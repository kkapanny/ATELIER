import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function formatDate(d: string | Date, fmt = "d MMMM yyyy, HH:mm") {
  return format(new Date(d), fmt, { locale: ru });
}

export function formatPrice(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function classNames(...c: (string | false | undefined | null)[]): string {
  return c.filter(Boolean).join(" ");
}

export function bookingErrorMessage(code?: string): string {
  switch (code) {
    case "slot_taken":
      return "Слот уже занят";
    case "too_soon":
      return "Запись возможна не ранее чем через час от текущего времени";
    case "past_time":
      return "Нельзя записаться на прошедшее время";
    case "outside_work_schedule":
      return "Выбранное время вне рабочего графика мастера";
    case "cannot_reschedule":
      return "Эту запись нельзя перенести";
    default:
      return "Попробуйте другой слот";
  }
}
