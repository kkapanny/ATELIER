import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatPrice, classNames } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import {
  appointmentStatusLabel,
  MASTER_VISIT_OUTCOMES,
  type MasterVisitOutcome,
} from "@/lib/appointmentStatus";

export function MasterAppointment() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState<MasterVisitOutcome | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });
  const a = items.find((x: any) => String(x.id) === id);

  const review = useMutation({
    mutationFn: async (status: "confirmed" | "cancelled") =>
      (await api.patch(`/appointments/${id}`, { status })).data,
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["master-appointments"] });
      if (status === "confirmed") {
        toast("Запись подтверждена", "Клиент получит напоминания о визите");
      } else {
        toast("Запись отклонена", "Слот снова доступен для записи", "info");
        navigate("/master");
      }
    },
    onError: () => {
      toast("Не удалось обновить запись", "Попробуйте ещё раз", "error");
    },
  });

  const finalize = useMutation({
    mutationFn: async (status: MasterVisitOutcome) =>
      (await api.patch(`/appointments/${id}`, { status })).data,
    onSuccess: (_data, status) => {
      qc.invalidateQueries({ queryKey: ["master-appointments"] });
      if (status === "completed") {
        toast("Услуга оказана", "Добавьте совет по уходу");
        navigate(`/master/appointments/${id}/care`);
      } else if (status === "service_refused") {
        toast("Итог визита сохранён", "При желании оставьте совет по уходу");
        navigate(`/master/appointments/${id}/care?optional=1`);
      } else {
        toast("Итог визита сохранён", appointmentStatusLabel(status));
        navigate("/master");
      }
    },
    onError: (err: any) => {
      const code = err.response?.data?.error;
      if (code === "visit_not_started") toast("Рано фиксировать итог", "Итог можно указать после начала записи", "error");
      else if (code === "visit_not_confirmed") toast("Сначала подтвердите запись", "", "error");
      else if (code === "visit_already_finalized") toast("Итог уже указан", "", "error");
      else toast("Не удалось сохранить", "Попробуйте ещё раз", "error");
    },
  });

  if (!a) return <div className="page-shell">Загрузка…</div>;

  const isPlanned = a.status === "planned";
  const isConfirmed = a.status === "confirmed";
  const visitStarted = new Date() >= new Date(a.startsAt);

  function handleFinalize() {
    if (!outcome) return;
    finalize.mutate(outcome);
  }

  return (
    <div className="page-shell max-w-3xl">
      <Link to="/master" className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">← К расписанию</Link>
      <h1 className="font-display text-3xl text-ink-700 mt-3">{a.service.name}</h1>
      <p className="text-ink-400 text-sm mt-1">{formatDate(a.startsAt)}</p>

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        <div className="bg-white border border-cream-200 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-ink-300">Клиент</div>
          <div className="font-display text-xl text-ink-700 mt-1">{a.client.fullName}</div>
          <div className="text-sm text-ink-500 mt-1">
            {a.client.phone} · {a.client.category === "regular" ? "Постоянный" : "Случайный"}
          </div>
        </div>
        <div className="bg-white border border-cream-200 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-ink-300">Услуга</div>
          <div className="font-display text-xl text-ink-700 mt-1">{a.service.name}</div>
          <div className="text-sm text-ink-500 mt-1">
            {formatPrice(Number(a.priceAtBooking) - Number(a.discountApplied || 0))} · {a.service.durationMin} мин
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white border border-cream-200 rounded-2xl p-6">
        {isPlanned && (
          <>
            <div className="text-xs uppercase tracking-widest text-ink-300">Подтверждение записи</div>
            <p className="text-sm text-ink-500 mt-3">
              Запись ожидает вашего решения — подтвердите или отклоните.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button
                disabled={review.isPending}
                onClick={() => review.mutate("confirmed")}
              >
                {review.isPending ? "Сохранение…" : "Подтвердить"}
              </Button>
              <Button
                variant="secondary"
                disabled={review.isPending}
                onClick={() => review.mutate("cancelled")}
              >
                Отклонить
              </Button>
            </div>
          </>
        )}

        {isConfirmed && (
          <>
        <div className="text-xs uppercase tracking-widest text-ink-300">Итог визита</div>

        {!visitStarted && (
          <p className="text-sm text-ink-400 mt-3">
            Итог можно указать после начала записи — {formatDate(a.startsAt)}.
          </p>
        )}

        {visitStarted && (
          <>
            <p className="text-sm text-ink-500 mt-3">
              После завершения визита выберите итог и подтвердите.
            </p>
            <div className="mt-4 space-y-2">
              {MASTER_VISIT_OUTCOMES.map((option) => {
                const active = outcome === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOutcome(option.value)}
                    className={classNames(
                      "w-full text-left p-4 rounded-xl border transition",
                      active
                        ? "border-ink-700 bg-cream-50 ring-1 ring-ink-700"
                        : "border-cream-200 hover:border-ink-300",
                    )}
                  >
                    <div className="font-display text-lg text-ink-700">{option.label}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{option.hint}</div>
                  </button>
                );
              })}
            </div>
            <Button
              className="mt-5"
              disabled={!outcome || finalize.isPending}
              onClick={handleFinalize}
            >
              {finalize.isPending ? "Сохранение…" : "Подтвердить итог"}
            </Button>
          </>
        )}
          </>
        )}

        {!isPlanned && !isConfirmed && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="pill-cream">{appointmentStatusLabel(a.status)}</span>
            {a.status === "service_refused" && !a.care && (
              <Link to={`/master/appointments/${id}/care?optional=1`} className="btn-secondary text-xs">
                Добавить совет по уходу
              </Link>
            )}
          </div>
        )}
      </div>

      {a.care && (
        <div className="mt-6 bg-cream-50 border border-cream-200 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-ink-300">Совет по уходу</div>
          <p className="text-sm text-ink-700 mt-2">{a.care.adviceText}</p>
          <p className="text-xs text-ink-400 mt-2">Повтор через {a.care.repeatAfterDays} дней</p>
        </div>
      )}
    </div>
  );
}
