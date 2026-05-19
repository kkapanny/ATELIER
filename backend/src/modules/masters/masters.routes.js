import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/error.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const { hall_id, service_id, sort } = req.query;
    const where = { isActive: true };
    if (hall_id) where.hallId = Number(hall_id);
    if (service_id) where.services = { some: { serviceId: Number(service_id) } };

    const orderBy =
      sort === "rating" ? { averageRating: "desc" }
      : sort === "experience" ? { experienceYears: "desc" }
      : { id: "asc" };

    const masters = await prisma.master.findMany({
      where,
      orderBy,
      include: { hall: true, services: { include: { service: true } } },
    });

    res.json(masters.map(serialize));
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const master = await prisma.master.findUnique({
      where: { id },
      include: {
        hall: true,
        services: { include: { service: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { client: true },
        },
      },
    });
    if (!master) throw new HttpError(404, "master_not_found");
    res.json(serialize(master, true));
  } catch (e) { next(e); }
});

/**
 * Свободные слоты мастера на конкретную дату.
 * Логика: рабочее окно 10:00–19:00, шаг 30 мин, длительность услуги — из БД.
 * Слот считается свободным, если на интервале нет confirmed/planned записей.
 */
router.get("/:id/availability", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const dateStr = req.query.date;
    const serviceId = Number(req.query.service_id);
    if (!dateStr || !serviceId) throw new HttpError(400, "date_and_service_required");

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new HttpError(404, "service_not_found");

    const day = new Date(dateStr);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const busy = await prisma.appointment.findMany({
      where: {
        masterId: id,
        startsAt: { gte: day, lt: dayEnd },
        status: { in: ["planned", "confirmed", "completed"] },
      },
    });

    const slots = [];
    const stepMin = 30;
    const startHour = 10;
    const endHour = 19;
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += stepMin) {
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + service.durationMin * 60 * 1000);
        if (slotEnd.getHours() + slotEnd.getMinutes() / 60 > endHour) continue;

        const overlap = busy.some(
          (a) => slotStart < a.endsAt && slotEnd > a.startsAt,
        );
        slots.push({
          startsAt: slotStart.toISOString(),
          endsAt: slotEnd.toISOString(),
          available: !overlap,
        });
      }
    }
    res.json({ masterId: id, serviceId, slots });
  } catch (e) { next(e); }
});

function serialize(master, includeReviews = false) {
  return {
    id: master.id,
    fullName: master.fullName,
    gender: master.gender,
    hall: master.hall ? { id: master.hall.id, name: master.hall.name } : null,
    rank: master.rank,
    experienceYears: master.experienceYears,
    bio: master.bio,
    avatarUrl: master.avatarUrl,
    socialLinks: master.socialLinks,
    averageRating: master.averageRating,
    services: master.services.map((s) => ({
      id: s.service.id,
      name: s.service.name,
      durationMin: s.service.durationMin,
      price: Number(s.customPrice ?? s.service.price),
    })),
    ...(includeReviews
      ? {
          reviews: master.reviews?.map((r) => ({
            id: r.id,
            rating: r.rating,
            text: r.text,
            createdAt: r.createdAt,
            clientName: r.client?.fullName,
          })),
        }
      : {}),
  };
}

export default router;
