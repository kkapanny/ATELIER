import { FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function MasterCare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const optional = params.get("optional") === "1";

  const { data: items = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });
  const appointment = items.find((x: any) => String(x.id) === id);

  const m = useMutation({
    mutationFn: async (body: { adviceText: string; repeatAfterDays: number }) =>
      (await api.post(`/appointments/${id}/care`, body)).data,
    onSuccess: () => {
      toast("Совет сохранён", "Клиент увидит его в личном кабинете");
      navigate("/master");
    },
    onError: () => {
      toast("Не удалось сохранить", "Попробуйте ещё раз", "error");
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    m.mutate({
      adviceText: String(fd.get("adviceText") || ""),
      repeatAfterDays: Number(fd.get("repeatAfterDays") || 28),
    });
  }

  return (
    <div className="page-shell max-w-2xl">
      <Link to={`/master/appointments/${id}`} className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">
        ← Назад
      </Link>
      <h1 className="font-display text-3xl text-ink-700 mt-3">Совет по уходу</h1>
      {optional ? (
        <p className="text-ink-400 text-sm mt-1">
          Необязательно. Можно оставить рекомендацию клиенту или пропустить этот шаг.
        </p>
      ) : (
        <p className="text-ink-400 text-sm mt-1">
          Появится в личном кабинете клиента и в напоминании о повторной записи.
        </p>
      )}

      {appointment?.care && (
        <div className="mt-6 bg-cream-50 border border-cream-200 rounded-xl p-4 text-sm text-ink-600">
          Совет уже добавлен. Вы можете изменить его ниже.
        </div>
      )}

      <form className="mt-8 bg-white border border-cream-200 rounded-2xl p-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Совет по уходу</label>
          <textarea
            name="adviceText"
            rows={5}
            required
            defaultValue={appointment?.care?.adviceText ?? ""}
            className="field-input min-h-[120px] resize-y"
            placeholder="Например: безсульфатный шампунь, маска для окрашенных волос 1 раз в неделю…"
          />
        </div>
        <Input
          label="Рекомендуемый срок повторной записи (дней)"
          name="repeatAfterDays"
          type="number"
          min={1}
          max={180}
          defaultValue={appointment?.care?.repeatAfterDays ?? 28}
        />
        <div className="flex gap-2 pt-2">
          {optional && (
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate("/master")}>
              Пропустить
            </Button>
          )}
          <Button disabled={m.isPending} className={optional ? "flex-1" : "w-full"}>
            {m.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
