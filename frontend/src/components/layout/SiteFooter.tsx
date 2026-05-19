/**
 * Подвал сайта в стиле BEAUTY ROOM: тёмный блок с логотипом, навигацией и часами.
 */
export function SiteFooter() {
  return (
    <footer className="mt-20">
      <div className="bg-ink-700 text-cream-100 rounded-tl-3xl rounded-tr-3xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="font-display text-3xl tracking-widest">ATELIER</div>
            <p className="text-cream-100/60 text-sm mt-3 max-w-xs">
              Салон-парикмахерская с двумя залами и фокусом на индивидуальных рекомендациях по уходу.
            </p>
          </div>
          <div className="text-sm flex gap-6 md:justify-center text-cream-100/80">
            <a className="hover:text-white">О нас</a>
            <a className="hover:text-white">Услуги</a>
            <a className="hover:text-white">Акции</a>
            <a className="hover:text-white">Обучение</a>
          </div>
          <div className="text-sm space-y-1 text-cream-100/80">
            <div className="grid grid-cols-[60px_1fr] gap-1">
              <span>Пн–Сб:</span><span>10:00–19:00</span>
              <span>Вс:</span><span>выходной</span>
            </div>
            <div className="pt-2 text-cream-100/60">г. Москва, ул. Примерная, 12</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
