import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [role, setRole] = useState<"client" | "master">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api.post("/auth/register", {
        login: fd.get("login"),
        password: fd.get("password"),
        fullName: fd.get("fullName"),
        phone: fd.get("phone"),
        gender: fd.get("gender"),
        role,
      });
      setSession(res.data.accessToken, res.data.user);
      toast("Аккаунт создан", `Добро пожаловать, ${res.data.user.fullName}`);
      navigate(role === "master" ? "/master/profile" : "/client", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error === "login_already_taken"
        ? "Логин уже занят, выберите другой"
        : "Не удалось создать аккаунт. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center page-shell">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-cream-200 shadow-soft p-10">
        <div className="font-display text-3xl tracking-widest text-center text-ink-700">ATELIER</div>
        <h1 className="font-display text-2xl text-center mt-4">Создание аккаунта</h1>

        <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-cream-100 rounded-full">
          {(["client", "master"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={classNames(
                "py-2 rounded-full text-sm tracking-wide transition-colors",
                role === r ? "bg-ink-700 text-cream-50" : "text-ink-400",
              )}
            >
              {r === "client" ? "Я клиент" : "Я мастер"}
            </button>
          ))}
        </div>

        <form className="mt-6 grid grid-cols-2 gap-4" onSubmit={onSubmit}>
          {error && (
            <div className="col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}
          <div className="col-span-2"><Input label="ФИО" name="fullName" required /></div>
          <Input label="Логин" name="login" required />
          <Input label="Телефон" name="phone" />
          <Input label="Пароль" name="password" type="password" required minLength={3} />
          <div>
            <label className="field-label">Пол</label>
            <select name="gender" className="field-input bg-transparent">
              <option value="female">Женский</option>
              <option value="male">Мужской</option>
            </select>
          </div>
          <label className="col-span-2 flex items-start gap-2 text-xs text-ink-400 mt-2">
            <input type="checkbox" defaultChecked className="mt-0.5" />
            <span>Согласен с правилами обработки данных и публичной офертой ATELIER.</span>
          </label>
          <Button full className="col-span-2 mt-2" disabled={loading}>
            {loading ? "Создание…" : "Создать аккаунт"}
          </Button>
        </form>

        <div className="text-center text-sm text-ink-400 mt-5">
          Уже есть аккаунт? <Link to="/login" className="text-ink-700 underline-offset-2 hover:underline">Войти</Link>
        </div>
      </div>
    </div>
  );
}
