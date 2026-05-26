export type ServiceLike = { id: number; name: string };

const SERVICE_KIND_ORDER = ["haircut", "hairCare", "coloring", "manicure", "makeup"] as const;
type ServiceKind = (typeof SERVICE_KIND_ORDER)[number] | "other";

export const SERVICE_CATALOG_SECTIONS = [
  { id: "hair", title: "Стрижка и уход", kinds: ["haircut", "hairCare"] as const },
  { id: "coloring", title: "Окрашивание", kinds: ["coloring"] as const },
  { id: "manicure", title: "Маникюр", kinds: ["manicure"] as const },
  { id: "makeup", title: "Макияж", kinds: ["makeup"] as const },
] as const;

export function getServiceKind(name: string): ServiceKind {
  const n = name.toLowerCase();
  if (n.includes("маникюр")) return "manicure";
  if (n.includes("макияж")) return "makeup";
  if (n.includes("окрашив") || n.includes("балаяж")) return "coloring";
  if (n.includes("olaplex") || (n.includes("уход") && !n.includes("макияж"))) return "hairCare";
  if (n.includes("стрижк") || n.includes("бород") || n.includes("ирокез")) return "haircut";
  return "other";
}

function kindSortIndex(kind: ServiceKind) {
  const i = SERVICE_KIND_ORDER.indexOf(kind as (typeof SERVICE_KIND_ORDER)[number]);
  return i === -1 ? SERVICE_KIND_ORDER.length : i;
}

export function sortServicesByCatalog<T extends ServiceLike>(services: T[]): T[] {
  return [...services].sort((a, b) => {
    const ka = kindSortIndex(getServiceKind(a.name));
    const kb = kindSortIndex(getServiceKind(b.name));
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
      (section.kinds as readonly string[]).includes(getServiceKind(s.name)),
    ),
  })).filter((g) => g.items.length > 0);
}
