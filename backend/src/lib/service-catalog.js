/** Порядок видов услуг в каталоге. */
const SERVICE_KIND_ORDER = ["hair", "haircut", "hairCare", "coloring", "manicure", "makeup"];
const VALID_KINDS = new Set(SERVICE_KIND_ORDER);

/** Мини-разделы прайса. */
export const SERVICE_CATALOG_SECTIONS = [
  { id: "hair", title: "Стрижка и уход", kinds: ["hair", "haircut", "hairCare"] },
  { id: "coloring", title: "Окрашивание", kinds: ["coloring"] },
  { id: "manicure", title: "Маникюр", kinds: ["manicure"] },
  { id: "makeup", title: "Макияж", kinds: ["makeup"] },
];

/** Принимает объект услуги (с полем category) или строку (имя). */
export function getServiceKind(service) {
  if (typeof service === "string") return getKindFromName(service);
  if (service.category && VALID_KINDS.has(service.category)) return service.category;
  return getKindFromName(service.name);
}

function getKindFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("маникюр")) return "manicure";
  if (n.includes("макияж")) return "makeup";
  if (n.includes("окрашив") || n.includes("балаяж")) return "coloring";
  if (n.includes("olaplex") || (n.includes("уход") && !n.includes("макияж"))) return "hairCare";
  if (n.includes("стрижк") || n.includes("бород") || n.includes("ирокез")) return "haircut";
  return "other";
}

function kindSortIndex(kind) {
  const i = SERVICE_KIND_ORDER.indexOf(kind);
  return i === -1 ? SERVICE_KIND_ORDER.length : i;
}

/** Сортировка: стрижка → уход → окрашивание → маникюр → макияж. */
export function sortServicesByCatalog(services) {
  return [...services].sort((a, b) => {
    const ka = kindSortIndex(getServiceKind(a));
    const kb = kindSortIndex(getServiceKind(b));
    if (ka !== kb) return ka - kb;
    return a.name.localeCompare(b.name, "ru");
  });
}

/** Группы для отображения с мини-заголовками. */
export function groupServicesByCatalog(services) {
  const sorted = sortServicesByCatalog(services);
  return SERVICE_CATALOG_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    items: sorted.filter((s) => section.kinds.includes(getServiceKind(s))),
  })).filter((g) => g.items.length > 0);
}
