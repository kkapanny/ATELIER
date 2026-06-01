import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServiceListGrouped } from "@/components/ServiceListGrouped";
import { api } from "@/lib/api";
import { classNames } from "@/lib/utils";
import { formatHallLabel } from "@/lib/hall";

interface Hall {
  id: number;
  name: string;
  description: string | null;
}

interface Service {
  id: number;
  name: string;
  durationMin: number;
  price: number;
  category?: string | null;
  hall: { id: number; name: string };
}

export function ClientServices() {
  const [hallId, setHallId] = useState<number | null>(null);

  const { data: halls = [] } = useQuery({
    queryKey: ["halls"],
    queryFn: async () => (await api.get<Hall[]>("/halls")).data,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services", { hallId }],
    queryFn: async () =>
      (await api.get<Service[]>("/services", { params: { hall_id: hallId ?? undefined } })).data,
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-60 shrink-0">
          <div className="text-xs uppercase tracking-widest text-ink-300 mb-3">Зал</div>
          <div className="space-y-1">
            <FilterBtn active={hallId === null} onClick={() => setHallId(null)}>
              Все
            </FilterBtn>
            {halls.map((hall) => (
              <FilterBtn key={hall.id} active={hallId === hall.id} onClick={() => setHallId(hall.id)}>
                {formatHallLabel(hall).replace(/ зал$/i, "")}
              </FilterBtn>
            ))}
          </div>
        </aside>

        <section className="flex-1">
          <h1 className="font-display text-4xl text-ink-700 mb-2">Услуги</h1>
          <p className="text-sm text-ink-400 mb-8">Выберите услугу — покажем свободное время у подходящих мастеров.</p>

          {services.length === 0 ? (
            <p className="text-sm text-ink-400">Услуги не найдены.</p>
          ) : (
            <ServiceListGrouped
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                durationMin: s.durationMin,
                price: Number(s.price),
                category: s.category,
              }))}
              bookLink={(id) => `/client/services/${id}/calendar`}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function FilterBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
        active ? "bg-ink-700 text-cream-50" : "text-ink-500 hover:bg-cream-200",
      )}
    >
      {children}
    </button>
  );
}
