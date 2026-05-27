import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  { label: "О нас", to: "/about" },
  { label: "Услуги", to: "/services" },
  { label: "Акции", to: "/promo" },
] as const;

/**
 * Подвал сайта в стиле BEAUTY ROOM: тёмный блок с логотипом, навигацией и часами.
 */
export function SiteFooter() {
  return (
    <footer className="mt-20">
      <div className="bg-ink-700 text-cream-100 rounded-tl-3xl rounded-tr-3xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <Link to="/" className="font-display text-3xl tracking-widest hover:text-white transition">
              ATELIER
            </Link>
            <p className="text-cream-100/60 text-sm mt-3 max-w-xs">
              Пространство красоты и заботы.
            </p>
          </div>
          <nav className="text-sm flex flex-wrap gap-6 md:justify-center text-cream-100/80" aria-label="Навигация в подвале">
            {FOOTER_LINKS.map(({ label, to }) => (
              <Link key={label} to={to} className="hover:text-white transition">
                {label}
              </Link>
            ))}
          </nav>
          <div className="text-sm space-y-1 text-cream-100/80">
            <div className="grid grid-cols-[60px_1fr] gap-1">
              <span>Пн–Сб:</span><span>10:00–21:00</span>
              <span>Вс:</span><span>выходной</span>
            </div>
            <div className="pt-2 text-cream-100/60">г. Москва, ул. Примерная, 12</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
