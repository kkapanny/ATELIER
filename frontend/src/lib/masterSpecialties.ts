/** Категории мастера для подписи text-xs tracking-widest uppercase. */
export const MASTER_SPECIALTY_OPTIONS = [
  "Стрижка",
  "Окрашивание",
  "Уход за волосами",
  "Макияж",
  "Борода",
  "Маникюр",
] as const;

export type MasterSpecialtyOption = (typeof MASTER_SPECIALTY_OPTIONS)[number];

const SPECIALTY_ORDER: readonly MasterSpecialtyOption[] = MASTER_SPECIALTY_OPTIONS;

function detectSpecialty(serviceName: string): MasterSpecialtyOption | null {
  const n = serviceName.toLowerCase();
  if (n.includes("стрижк")) return "Стрижка";
  if (n.includes("окрашив") || n.includes("балаяж")) return "Окрашивание";
  if (n.includes("маникюр")) return "Маникюр";
  if (n.includes("макияж")) return "Макияж";
  if (n.includes("бород")) return "Борода";
  if (n.includes("olaplex") || (n.includes("уход") && !n.includes("макияж"))) return "Уход за волосами";
  return null;
}

function fromServices(services: { name: string }[] = []): MasterSpecialtyOption[] {
  const found = new Set<MasterSpecialtyOption>();
  for (const s of services) {
    const tag = detectSpecialty(s.name);
    if (tag) found.add(tag);
  }
  return SPECIALTY_ORDER.filter((t) => found.has(t));
}

/** Приоритет у явно заданных категорий (админ), иначе — из услуг. */
export function resolveMasterSpecialties(
  services: { name: string }[] = [],
  stored?: string[] | null,
): MasterSpecialtyOption[] {
  if (stored?.length) {
    return SPECIALTY_ORDER.filter((t) => stored.includes(t));
  }
  return fromServices(services);
}

export function formatMasterSpecialties(
  services: { name: string }[] = [],
  stored?: string[] | null,
): string {
  return resolveMasterSpecialties(services, stored).join(" · ");
}

export function formatMasterSpecialtyLine(
  services: { name: string }[] = [],
  experienceYears: number,
  stored?: string[] | null,
): string {
  const tags = formatMasterSpecialties(services, stored);
  if (!tags) return `${experienceYears} лет опыта`;
  return `${tags} · ${experienceYears} лет`;
}

export function formatMasterSpecialtyWithYears(
  services: { name: string }[] = [],
  experienceYears: number,
  stored?: string[] | null,
): string {
  const tags = formatMasterSpecialties(services, stored);
  if (!tags) return `${experienceYears} лет`;
  return `${tags} · ${experienceYears} лет`;
}

export function primaryMasterSpecialty(
  services: { name: string }[] = [],
  stored?: string[] | null,
): string {
  const tags = resolveMasterSpecialties(services, stored);
  return tags[0] ?? "Мастер";
}
