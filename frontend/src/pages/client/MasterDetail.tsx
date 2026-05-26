import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { MasterAvatar } from "@/components/MasterAvatar";
import { Tabs } from "@/components/ui/Tabs";

export function ClientMasterDetail() {
  const { id } = useParams();
  const { data: master } = useQuery({
    queryKey: ["master", id],
    queryFn: async () => (await api.get(`/masters/${id}`)).data,
  });

  if (!master) return <div className="page-shell">Загрузка…</div>;

  return (
    <div className="page-shell">
      <Link to="/client" className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">← К каталогу</Link>

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
                        <div className="flex items-center gap-3">
                          <span className="text-ink-700 font-medium">{formatPrice(s.price)}</span>
                          <Link
                            to={`/client/masters/${master.id}/calendar?service_id=${s.id}`}
                            className="btn-primary text-xs"
                          >
                            Записаться
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                id: "about",
                label: "Описание",
                content: <p className="text-sm text-ink-500 leading-relaxed">{master.bio || "Описание скоро появится."}</p>,
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
          <div className="text-xs text-ink-300 mt-1">базовая цена · скидка постоянного клиента применится автоматически</div>

          <Link
            to={master.services[0] ? `/client/masters/${master.id}/calendar?service_id=${master.services[0].id}` : "#"}
            className="btn-pill w-full justify-center mt-5"
          >
            Записаться
          </Link>
        </aside>
      </div>
    </div>
  );
}
