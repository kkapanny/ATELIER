import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { formatDate } from "@/lib/utils";
import { classNames } from "@/lib/utils";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointmentStatus";

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
        action={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded-md border border-cream-300 bg-white text-sm"
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {LEGEND_STATUSES.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <Th>Время</Th><Th>Мастер</Th><Th>Клиент</Th><Th>Услуга</Th><Th className="w-0 whitespace-nowrap">Статус</Th>
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
                <Td className="w-0 whitespace-nowrap"><StatusPill status={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const LEGEND_STATUSES = ["planned", "confirmed", "completed", "cancelled", "no_show", "service_refused"] as const;

const STATUS_STYLES: Record<string, string> = {
  planned: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-cream-200 text-ink-500",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
  service_refused: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = APPOINTMENT_STATUS_LABELS;

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center justify-center shrink-0 w-max max-w-max",
        "px-3 py-1 rounded-full text-xs tracking-wide whitespace-nowrap",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={classNames("text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium", className)}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 " + className}>{children}</td>;
}
