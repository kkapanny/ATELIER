import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { classNames, formatPrice, bookingErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { MasterAvatar } from "@/components/MasterAvatar";

interface SlotMaster {
  id: number;
  fullName: string;
  avatarUrl?: string | null;
  averageRating: number;
  price: number;
}

interface AggregatedSlot {
  startsAt: string;
  time: string;
  masters: SlotMaster[];
}

export function ClientServiceCalendar() {
  const { serviceId: serviceIdParam } = useParams();
  const serviceId = Number(serviceIdParam);
  const navigate = useNavigate();
  const [day] = useState(() => startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<SlotMaster | null>(null);
  const [mastersAtSlot, setMastersAtSlot] = useState<SlotMaster[]>([]);

  const { data: service } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const services = (await api.get("/services")).data as { id: number; name: string; durationMin: number }[];
      return services.find((s) => s.id === serviceId) ?? null;
    },
    enabled: !!serviceId,
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(day, i));

  const createMutation = useMutation({
    mutationFn: async ({ masterId, startsAt }: { masterId: number; startsAt: string }) =>
      (await api.post("/appointments", { masterId, serviceId, startsAt })).data,
    onSuccess: () => {
      toast("Запись создана", "Push-напоминания за 24 ч и 3 ч поставлены в очередь");
      navigate("/client/cabinet");
    },
    onError: (err: any) => {
      toast("Не удалось записаться", bookingErrorMessage(err.response?.data?.error), "error");
    },
  });

  function handleSelectTime(iso: string, masters: SlotMaster[]) {
    setSelectedTime(iso);
    setMastersAtSlot(masters);
    setSelectedMaster(masters.length === 1 ? masters[0] : null);
  }

  const canConfirm = selectedTime && selectedMaster;

  return (
    <div className="page-shell">
      <Link to="/client/services" className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">
        ← К услугам
      </Link>
      <h1 className="font-display text-4xl text-ink-700 mt-3">Выбор времени</h1>
      {service && (
        <p className="text-sm text-ink-400 mt-2">
          {service.name} · {service.durationMin} мин
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((d) => (
          <div key={format(d, "yyyy-MM-dd")} className="bg-white rounded-xl border border-cream-200 p-3">
            <div className="text-center mb-2">
              <div className="font-display text-lg text-ink-700">{format(d, "d MMM", { locale: ru })}</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-300">{format(d, "EEEE", { locale: ru })}</div>
            </div>
            <DaySlots
              day={d}
              serviceId={serviceId}
              selected={selectedTime}
              onSelect={handleSelectTime}
            />
          </div>
        ))}
      </div>

      {selectedTime && mastersAtSlot.length > 1 && (
        <MasterPicker
          masters={mastersAtSlot}
          selectedMaster={selectedMaster}
          onSelect={setSelectedMaster}
          selectedTime={selectedTime}
        />
      )}

      <div className="mt-8 flex items-center justify-between">
        <div className="text-sm text-ink-400">
          {selectedTime && selectedMaster ? (
            <>
              Выбрано:{" "}
              <strong className="text-ink-700">
                {format(new Date(selectedTime), "d MMMM, HH:mm", { locale: ru })}
              </strong>
              {" · "}
              <strong className="text-ink-700">{selectedMaster.fullName}</strong>
            </>
          ) : selectedTime ? (
            <>Выбрано время — выберите мастера</>
          ) : (
            "Выберите время"
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/client/services" className="btn-secondary">
            Отмена
          </Link>
          <Button
            disabled={!canConfirm || createMutation.isPending}
            onClick={() =>
              canConfirm &&
              createMutation.mutate({ masterId: selectedMaster!.id, startsAt: selectedTime! })
            }
          >
            {createMutation.isPending ? "Подтверждение…" : "Подтвердить запись"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DaySlots({
  day,
  serviceId,
  selected,
  onSelect,
}: {
  day: Date;
  serviceId: number;
  selected: string | null;
  onSelect: (iso: string, masters: SlotMaster[]) => void;
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const { data } = useQuery({
    queryKey: ["service-availability", serviceId, dateKey],
    queryFn: async () =>
      (await api.get(`/services/${serviceId}/availability`, { params: { date: dateKey } })).data as {
        slots: AggregatedSlot[];
        dayOff: boolean;
        noMasters?: boolean;
      },
    enabled: !!serviceId,
  });

  const slots = data?.slots ?? [];

  return (
    <div className="space-y-1.5">
      {data?.noMasters && <div className="text-xs text-ink-300 text-center py-4">нет мастеров</div>}
      {data?.dayOff && !data?.noMasters && <div className="text-xs text-ink-300 text-center py-4">выходной</div>}
      {!data?.dayOff && !data?.noMasters && slots.length === 0 && (
        <div className="text-xs text-ink-300 text-center py-4">—</div>
      )}
      {slots.map((s) => {
        const active = selected === s.startsAt;
        return (
          <button
            key={s.startsAt}
            onClick={() => onSelect(s.startsAt, s.masters)}
            className={classNames(
              "w-full text-center py-1.5 text-sm rounded-md",
              !active && "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              active && "bg-ink-700 text-cream-50",
            )}
          >
            {s.time ?? format(new Date(s.startsAt), "HH:mm")}
          </button>
        );
      })}
    </div>
  );
}

function MasterPicker({
  masters,
  selectedTime,
  selectedMaster,
  onSelect,
}: {
  masters: SlotMaster[];
  selectedTime: string;
  selectedMaster: SlotMaster | null;
  onSelect: (m: SlotMaster) => void;
}) {
  return (
    <div className="mt-8 bg-white rounded-2xl border border-cream-200 p-6">
      <h2 className="font-display text-2xl text-ink-700 mb-1">Выберите мастера</h2>
      <p className="text-sm text-ink-400 mb-5">
        На {format(new Date(selectedTime), "d MMMM в HH:mm", { locale: ru })} доступно несколько мастеров
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map((m) => {
          const active = selectedMaster?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={classNames(
                "flex items-center gap-4 p-4 rounded-xl border text-left transition",
                active ? "border-ink-700 bg-cream-50 ring-1 ring-ink-700" : "border-cream-200 hover:border-ink-300",
              )}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 bg-cream-200">
                <MasterAvatar fullName={m.fullName} avatarUrl={m.avatarUrl} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-lg text-ink-700 truncate">{m.fullName}</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  ★ {m.averageRating.toFixed(1)} · {formatPrice(m.price)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
