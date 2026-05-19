import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { formatPrice } from "@/lib/utils";

/**
 * Все 6 отчётов руководителя из задания:
 *  1. Клиенты по мастерам на дату
 *  2. Заработок мастера на дату
 *  3. Самая распространённая услуга
 *  4. Соотношение мужчин и женщин
 *  5. Количество постоянных клиентов на дату
 *  6. Лучший мастер по числу клиентов
 */
export function AdminReports() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const daily = useQuery({ queryKey: ["rep-daily", date], queryFn: async () => (await api.get("/admin/reports/daily", { params: { date } })).data });
  const earnings = useQuery({ queryKey: ["rep-earnings", date], queryFn: async () => (await api.get("/admin/reports/earnings", { params: { date } })).data });
  const top = useQuery({ queryKey: ["rep-top"], queryFn: async () => (await api.get("/admin/reports/top-service")).data });
  const gender = useQuery({ queryKey: ["rep-gender"], queryFn: async () => (await api.get("/admin/reports/gender-ratio")).data });
  const regs = useQuery({ queryKey: ["rep-regs"], queryFn: async () => (await api.get("/admin/reports/regulars-count")).data });
  const topMaster = useQuery({ queryKey: ["rep-top-master"], queryFn: async () => (await api.get("/admin/reports/top-master")).data });

  return (
    <div>
      <PageHeading
        title="Отчёты руководителя"
        subtitle="Аналитика по работе салона"
        action={
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded-md border border-cream-300 bg-white text-sm"
          />
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ReportCard title="Клиенты по мастерам" subtitle={`На ${date}`}>
          <ul className="space-y-2 text-sm">
            {(daily.data ?? []).map((d: any) => (
              <li key={d.masterId} className="flex justify-between border-b border-cream-200 pb-1.5">
                <span className="text-ink-700">{d.masterName}</span>
                <strong className="font-display text-lg text-ink-700">{d.clients}</strong>
              </li>
            ))}
            {(daily.data ?? []).length === 0 && <li className="text-ink-400">Нет данных</li>}
          </ul>
        </ReportCard>

        <ReportCard title="Заработок (общий по салону)" subtitle={`На ${date}`}>
          <div className="font-display text-4xl text-ink-700">{formatPrice(earnings.data?.net || 0)}</div>
          <div className="text-xs uppercase tracking-widest text-ink-300 mt-2">за смену</div>
          <div className="text-xs text-ink-400 mt-3">
            Brutto: {formatPrice(earnings.data?.gross || 0)} · скидки: {formatPrice(earnings.data?.discount || 0)}
          </div>
        </ReportCard>

        <ReportCard title="Самая распространённая услуга" subtitle="Все периоды">
          <ul className="space-y-2 text-sm">
            {(top.data ?? []).slice(0, 5).map((s: any) => (
              <li key={s.serviceId} className="flex justify-between border-b border-cream-200 pb-1.5">
                <span className="text-ink-700">{s.name}</span>
                <strong className="font-display text-lg text-ink-700">{s.count}</strong>
              </li>
            ))}
            {(top.data ?? []).length === 0 && <li className="text-ink-400">Нет данных</li>}
          </ul>
        </ReportCard>

        <ReportCard title="Соотношение мужчин и женщин" subtitle="База клиентов">
          <Bar male={gender.data?.male || 0} female={gender.data?.female || 0} />
          <div className="flex justify-between text-xs text-ink-400 mt-3">
            <span>Мужчины: {gender.data?.male || 0}</span>
            <span>Женщины: {gender.data?.female || 0}</span>
          </div>
        </ReportCard>

        <ReportCard title="Постоянных клиентов" subtitle="На текущий момент">
          <div className="font-display text-4xl text-ink-700">{regs.data?.regular || 0}</div>
          <div className="text-xs uppercase tracking-widest text-ink-300 mt-2">из {regs.data?.total || 0}</div>
        </ReportCard>

        <ReportCard title="Лучший мастер по числу клиентов" subtitle="Все периоды">
          <ul className="space-y-2 text-sm">
            {(topMaster.data ?? []).slice(0, 5).map((m: any) => (
              <li key={m.masterId} className="flex justify-between border-b border-cream-200 pb-1.5">
                <span className="text-ink-700">{m.name}</span>
                <strong className="font-display text-lg text-ink-700">{m.count}</strong>
              </li>
            ))}
            {(topMaster.data ?? []).length === 0 && <li className="text-ink-400">Нет данных</li>}
          </ul>
        </ReportCard>
      </div>
    </div>
  );
}

function ReportCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-cream-200 rounded-2xl p-6">
      <div className="text-xs uppercase tracking-widest text-ink-300">{subtitle}</div>
      <div className="font-display text-xl text-ink-700 mt-1">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Bar({ male, female }: { male: number; female: number }) {
  const total = Math.max(male + female, 1);
  return (
    <div className="h-3 rounded-full overflow-hidden bg-cream-200 flex">
      <div className="h-full bg-ink-700" style={{ width: `${(male / total) * 100}%` }} />
      <div className="h-full bg-accent-rose" style={{ width: `${(female / total) * 100}%` }} />
    </div>
  );
}
