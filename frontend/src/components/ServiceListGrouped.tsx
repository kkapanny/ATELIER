import { groupServicesByCatalog } from "@/lib/serviceCatalog";
import { formatPrice } from "@/lib/utils";
import { Link } from "react-router-dom";

export interface ServiceListItem {
  id: number;
  name: string;
  durationMin: number;
  price: number;
}

interface ServiceListGroupedProps {
  services: ServiceListItem[];
  /** Кнопка «Записаться» у каждой услуги (карточка мастера для клиента). */
  bookBasePath?: string;
}

export function ServiceListGrouped({ services, bookBasePath }: ServiceListGroupedProps) {
  const groups = groupServicesByCatalog(services);

  if (groups.length === 0) {
    return <p className="text-sm text-ink-400">Услуги не указаны.</p>;
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="text-xs uppercase tracking-widest text-ink-400 mb-3">{group.title}</h3>
          <ul className="space-y-3">
            {group.items.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between border-b border-dashed border-cream-300 pb-3"
              >
                <div>
                  <div className="font-display text-lg text-ink-700">{s.name}</div>
                  <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">
                    {s.durationMin} мин
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink-700 font-medium">{formatPrice(s.price)}</span>
                  {bookBasePath ? (
                    <Link
                      to={`${bookBasePath}?service_id=${s.id}`}
                      className="btn-primary text-xs"
                    >
                      Записаться
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
