import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/error.js";
import { sortServicesByCatalog } from "../../lib/service-catalog.js";
import { generateSlotsForDay, getDayScheduleForDate, parseCalendarDate, formatCalendarDate, salonDayBoundsUtc } from "../../lib/work-schedule.js";

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
 * Слоты мастера на конкретную дату.
 * Окно берётся из workSchedule (график в панели админа), шаг 30 мин.
 * Слоты вне рабочего времени не возвращаются; занятые — available: false.
 */
router.get("/:id/availability", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const dateStr = req.query.date;
    const serviceId = Number(req.query.service_id);
    if (!dateStr || !serviceId) throw new HttpError(400, "date_and_service_required");

    const [master, service] = await Promise.all([
      prisma.master.findUnique({ where: { id }, select: { workSchedule: true } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!master) throw new HttpError(404, "master_not_found");
    if (!service) throw new HttpError(404, "service_not_found");

    const parts = parseCalendarDate(dateStr);
    if (!parts) throw new HttpError(400, "invalid_date");
    const calendarDate = formatCalendarDate(parts);

    const daySchedule = getDayScheduleForDate(master.workSchedule, calendarDate);
    if (!daySchedule) {
      return res.json({ masterId: id, serviceId, slots: [], dayOff: true });
    }

    const { dayStart, dayEnd } = salonDayBoundsUtc(calendarDate);

    const busy = await prisma.appointment.findMany({
      where: {
        masterId: id,
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["planned", "confirmed", "completed"] },
      },
    });

    const slots = generateSlotsForDay({
      dateStr: calendarDate,
      daySchedule,
      durationMin: service.durationMin,
      busy,
    });

    res.json({ masterId: id, serviceId, slots, dayOff: false });
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
    specialties: master.specialties ?? [],
    avatarUrl: master.avatarUrl,
    socialLinks: master.socialLinks,
    averageRating: master.averageRating,
    services: sortServicesByCatalog(
      master.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        durationMin: s.service.durationMin,
        price: Number(s.customPrice ?? s.service.price),
        category: s.service.category ?? null,
      })),
    ),
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
