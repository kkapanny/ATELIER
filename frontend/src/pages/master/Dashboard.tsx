import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";

export function MasterDashboard() {
  const { user } = useAuthStore();
  const { data: items = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });

  const upcoming = items.filter((a: any) => ["confirmed", "planned"].includes(a.status));
  const completed = items.filter((a: any) => a.status === "completed");
  const earnings = completed.reduce((acc: number, a: any) => acc + (Number(a.priceAtBooking) - Number(a.discountApplied || 0)), 0);

  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <Stat label="Записей на неделе" value={String(upcoming.length)} />
        <Stat label="Заработок (всего)" value={formatPrice(earnings)} />
        <Stat label="Здравствуйте" value={user?.fullName || ""} />
      </div>

      <h1 className="font-display text-3xl text-ink-700 mb-6">Расписание</h1>
      <div className="space-y-3">
        {upcoming.length === 0 && (
          <div className="bg-white border border-dashed border-cream-300 rounded-xl p-12 text-center text-ink-400">
            Нет ближайших записей
          </div>
        )}
        {upcoming.map((a: any) => (
          <Link
            key={a.id}
            to={`/master/appointments/${a.id}`}
            className="bg-white border border-cream-200 rounded-2xl p-5 flex items-center gap-5 hover:shadow-card transition"
          >
            <div className="w-14 h-14 rounded-full bg-cream-200 grid place-items-center font-display text-lg text-ink-300">
              {a.client?.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <div className="font-display text-lg text-ink-700">{a.service?.name}</div>
              <div className="text-sm text-ink-500">{a.client?.fullName} · {formatDate(a.startsAt)}</div>
            </div>
            <span className="pill-cream">{statusLabel(a.status)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-cream-200 rounded-2xl p-6">
      <div className="text-xs uppercase tracking-widest text-ink-300">{label}</div>
      <div className="font-display text-3xl text-ink-700 mt-2 truncate">{value}</div>
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
