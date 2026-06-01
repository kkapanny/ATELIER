import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { MasterWeekCalendar } from "@/components/master/MasterWeekCalendar";
import { addCalendarDays, mondayOfWeek, salonDateKey, salonTodayKey } from "@/lib/salonTime";

export function MasterDashboard() {
  const { data: items = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });

  const weekMonday = mondayOfWeek(salonTodayKey());
  const weekEnd = addCalendarDays(weekMonday, 6)!;

  const weekUpcoming = useMemo(
    () =>
      items.filter((a: any) => {
        if (!["confirmed", "planned"].includes(a.status)) return false;
        const key = salonDateKey(a.startsAt);
        return key >= weekMonday && key <= weekEnd;
      }),
    [items, weekMonday, weekEnd],
  );

  const todayKey = salonTodayKey();
  const todayEarnings = useMemo(
    () =>
      items
        .filter((a: any) => a.status === "completed" && salonDateKey(a.startsAt) === todayKey)
        .reduce(
          (acc: number, a: any) => acc + (Number(a.priceAtBooking) - Number(a.discountApplied || 0)),
          0,
        ),
    [items, todayKey],
  );

  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <Stat label="Записей на неделе" value={String(weekUpcoming.length)} />
        <Stat label="Заработок за сегодня" value={formatPrice(todayEarnings)} />
      </div>

      <h1 className="font-display text-3xl text-ink-700 mb-4">Расписание</h1>
      <MasterWeekCalendar appointments={items} />
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
