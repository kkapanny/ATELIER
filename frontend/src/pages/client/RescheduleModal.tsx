import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "@/lib/api";
import { classNames, formatDate, bookingErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

interface RescheduleModalProps {
  appointment: {
    id: number;
    startsAt: string;
    masterId: number;
    serviceId: number;
    master?: { fullName: string };
    service?: { name: string };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function RescheduleModal({ appointment, onClose, onSuccess }: RescheduleModalProps) {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateKey = format(day, "yyyy-MM-dd");
  const { data: availability, isLoading } = useQuery({
    queryKey: ["availability", appointment.masterId, appointment.serviceId, dateKey, appointment.id],
    queryFn: async () =>
      (await api.get(`/masters/${appointment.masterId}/availability`, {
        params: {
          service_id: appointment.serviceId,
          date: dateKey,
          exclude_appointment_id: appointment.id,
        },
      })).data,
  });

  const freeSlots = useMemo(
    () => (availability?.slots ?? []).filter((s: { available: boolean }) => s.available),
    [availability],
  );

  useEffect(() => {
    setSelected(null);
    setError(null);
  }, [day]);

  const reschedule = useMutation({
    mutationFn: async (startsAt: string) =>
      (await api.patch(`/appointments/${appointment.id}`, { startsAt })).data,
    onSuccess: () => {
      toast("Запись перенесена", "Push-напоминания обновлены");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setError(bookingErrorMessage(err.response?.data?.error));
    },
  });

  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));

  function handleSubmit() {
    if (!selected) {
      setError("Выберите новое время.");
      return;
    }
    if (selected === appointment.startsAt) {
      setError("Выберите время, отличное от текущего.");
      return;
    }
    setError(null);
    reschedule.mutate(selected);
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-700/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft w-full max-w-lg my-8">
        <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
          <div>
            <div className="font-display text-2xl text-ink-700">Перенести запись</div>
            <div className="text-sm text-ink-400 mt-1">
              {appointment.service?.name} · {appointment.master?.fullName}
            </div>
            <div className="text-xs text-ink-300 mt-0.5">
              Сейчас: {formatDate(appointment.startsAt)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="field-label">Новая дата</label>
            <select
              className="field-input bg-white"
              value={dateKey}
              onChange={(e) => setDay(startOfDay(new Date(e.target.value)))}
            >
              {days.map((d) => (
                <option key={format(d, "yyyy-MM-dd")} value={format(d, "yyyy-MM-dd")}>
                  {format(d, "d MMMM (EEEE)", { locale: ru })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Свободное время</label>
            {isLoading ? (
              <p className="text-sm text-ink-400 mt-1">Загрузка слотов…</p>
            ) : availability?.dayOff ? (
              <p className="text-sm text-ink-400 mt-1">У мастера выходной в этот день.</p>
            ) : freeSlots.length === 0 ? (
              <p className="text-sm text-ink-400 mt-1">Нет свободных слотов на эту дату.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {freeSlots.map((s: { startsAt: string; time?: string }) => {
                  const time = s.time ?? format(new Date(s.startsAt), "HH:mm");
                  const active = selected === s.startsAt;
                  const isCurrent = s.startsAt === appointment.startsAt;
                  return (
                    <button
                      key={s.startsAt}
                      type="button"
                      onClick={() => setSelected(s.startsAt)}
                      className={classNames(
                        "px-3 py-1.5 text-sm rounded-md border transition-colors",
                        active
                          ? "bg-ink-700 text-cream-50 border-ink-700"
                          : isCurrent
                            ? "bg-cream-100 text-ink-400 border-cream-200"
                            : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
                      )}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <p className="text-sm text-ink-500">
              Новое время:{" "}
              <strong className="text-ink-700">{format(new Date(selected), "d MMMM, HH:mm", { locale: ru })}</strong>
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!selected || reschedule.isPending}
              onClick={handleSubmit}
            >
              {reschedule.isPending ? "Сохранение…" : "Подтвердить перенос"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
