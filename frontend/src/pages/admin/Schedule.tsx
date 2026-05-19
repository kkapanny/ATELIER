import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { formatDate } from "@/lib/utils";
import { classNames } from "@/lib/utils";

export function AdminSchedule() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { data: items = [] } = useQuery({
    queryKey: ["admin-schedule", date],
    queryFn: async () => (await api.get("/admin/schedule", { params: { date } })).data,
  });

  return (
    <div>
      <PageHeading
        title="Расписание"
        subtitle="Все записи салона на выбранный день"
        action={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded-md border border-cream-300 bg-white text-sm"
          />
        }
      />

      <div className="grid grid-cols-5 gap-3 text-xs text-ink-400 mb-3 max-w-md">
        <Legend cls="bg-blue-100 text-blue-700">Запланировано</Legend>
        <Legend cls="bg-emerald-100 text-emerald-700">Подтверждено</Legend>
        <Legend cls="bg-cream-200 text-ink-500">Завершено</Legend>
        <Legend cls="bg-red-100 text-red-700">Отменено</Legend>
        <Legend cls="bg-amber-100 text-amber-700">Не пришёл</Legend>
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <Th>Время</Th><Th>Мастер</Th><Th>Клиент</Th><Th>Услуга</Th><Th>Статус</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-ink-400">Записей на этот день нет</td></tr>
            )}
            {items.map((a: any) => (
              <tr key={a.id} className="border-t border-cream-200 hover:bg-cream-50">
                <Td className="font-mono">{format(new Date(a.startsAt), "HH:mm", { locale: ru })}</Td>
                <Td className="text-ink-700">{a.master?.fullName}</Td>
                <Td>{a.client?.fullName}</Td>
                <Td>{a.service?.name}</Td>
                <Td><StatusPill status={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    planned: "bg-blue-100 text-blue-700",
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-cream-200 text-ink-500",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-amber-100 text-amber-700",
  };
  const labels: Record<string, string> = {
    planned: "Запланировано",
    confirmed: "Подтверждено",
    completed: "Завершено",
    cancelled: "Отменено",
    no_show: "Не пришёл",
  };
  return <span className={classNames("pill", map[status])}>{labels[status]}</span>;
}

function Legend({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={classNames("pill", cls)}>{children}</span>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 " + className}>{children}</td>;
}
