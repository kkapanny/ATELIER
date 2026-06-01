import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { classNames, bookingErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function ClientCalendar() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = Number(params.get("service_id"));
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["availability", id, serviceId, format(day, "yyyy-MM-dd")],
    queryFn: async () =>
      (await api.get(`/masters/${id}/availability`, {
        params: { service_id: serviceId, date: format(day, "yyyy-MM-dd") },
      })).data,
    enabled: !!id && !!serviceId,
  });

  const createMutation = useMutation({
    mutationFn: async (startsAt: string) =>
      (await api.post("/appointments", { masterId: Number(id), serviceId, startsAt })).data,
    onSuccess: () => {
      toast("Запись создана", "Push-напоминания за 24 ч и 3 ч поставлены в очередь");
      navigate("/client/cabinet");
    },
    onError: (err: any) => {
      toast("Не удалось записаться", bookingErrorMessage(err.response?.data?.error), "error");
    },
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(day, i));

  return (
    <div className="page-shell">
      <Link to={`/client/masters/${id}`} className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">← К мастеру</Link>
      <h1 className="font-display text-4xl text-ink-700 mt-3">Выбор времени</h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((d) => {
          const dayKey = format(d, "yyyy-MM-dd");
          return (
            <div key={dayKey} className="bg-white rounded-xl border border-cream-200 p-3">
              <div className="text-center mb-2">
                <div className="font-display text-lg text-ink-700">{format(d, "d MMM", { locale: ru })}</div>
                <div className="text-[10px] uppercase tracking-widest text-ink-300">{format(d, "EEEE", { locale: ru })}</div>
              </div>
              <DaySlots
                day={d}
                masterId={Number(id)}
                serviceId={serviceId}
                selected={selected}
                onSelect={(iso) => setSelected(iso)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-ink-400">
          {selected ? <>Выбрано: <strong className="text-ink-700">{format(new Date(selected), "d MMMM, HH:mm", { locale: ru })}</strong></> : "Выберите время"}
        </div>
        <div className="flex gap-2">
          <Link to={`/client/masters/${id}`} className="btn-secondary">Отмена</Link>
          <Button disabled={!selected || createMutation.isPending} onClick={() => selected && createMutation.mutate(selected)}>
            {createMutation.isPending ? "Подтверждение…" : "Подтвердить запись"}
          </Button>
        </div>
      </div>

      {isLoading && <div className="mt-6 text-ink-400">Загрузка слотов…</div>}
    </div>
  );
}

function DaySlots({
  day, masterId, serviceId, selected, onSelect,
}: { day: Date; masterId: number; serviceId: number; selected: string | null; onSelect: (iso: string) => void }) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { data } = useQuery({
    queryKey: ["availability", masterId, serviceId, dateKey],
    queryFn: async () =>
      (await api.get(`/masters/${masterId}/availability`, {
        params: { service_id: serviceId, date: dateKey },
      })).data,
    enabled: !!serviceId,
  });

  const slots = data?.slots ?? [];
  return (
    <div className="space-y-1.5">
      {data?.dayOff && <div className="text-xs text-ink-300 text-center py-4">выходной</div>}
      {!data?.dayOff && slots.length === 0 && <div className="text-xs text-ink-300 text-center py-4">—</div>}
      {slots.map((s: any) => {
        const time = s.time ?? format(new Date(s.startsAt), "HH:mm");
        const active = selected === s.startsAt;
        const isOccupied = s.occupied ?? !s.available;
        return (
          <button
            key={s.startsAt}
            disabled={!s.available}
            onClick={() => onSelect(s.startsAt)}
            className={classNames(
              "w-full text-center py-1.5 text-sm rounded-md",
              isOccupied && "bg-cream-100 text-ink-300 line-through cursor-not-allowed",
              s.available && !active && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              active && "bg-ink-700 text-cream-50",
            )}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}
