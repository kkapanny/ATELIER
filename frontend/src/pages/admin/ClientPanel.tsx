import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { format, addDays, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { classNames } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "planned", label: "Запланировано" },
  { value: "confirmed", label: "Подтверждено" },
  { value: "completed", label: "Завершено" },
  { value: "cancelled", label: "Отменено" },
  { value: "no_show", label: "Не пришёл" },
] as const;

interface ClientPanelProps {
  clientId: number;
  onClose: () => void;
  onDeleted: () => void;
}

export function ClientPanel({ clientId, onClose, onDeleted }: ClientPanelProps) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"edit" | "appointments">("edit");

  const { data: client, isLoading } = useQuery({
    queryKey: ["admin-client", clientId],
    queryFn: async () => (await api.get(`/admin/clients/${clientId}`)).data,
  });

  if (isLoading || !client) {
    return (
      <div className="fixed inset-0 z-50 bg-ink-700/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-ink-500">Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink-700/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-cream-200 shadow-soft w-full max-w-3xl my-8">
        <div className="flex items-center justify-between border-b border-cream-200 px-6 py-4">
          <div>
            <div className="font-display text-2xl text-ink-700">{client.fullName}</div>
            <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">Управление клиентом</div>
          </div>
          <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-700 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4 border-b border-cream-200">
          <TabBtn active={tab === "edit"} onClick={() => setTab("edit")}>Данные</TabBtn>
          <TabBtn active={tab === "appointments"} onClick={() => setTab("appointments")}>Записи</TabBtn>
        </div>

        <div className="p-6">
          {tab === "edit" ? (
            <EditClientForm
              client={client}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["admin-clients"] });
                qc.invalidateQueries({ queryKey: ["admin-client", clientId] });
              }}
              onDeleted={onDeleted}
            />
          ) : (
            <ClientAppointments clientId={clientId} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
        active ? "border-ink-700 text-ink-700" : "border-transparent text-ink-400 hover:text-ink-600"
      }`}
    >
      {children}
    </button>
  );
}

function EditClientForm({
  client,
  onSaved,
  onDeleted,
}: {
  client: any;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [fullName, setFullName] = useState(client.fullName);
  const [phone, setPhone] = useState(client.phone ?? "");
  const [category, setCategory] = useState<"regular" | "casual">(client.category);
  const [login, setLogin] = useState(client.user?.login ?? "");
  const [password, setPassword] = useState("");
  const [addAccount, setAddAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasAccount = Boolean(client.user?.login);

  useEffect(() => {
    setFullName(client.fullName);
    setPhone(client.phone ?? "");
    setCategory(client.category);
    setLogin(client.user?.login ?? "");
    setPassword("");
    setAddAccount(false);
  }, [client]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.patch(`/admin/clients/${client.id}`, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        category,
        ...(login.trim() ? { login: login.trim() } : {}),
        ...(password ? { password } : {}),
        ...(addAccount && !hasAccount ? { addAccount: true, login: login.trim(), password } : {}),
      });
      toast("Сохранено", "Данные клиента обновлены");
      onSaved();
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "login_already_taken") setError("Логин уже занят.");
      else setError("Не удалось сохранить изменения.");
    } finally {
      setLoading(false);
    }
  }

  async function removeLogin() {
    if (!confirm("Отключить вход в кабинет? Клиент останется в базе, записи ведёт администратор.")) return;
    setLoading(true);
    try {
      await api.patch(`/admin/clients/${client.id}`, { removeAccount: true });
      toast("Вход отключён", undefined, "info");
      onSaved();
    } catch {
      setError("Не удалось отключить аккаунт.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteClient() {
    if (!confirm(`Удалить клиента «${client.fullName}» и все его записи?`)) return;
    setLoading(true);
    try {
      await api.delete(`/admin/clients/${client.id}`);
      toast("Клиент удалён", undefined, "info");
      onDeleted();
    } catch {
      setError("Не удалось удалить клиента.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <Input label="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      <Input label="Телефон" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />

      <div>
        <label className="field-label">Категория</label>
        <select
          className="field-input bg-transparent"
          value={category}
          onChange={(e) => setCategory(e.target.value as "regular" | "casual")}
        >
          <option value="casual">Случайный (без скидки)</option>
          <option value="regular">Постоянный (скидка 10%)</option>
        </select>
      </div>

      {hasAccount ? (
        <>
          <Input label="Логин" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="off" />
          <Input
            label="Новый пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
            autoComplete="new-password"
          />
          <Button type="button" variant="secondary" onClick={removeLogin} disabled={loading}>
            Отключить вход в кабинет
          </Button>
        </>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
            <input type="checkbox" checked={addAccount} onChange={(e) => setAddAccount(e.target.checked)} />
            Добавить логин и пароль для входа в кабинет
          </label>
          {addAccount && (
            <>
              <Input label="Логин" value={login} onChange={(e) => setLogin(e.target.value)} required />
              <Input
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={3}
              />
            </>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={loading}>Сохранить</Button>
        <Button type="button" variant="secondary" onClick={deleteClient} disabled={loading} className="!text-red-600">
          Удалить клиента
        </Button>
      </div>
    </form>
  );
}

function ClientAppointments({ clientId }: { clientId: number }) {
  const qc = useQueryClient();
  const [showBook, setShowBook] = useState(false);

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ["admin-client-appointments", clientId],
    queryFn: async () => (await api.get(`/admin/clients/${clientId}/appointments`)).data,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      (await api.patch(`/admin/appointments/${id}`, { status })).data,
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["admin-schedule"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-lg text-ink-700">Записи клиента</h3>
        <Button variant="secondary" onClick={() => setShowBook((v) => !v)}>
          {showBook ? "Скрыть форму" : "+ Новая запись"}
        </Button>
      </div>

      {showBook && (
        <BookAppointmentForm
          clientId={clientId}
          onSuccess={() => {
            setShowBook(false);
            refetch();
            qc.invalidateQueries({ queryKey: ["admin-schedule"] });
          }}
        />
      )}

      <div className="border border-cream-200 rounded-xl overflow-hidden">
        {appointments.length === 0 ? (
          <p className="text-sm text-ink-400 p-6 text-center">Записей пока нет</p>
        ) : (
          <ul className="divide-y divide-cream-200">
            {appointments.map((a: any) => (
              <li key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-ink-700">
                    {formatDate(a.startsAt, "d MMM yyyy, HH:mm")}
                  </div>
                  <div className="text-sm text-ink-500 mt-0.5">
                    {a.master?.fullName} · {a.service?.name}
                  </div>
                  <div className="text-xs text-ink-400 mt-1">
                    {formatPrice(Number(a.priceAtBooking) - Number(a.discountApplied || 0))}
                  </div>
                </div>
                <select
                  className="field-input bg-transparent text-sm w-full sm:w-44"
                  value={a.status}
                  onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value })}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BookAppointmentForm({ clientId, onSuccess }: { clientId: number; onSuccess: () => void }) {
  const [masterId, setMasterId] = useState<number | "">("");
  const [serviceId, setServiceId] = useState<number | "">("");
  const [day, setDay] = useState<Date>(startOfDay(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: masters = [] } = useQuery({
    queryKey: ["masters", "admin-book"],
    queryFn: async () => (await api.get("/masters")).data,
  });

  const { data: masterDetail } = useQuery({
    queryKey: ["master", masterId],
    queryFn: async () => (await api.get(`/masters/${masterId}`)).data,
    enabled: !!masterId,
  });

  const dateKey = format(day, "yyyy-MM-dd");
  const { data: availability } = useQuery({
    queryKey: ["availability", masterId, serviceId, dateKey],
    queryFn: async () =>
      (await api.get(`/masters/${masterId}/availability`, {
        params: { service_id: serviceId, date: dateKey },
      })).data,
    enabled: !!masterId && !!serviceId,
  });

  const services = useMemo(() => masterDetail?.services ?? [], [masterDetail]);
  const freeSlots = useMemo(
    () => (availability?.slots ?? []).filter((s: any) => s.available),
    [availability],
  );

  useEffect(() => { setServiceId(""); setSelected(null); }, [masterId]);
  useEffect(() => { setSelected(null); }, [serviceId, day]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!masterId || !serviceId || !selected) {
      setError("Выберите мастера, услугу и время.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/admin/clients/${clientId}/appointments`, {
        masterId: Number(masterId),
        serviceId: Number(serviceId),
        startsAt: selected,
      });
      toast("Запись создана", formatDate(selected, "d MMM, HH:mm"));
      onSuccess();
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "slot_taken") setError("Это время уже занято — обновите слоты.");
      else setError("Не удалось создать запись.");
    } finally {
      setLoading(false);
    }
  }

  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));

  return (
    <form onSubmit={onSubmit} className="bg-cream-50 border border-cream-200 rounded-xl p-4 space-y-3">
      {error && (
        <div className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <div>
        <label className="field-label">Мастер</label>
        <select
          className="field-input bg-white"
          value={masterId}
          onChange={(e) => setMasterId(e.target.value ? Number(e.target.value) : "")}
          required
        >
          <option value="">Выберите мастера</option>
          {masters.map((m: any) => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Услуга</label>
        <select
          className="field-input bg-white"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : "")}
          required
          disabled={!masterId}
        >
          <option value="">Выберите услугу</option>
          {services.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>
          ))}
        </select>
      </div>

      {masterId && serviceId && (
        <>
          <div>
            <label className="field-label">Дата</label>
            <select
              className="field-input bg-white"
              value={format(day, "yyyy-MM-dd")}
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
            {freeSlots.length === 0 ? (
              <p className="text-sm text-ink-400 mt-1">Нет свободных слотов на эту дату.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {freeSlots.map((s: any) => {
                  const time = s.time ?? format(new Date(s.startsAt), "HH:mm");
                  const active = selected === s.startsAt;
                  return (
                    <button
                      key={s.startsAt}
                      type="button"
                      onClick={() => setSelected(s.startsAt)}
                      className={classNames(
                        "px-3 py-1.5 text-sm rounded-md border transition-colors",
                        active
                          ? "bg-ink-700 text-cream-50 border-ink-700"
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
              Выбрано: <strong className="text-ink-700">{format(new Date(selected), "d MMMM, HH:mm", { locale: ru })}</strong>
            </p>
          )}
        </>
      )}

      <Button type="submit" disabled={loading || !selected}>
        {loading ? "Создание…" : "Записать"}
      </Button>
    </form>
  );
}
