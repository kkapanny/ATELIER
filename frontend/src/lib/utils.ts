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
