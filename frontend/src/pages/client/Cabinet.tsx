import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/utils";
import { appointmentStatusLabel } from "@/lib/appointmentStatus";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { RescheduleModal } from "./RescheduleModal";
import { ReviewModal, ReviewSummary } from "./ReviewModal";

export function ClientCabinet() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);
  const { data: items = [] } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => (await api.get("/appointments/me")).data,
  });

  const cancel = useMutation({
    mutationFn: async (id: number) => (await api.patch(`/appointments/${id}`, { status: "cancelled" })).data,
    onSuccess: () => {
      toast("Запись отменена", "Push-напоминания отменены", "info");
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
  });

  const upcoming = items.filter((a: any) => ["planned", "confirmed"].includes(a.status));
  const past = items.filter((a: any) => ["completed", "service_refused"].includes(a.status));

  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div>
          <h1 className="font-display text-4xl text-ink-700">Мой кабинет</h1>
          <p className="text-ink-400 mt-2 text-sm">Здравствуйте, {user?.fullName.split(" ")[0]}!</p>

          <h2 className="font-display text-2xl text-ink-700 mt-10 mb-4">Предстоящие записи</h2>
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <div className="bg-white border border-dashed border-cream-300 rounded-xl p-8 text-center text-ink-400">
                Записей пока нет. <Link to="/client" className="text-ink-700 underline-offset-2 hover:underline">Выбрать мастера</Link>
              </div>
            )}
            {upcoming.map((a: any) => (
              <div key={a.id} className="bg-white border border-cream-200 rounded-2xl p-5 flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-cream-200 grid place-items-center font-display text-lg text-ink-300">
                  {a.master?.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg text-ink-700">{a.service?.name}</div>
                  <div className="text-sm text-ink-500">{a.master?.fullName} · {formatDate(a.startsAt)}</div>
                </div>
                <div className="text-right">
                  <div className="text-ink-700 font-medium">{formatPrice(Number(a.priceAtBooking) - Number(a.discountApplied || 0))}</div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <Button variant="ghost" className="text-xs text-ink-600" onClick={() => setRescheduleTarget(a)}>
                      Перенести
                    </Button>
                    <Button variant="ghost" className="text-red-600 text-xs" onClick={() => cancel.mutate(a.id)}>
                      Отменить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-display text-2xl text-ink-700 mt-10 mb-4">История посещений</h2>
          <div className="space-y-3">
            {past.length === 0 && (
              <div className="bg-white border border-dashed border-cream-300 rounded-xl p-8 text-center text-ink-400">
                Здесь будут ваши прошлые визиты с советами по уходу.
              </div>
            )}
            {past.slice(0, 3).map((a: any) => (
              <HistoryCard key={a.id} item={a} compact onReview={() => qc.invalidateQueries({ queryKey: ["my-appointments"] })} />
            ))}
            {past.length > 3 && (
              <Link to="/client/history" className="text-sm text-ink-400 hover:text-ink-700 underline-offset-2 hover:underline">
                Показать всю историю →
              </Link>
            )}
          </div>
        </div>

        <aside className="bg-ink-700 text-cream-100 rounded-3xl p-7 self-start">
          <div className="text-xs uppercase tracking-widest text-cream-100/60">Бонусная программа</div>
          <div className="font-display text-3xl text-cream-50 mt-2">
            {user?.category === "regular" ? "Постоянный клиент" : "Новый клиент"}
          </div>
          <div className="text-cream-100/70 text-sm mt-2">
            Скидка <strong className="text-white">{user?.discountPercent ?? 0}%</strong> применяется автоматически.
          </div>
          <div className="h-px bg-cream-100/15 my-5" />
          <div className="text-xs uppercase tracking-widest text-cream-100/60">Push-уведомления</div>
          <p className="text-sm text-cream-100/80 mt-1">
            За 24 часа и за 3 часа до визита, плюс напоминание о повторной записи.
          </p>
          <Link to="/client/notifications" className="mt-4 inline-flex items-center gap-2 text-cream-50 hover:text-white">
            Настроить →
          </Link>
        </aside>
      </div>

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ["my-appointments"] })}
        />
      )}
    </div>
  );
}

export function HistoryCard({
  item,
  compact = false,
  onReview,
}: {
  item: any;
  compact?: boolean;
  onReview?: () => void;
}) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const canReview = item.status === "completed";

  return (
    <div className="bg-white border border-cream-200 rounded-2xl p-5">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-cream-200 grid place-items-center font-display text-lg text-ink-300">
          {item.master?.fullName.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg text-ink-700">{item.service?.name}</div>
          <div className="text-sm text-ink-500">{item.master?.fullName} · {formatDate(item.startsAt)}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="pill-cream">{appointmentStatusLabel(item.status)}</span>
          {canReview && !item.review && (
            <Button variant="ghost" className="text-xs text-ink-600" onClick={() => setReviewOpen(true)}>
              Оставить отзыв
            </Button>
          )}
        </div>
      </div>
      {item.review && (
        <ReviewSummary
          review={item.review}
          compact={compact}
          onEdit={canReview ? () => setReviewOpen(true) : undefined}
        />
      )}
      {item.care && !compact && (
        <div className="mt-4 grid md:grid-cols-2 gap-3">
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-widest text-ink-300">Совет по уходу</div>
            <div className="text-sm text-ink-700 mt-1">{item.care.adviceText}</div>
          </div>
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 flex flex-col">
            <div className="text-[11px] uppercase tracking-widest text-ink-300">Повторная запись</div>
            <div className="text-sm text-ink-700 mt-1">через {item.care.repeatAfterDays} дней</div>
            <Link
              to={`/client/masters/${item.master.id}`}
              className="btn-secondary mt-auto self-start text-xs"
            >Записаться повторно</Link>
          </div>
        </div>
      )}
      {item.care && compact && (
        <div className="text-xs text-ink-400 mt-3 line-clamp-2">{item.care.adviceText}</div>
      )}

      {reviewOpen && (
        <ReviewModal
          appointment={item}
          onClose={() => setReviewOpen(false)}
          onSuccess={() => onReview?.()}
        />
      )}
    </div>
  );
}
