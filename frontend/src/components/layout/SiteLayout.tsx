import { Outlet } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ToastStack } from "../ui/Toast";

/**
 * Базовый layout для гостевых, клиентских и мастерских страниц.
 * Бренд + навигация + main + футер.
 */
export function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <SiteFooter />
      <ToastStack />
    </div>
  );
}
