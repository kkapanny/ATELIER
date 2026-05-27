import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { ClientPanel } from "./ClientPanel";

export function AdminClients() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => (await api.get("/admin/clients")).data,
  });

  const filtered = clients.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    if (c.fullName?.toLowerCase().includes(q)) return true;
    if (qDigits.length > 0 && c.phone?.replace(/\D/g, "").includes(qDigits)) return true;
    if (c.phone?.toLowerCase().includes(q)) return true;
    return false;
  });

  return (
    <div>
      <PageHeading
        title="Клиенты"
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Скрыть форму" : "+ Добавить"}
          </Button>
        }
      />

      {showForm && (
        <AddClientForm
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-clients"] });
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="relative mt-6 mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по ФИО или телефону…"
          className="field-input pl-9 w-full max-w-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition-colors text-lg leading-none"
            style={{ maxWidth: "calc(100% - 24rem)" }}
          >
            ×
          </button>
        )}
      </div>

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <Th>ФИО</Th>
              <Th>Телефон</Th>
              <Th>Аккаунт</Th>
              <Th>Категория</Th>
              <Th>Скидка</Th>
              <Th>Дата регистрации</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">
                  {search ? `Ничего не найдено по запросу «${search}»` : "Нет клиентов"}
                </td>
              </tr>
            )}
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t border-cream-200 hover:bg-cream-50">
                <Td className="font-display text-ink-700">{c.fullName}</Td>
                <Td>{c.phone || "—"}</Td>
                <Td>
                  {c.user?.login ? (
                    <span className="pill-ink">{c.user.login}</span>
                  ) : (
                    <span className="pill-cream">Через админа</span>
                  )}
                </Td>
                <Td>
                  <span className={c.category === "regular" ? "pill-ink" : "pill-cream"}>
                    {c.category === "regular" ? "Постоянный" : "Случайный"}
                  </span>
                </Td>
                <Td>{c.discountPercent}%</Td>
                <Td>
                  {formatDate(c.registeredAt ?? c.user?.createdAt, "d MMM yyyy")}
                </Td>
                <Td>
                  <Button variant="secondary" className="text-xs" onClick={() => setSelectedId(c.id)}>
                    Управление
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId !== null && (
        <ClientPanel
          clientId={selectedId}
          onClose={() => setSelectedId(null)}
          onDeleted={() => {
            setSelectedId(null);
            qc.invalidateQueries({ queryKey: ["admin-clients"] });
          }}
        />
      )}
    </div>
  );
}

function AddClientForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [withAccount, setWithAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const firstName = String(fd.get("firstName") ?? "").trim();
    const lastName = String(fd.get("lastName") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const gender = fd.get("gender") as "male" | "female";
    const login = String(fd.get("login") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!firstName || !lastName) {
      setError("Укажите имя и фамилию.");
      return;
    }
    if (!phone) {
      setError("Укажите номер телефона.");
      return;
    }
    if (withAccount && (!login || !password)) {
      setError("Для входа в кабинет укажите логин и пароль.");
      return;
    }
    if (withAccount && password.length < 3) {
      setError("Пароль должен быть не короче 3 символов.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/clients", {
        firstName,
        lastName,
        phone,
        gender,
        ...(withAccount ? { login, password } : {}),
      });
      toast("Клиент добавлен", `${firstName} ${lastName}`);
      onSuccess();
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "login_already_taken") setError("Логин уже занят.");
      else setError("Не удалось добавить клиента. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-cream-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="md:col-span-2 font-display text-xl text-ink-700">Новый клиент</div>

      {error && (
        <div className="md:col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <Input label="Имя" name="firstName" required autoComplete="given-name" />
      <Input label="Фамилия" name="lastName" required autoComplete="family-name" />
      <Input label="Телефон" name="phone" type="tel" required placeholder="+7 (999) 000-00-00" />
      <div>
        <label className="field-label">Пол</label>
        <select name="gender" className="field-input bg-transparent" required defaultValue="female">
          <option value="female">Женский</option>
          <option value="male">Мужской</option>
        </select>
      </div>

      <div className="md:col-span-2 border-t border-cream-200 pt-4">
        <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
          <input
            type="checkbox"
            checked={withAccount}
            onChange={(e) => setWithAccount(e.target.checked)}
          />
          Создать логин и пароль для самостоятельного входа в кабинет
        </label>
        <p className="text-xs text-ink-400 mt-1">
          Если не отмечено, клиент не сможет войти в систему — записи будет вести администратор.
        </p>
      </div>

      {withAccount && (
        <>
          <Input label="Логин" name="login" autoComplete="off" />
          <Input label="Пароль" name="password" type="password" minLength={3} autoComplete="new-password" />
        </>
      )}

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохранение…" : "Добавить клиента"}
        </Button>
      </div>
    </form>
  );
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-300">ATELIER · admin</div>
        <h1 className="font-display text-3xl text-ink-700 mt-1">{title}</h1>
        {subtitle && <p className="text-ink-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 align-middle " + className}>{children}</td>;
}
