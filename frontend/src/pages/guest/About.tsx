import { Link } from "react-router-dom";

export function GuestAbout() {
  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="rounded-2xl overflow-hidden bg-cream-200 aspect-[4/5]">
          <img
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=900"
            alt="ATELIER"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="self-center max-w-md">
          <h1 className="font-display text-5xl text-ink-700">О нас</h1>
          <div className="h-px w-12 bg-ink-700 my-6" />
          <p className="text-ink-500 leading-relaxed">
            Салон ATELIER — уникальное пространство, в котором сочетаются высокий сервис, уютная атмосфера
            и создание новых образов. Мы работаем с 2016 года и каждый день стараемся подчеркнуть вашу красоту.
          </p>
          <p className="text-ink-500 leading-relaxed mt-3">
            Важное для нас — наши клиенты. Мы учитываем ваши пожелания, используем профессиональную и
            качественную продукцию и работаем с топ-мастерами нашего города.
          </p>
          <Link to="/login" className="btn-primary mt-8 inline-flex">Записаться</Link>
        </div>
      </div>

      {/* Команда */}
      <div id="team" className="mt-20 scroll-mt-24">
        <h2 className="font-display text-3xl text-ink-700 mb-8">Команда</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { name: "Анна Морозова", role: "Мастер окрашивания", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600" },
            { name: "София Гриневич", role: "Администратор", img: "https://images.unsplash.com/photo-1504703395950-b89145a5425b?w=600" },
            { name: "Валерия Филиппчук", role: "Мастер маникюра", img: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600" },
            { name: "София Крашевская", role: "Мастер ногтевого сервиса", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600" },
          ].map((p) => (
            <div key={p.name} className="rounded-2xl overflow-hidden bg-white border border-cream-200">
              <div className="aspect-[3/4] bg-cream-200">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="font-display text-lg text-ink-700">{p.name}</div>
                <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">{p.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
