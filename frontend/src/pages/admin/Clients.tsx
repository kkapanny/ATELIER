import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export function AdminClients() {
  const { data: clients = [] } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: async () => (await api.get("/admin/clients")).data,
  });

  return (
    <div>
      <PageHeading
        title="Клиенты"
        subtitle="Полный список клиентов салона с категорией и скидкой"
        action={<button className="btn-primary">+ Добавить</button>}
      />

      <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-ink-400">
            <tr>
              <Th>ФИО</Th>
              <Th>Телефон</Th>
              <Th>Категория</Th>
              <Th>Скидка</Th>
              <Th>Дата регистрации</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c: any) => (
              <tr key={c.id} className="border-t border-cream-200 hover:bg-cream-50">
                <Td className="font-display text-ink-700">{c.fullName}</Td>
                <Td>{c.phone || "—"}</Td>
                <Td>
                  <span className={c.category === "regular" ? "pill-ink" : "pill-cream"}>
                    {c.category === "regular" ? "Постоянный" : "Случайный"}
                  </span>
                </Td>
                <Td>{c.discountPercent}%</Td>
                <Td>{formatDate(c.user?.createdAt ?? new Date(), "d MMM yyyy")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-ink-300">ATELIER · admin</div>
        <h1 className="font-display text-3xl text-ink-700 mt-1">{title}</h1>
        {subtitle && <p className="text-ink-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 align-middle " + className}>{children}</td>;
}
