import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function MasterAppointment() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: items = [] } = useQuery({
    queryKey: ["master-appointments"],
    queryFn: async () => (await api.get("/appointments/master/me")).data,
  });
  const a = items.find((x: any) => String(x.id) === id);

  const setStatus = useMutation({
    mutationFn: async (status: string) => (await api.patch(`/appointments/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-appointments"] }),
  });

  const complete = useMutation({
    mutationFn: async () => (await api.post(`/appointments/${id}/complete`, {})).data,
    onSuccess: () => {
      toast("Визит завершён", "Добавьте совет по уходу");
      navigate(`/master/appointments/${id}/care`);
    },
  });

  if (!a) return <div className="page-shell">Загрузка…</div>;

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
        <div className="text-xs uppercase tracking-widest text-ink-300">Статус визита</div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="secondary" onClick={() => setStatus.mutate("confirmed")}>Пришёл</Button>
          <Button variant="secondary" onClick={() => setStatus.mutate("no_show")}>Не пришёл</Button>
          <Button variant="secondary" onClick={() => setStatus.mutate("planned")}>Опаздывает</Button>
          <Button onClick={() => complete.mutate()} className="ml-auto">Завершить визит</Button>
        </div>
      </div>

      {a.care && (
        <div className="mt-6 bg-cream-50 border border-cream-200 rounded-2xl p-6">
          <div className="text-xs uppercase tracking-widest text-ink-300">Уже оставленный совет</div>
          <p className="text-sm text-ink-700 mt-2">{a.care.adviceText}</p>
          <p className="text-xs text-ink-400 mt-2">Повтор через {a.care.repeatAfterDays} дней</p>
        </div>
      )}
    </div>
  );
}
