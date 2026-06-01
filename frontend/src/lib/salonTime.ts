/** Часовой пояс салона (UTC+3). */
export const SALON_UTC_OFFSET_MIN = 180;

export const SALON_DAY_START = 10 * 60;
export const SALON_DAY_END = 21 * 60;

export function parseTime(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return { hours: h, minutes: m, totalMinutes: h * 60 + m };
}

export function minutesToTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatCalendarDate(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function parseCalendarDate(dateStr: string) {
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function addCalendarDays(dateStr: string, days: number) {
  const parts = parseCalendarDate(dateStr);
  if (!parts) return null;
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatCalendarDate({
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  });
}

export function calendarDayOfWeek(dateStr: string) {
  const parts = parseCalendarDate(dateStr);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function utcToSalonLocal(date: Date) {
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

export function salonDateKey(iso: string | Date) {
  return formatCalendarDate(utcToSalonLocal(new Date(iso)));
}

export function salonTodayKey() {
  return salonDateKey(new Date());
}

export function mondayOfWeek(dateStr: string) {
  const dow = calendarDayOfWeek(dateStr);
  if (dow === null) return dateStr;
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  return addCalendarDays(dateStr, -daysSinceMonday) ?? dateStr;
}

export function weekDaysFromMonday(mondayKey: string) {
  return Array.from({ length: 7 }, (_, i) => addCalendarDays(mondayKey, i)!);
}
