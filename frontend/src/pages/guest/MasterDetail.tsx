import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Tabs } from "@/components/ui/Tabs";
import { MasterAvatar } from "@/components/MasterAvatar";

export function GuestMasterDetail() {
  const { id } = useParams();
  const { data: master } = useQuery({
    queryKey: ["master", id],
    queryFn: async () => (await api.get(`/masters/${id}`)).data,
  });

  if (!master) return <div className="page-shell">Загрузка…</div>;

  return (
    <div className="page-shell">
      <Link to="/" className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">← К каталогу мастеров</Link>

      <div className="mt-6 grid md:grid-cols-[360px_1fr_280px] gap-8">
        <aside className="bg-white rounded-2xl border border-cream-200 p-6 text-center">
          <div className="aspect-square rounded-2xl overflow-hidden bg-cream-200 mb-5">
            <MasterAvatar
              fullName={master.fullName}
              avatarUrl={master.avatarUrl}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <h2 className="font-display text-2xl text-ink-700">{master.fullName}</h2>
          <div className="text-xs uppercase tracking-widest text-ink-300 mt-2">
            {master.hall?.name === "male" ? "Мужской зал" : "Женский зал"} · {master.experienceYears} лет
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <Stat label={`★ ${master.averageRating.toFixed(1)}`} desc="оценка" />
            <Stat label={`${master.experienceYears}`} desc="лет опыта" />
            <Stat label={`${master.rank}`} desc="разряд" />
          </div>
        </aside>

        <section className="bg-white rounded-2xl border border-cream-200 p-6">
          <Tabs
            items={[
              {
                id: "services",
                label: "Услуги и цены",
                content: (
                  <ul className="space-y-3">
                    {master.services.map((s: any) => (
                      <li key={s.id} className="flex items-center justify-between border-b border-dashed border-cream-300 pb-3">
                        <div>
                          <div className="font-display text-lg text-ink-700">{s.name}</div>
                          <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">{s.durationMin} мин</div>
                        </div>
                        <div className="text-ink-700 font-medium">{formatPrice(s.price)}</div>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: "about",
                label: "Описание",
                content: (
                  <div className="space-y-4 text-sm text-ink-500 leading-relaxed">
                    <p>{master.bio || "Описание скоро появится."}</p>
                  </div>
                ),
              },
              {
                id: "reviews",
                label: `Отзывы (${master.reviews?.length ?? 0})`,
                content: (
                  <div className="space-y-3">
                    {(master.reviews ?? []).map((r: any) => (
                      <div key={r.id} className="border-b border-cream-200 pb-3">
                        <div className="flex items-center justify-between">
                          <strong className="text-ink-700">{r.clientName ?? "Клиент"}</strong>
                          <span className="text-accent-gold">{"★".repeat(r.rating)}</span>
                        </div>
                        <p className="text-sm text-ink-500 mt-1">{r.text}</p>
                      </div>
                    ))}
                    {!master.reviews?.length && <div className="text-sm text-ink-400">Отзывов пока нет.</div>}
                  </div>
                ),
              },
            ]}
          />
        </section>

        <aside className="bg-white rounded-2xl border border-cream-200 p-6 self-start">
          <div className="text-xs uppercase tracking-widest text-ink-300">от</div>
          <div className="font-display text-3xl text-ink-700 mt-1">
            {master.services[0] ? formatPrice(master.services[0].price) : "—"}
          </div>
          <div className="text-xs text-ink-300 mt-1">обычная цена без скидки</div>

          <Link to="/login" className="btn-pill w-full justify-center mt-5">🔒 Войти, чтобы записаться</Link>
          <div className="text-xs text-ink-300 text-center mt-2">Запись доступна авторизованным клиентам</div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="border border-cream-200 rounded-lg py-3">
      <div className="font-display text-lg text-ink-700">{label}</div>
      <div className="text-[10px] uppercase tracking-widest text-ink-300 mt-1">{desc}</div>
    </div>
  );
}
