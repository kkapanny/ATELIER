import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { Button } from "@/components/ui/Button";
import { MasterAvatar } from "@/components/MasterAvatar";
import { formatMasterSpecialties } from "@/lib/masterSpecialties";

export function AdminMasters() {
  const qc = useQueryClient();
  const { data: masters = [] } = useQuery({
    queryKey: ["admin-masters"],
    queryFn: async () => (await api.get("/admin/masters")).data,
  });

  const activate = useMutation({
    mutationFn: async (id: number) => (await api.post(`/admin/masters/${id}/activate`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-masters"] }),
  });

  return (
    <div>
      <PageHeading title="Мастера" subtitle="Активация профилей и управление мастерами" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map((m: any) => (
          <div key={m.id} className="bg-white border border-cream-200 rounded-2xl p-5 flex gap-4">
            <MasterAvatar
              fullName={m.fullName}
              avatarUrl={m.avatarUrl}
              className="w-16 h-16 rounded-full object-cover object-top shrink-0"
            />
            <div className="flex-1">
              <div className="font-display text-lg text-ink-700">{m.fullName}</div>
              <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">
                {(() => {
                  const specs = formatMasterSpecialties(
                    m.services?.map((row: { service: { name: string } }) => ({ name: row.service.name })),
                  );
                  return specs ? `${specs} · разряд ${m.rank}` : `разряд ${m.rank}`;
                })()}
              </div>
              <div className="text-sm text-ink-500 mt-2">{m.bio || "Без описания"}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className={m.isActive ? "pill-ink" : "pill-cream"}>{m.isActive ? "Активен" : "На модерации"}</span>
                {!m.isActive && <Button variant="secondary" onClick={() => activate.mutate(m.id)}>Одобрить</Button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
