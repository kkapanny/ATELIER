import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { HistoryCard } from "./Cabinet";

export function ClientHistory() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => (await api.get("/appointments/me")).data,
  });
  const past = items.filter((a: any) => ["completed", "service_refused"].includes(a.status));
  return (
    <div className="page-shell">
      <h1 className="font-display text-4xl text-ink-700">История посещений</h1>
      <p className="text-ink-400 mt-2 text-sm">Прошлые визиты с советами по уходу и отзывами.</p>
      <div className="space-y-3 mt-8 max-w-3xl">
        {past.length === 0 && (
          <div className="bg-white border border-dashed border-cream-300 rounded-xl p-12 text-center text-ink-400">
            История пока пуста.
          </div>
        )}
        {past.map((a: any) => (
          <HistoryCard
            key={a.id}
            item={a}
            onReview={() => qc.invalidateQueries({ queryKey: ["my-appointments"] })}
          />
        ))}
      </div>
    </div>
  );
}
