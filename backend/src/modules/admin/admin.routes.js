import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { authenticate } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validateBody } from "../../middleware/validate.js";

const router = Router();

router.use(authenticate, requireRole("admin"));

// ===========================================================
// CRUD клиенты
// ===========================================================
router.get("/clients", async (_req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      include: { user: true },
      orderBy: { id: "asc" },
    });
    res.json(clients);
  } catch (e) { next(e); }
});

const clientSchema = z.object({
  fullName: z.string(),
  phone: z.string().optional(),
  gender: z.enum(["male", "female"]),
  category: z.enum(["regular", "casual"]).default("casual"),
  discountPercent: z.number().int().min(0).max(50).default(0),
  login: z.string().min(2),
  password: z.string().min(3),
});

router.post("/clients", validateBody(clientSchema), async (req, res, next) => {
  try {
    const bcrypt = (await import("bcrypt")).default;
    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await prisma.user.create({
      data: {
        login: req.body.login,
        passwordHash,
        role: "client",
        phone: req.body.phone,
        client: {
          create: {
            fullName: req.body.fullName,
            gender: req.body.gender,
            category: req.body.category,
            discountPercent: req.body.discountPercent,
            phone: req.body.phone,
          },
        },
      },
      include: { client: true },
    });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

router.delete("/clients/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) return res.status(404).json({ error: "not_found" });
    await prisma.user.delete({ where: { id: client.userId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ===========================================================
// Мастера: модерация и активация
// ===========================================================
router.get("/masters", async (_req, res, next) => {
  try {
    const masters = await prisma.master.findMany({
      include: { user: true, hall: true },
      orderBy: { id: "asc" },
    });
    res.json(masters);
  } catch (e) { next(e); }
});

router.post("/masters/:id/activate", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const updated = await prisma.master.update({ where: { id }, data: { isActive: true } });
    res.json(updated);
  } catch (e) { next(e); }
});

// ===========================================================
// Расписание дня
// ===========================================================
router.get("/schedule", async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const items = await prisma.appointment.findMany({
      where: { startsAt: { gte: day, lt: dayEnd } },
      include: { client: true, master: true, service: true },
      orderBy: { startsAt: "asc" },
    });
    res.json(items);
  } catch (e) { next(e); }
});

// ===========================================================
// Отчёты руководителя — все 6 из задания
// ===========================================================
router.get("/reports/daily", async (req, res, next) => {
  try {
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const grouped = await prisma.appointment.groupBy({
      by: ["masterId"],
      where: { startsAt: { gte: day, lt: dayEnd }, status: { in: ["completed", "confirmed"] } },
      _count: { _all: true },
    });
    const masters = await prisma.master.findMany({ where: { id: { in: grouped.map((g) => g.masterId) } } });

    res.json(grouped.map((g) => ({
      masterId: g.masterId,
      masterName: masters.find((m) => m.id === g.masterId)?.fullName,
      clients: g._count._all,
    })));
  } catch (e) { next(e); }
});

router.get("/reports/earnings", async (req, res, next) => {
  try {
    const masterId = req.query.master_id ? Number(req.query.master_id) : undefined;
    const dateStr = req.query.date || new Date().toISOString();
    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const sum = await prisma.appointment.aggregate({
      where: { masterId, startsAt: { gte: day, lt: dayEnd }, status: "completed" },
      _sum: { priceAtBooking: true, discountApplied: true },
    });
    res.json({
      masterId: masterId || null,
      gross: Number(sum._sum.priceAtBooking || 0),
      discount: Number(sum._sum.discountApplied || 0),
      net: Number(sum._sum.priceAtBooking || 0) - Number(sum._sum.discountApplied || 0),
    });
  } catch (e) { next(e); }
});

router.get("/reports/top-service", async (_req, res, next) => {
  try {
    const grouped = await prisma.appointment.groupBy({
      by: ["serviceId"],
      where: { status: "completed" },
      _count: { _all: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 10,
    });
    const services = await prisma.service.findMany({ where: { id: { in: grouped.map((g) => g.serviceId) } } });
    res.json(grouped.map((g) => ({
      serviceId: g.serviceId,
      name: services.find((s) => s.id === g.serviceId)?.name,
      count: g._count._all,
    })));
  } catch (e) { next(e); }
});

router.get("/reports/gender-ratio", async (_req, res, next) => {
  try {
    const grouped = await prisma.client.groupBy({
      by: ["gender"],
      _count: { _all: true },
    });
    const total = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const result = { male: 0, female: 0, total };
    for (const g of grouped) result[g.gender] = g._count._all;
    res.json(result);
  } catch (e) { next(e); }
});

router.get("/reports/regulars-count", async (_req, res, next) => {
  try {
    const total = await prisma.client.count();
    const regular = await prisma.client.count({ where: { category: "regular" } });
    res.json({ total, regular, casual: total - regular });
  } catch (e) { next(e); }
});

router.get("/reports/top-master", async (_req, res, next) => {
  try {
    const grouped = await prisma.appointment.groupBy({
      by: ["masterId"],
      where: { status: "completed" },
      _count: { _all: true },
      orderBy: { _count: { masterId: "desc" } },
      take: 10,
    });
    const masters = await prisma.master.findMany({ where: { id: { in: grouped.map((g) => g.masterId) } } });
    res.json(grouped.map((g) => ({
      masterId: g.masterId,
      name: masters.find((m) => m.id === g.masterId)?.fullName,
      count: g._count._all,
    })));
  } catch (e) { next(e); }
});

export default router;
