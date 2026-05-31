import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";
import { HttpError } from "../../middleware/error.js";
import { scheduleReminders, cancelReminders } from "../../queue/reminders.queue.js";
import { isWithinWorkSchedule } from "../../lib/work-schedule.js";

const router = Router();

const createSchema = z.object({
  masterId: z.number().int(),
  serviceId: z.number().int(),
  startsAt: z.string(), // ISO
});

router.post("/", authenticate, requireRole("client", "admin"), validateBody(createSchema), async (req, res, next) => {
  try {
    const { masterId, serviceId, startsAt } = req.body;
    const start = new Date(startsAt);
    if (isNaN(start.getTime())) throw new HttpError(400, "invalid_date");

    const [client, master, service] = await Promise.all([
      prisma.client.findUnique({ where: { userId: req.user.id } }),
      prisma.master.findUnique({ where: { id: masterId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!client) throw new HttpError(403, "client_required");
    if (!master) throw new HttpError(404, "master_not_found");
    if (!service) throw new HttpError(404, "service_not_found");

    const end = new Date(start.getTime() + service.durationMin * 60 * 1000);
    if (!isWithinWorkSchedule(master.workSchedule, start, end)) {
      throw new HttpError(400, "outside_work_schedule");
    }

    const appointment = await prisma.$transaction(async (tx) => {
      // Проверка пересечения слотов мастера. Для строгой защиты от гонок
      // в production используется блокировка диапазона; здесь — логическая проверка.
      const conflict = await tx.appointment.findFirst({
        where: {
          masterId,
          status: { in: ["planned", "confirmed", "completed"] },
          AND: [{ startsAt: { lt: end } }, { endsAt: { gt: start } }],
        },
      });
      if (conflict) throw new HttpError(409, "slot_taken");

      const price = Number(service.price);
      const discount = client.discountPercent
        ? Math.round(price * (client.discountPercent / 100) * 100) / 100
        : 0;

      return tx.appointment.create({
        data: {
          clientId: client.id,
          masterId,
          serviceId,
          startsAt: start,
          endsAt: end,
          status: "confirmed",
          priceAtBooking: price,
          discountApplied: discount,
        },
        include: { master: true, service: true },
      });
    });

    await scheduleReminders(appointment);
    res.status(201).json(appointment);
  } catch (e) { next(e); }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({ where: { userId: req.user.id } });
    if (!client) return res.json([]);
    const items = await prisma.appointment.findMany({
      where: { clientId: client.id },
      orderBy: { startsAt: "desc" },
      include: { master: true, service: true, care: true },
    });
    res.json(items);
  } catch (e) { next(e); }
});

router.get("/master/me", authenticate, requireRole("master"), async (req, res, next) => {
  try {
    const master = await prisma.master.findUnique({ where: { userId: req.user.id } });
    if (!master) return res.json([]);
    const items = await prisma.appointment.findMany({
      where: { masterId: master.id },
      orderBy: { startsAt: "asc" },
      include: { client: true, service: true, care: true },
    });
    res.json(items);
  } catch (e) { next(e); }
});

const patchSchema = z.object({
  startsAt: z.string().optional(),
  status: z.enum(["planned", "confirmed", "completed", "cancelled", "no_show"]).optional(),
});

router.patch("/:id", authenticate, validateBody(patchSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const appointment = await prisma.appointment.findUnique({ where: { id }, include: { service: true, client: true, master: true } });
    if (!appointment) throw new HttpError(404, "appointment_not_found");

    // Контроль доступа: клиент — только свои; мастер — только свои; админ — любые.
    const role = req.user.role;
    if (role === "client") {
      const client = await prisma.client.findUnique({ where: { userId: req.user.id } });
      if (!client || client.id !== appointment.clientId) throw new HttpError(403, "forbidden");
    } else if (role === "master") {
      const master = await prisma.master.findUnique({ where: { userId: req.user.id } });
      if (!master || master.id !== appointment.masterId) throw new HttpError(403, "forbidden");
    }

    const data = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.startsAt) {
      const start = new Date(req.body.startsAt);
      data.startsAt = start;
      data.endsAt = new Date(start.getTime() + appointment.service.durationMin * 60 * 1000);
    }
    const updated = await prisma.appointment.update({ where: { id }, data });

    if (data.startsAt) {
      await cancelReminders(id);
      await scheduleReminders(updated);
    }
    if (data.status === "cancelled" || data.status === "no_show") {
      await cancelReminders(id);
    }
    res.json(updated);
  } catch (e) { next(e); }
});

const completeSchema = z.object({
  priceActual: z.number().optional(),
  notes: z.string().optional(),
});

router.post("/:id/complete", authenticate, requireRole("master", "admin"), validateBody(completeSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: "completed",
        priceAtBooking: req.body.priceActual !== undefined ? req.body.priceActual : undefined,
        notes: req.body.notes,
      },
    });
    await cancelReminders(id);
    res.json(updated);
  } catch (e) { next(e); }
});

const careSchema = z.object({
  adviceText: z.string().min(3),
  repeatAfterDays: z.number().int().min(1).max(180),
});

router.post("/:id/care", authenticate, requireRole("master", "admin"), validateBody(careSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({ where: { userId: req.user.id } });
    if (!master) throw new HttpError(403, "master_required");

    const care = await prisma.careRecommendation.upsert({
      where: { appointmentId: id },
      create: {
        appointmentId: id,
        adviceText: req.body.adviceText,
        repeatAfterDays: req.body.repeatAfterDays,
        createdById: master.id,
      },
      update: {
        adviceText: req.body.adviceText,
        repeatAfterDays: req.body.repeatAfterDays,
      },
    });

    // Запланировать push о повторной записи
    const appt = await prisma.appointment.findUnique({ where: { id } });
    if (appt) await scheduleReminders(appt, { repeatAfterDays: req.body.repeatAfterDays });

    res.json(care);
  } catch (e) { next(e); }
});

export default router;
