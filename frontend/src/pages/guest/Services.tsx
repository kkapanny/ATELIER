import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ServiceListGrouped } from "@/components/ServiceListGrouped";
import { api } from "@/lib/api";

interface Service {
  id: number;
  name: string;
  durationMin: number;
  price: number;
  category?: string | null;
  description?: string | null;
  hall: { name: string };
}

export function GuestServices() {
  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const male = services.filter((s) => s.hall.name === "male");
  const female = services.filter((s) => s.hall.name === "female");

  return (
    <div className="page-shell">
      <h1 className="font-display text-5xl text-ink-700 mb-12">Услуги</h1>

      <div className="grid md:grid-cols-2 gap-12">
        <ServiceColumn title="Женский зал" items={female} />
        <ServiceColumn title="Мужской зал" items={male} />
      </div>

      <div className="mt-12 p-8 rounded-2xl bg-white border border-cream-200 flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl text-ink-700">Готовы записаться?</h3>
          <p className="text-ink-400 text-sm mt-1">Войдите или создайте аккаунт — займёт минуту.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/register" className="btn-secondary">Регистрация</Link>
          <Link to="/login" className="btn-primary">Войти</Link>
        </div>
      </div>
    </div>
  );
}

function ServiceColumn({ title, items }: { title: string; items: Service[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-ink-300 mb-6">— {title}</div>
      <ServiceListGrouped
        services={items.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          price: Number(s.price),
          category: s.category,
        }))}
      />
    </div>
  );
}
