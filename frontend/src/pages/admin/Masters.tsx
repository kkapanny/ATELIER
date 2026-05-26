import { FormEvent, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MasterAvatar } from "@/components/MasterAvatar";
import { formatMasterSpecialties, MASTER_SPECIALTY_OPTIONS } from "@/lib/masterSpecialties";
import { formatHallLabel } from "@/lib/hall";
import { toast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";

interface Hall {
  id: number;
  name: "male" | "female";
  description: string | null;
}

interface Service {
  id: number;
  name: string;
  hallId: number;
}

export function AdminMasters() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: masters = [] } = useQuery({
    queryKey: ["admin-masters"],
    queryFn: async () => (await api.get("/admin/masters")).data,
  });

  const activate = useMutation({
    mutationFn: async (id: number) => (await api.post(`/admin/masters/${id}/activate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-masters"] }),
  });

  return (
    <div>
      <PageHeading
        title="Мастера"
        subtitle="Добавление мастеров и управление профилями"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Скрыть форму" : "+ Добавить мастера"}
          </Button>
        }
      />

      {showForm && (
        <AddMasterForm
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-masters"] });
            qc.invalidateQueries({ queryKey: ["masters"] });
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {masters.map((m: any) => {
          const serviceNames = m.services?.map((row: { service: { name: string } }) => ({
            name: row.service.name,
          }));
          const specs = formatMasterSpecialties(serviceNames, m.specialties);
          return (
            <div key={m.id} className="bg-white border border-cream-200 rounded-2xl p-5 flex gap-4">
              <MasterAvatar
                fullName={m.fullName}
                avatarUrl={m.avatarUrl}
                className="w-16 h-16 rounded-full object-cover object-top shrink-0"
              />
              <div className="flex-1">
                <div className="font-display text-lg text-ink-700">{m.fullName}</div>
                <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">
                  {specs ? `${specs} · разряд ${m.rank}` : `разряд ${m.rank}`}
                </div>
                <div className="text-xs text-ink-400 mt-1">{formatHallLabel(m.hall)}</div>
                <div className="text-sm text-ink-500 mt-2">{m.bio || "Без описания"}</div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={m.isActive ? "pill-ink" : "pill-cream"}>
                    {m.isActive ? "Активен" : "На модерации"}
                  </span>
                  {!m.isActive && (
                    <Button variant="secondary" onClick={() => activate.mutate(m.id)}>
                      Одобрить
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddMasterForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [hallName, setHallName] = useState<"male" | "female">("female");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: halls = [] } = useQuery({
    queryKey: ["halls"],
    queryFn: async () => (await api.get<Hall[]>("/halls")).data,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const selectedHall = halls.find((h) => h.name === hallName);
  const hallServices = useMemo(
    () => allServices.filter((s) => s.hallId === selectedHall?.id),
    [allServices, selectedHall?.id],
  );

  function toggleService(id: number) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSpecialty(tag: string) {
    setSpecialties((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  function onHallChange(name: "male" | "female") {
    setHallName(name);
    setServiceIds([]);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const login = String(fd.get("login") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const phone = String(fd.get("phone") ?? "").trim();
    const rank = Number(fd.get("rank"));
    const experienceYears = Number(fd.get("experienceYears"));
    const bio = String(fd.get("bio") ?? "").trim();

    if (!fullName || !login || !password || !phone) {
      setError("Заполните ФИО, логин, пароль и телефон.");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу зала.");
      return;
    }
    if (specialties.length === 0) {
      setError("Выберите хотя бы одну категорию.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/masters", {
        fullName,
        login,
        password,
        phone,
        hallName,
        serviceIds,
        specialties,
        rank,
        experienceYears,
        bio: bio || undefined,
      });
      toast("Мастер добавлен", fullName);
      onSuccess();
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "login_already_taken") setError("Логин уже занят.");
      else if (code === "invalid_services_for_hall") setError("Услуги не соответствуют выбранному залу.");
      else setError("Не удалось создать мастера. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-cream-200 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="md:col-span-2 font-display text-xl text-ink-700">Новый мастер</div>

      {error && (
        <div className="md:col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Input label="ФИО" name="fullName" required />
      <Input label="Логин" name="login" required autoComplete="off" />
      <Input label="Пароль" name="password" type="password" required minLength={3} autoComplete="new-password" />
      <Input label="Телефон" name="phone" type="tel" required placeholder="+7 (999) 000-00-00" />

      <div>
        <label className="field-label">Зал</label>
        <select
          className="field-input bg-transparent"
          value={hallName}
          onChange={(e) => onHallChange(e.target.value as "male" | "female")}
        >
          <option value="female">Женский зал</option>
          <option value="male">Мужской зал</option>
        </select>
      </div>

      <div>
        <label className="field-label">Разряд (1–5)</label>
        <input name="rank" type="number" min={1} max={5} defaultValue={3} className="field-input" required />
      </div>

      <div>
        <label className="field-label">Опыт (лет)</label>
        <input name="experienceYears" type="number" min={0} max={50} defaultValue={1} className="field-input" required />
      </div>

      <div className="md:col-span-2">
        <label className="field-label">Описание</label>
        <textarea name="bio" rows={3} className="field-input resize-none" placeholder="Кратко о специализации мастера" />
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Категории (для подписи на карточке)</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {MASTER_SPECIALTY_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleSpecialty(tag)}
              className={classNames(
                "text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors",
                specialties.includes(tag)
                  ? "bg-ink-700 text-cream-50 border-ink-700"
                  : "bg-cream-50 text-ink-400 border-cream-200 hover:border-ink-300",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Услуги ({formatHallLabel({ name: hallName })})</div>
        <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-cream-200 rounded-xl p-3">
          {hallServices.length === 0 && (
            <p className="text-sm text-ink-400 col-span-2">Нет услуг для этого зала</p>
          )}
          {hallServices.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
              <input
                type="checkbox"
                checked={serviceIds.includes(s.id)}
                onChange={() => toggleService(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохранение…" : "Создать мастера"}
        </Button>
      </div>
    </form>
  );
}
