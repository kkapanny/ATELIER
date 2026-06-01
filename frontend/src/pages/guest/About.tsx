import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMasterSpecialties } from "@/lib/masterSpecialties";
import { TEAM_ADMIN, TEAM_MASTER_NAMES } from "@/lib/team";
import { MasterAvatar } from "@/components/MasterAvatar";

interface Master {
  id: number;
  fullName: string;
  avatarUrl?: string | null;
  services?: { name: string }[];
  specialties?: string[];
}

export function GuestAbout() {
  const { data: masters = [] } = useQuery({
    queryKey: ["masters", "about-team"],
    queryFn: async () => (await api.get<Master[]>("/masters")).data,
  });

  const teamMasters = TEAM_MASTER_NAMES.map((name) => masters.find((m) => m.fullName === name)).filter(
    (m): m is Master => Boolean(m),
  );

  return (
    <div className="page-shell">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="rounded-2xl overflow-hidden bg-cream-200 aspect-[4/5]">
          <img
            src="/images/hero-atelier.png"
            alt="Интерьер салона ATELIER"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <TeamCard
            name={TEAM_ADMIN.name}
            role={TEAM_ADMIN.role}
            image={TEAM_ADMIN.image}
          />

          {teamMasters.map((m) => (
            <TeamCard
              key={m.id}
              name={m.fullName}
              role={formatMasterSpecialties(m.services, m.specialties) || "Мастер"}
              avatarUrl={m.avatarUrl}
              to={`/masters/${m.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamCard({
  name,
  role,
  avatarUrl,
  image,
  to,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
  image?: string;
  to?: string;
}) {
  const content = (
    <>
      <div className="aspect-[3/4] bg-cream-200 overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover object-top" />
        ) : (
          <MasterAvatar fullName={name} avatarUrl={avatarUrl} className="w-full h-full object-cover object-top" />
        )}
      </div>
      <div className="p-4">
        <div className="font-display text-lg text-ink-700">{name}</div>
        <div className="text-xs uppercase tracking-widest text-ink-300 mt-1 leading-snug">{role}</div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-2xl overflow-hidden bg-white border border-cream-200 hover:shadow-card transition block"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-cream-200">
      {content}
    </div>
  );
}
