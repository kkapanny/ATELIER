import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { login, password });
      setSession(res.data.accessToken, res.data.user);
      toast(`Добро пожаловать, ${res.data.user.fullName}`, "Вход выполнен");
      const from = location.state?.from?.pathname as string | undefined;
      const def = defaultRoute(res.data.user.role);
      // Only restore `from` if it belongs to the same role section to avoid
      // cross-account redirects (e.g. admin landing on a client page after
      // logging out from a client account).
      const roleRoot = "/" + def.split("/")[1]; // "/admin" | "/client" | "/master"
      const to = from && from.startsWith(roleRoot) ? from : def;
      navigate(to, { replace: true });
    } catch (err: any) {
      if (!err.response) {
        setError(
          "Нет ответа от сервера. Убедитесь, что backend запущен (docker: порт 4000), в консоли нет ошибки CORS и открыт тот же хост, что в CORS (localhost или 127.0.0.1).",
        );
        return;
      }
      setError(err.response?.data?.error === "invalid_credentials"
        ? "Неверный логин или пароль."
        : "Не удалось войти. Проверьте данные и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center page-shell">
      <div className="w-full max-w-md bg-white rounded-3xl border border-cream-200 shadow-soft p-10">
        <div className="font-display text-3xl tracking-widest text-center text-ink-700">ATELIER</div>
        <h1 className="font-display text-2xl text-center mt-6 text-ink-700">Вход в кабинет</h1>
        <p className="text-center text-ink-400 text-sm mt-2">Запись к мастеру в один клик</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {error && (
            <div className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <Input
            label="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="user"
            autoFocus
          />
          <Input
            label="Пароль"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button full disabled={loading} className="mt-4">
            {loading ? "Вход…" : "Войти"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-400">
          Нет аккаунта?{" "}
          <Link to="/register" className="text-ink-700 underline-offset-2 hover:underline">
            Зарегистрироваться
          </Link>
        </div>
        <div className="mt-2 text-center text-sm">
          <Link to="/" className="text-ink-300 hover:text-ink-700">← На главную</Link>
        </div>
      </div>
    </div>
  );
}

function defaultRoute(role: string) {
  if (role === "admin") return "/admin/clients";
  if (role === "master") return "/master";
  return "/client";
}
