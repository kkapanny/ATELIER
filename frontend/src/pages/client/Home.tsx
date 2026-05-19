import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { classNames } from "@/lib/utils";

interface Master {
  id: number;
  fullName: string;
  hall: { id: number; name: string };
  experienceYears: number;
  averageRating: number;
  avatarUrl?: string | null;
}

export function ClientHome() {
  const [hallId, setHallId] = useState<number | null>(null);

  const { data: masters = [] } = useQuery({
    queryKey: ["masters", { hallId }],
    queryFn: async () => (await api.get<Master[]>("/masters", { params: { hall_id: hallId ?? undefined } })).data,
  });

  return (
    <div className="page-shell">
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="md:w-60 shrink-0">
          <div className="text-xs uppercase tracking-widest text-ink-300 mb-3">Зал</div>
          <div className="space-y-1">
            <FilterBtn active={hallId === null} onClick={() => setHallId(null)}>Все</FilterBtn>
            <FilterBtn active={hallId === 1} onClick={() => setHallId(1)}>Мужской</FilterBtn>
            <FilterBtn active={hallId === 2} onClick={() => setHallId(2)}>Женский</FilterBtn>
          </div>

          <div className="text-xs uppercase tracking-widest text-ink-300 mt-8 mb-3">Сортировка</div>
          <div className="space-y-1 text-sm text-ink-500">
            <div className="px-3 py-2 rounded-md bg-cream-50 border border-cream-200">По рейтингу</div>
          </div>
        </aside>

        <section className="flex-1">
          <h1 className="font-display text-4xl text-ink-700 mb-6">Наши мастера</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {masters.map((m) => (
              <Link
                key={m.id}
                to={`/client/masters/${m.id}`}
                className="group rounded-2xl bg-white border border-cream-200 overflow-hidden flex flex-col hover:shadow-card transition"
              >
                <div className="aspect-[4/5] bg-cream-200 relative overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-full h-full grid place-items-center font-display text-5xl text-ink-300">
                      {m.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <span className="absolute top-3 left-3 pill-soft">
                    {m.hall.name === "male" ? "Мужской зал" : "Женский зал"}
                  </span>
                  <span className="absolute top-3 right-3 pill bg-white/90 text-ink-500">★ {m.averageRating.toFixed(1)}</span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="font-display text-xl text-ink-700">{m.fullName}</div>
                  <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">
                    {m.experienceYears} лет опыта
                  </div>
                  <div className="mt-auto pt-5">
                    <span className="btn-secondary w-full justify-center">Записаться</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
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
