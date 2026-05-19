import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Tabs } from "@/components/ui/Tabs";
import { formatDate, formatPrice } from "@/lib/utils";

export function MasterProfile() {
  const { user } = useAuthStore();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/users/me")).data,
  });
  const { data: appts = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });

  const { data: master } = useQuery({
    queryKey: ["master-self", me?.master?.id],
    enabled: !!me?.master?.id,
    queryFn: async () => (await api.get(`/masters/${me.master.id}`)).data,
  });

  const completed = appts.filter((a: any) => a.status === "completed");
  const earnings = completed.reduce((acc: number, a: any) => acc + (Number(a.priceAtBooking) - Number(a.discountApplied || 0)), 0);

  if (!me?.master) return <div className="page-shell">Профиль мастера не найден</div>;

  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <aside className="bg-white rounded-2xl border border-cream-200 p-6 text-center self-start">
          <div className="aspect-square rounded-2xl overflow-hidden bg-cream-200 mb-5">
            {master?.avatarUrl ? (
              <img src={master.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center font-display text-6xl text-ink-300">
                {user?.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </div>
            )}
          </div>
          <h2 className="font-display text-2xl text-ink-700">{user?.fullName}</h2>
          <div className="text-xs uppercase tracking-widest text-ink-300 mt-2">
            {me.master.hall?.name === "male" ? "Мужской зал" : "Женский зал"} · {me.master.experienceYears} лет
          </div>
          <div className="grid grid-cols-3 gap-2 mt-6">
            <Stat label={`★ ${master?.averageRating.toFixed(1) ?? "0.0"}`} desc="оценка" />
            <Stat label={String(completed.length)} desc="клиентов" />
            <Stat label={String(me.master.rank)} desc="разряд" />
          </div>
        </aside>

        <section className="bg-white rounded-2xl border border-cream-200 p-6">
          <Tabs
            items={[
              {
                id: "schedule",
                label: "Расписание",
                content: (
                  <div className="space-y-2">
                    {appts.length === 0 && <div className="text-ink-400">Записей нет</div>}
                    {appts.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-3 border-b border-cream-200 pb-2 last:border-b-0">
                        <span className="text-sm text-ink-700 w-44">{formatDate(a.startsAt, "d MMM, HH:mm")}</span>
                        <span className="text-sm text-ink-500 flex-1">{a.client.fullName} · {a.service.name}</span>
                        <span className="pill-cream">{statusLabel(a.status)}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                id: "services",
                label: "Услуги",
                content: (
                  <ul className="space-y-3">
                    {(master?.services ?? []).map((s: any) => (
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
                id: "reviews",
                label: `Отзывы (${master?.reviews?.length ?? 0})`,
                content: (
                  <div className="space-y-3">
                    {(master?.reviews ?? []).map((r: any) => (
                      <div key={r.id} className="border-b border-cream-200 pb-3">
                        <div className="flex items-center justify-between">
                          <strong className="text-ink-700">{r.clientName ?? "Клиент"}</strong>
                          <span className="text-accent-gold">{"★".repeat(r.rating)}</span>
                        </div>
                        <p className="text-sm text-ink-500 mt-1">{r.text}</p>
                      </div>
                    ))}
                    {!master?.reviews?.length && <div className="text-sm text-ink-400">Отзывов пока нет.</div>}
                  </div>
                ),
              },
              {
                id: "stats",
                label: "Статистика",
                content: (
                  <div className="grid grid-cols-3 gap-3">
                    <BigStat label="Завершено визитов" value={String(completed.length)} />
                    <BigStat label="Заработок (всего)" value={formatPrice(earnings)} />
                    <BigStat label="Средний чек" value={formatPrice(completed.length ? Math.round(earnings / completed.length) : 0)} />
                  </div>
                ),
              },
            ]}
          />
        </section>
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

function BigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl p-5">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className="font-display text-2xl text-ink-700 mt-2">{value}</div>
    </div>
  );
}

function statusLabel(s: string) {
  return ({
    planned: "Запланировано",
    confirmed: "Подтверждено",
    completed: "Завершено",
    cancelled: "Отменено",
    no_show: "Не пришёл",
  } as Record<string, string>)[s] ?? s;
}
