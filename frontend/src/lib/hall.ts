/** Подпись зала для бейджа на карточке мастера. */
export function formatHallLabel(hall?: { name: string; description?: string | null } | null): string {
  if (!hall) return "";
  if (hall.description?.trim()) return hall.description.trim();
  if (hall.name === "male") return "Мужской зал";
  if (hall.name === "female") return "Женский зал";
  return hall.name;
}
