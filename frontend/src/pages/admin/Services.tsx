import { FormEvent, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";
import { CATALOG_CATEGORIES } from "@/lib/serviceCatalog";

function formatDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

function hallLabel(name: string) {
  return name === "male" ? "Мужской" : "Женский";
}

export function AdminServices() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editService, setEditService] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => (await api.get("/admin/services")).data,
  });

  const deleteService = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/admin/services/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast("Услуга удалена");
    },
    onError: () => toast("Не удалось удалить услугу"),
  });

  const filtered = services.filter((s: any) => {
    if (filterCategory && s.category !== filterCategory) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      hallLabel(s.hall?.name ?? "").toLowerCase().includes(q)
    );
  });

  // Group by hall for display
  const female = filtered.filter((s: any) => s.hall?.name === "female");
  const male = filtered.filter((s: any) => s.hall?.name === "male");

  function handleDelete(s: any) {
    if (!confirm(`Удалить услугу «${s.name}»?`)) return;
    deleteService.mutate(s.id);
  }

  return (
    <div>
      <PageHeading
        title="Услуги"
        action={
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск…"
                className="field-input pl-8 pr-7 w-48 text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
            <Button onClick={() => { setShowForm((v) => !v); setEditService(null); }}>
              {showForm ? "Скрыть форму" : "+ Добавить услугу"}
            </Button>
          </div>
        }
      />

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2 mt-6 mb-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={classNames(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            filterCategory === null
              ? "bg-ink-700 text-cream-50 border-ink-700"
              : "bg-cream-50 text-ink-500 border-cream-200 hover:border-ink-400",
          )}
        >
          Все
        </button>
        {CATALOG_CATEGORIES.map(({ kind, label }) => (
          <button
            key={kind}
            onClick={() => setFilterCategory(filterCategory === kind ? null : kind)}
            className={classNames(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              filterCategory === kind
                ? "bg-ink-700 text-cream-50 border-ink-700"
                : "bg-cream-50 text-ink-500 border-cream-200 hover:border-ink-400",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <ServiceForm
          onSuccess={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["admin-services"] });
            qc.invalidateQueries({ queryKey: ["services"] });
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editService && (
        <ServiceForm
          initial={editService}
          onSuccess={() => {
            setEditService(null);
            qc.invalidateQueries({ queryKey: ["admin-services"] });
            qc.invalidateQueries({ queryKey: ["services"] });
          }}
          onCancel={() => setEditService(null)}
        />
      )}

      {filtered.length === 0 && (
        <div className="text-center text-sm text-ink-400 py-12">
          {search ? `Ничего не найдено по запросу «${search}»` : "Нет услуг"}
        </div>
      )}

      {[{ label: "Женский зал", items: female }, { label: "Мужской зал", items: male }].map(({ label, items }) => {
        if (items.length === 0) return null;
        return (
          <div key={label} className="mb-8">
            <div className="text-xs uppercase tracking-widest text-ink-300 mb-3">{label}</div>
            <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 text-ink-400">
                  <tr>
                    <Th>Название</Th>
                    <Th>Категория</Th>
                    <Th>Длительность</Th>
                    <Th>Стоимость</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s: any) => (
                    <tr key={s.id} className="border-t border-cream-200 hover:bg-cream-50">
                      <Td className="font-medium text-ink-700">{s.name}</Td>
                      <Td>
                        {s.category ? (
                          <span className="pill-cream">
                            {CATALOG_CATEGORIES.find((c) => c.kind === s.category)?.label ?? s.category}
                          </span>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </Td>
                      <Td>{formatDuration(s.durationMin)}</Td>
                      <Td>{Number(s.price).toLocaleString("ru-RU")} ₽</Td>
                      <Td>
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() => { setEditService(s); setShowForm(false); }}
                            className="text-xs text-ink-500 hover:text-ink-800 transition-colors px-2 py-1 rounded hover:bg-cream-100"
                          >
                            Изменить
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                          >
                            Удалить
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Service Form (add + edit) ────────────────────────────────────────────────

function ServiceForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const price = Number(fd.get("price"));
    const durationMin = Number(fd.get("durationMin"));
    const hallName = String(fd.get("hallName") ?? "");
    if (!name) { setError("Введите название услуги."); return; }
    if (!price || price <= 0) { setError("Укажите стоимость."); return; }
    if (!durationMin || durationMin < 5) { setError("Укажите длительность (минимум 5 мин)."); return; }

    setLoading(true);
    try {
      const body = { name, price, durationMin, hallName, category: category || undefined };
      if (isEdit) {
        await api.patch(`/admin/services/${initial.id}`, body);
        toast("Услуга обновлена", name);
      } else {
        await api.post("/admin/services", body);
        toast("Услуга добавлена", name);
      }
      onSuccess();
    } catch (err: any) {
      setError("Не удалось сохранить услугу. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={classNames(
        "border rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4",
        isEdit ? "bg-amber-50 border-amber-200" : "bg-white border-cream-200",
      )}
    >
      <div className="md:col-span-2 flex items-center justify-between">
        <div className="font-display text-xl text-ink-700">
          {isEdit ? `Редактирование: ${initial.name}` : "Новая услуга"}
        </div>
        <button type="button" onClick={onCancel} className="text-ink-300 hover:text-ink-600 transition-colors text-2xl leading-none">×</button>
      </div>

      {error && (
        <div className="md:col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <Input label="Название услуги" name="name" required defaultValue={initial?.name ?? ""} className="md:col-span-2" />

      <div>
        <label className="field-label">Стоимость (₽)</label>
        <input name="price" type="number" min={1} step={1} required defaultValue={initial ? Number(initial.price) : ""}
          className="field-input" placeholder="1500" />
      </div>

      <div>
        <label className="field-label">Длительность (мин)</label>
        <input name="durationMin" type="number" min={5} max={480} step={5} required
          defaultValue={initial?.durationMin ?? 60} className="field-input" />
      </div>

      <div>
        <label className="field-label">Зал</label>
        <select name="hallName" className="field-input bg-transparent" defaultValue={initial?.hall?.name ?? "female"}>
          <option value="female">Женский зал</option>
          <option value="male">Мужской зал</option>
        </select>
      </div>

      <div>
        <label className="field-label">Раздел каталога</label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {CATALOG_CATEGORIES.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              onClick={() => setCategory(category === kind ? "" : kind)}
              className={classNames(
                "text-xs px-3 py-1.5 rounded-full border transition-colors",
                category === kind
                  ? "bg-ink-700 text-cream-50 border-ink-700"
                  : "bg-cream-50 text-ink-500 border-cream-200 hover:border-ink-300",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {!category && (
          <p className="text-xs text-ink-400 mt-1.5">Если не выбрано — услуга не попадёт ни в один раздел на сайте.</p>
        )}
      </div>

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={loading}>{loading ? "Сохранение…" : isEdit ? "Сохранить" : "Добавить услугу"}</Button>
      </div>
    </form>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-3 align-middle " + className}>{children}</td>;
}
