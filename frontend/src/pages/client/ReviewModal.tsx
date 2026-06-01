import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { classNames, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

interface ReviewModalProps {
  appointment: {
    id: number;
    startsAt: string;
    master?: { fullName: string };
    service?: { name: string };
    review?: { rating: number; text?: string | null };
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ appointment, onClose, onSuccess }: ReviewModalProps) {
  const [rating, setRating] = useState(appointment.review?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async (body: { appointmentId: number; rating: number; text?: string }) =>
      (await api.post("/reviews", body)).data,
    onSuccess: () => {
      toast("Спасибо!", "Ваш отзыв опубликован");
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const code = err.response?.data?.error;
      if (code === "review_not_allowed") setError("Отзыв можно оставить только после завершённого визита.");
      else setError("Не удалось отправить отзыв. Попробуйте ещё раз.");
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rating < 1) {
      setError("Выберите оценку от 1 до 5.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setError(null);
    submit.mutate({
      appointmentId: appointment.id,
      rating,
      text: String(fd.get("text") || "").trim() || undefined,
    });
  }

  const display = hover || rating;

  return (
    <div className="fixed inset-0 z-50 bg-ink-700/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft w-full max-w-lg my-8">
        <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
          <div>
            <div className="font-display text-2xl text-ink-700">Оставить отзыв</div>
            <div className="text-sm text-ink-400 mt-1">
              {appointment.service?.name} · {appointment.master?.fullName}
            </div>
            <div className="text-xs text-ink-300 mt-0.5">{formatDate(appointment.startsAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <form className="p-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="field-label">Оценка</label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(star)}
                  className="text-3xl leading-none p-1 transition-transform hover:scale-110"
                  aria-label={`${star} звёзд`}
                >
                  <span className={star <= display ? "text-accent-gold" : "text-cream-300"}>★</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Комментарий (необязательно)</label>
            <textarea
              name="text"
              rows={4}
              defaultValue={appointment.review?.text ?? ""}
              className="field-input min-h-[100px] resize-y mt-1"
              placeholder="Расскажите о впечатлениях от визита…"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={submit.isPending}>
              {submit.isPending ? "Отправка…" : appointment.review ? "Сохранить" : "Отправить отзыв"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReviewSummaryProps {
  review: { rating: number; text?: string | null };
  compact?: boolean;
  onEdit?: () => void;
}

export function ReviewSummary({ review, compact, onEdit }: ReviewSummaryProps) {
  return (
    <div className={classNames("bg-cream-50 border border-cream-200 rounded-xl p-4", compact ? "mt-3" : "")}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest text-ink-300">Ваш отзыв</div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs text-ink-500 hover:text-ink-700">
            Изменить
          </button>
        )}
      </div>
      <div className="text-accent-gold mt-1">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div>
      {review.text && !compact && <p className="text-sm text-ink-700 mt-2">{review.text}</p>}
      {review.text && compact && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{review.text}</p>}
    </div>
  );
}
