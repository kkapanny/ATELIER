import { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function MasterCare() {
  const { id } = useParams();
  const navigate = useNavigate();

  const m = useMutation({
    mutationFn: async (body: any) => (await api.post(`/appointments/${id}/care`, body)).data,
    onSuccess: () => {
      toast("Совет сохранён", "Push-напоминание о повторной записи поставлено в очередь");
      navigate("/master");
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
      <Link to={`/master/appointments/${id}`} className="text-xs uppercase tracking-widest text-ink-300 hover:text-ink-700">← Назад</Link>
      <h1 className="font-display text-3xl text-ink-700 mt-3">Совет по уходу</h1>
      <p className="text-ink-400 text-sm mt-1">Появится в личном кабинете клиента и в напоминании о повторной записи.</p>

      <form className="mt-8 bg-white border border-cream-200 rounded-2xl p-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Совет по уходу</label>
          <textarea
            name="adviceText"
            rows={5}
            required
            className="field-input min-h-[120px] resize-y"
            placeholder="Например: безсульфатный шампунь, маска для окрашенных волос 1 раз в неделю…"
          />
        </div>
        <Input label="Рекомендуемый срок повторной записи (дней)" name="repeatAfterDays" type="number" min={1} max={180} defaultValue={28} />
        <Button disabled={m.isPending} className="mt-2">
          {m.isPending ? "Сохранение…" : "Сохранить и завершить"}
        </Button>
      </form>
    </div>
  );
}
