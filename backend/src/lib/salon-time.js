/** Часовой пояс салона (Москва, UTC+3, без перехода на летнее время). */
export const SALON_UTC_OFFSET_MIN = 180;

export function parseTime(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m, totalMinutes: h * 60 + m };
}

export function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Разбирает календарную дату yyyy-MM-dd. */
export function parseCalendarDate(dateStr) {
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function formatCalendarDate({ year, month, day }) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addCalendarDays(dateStr, days) {
  const parts = parseCalendarDate(dateStr);
  if (!parts) return null;
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatCalendarDate({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

/** Локальное время салона → UTC Date. */
export function salonLocalToUtc(dateStr, timeStr) {
  const parts = parseCalendarDate(dateStr);
  if (!parts) return null;
  const { totalMinutes } = parseTime(timeStr);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, h, m) - SALON_UTC_OFFSET_MIN * 60 * 1000,
  );
}

/** UTC Date → компоненты локального времени салона. */
export function utcToSalonLocal(date) {
  const salonMs = date.getTime() + SALON_UTC_OFFSET_MIN * 60 * 1000;
  const d = new Date(salonMs);
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

export function formatSalonTime(date) {
  const { hours, minutes } = utcToSalonLocal(date);
  return minutesToTime(hours * 60 + minutes);
}

/** Границы календарного дня салона в UTC. */
export function salonDayBoundsUtc(dateStr) {
  const dayStart = salonLocalToUtc(dateStr, "00:00");
  const nextDay = addCalendarDays(dateStr, 1);
  const dayEnd = salonLocalToUtc(nextDay, "00:00");
  return { dayStart, dayEnd };
}

/** День недели 0=Вс … 6=Сб по календарной дате. */
export function calendarDayOfWeek(dateStr) {
  const parts = parseCalendarDate(dateStr);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Интервалы [start, end) пересекаются. */
export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
