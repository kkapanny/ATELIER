export function GuestPromo() {
  return (
    <div className="page-shell">
      <h1 className="font-display text-5xl text-ink-700 mb-8">Акции</h1>
      <div className="grid md:grid-cols-2 gap-5">
        {[
          { title: "Organic brows · −10%", img: "https://images.unsplash.com/photo-1522335789203-aaa617e2462d?w=900" },
          { title: "Заботливый уход · −15%", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900" },
          { title: "Привести подругу · +5% к скидке", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=900" },
          { title: "Тонирование от 2 000 ₽", img: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=900" },
        ].map((p) => (
          <div key={p.title} className="relative aspect-[3/2] overflow-hidden rounded-2xl">
            <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-700/80 to-transparent" />
            <div className="relative p-8 text-cream-50 h-full flex items-end">
              <div className="font-display text-3xl">{p.title}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
