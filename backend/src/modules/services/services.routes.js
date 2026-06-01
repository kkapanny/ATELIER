import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { sortServicesByCatalog } from "../../lib/service-catalog.js";
import { HttpError } from "../../middleware/error.js";
import {
  generateSlotsForDay,
  getDayScheduleForDate,
  parseCalendarDate,
  formatCalendarDate,
  salonDayBoundsUtc,
} from "../../lib/work-schedule.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const hallId = req.query.hall_id ? Number(req.query.hall_id) : undefined;
    const services = await prisma.service.findMany({
      where: { isActive: true, hallId },
      include: { hall: true },
    });
    res.json(sortServicesByCatalog(services));
  } catch (e) { next(e); }
});

/**
 * Слоты по услуге: объединяет доступность всех мастеров, которые её выполняют.
 * В каждом слоте — список свободных мастеров на это время.
 */
router.get("/:id/availability", async (req, res, next) => {
  try {
    const serviceId = Number(req.params.id);
    const dateStr = req.query.date;
    if (!dateStr) throw new HttpError(400, "date_required");

    const parts = parseCalendarDate(dateStr);
    if (!parts) throw new HttpError(400, "invalid_date");
    const calendarDate = formatCalendarDate(parts);

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new HttpError(404, "service_not_found");

    const masters = await prisma.master.findMany({
      where: { isActive: true, services: { some: { serviceId } } },
      include: { services: { where: { serviceId } } },
    });

    if (masters.length === 0) {
      return res.json({ serviceId, slots: [], dayOff: false, noMasters: true });
    }

    const { dayStart, dayEnd } = salonDayBoundsUtc(calendarDate);

    const busy = await prisma.appointment.findMany({
      where: {
        masterId: { in: masters.map((m) => m.id) },
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["planned", "confirmed", "completed"] },
      },
    });

    const slotMap = new Map();
    let anyWorking = false;

    for (const master of masters) {
      const daySchedule = getDayScheduleForDate(master.workSchedule, calendarDate);
      if (!daySchedule) continue;
      anyWorking = true;

      const masterBusy = busy.filter((a) => a.masterId === master.id);
      const masterSlots = generateSlotsForDay({
        dateStr: calendarDate,
        daySchedule,
        durationMin: service.durationMin,
        busy: masterBusy,
      });

      const ms = master.services[0];
      const price = Number(ms?.customPrice ?? service.price);

      for (const slot of masterSlots) {
        if (!slot.available) continue;
        if (!slotMap.has(slot.startsAt)) {
          slotMap.set(slot.startsAt, { startsAt: slot.startsAt, time: slot.time, masters: [] });
        }
        slotMap.get(slot.startsAt).masters.push({
          id: master.id,
          fullName: master.fullName,
          avatarUrl: master.avatarUrl,
          averageRating: master.averageRating,
          price,
        });
      }
    }

    const slots = [...slotMap.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    res.json({ serviceId, slots, dayOff: !anyWorking });
  } catch (e) { next(e); }
});

export default router;
