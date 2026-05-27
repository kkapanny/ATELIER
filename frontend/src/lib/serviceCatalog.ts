export type ServiceKind = "hair" | "haircut" | "hairCare" | "coloring" | "manicure" | "makeup" | "other";

export type ServiceLike = { id: number; name: string; category?: string | null };

const SERVICE_KIND_ORDER: ServiceKind[] = ["hair", "haircut", "hairCare", "coloring", "manicure", "makeup"];

export const SERVICE_CATALOG_SECTIONS = [
  { id: "hair", title: "Стрижка и уход", kinds: ["hair", "haircut", "hairCare"] as const },
  { id: "coloring", title: "Окрашивание", kinds: ["coloring"] as const },
  { id: "manicure", title: "Маникюр", kinds: ["manicure"] as const },
  { id: "makeup", title: "Макияж", kinds: ["makeup"] as const },
] as const;

/** Категории каталога — используются в форме услуг в панели администратора. */
export const CATALOG_CATEGORIES: { kind: ServiceKind; label: string }[] = [
  { kind: "hair", label: "Стрижка и уход" },
  { kind: "coloring", label: "Окрашивание" },
  { kind: "manicure", label: "Маникюр" },
  { kind: "makeup", label: "Макияж" },
];

const VALID_KINDS = new Set<string>(SERVICE_KIND_ORDER);

/** Определяет раздел каталога: сначала по полю category (если задано), затем по имени. */
export function getServiceKind(service: ServiceLike | string): ServiceKind {
  if (typeof service === "string") return getKindFromName(service);
  if (service.category && VALID_KINDS.has(service.category)) {
    return service.category as ServiceKind;
  }
  return getKindFromName(service.name);
}

function getKindFromName(name: string): ServiceKind {
  const n = name.toLowerCase();
  if (n.includes("маникюр")) return "manicure";
  if (n.includes("макияж")) return "makeup";
  if (n.includes("окрашив") || n.includes("балаяж")) return "coloring";
  if (n.includes("olaplex") || (n.includes("уход") && !n.includes("макияж"))) return "hairCare";
  if (n.includes("стрижк") || n.includes("бород") || n.includes("ирокез")) return "haircut";
  return "other";
}

function kindSortIndex(kind: ServiceKind) {
  const i = SERVICE_KIND_ORDER.indexOf(kind);
  return i === -1 ? SERVICE_KIND_ORDER.length : i;
}

export function sortServicesByCatalog<T extends ServiceLike>(services: T[]): T[] {
  return [...services].sort((a, b) => {
    const ka = kindSortIndex(getServiceKind(a));
    const kb = kindSortIndex(getServiceKind(b));
    if (ka !== kb) return ka - kb;
    return a.name.localeCompare(b.name, "ru");
  });
}

export function groupServicesByCatalog<T extends ServiceLike>(services: T[]) {
  const sorted = sortServicesByCatalog(services);
  return SERVICE_CATALOG_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    items: sorted.filter((s) =>
      (section.kinds as readonly string[]).includes(getServiceKind(s)),
    ),
  })).filter((g) => g.items.length > 0);
}
