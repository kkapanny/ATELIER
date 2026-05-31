import {
  calendarDayOfWeek,
  formatCalendarDate,
  intervalsOverlap,
  minutesToTime,
  parseCalendarDate,
  parseTime,
  salonDayBoundsUtc,
  salonLocalToUtc,
  utcToSalonLocal,
} from "./salon-time.js";

export const SALON_START = "10:00";
export const SALON_END = "21:00";

export { parseCalendarDate, formatCalendarDate, calendarDayOfWeek, salonDayBoundsUtc };

export function buildDefaultWorkSchedule() {
  const sched = {};
  for (let d = 0; d <= 6; d++) {
    sched[String(d)] = d === 0 ? null : { start: SALON_START, end: SALON_END };
  }
  return sched;
}

/** Сливает сохранённый график с дефолтным (как в панели админа). */
export function resolveWorkSchedule(raw) {
  const merged = buildDefaultWorkSchedule();
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(merged)) {
      if (key in raw) merged[key] = raw[key];
    }
  }
  return merged;
}

/** График на календарный день или null (выходной). */
export function getDayScheduleForDate(workSchedule, dateStr) {
  const schedule = resolveWorkSchedule(workSchedule);
  const dow = calendarDayOfWeek(dateStr);
  if (dow === null) return null;
  return schedule[String(dow)] ?? null;
}

export function isWithinWorkSchedule(workSchedule, startUtc, endUtc) {
  const startLocal = utcToSalonLocal(startUtc);
  const endLocal = utcToSalonLocal(endUtc);
  const dateStr = formatCalendarDate(startLocal);
  const endDateStr = formatCalendarDate(endLocal);

  if (dateStr !== endDateStr) return false;

  const daySchedule = getDayScheduleForDate(workSchedule, dateStr);
  if (!daySchedule) return false;

  const ws = parseTime(daySchedule.start);
  const we = parseTime(daySchedule.end);
  return startLocal.totalMinutes >= ws.totalMinutes && endLocal.totalMinutes <= we.totalMinutes;
}

/**
 * Слоты на день:
 * - occupied — мастер занят в этот 30-мин интервал (серая зачёркнутая кнопка);
 * - available — можно записаться на услугу с durationMin;
 * - слоты, где мастер свободен, но услуга не помещается, не возвращаются.
 */
export function generateSlotsForDay({ dateStr, daySchedule, durationMin, busy, stepMin = 30 }) {
  if (!daySchedule) return [];

  const parts = parseCalendarDate(dateStr);
  if (!parts) return [];

  const workStart = parseTime(daySchedule.start);
  const workEnd = parseTime(daySchedule.end);
  const workEndUtc = salonLocalToUtc(dateStr, daySchedule.end);
  const slots = [];

  for (let current = workStart.totalMinutes; current < workEnd.totalMinutes; current += stepMin) {
    const time = minutesToTime(current);
    const slotStartUtc = salonLocalToUtc(dateStr, time);
    if (!slotStartUtc) continue;

    const slotEndUtc = new Date(slotStartUtc.getTime() + durationMin * 60 * 1000);
    const stepEndUtc = new Date(slotStartUtc.getTime() + stepMin * 60 * 1000);

    const occupied = busy.some((a) =>
      intervalsOverlap(slotStartUtc, stepEndUtc, a.startsAt, a.endsAt),
    );

    const hasConflict = busy.some((a) =>
      intervalsOverlap(slotStartUtc, slotEndUtc, a.startsAt, a.endsAt),
    );

    const fitsWorkDay = slotEndUtc <= workEndUtc;
    const available = !hasConflict && fitsWorkDay;

    if (!occupied && !available) continue;

    slots.push({
      startsAt: slotStartUtc.toISOString(),
      time,
      available,
      occupied,
    });
  }

  return slots;
}
