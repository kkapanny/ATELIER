import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast, ToastStack } from "../ui/Toast";

const sections = [
  { to: "/admin/clients", label: "Клиенты", icon: "★" },
  { to: "/admin/masters", label: "Мастера", icon: "✦" },
  { to: "/admin/services", label: "Услуги", icon: "◆" },
  { to: "/admin/schedule", label: "Расписание", icon: "▦" },
  { to: "/admin/reports", label: "Отчёты", icon: "▌" },
];

export function AdminLayout() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    clear();
    toast("Вы вышли из админ-панели", undefined, "info");
    navigate("/");
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 w-[260px] bg-ink-700 text-cream-100 flex flex-col">
        <div className="px-6 py-6 font-display text-2xl tracking-widest">
          ATELIER<span className="text-cream-100/40 text-xs ml-2 align-top">/admin</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm tracking-wide transition-colors
                 ${isActive ? "bg-cream-100/15 text-white" : "text-cream-100/80 hover:bg-cream-100/10 hover:text-white"}`
              }
            >
              <span className="text-cream-100/50 w-4 text-center">{s.icon}</span>
              {s.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-cream-100/10">
          <div className="text-xs text-cream-100/60 px-3 mb-2">Администратор</div>
          <div className="px-3 text-sm text-cream-50 mb-3">{user?.fullName}</div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-rose-300 hover:bg-cream-100/10 rounded-md"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="ml-[260px] bg-cream-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
      <ToastStack />
    </div>
  );
}
