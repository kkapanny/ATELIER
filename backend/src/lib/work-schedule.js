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
/** Минимальный интервал между «сейчас» и записью для клиента. */
export const CLIENT_MIN_LEAD_MINUTES = 60;

export { parseCalendarDate, formatCalendarDate, calendarDayOfWeek, salonDayBoundsUtc };

/** Календарная дата «сегодня» в часовом поясе салона. */
export function salonTodayDateStr(now = new Date()) {
  return formatCalendarDate(utcToSalonLocal(now));
}

export function isPastCalendarDate(dateStr, now = new Date()) {
  return dateStr < salonTodayDateStr(now);
}

/** UTC-момент, раньше которого запись недоступна. */
export function getMinBookableStartsAt(minLeadMinutes = 0, now = new Date()) {
  return new Date(now.getTime() + minLeadMinutes * 60 * 1000);
}

export function resolveMinLeadMinutes(bookingMode) {
  return bookingMode === "admin" ? 0 : CLIENT_MIN_LEAD_MINUTES;
}

/** null — ок; иначе код ошибки для HttpError. */
export function validateBookingStart(startUtc, { minLeadMinutes = 0, now = new Date() } = {}) {
  const minStart = getMinBookableStartsAt(minLeadMinutes, now);
  if (startUtc.getTime() < minStart.getTime()) {
    return minLeadMinutes > 0 ? "too_soon" : "past_time";
  }
  return null;
}

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
export function generateSlotsForDay({ dateStr, daySchedule, durationMin, busy, stepMin = 30, minStartsAtUtc = null }) {
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
    if (minStartsAtUtc && slotStartUtc < minStartsAtUtc) continue;

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
