import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { MasterAvatar } from "@/components/MasterAvatar";
import { MasterSpecialtyLine } from "@/components/MasterSpecialtyLine";
import { formatHallLabel } from "@/lib/hall";

const MANICURE_IMAGE = "/images/manicure-hero.png";
const COLORING_IMAGE = "/images/coloring-hero.png";
const MAKEUP_IMAGE = "/images/makeup.png";
const HERO_ATELIER_IMAGE = "/images/hero-atelier.png";
const COMING_SOON_IMAGE = "/images/coming-soon.png";

interface Master {
  id: number;
  fullName: string;
  hall: { name: string };
  rank: number;
  experienceYears: number;
  bio?: string;
  avatarUrl?: string | null;
  averageRating: number;
  services?: { name: string }[];
  specialties?: string[];
}

export function GuestHome() {
  const { data: masters = [] } = useQuery({
    queryKey: ["masters", "guest"],
    queryFn: async () => (await api.get<Master[]>("/masters")).data,
  });

  return (
    <div>
      {/* Hero — просторный белый блок с фото-картой и оверлеем (как на референсе BEAUTY ROOM) */}
      <section className="page-shell pt-6 lg:pt-10">
        <div className="bg-white rounded-3xl shadow-soft border border-cream-200/70 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] lg:items-stretch">
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <h1 className="font-display text-6xl lg:text-7xl leading-[1.05] text-ink-700">
                ATELIER
              </h1>
              <p className="text-ink-500 mt-6 max-w-md leading-relaxed">
                Пространство красоты, любви и заботы. Специальные предложения для наших клиентов
                каждый месяц — стрижки, окрашивание, маникюр и косметология в двух залах.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
                <PromoMini title="Маникюр" img={MANICURE_IMAGE} />
                <PromoMini title="Окрашивание" img={COLORING_IMAGE} />
              </div>
            </div>

            <div className="relative bg-cream-200 min-h-[280px] lg:min-h-0 lg:h-full">
              <img
                src={HERO_ATELIER_IMAGE}
                alt="Интерьер салона ATELIER"
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute bottom-6 right-6">
                <Link to="/login" className="btn-pill">Записаться</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Почему выбирают нас */}
      <section className="page-shell">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl text-ink-700">Почему выбирают нас?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { t: "Опытные специалисты", d: "Каждый мастер регулярно повышает квалификацию, обучается у лучших в индустрии и принимает в своём ритме." },
            { t: "Премиальные средства", d: "В своей работе мы используем лучшие средства: ORGANIC, BRONX, TIGI, INAMA, KEVIN MURPHY." },
            { t: "Специальные предложения", d: "Каждый месяц мы публикуем специальные предложения для наших постоянных гостей." },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-cream-200 bg-white p-7">
              <div className="text-xs tracking-widest uppercase text-ink-300 mb-3">— {b.t}</div>
              <p className="text-sm text-ink-500 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Услуги (галерея) */}
      <section className="page-shell">
        <h2 className="font-display text-3xl text-ink-700 mb-8">Услуги</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: "Макияж", img: MAKEUP_IMAGE },
            { t: "Окрашивание волос", img: COLORING_IMAGE },
            { t: "Ногтевой сервис", img: MANICURE_IMAGE },
            { t: "Косметология", img: COMING_SOON_IMAGE, placeholder: true },
            { t: "Стрижки", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600" },
            { t: "Тату", img: COMING_SOON_IMAGE, placeholder: true },
            { t: "Перманентный макияж", img: COMING_SOON_IMAGE, placeholder: true },
            { t: "Пирсинг", img: COMING_SOON_IMAGE, placeholder: true },
          ].map((s) => (
            <Link to="/services" key={s.t} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-cream-200">
              <img
                src={s.img}
                alt={s.t}
                className={`w-full h-full group-hover:scale-105 transition ${
                  "placeholder" in s && s.placeholder
                    ? "object-contain bg-white p-8"
                    : s.t === "Макияж"
                      ? "object-cover object-top"
                      : "object-cover"
                }`}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-ink-700/70 to-transparent text-cream-50 text-sm flex justify-between items-center">
                {s.t}
                <span>↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Каталог мастеров (как в макете, новый дизайн) */}
      <section className="page-shell">
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-display text-3xl text-ink-700">Наши мастера</h2>
          <Link to="/login" className="text-xs uppercase tracking-widest text-ink-400 hover:text-ink-700">
            Войти, чтобы записаться →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {masters.map((m) => (
            <Link
              to={`/masters/${m.id}`}
              key={m.id}
              className="group rounded-2xl bg-white border border-cream-200 overflow-hidden flex flex-col hover:shadow-card transition"
            >
              <div className="aspect-[3/4] bg-cream-200 relative overflow-hidden">
                <MasterAvatar
                  fullName={m.fullName}
                  avatarUrl={m.avatarUrl}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition"
                />
                <span className="absolute top-3 left-3 pill-soft">
                  {formatHallLabel(m.hall)}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-1 flex-1">
                <div className="font-display text-xl text-ink-700">{m.fullName}</div>
                <MasterSpecialtyLine
                  services={m.services}
                  specialties={m.specialties}
                  experienceYears={m.experienceYears}
                />
                <div className="mt-2 text-sm text-ink-500">★ {m.averageRating.toFixed(1)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Специальные предложения */}
      <section className="page-shell pb-20">
        <h2 className="font-display text-3xl text-ink-700 mb-8">Специальные предложения</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              title: "Цвет сезона",
              img: COLORING_IMAGE,
              discount: "−15%",
              bullets: [
                "−15% на сложное окрашивание и балаяж",
                "Акция действует до конца сезона",
              ],
            },
            {
              title: "Заботливый уход",
              img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900",
              discount: "−10%",
              bullets: [
                "−10% на уходовую косметику при записи на любую процедуру",
                "Акция действует до конца сезона",
              ],
            },
          ].map((p) => (
            <div key={p.title} className="relative aspect-[3/2] overflow-hidden rounded-2xl">
              <img src={p.img} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-700/85 via-ink-700/40 to-transparent" />
              <div className="relative p-8 h-full flex flex-col justify-between text-cream-50">
                <div>
                  <h3 className="font-display text-3xl">{p.title}</h3>
                  <ul className="text-sm mt-3 space-y-1 list-disc list-inside opacity-90 max-w-sm">
                    {p.bullets.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-3xl">{p.discount ?? "−10%"} скидка</span>
                  <Button variant="pill" onClick={() => (window.location.href = "/login")}>Записаться</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PromoMini({ title, img }: { title: string; img: string }) {
  return (
    <Link to="/services" className="block">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-cream-200 bg-ink-700">
        <img src={img} alt={title} className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-ink-700/70 text-cream-50 text-sm flex justify-between items-center">
          {title}<span>↗</span>
        </div>
      </div>
    </Link>
  );
}

