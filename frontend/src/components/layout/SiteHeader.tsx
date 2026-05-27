import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";
import { initials } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";

/**
 * Глобальная шапка сайта в стиле BEAUTY ROOM: брендовое имя ATELIER слева,
 * тонкая навигация в виде пилюль по центру, действия пользователя справа.
 * Меняется в зависимости от роли (guest / client / master).
 * Для админа header скрыт — там собственный layout с боковой панелью.
 */
export function SiteHeader() {
  const { user, isAuthed, role, clear } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    // Navigate first so the ProtectedRoute re-render sees a public location
    // and doesn't inject a stale `from` state into the /login entry.
    navigate("/", { replace: true });
    clear();
    toast("Вы вышли из аккаунта", "До встречи в ATELIER", "info");
  }

  const r = role();

  return (
    <header className="sticky top-0 z-30 bg-cream-100/80 backdrop-blur supports-[backdrop-filter]:bg-cream-100/60 border-b border-cream-200/70">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center gap-6">
        <NavLink to="/" className="font-display text-2xl tracking-widest text-ink-700 mr-4">
          ATELIER
        </NavLink>

        <nav className="flex-1 flex gap-1">
          {r === "guest" && (
            <>
              <NavPill to="/">Главная</NavPill>
              <NavPill to="/about">О нас</NavPill>
              <NavPill to="/services">Услуги</NavPill>
              <NavPill to="/promo">Акции</NavPill>
            </>
          )}
          {r === "client" && (
            <>
              <NavPill to="/client">Мастера</NavPill>
              <NavPill to="/client/cabinet">Мои записи</NavPill>
              <NavPill to="/client/history">История</NavPill>
              <NavPill to="/client/notifications">Уведомления</NavPill>
            </>
          )}
          {r === "master" && (
            <>
              <NavPill to="/master">Расписание</NavPill>
              <NavPill to="/master/profile">Профиль</NavPill>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {!isAuthed() ? (
            <>
              <NavLink to="/login" className="btn-ghost text-sm">Войти</NavLink>
              <NavLink to="/register" className="btn-primary text-sm">Регистрация</NavLink>
            </>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full border border-ink-700/15 hover:border-ink-700/40 transition"
              >
                <span className="w-8 h-8 rounded-full bg-ink-700 text-cream-50 grid place-items-center text-xs font-medium">
                  {initials(user?.fullName ?? "")}
                </span>
                <div className="text-left">
                  <div className="text-sm leading-tight text-ink-700">{user?.fullName}</div>
                  <div className="text-[11px] uppercase tracking-widest text-ink-300">
                    {user?.role === "client" ? "Клиент" : user?.role === "master" ? "Мастер" : "Админ"}
                  </div>
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white shadow-card rounded-xl border border-cream-200 p-2 z-50">
                  {r === "client" && (
                    <>
                      <MenuItem to="/client/cabinet" onClick={() => setMenuOpen(false)}>Мой кабинет</MenuItem>
                      <MenuItem to="/client/profile" onClick={() => setMenuOpen(false)}>Редактировать профиль</MenuItem>
                      <MenuItem to="/client/notifications" onClick={() => setMenuOpen(false)}>Push-уведомления</MenuItem>
                    </>
                  )}
                  {r === "master" && (
                    <>
                      <MenuItem to="/master" onClick={() => setMenuOpen(false)}>Расписание</MenuItem>
                      <MenuItem to="/master/profile" onClick={() => setMenuOpen(false)}>Мой профиль</MenuItem>
                    </>
                  )}
                  {user?.role === "admin" && (
                    <MenuItem to="/admin/clients" onClick={() => setMenuOpen(false)}>Админ-панель</MenuItem>
                  )}
                  <div className="my-1 h-px bg-cream-200" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-cream-50 rounded-md"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavPill({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/" || to === "/client" || to === "/master"}
      className={({ isActive }) =>
        `nav-pill ${isActive ? "nav-pill-active" : "hover:bg-cream-200/70"}`
      }
    >
      {children}
    </NavLink>
  );
}

function MenuItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="block px-3 py-2 text-sm text-ink-700 hover:bg-cream-50 rounded-md"
    >
      {children}
    </NavLink>
  );
}
