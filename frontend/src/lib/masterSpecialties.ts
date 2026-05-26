/** Краткие подписи специализации мастера по списку услуг. */
const SPECIALTY_ORDER = [
  "Стрижка",
  "Окрашивание",
  "Маникюр",
  "Макияж",
  "Борода",
  "Уход за волосами",
] as const;

type Specialty = (typeof SPECIALTY_ORDER)[number];

function detectSpecialty(serviceName: string): Specialty | null {
  const n = serviceName.toLowerCase();
  if (n.includes("стрижк")) return "Стрижка";
  if (n.includes("окрашив") || n.includes("балаяж")) return "Окрашивание";
  if (n.includes("маникюр")) return "Маникюр";
  if (n.includes("макияж")) return "Макияж";
  if (n.includes("бород")) return "Борода";
  if (n.includes("olaplex") || (n.includes("уход") && !n.includes("макияж"))) return "Уход за волосами";
  return null;
}

export function getMasterSpecialties(services: { name: string }[] = []): Specialty[] {
  const found = new Set<Specialty>();
  for (const s of services) {
    const tag = detectSpecialty(s.name);
    if (tag) found.add(tag);
  }
  return SPECIALTY_ORDER.filter((t) => found.has(t));
}

export function formatMasterSpecialties(services: { name: string }[] = []): string {
  return getMasterSpecialties(services).join(" · ");
}

export function formatMasterSpecialtyLine(
  services: { name: string }[] = [],
  experienceYears: number,
): string {
  const tags = formatMasterSpecialties(services);
  if (!tags) return `${experienceYears} лет опыта`;
  return `${tags} · ${experienceYears} лет`;
}

export function formatMasterSpecialtyWithYears(
  services: { name: string }[] = [],
  experienceYears: number,
): string {
  const tags = formatMasterSpecialties(services);
  if (!tags) return `${experienceYears} лет`;
  return `${tags} · ${experienceYears} лет`;
}

/** Первая специализация — для бейджа на фото. */
export function primaryMasterSpecialty(services: { name: string }[] = []): string {
  const tags = getMasterSpecialties(services);
  return tags[0] ?? "Мастер";
}
