import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeading } from "./Clients";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MasterAvatar } from "@/components/MasterAvatar";
import { formatMasterSpecialties, MASTER_SPECIALTY_OPTIONS } from "@/lib/masterSpecialties";
import { formatHallLabel } from "@/lib/hall";
import { toast } from "@/components/ui/Toast";
import { classNames } from "@/lib/utils";

interface Hall {
  id: number;
  name: "male" | "female";
  description: string | null;
}

interface Service {
  id: number;
  name: string;
  hallId: number;
}

// Days of week: 0=Вс, 1=Пн ... 6=Сб (JS convention)
const WEEK_DAYS = [
  { key: "1", label: "Понедельник" },
  { key: "2", label: "Вторник" },
  { key: "3", label: "Среда" },
  { key: "4", label: "Четверг" },
  { key: "5", label: "Пятница" },
  { key: "6", label: "Суббота" },
  { key: "0", label: "Воскресенье" },
];

const SALON_START = "10:00";
const SALON_END = "21:00";

type DaySchedule = { start: string; end: string } | null;
type WorkSchedule = Record<string, DaySchedule>;

function buildDefaultSchedule(): WorkSchedule {
  const sched: WorkSchedule = {};
  for (const d of WEEK_DAYS) {
    sched[d.key] = d.key === "0" ? null : { start: SALON_START, end: SALON_END };
  }
  return sched;
}

export function AdminMasters() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<any | null>(null);
  const [editMaster, setEditMaster] = useState<any | null>(null);

  const { data: masters = [] } = useQuery({
    queryKey: ["admin-masters"],
    queryFn: async () => (await api.get("/admin/masters")).data,
  });

  const deleteMaster = useMutation({
    mutationFn: async (id: number) => (await api.delete(`/admin/masters/${id}`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["admin-masters"] });
      qc.invalidateQueries({ queryKey: ["masters"] });
      if (selectedMaster?.id === id) setSelectedMaster(null);
      if (editMaster?.id === id) setEditMaster(null);
      toast("Мастер удалён");
    },
    onError: () => {
      toast("Не удалось удалить мастера");
    },
  });

  function handleDelete(e: React.MouseEvent, m: any) {
    e.stopPropagation();
    if (!confirm(`Удалить мастера ${m.fullName}? Это действие необратимо.`)) return;
    deleteMaster.mutate(m.id);
  }

  function openEdit(e: React.MouseEvent, m: any) {
    e.stopPropagation();
    setEditMaster(m);
    setShowForm(false);
    setSelectedMaster(null);
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <PageHeading
          title="Мастера"
          subtitle={undefined}
          action={
            <Button onClick={() => { setShowForm((v) => !v); setEditMaster(null); setSelectedMaster(null); }}>
              {showForm ? "Скрыть форму" : "+ Добавить мастера"}
            </Button>
          }
        />

        {showForm && (
          <AddMasterForm
            onSuccess={() => {
              setShowForm(false);
              qc.invalidateQueries({ queryKey: ["admin-masters"] });
              qc.invalidateQueries({ queryKey: ["masters"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {editMaster && (
          <EditMasterForm
            master={editMaster}
            onSuccess={(updated) => {
              setEditMaster(null);
              qc.invalidateQueries({ queryKey: ["admin-masters"] });
              qc.invalidateQueries({ queryKey: ["masters"] });
              toast("Данные мастера обновлены", updated.fullName);
            }}
            onCancel={() => setEditMaster(null)}
          />
        )}

        <div className={classNames(
          "grid gap-4 mt-6",
          selectedMaster ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3",
        )}>
          {masters.map((m: any) => {
            const serviceNames = m.services?.map((row: { service: { name: string } }) => ({
              name: row.service.name,
            }));
            const specs = formatMasterSpecialties(serviceNames, m.specialties);
            const isSelected = selectedMaster?.id === m.id;
            const isEditing = editMaster?.id === m.id;
            const workStatus = getWorkStatus(m.workSchedule);
            return (
              <div
                key={m.id}
                onClick={() => { if (!isEditing) setSelectedMaster(isSelected ? null : m); }}
                className={classNames(
                  "bg-white border rounded-2xl p-5 flex gap-4 transition-all hover:shadow-md",
                  isEditing ? "border-amber-400 ring-1 ring-amber-300 cursor-default" :
                  isSelected ? "border-ink-500 ring-1 ring-ink-400 cursor-pointer" :
                  "border-cream-200 cursor-pointer",
                )}
              >
                <MasterAvatar
                  fullName={m.fullName}
                  avatarUrl={m.avatarUrl}
                  className="w-16 h-16 rounded-full object-cover object-top shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg text-ink-700">{m.fullName}</div>
                  <div className="text-xs uppercase tracking-widest text-ink-300 mt-1">
                    {specs ? `${specs} · разряд ${m.rank}` : `разряд ${m.rank}`}
                  </div>
                  <div className="text-xs text-ink-400 mt-1">{formatHallLabel(m.hall)}</div>
                  <div className="text-sm text-ink-500 mt-2">{m.bio || "Без описания"}</div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={workStatus.className}>{workStatus.label}</span>
                    <div className="ml-auto flex flex-col items-end gap-1">
                      <button
                        onClick={(e) => openEdit(e, m)}
                        className="text-xs text-ink-500 hover:text-ink-800 transition-colors px-2 py-1 rounded hover:bg-cream-100"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, m)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMaster && !editMaster && (
        <MasterSchedulePanel
          master={selectedMaster}
          onClose={() => setSelectedMaster(null)}
        />
      )}
    </div>
  );
}

// ─── Schedule Panel ───────────────────────────────────────────────────────────

function MasterSchedulePanel({ master, onClose }: { master: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: fetchedSchedule } = useQuery({
    queryKey: ["admin-master-schedule", master.id],
    queryFn: async () => {
      const data = (await api.get(`/admin/masters/${master.id}/schedule`)).data as WorkSchedule;
      const merged = buildDefaultSchedule();
      for (const key of Object.keys(merged)) {
        if (key in data) merged[key] = data[key];
      }
      return merged;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (fetchedSchedule) setSchedule(fetchedSchedule);
  }, [fetchedSchedule]);

  function toggleDay(key: string, active: boolean) {
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: active ? { start: SALON_START, end: SALON_END } : null,
      };
    });
  }

  function updateTime(key: string, field: "start" | "end", value: string) {
    setSchedule((prev) => {
      if (!prev || !prev[key]) return prev;
      return {
        ...prev,
        [key]: { ...(prev[key] as { start: string; end: string }), [field]: value },
      };
    });
  }

  async function save() {
    if (!schedule) return;
    setSaving(true);
    try {
      await api.put(`/admin/masters/${master.id}/schedule`, schedule);
      qc.invalidateQueries({ queryKey: ["admin-master-schedule", master.id] });
      toast("График сохранён", master.fullName);
    } catch {
      toast("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  }

  const hours = generateHourOptions();

  return (
    <div className="w-80 shrink-0 bg-white border border-cream-200 rounded-2xl p-5 h-fit sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display text-lg text-ink-700">График работы</div>
          <div className="text-xs text-ink-400 mt-0.5">{master.fullName}</div>
        </div>
        <button
          onClick={onClose}
          className="text-ink-300 hover:text-ink-600 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {!schedule ? (
        <div className="text-sm text-ink-400 text-center py-6">Загрузка…</div>
      ) : (
        <div className="space-y-2">
          {WEEK_DAYS.map(({ key, label }) => {
            const dayData = schedule[key];
            const isActive = dayData !== null;
            return (
              <div key={key} className="rounded-xl border border-cream-100 overflow-hidden">
                <label className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-cream-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => toggleDay(key, e.target.checked)}
                    className="accent-ink-700"
                  />
                  <span className={classNames("text-sm font-medium flex-1", isActive ? "text-ink-700" : "text-ink-400")}>
                    {label}
                  </span>
                  {!isActive && <span className="text-xs text-ink-300">выходной</span>}
                </label>

                {isActive && dayData && (
                  <div className="px-3 pb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-ink-400 block mb-1">Начало</label>
                      <select
                        value={dayData.start}
                        onChange={(e) => updateTime(key, "start", e.target.value)}
                        className="field-input text-sm py-1"
                      >
                        {hours.map((h) => (
                          <option key={h} value={h} disabled={h >= dayData.end}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-ink-400 block mb-1">Конец</label>
                      <select
                        value={dayData.end}
                        onChange={(e) => updateTime(key, "end", e.target.value)}
                        className="field-input text-sm py-1"
                      >
                        {hours.map((h) => (
                          <option key={h} value={h} disabled={h <= dayData.start}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Button onClick={save} disabled={saving || !schedule} className="w-full">
          {saving ? "Сохранение…" : "Сохранить график"}
        </Button>
      </div>
    </div>
  );
}

function getWorkStatus(workSchedule: WorkSchedule | null | undefined): {
  label: string;
  className: string;
} {
  if (!workSchedule || Object.keys(workSchedule).length === 0) {
    return { label: "График не задан", className: "pill-cream" };
  }
  const now = new Date();
  const dayKey = String(now.getDay()); // 0=Вс..6=Сб
  const dayData = workSchedule[dayKey];
  if (!dayData) {
    return { label: "Выходной", className: "pill-cream" };
  }
  const [sh, sm] = dayData.start.split(":").map(Number);
  const [eh, em] = dayData.end.split(":").map(Number);
  const totalNow = now.getHours() * 60 + now.getMinutes();
  const totalStart = sh * 60 + sm;
  const totalEnd = eh * 60 + em;
  if (totalNow >= totalStart && totalNow < totalEnd) {
    return { label: "На работе", className: "bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-0.5 rounded-full" };
  }
  return { label: "Не в смене", className: "pill-cream" };
}

function generateHourOptions(): string[] {
  const options: string[] = [];
  for (let h = 10; h <= 21; h++) {
    options.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 21) options.push(`${String(h).padStart(2, "0")}:30`);
  }
  return options;
}

// ─── Add Master Form ──────────────────────────────────────────────────────────

// ─── Edit Master Form ─────────────────────────────────────────────────────────

function EditMasterForm({
  master,
  onSuccess,
  onCancel,
}: {
  master: any;
  onSuccess: (updated: any) => void;
  onCancel: () => void;
}) {
  const initHall: "male" | "female" = master.hall?.name ?? "female";
  const initServiceIds: number[] = master.services?.map((r: any) => r.service?.id ?? r.serviceId) ?? [];

  const [hallName, setHallName] = useState<"male" | "female">(initHall);
  const [serviceIds, setServiceIds] = useState<number[]>(initServiceIds);
  const [specialties, setSpecialties] = useState<string[]>(master.specialties ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(master.avatarUrl ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: halls = [] } = useQuery({
    queryKey: ["halls"],
    queryFn: async () => (await api.get<Hall[]>("/halls")).data,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const selectedHall = halls.find((h) => h.name === hallName);
  const hallServices = useMemo(
    () => allServices.filter((s) => s.hallId === selectedHall?.id),
    [allServices, selectedHall?.id],
  );

  function onHallChange(name: "male" | "female") {
    setHallName(name);
    setServiceIds([]);
  }

  function toggleService(id: number) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSpecialty(tag: string) {
    setSpecialties((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const login = String(fd.get("login") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const phone = String(fd.get("phone") ?? "").trim();
    const rank = Number(fd.get("rank"));
    const experienceYears = Number(fd.get("experienceYears"));
    const bio = String(fd.get("bio") ?? "").trim();

    if (!fullName || !login || !phone) {
      setError("Заполните ФИО, логин и телефон.");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу зала.");
      return;
    }
    if (specialties.length === 0) {
      setError("Выберите хотя бы одну категорию.");
      return;
    }

    setLoading(true);
    try {
      let avatarUrl: string | undefined = master.avatarUrl ?? undefined;

      if (photoFile) {
        const photoData = new FormData();
        photoData.append("photo", photoFile);
        const { data } = await api.post("/admin/masters/photo", photoData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        avatarUrl = data.url;
      }

      const body: Record<string, any> = {
        fullName, login, phone, hallName, serviceIds, specialties, rank, experienceYears,
        bio: bio || undefined,
        avatarUrl,
      };
      if (password) body.password = password;

      const { data: updated } = await api.patch(`/admin/masters/${master.id}`, body);
      onSuccess(updated);
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "login_already_taken") setError("Логин уже занят.");
      else if (code === "invalid_services_for_hall") setError("Услуги не соответствуют выбранному залу.");
      else setError("Не удалось сохранить изменения. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="md:col-span-2 flex items-center justify-between">
        <div className="font-display text-xl text-ink-700">Редактирование: {master.fullName}</div>
        <button type="button" onClick={onCancel} className="text-ink-300 hover:text-ink-600 transition-colors text-2xl leading-none">×</button>
      </div>

      {error && (
        <div className="md:col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Photo */}
      <div className="md:col-span-2 flex items-center gap-5">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-full border-2 border-dashed border-amber-300 flex items-center justify-center cursor-pointer hover:border-ink-400 transition-colors overflow-hidden shrink-0"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Фото" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-ink-300">+</span>
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-ink-700">Фото мастера</div>
          <div className="text-xs text-ink-400 mt-0.5 mb-2">JPG, PNG до 5 МБ</div>
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="text-xs text-ink-600 underline hover:text-ink-900 transition-colors">
            {photoFile ? `Выбрано: ${photoFile.name}` : "Заменить фото"}
          </button>
          {photoFile && (
            <button type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(master.avatarUrl ?? null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="ml-3 text-xs text-red-400 hover:text-red-600 transition-colors">
              Отмена
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
        </div>
      </div>

      <Input label="ФИО" name="fullName" required defaultValue={master.fullName} />
      <Input label="Логин" name="login" required autoComplete="off" defaultValue={master.user?.login ?? ""} />
      <Input label="Новый пароль" name="password" type="password" minLength={3} autoComplete="new-password"
        placeholder="Оставьте пустым, чтобы не менять" />
      <Input label="Телефон" name="phone" type="tel" required placeholder="+7 (999) 000-00-00"
        defaultValue={master.user?.phone ?? ""} />

      <div>
        <label className="field-label">Зал</label>
        <select className="field-input bg-transparent" value={hallName}
          onChange={(e) => onHallChange(e.target.value as "male" | "female")}>
          <option value="female">Женский зал</option>
          <option value="male">Мужской зал</option>
        </select>
      </div>

      <div>
        <label className="field-label">Разряд (1–5)</label>
        <input name="rank" type="number" min={1} max={5} defaultValue={master.rank} className="field-input" required />
      </div>

      <div>
        <label className="field-label">Опыт (лет)</label>
        <input name="experienceYears" type="number" min={0} max={50} defaultValue={master.experienceYears} className="field-input" required />
      </div>

      <div className="md:col-span-2">
        <label className="field-label">Описание</label>
        <textarea name="bio" rows={3} className="field-input resize-none"
          placeholder="Кратко о специализации мастера" defaultValue={master.bio ?? ""} />
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Категории</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {MASTER_SPECIALTY_OPTIONS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleSpecialty(tag)}
              className={classNames(
                "text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors",
                specialties.includes(tag)
                  ? "bg-ink-700 text-cream-50 border-ink-700"
                  : "bg-cream-50 text-ink-400 border-cream-200 hover:border-ink-300",
              )}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Услуги ({formatHallLabel({ name: hallName })})</div>
        <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-cream-200 rounded-xl p-3">
          {hallServices.length === 0 && <p className="text-sm text-ink-400 col-span-2">Нет услуг для этого зала</p>}
          {hallServices.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
              <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={loading}>{loading ? "Сохранение…" : "Сохранить изменения"}</Button>
      </div>
    </form>
  );
}

// ─── Add Master Form ──────────────────────────────────────────────────────────

function AddMasterForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [hallName, setHallName] = useState<"male" | "female">("female");
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: halls = [] } = useQuery({
    queryKey: ["halls"],
    queryFn: async () => (await api.get<Hall[]>("/halls")).data,
  });

  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => (await api.get<Service[]>("/services")).data,
  });

  const selectedHall = halls.find((h) => h.name === hallName);
  const hallServices = useMemo(
    () => allServices.filter((s) => s.hallId === selectedHall?.id),
    [allServices, selectedHall?.id],
  );

  function toggleService(id: number) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSpecialty(tag: string) {
    setSpecialties((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  function onHallChange(name: "male" | "female") {
    setHallName(name);
    setServiceIds([]);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("fullName") ?? "").trim();
    const login = String(fd.get("login") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const phone = String(fd.get("phone") ?? "").trim();
    const rank = Number(fd.get("rank"));
    const experienceYears = Number(fd.get("experienceYears"));
    const bio = String(fd.get("bio") ?? "").trim();

    if (!fullName || !login || !password || !phone) {
      setError("Заполните ФИО, логин, пароль и телефон.");
      return;
    }
    if (serviceIds.length === 0) {
      setError("Выберите хотя бы одну услугу зала.");
      return;
    }
    if (specialties.length === 0) {
      setError("Выберите хотя бы одну категорию.");
      return;
    }

    setLoading(true);
    try {
      let avatarUrl: string | undefined;

      if (photoFile) {
        const photoData = new FormData();
        photoData.append("photo", photoFile);
        const { data } = await api.post("/admin/masters/photo", photoData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        avatarUrl = data.url;
      }

      await api.post("/admin/masters", {
        fullName,
        login,
        password,
        phone,
        hallName,
        serviceIds,
        specialties,
        rank,
        experienceYears,
        bio: bio || undefined,
        avatarUrl,
      });
      toast("Мастер добавлен", fullName);
      onSuccess();
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "login_already_taken") setError("Логин уже занят.");
      else if (code === "invalid_services_for_hall") setError("Услуги не соответствуют выбранному залу.");
      else setError("Не удалось создать мастера. Проверьте поля.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-cream-200 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div className="md:col-span-2 font-display text-xl text-ink-700">Новый мастер</div>

      {error && (
        <div className="md:col-span-2 text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Photo upload */}
      <div className="md:col-span-2 flex items-center gap-5">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 rounded-full border-2 border-dashed border-cream-300 flex items-center justify-center cursor-pointer hover:border-ink-400 transition-colors overflow-hidden shrink-0"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="Фото" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-ink-300">+</span>
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-ink-700">Фото мастера</div>
          <div className="text-xs text-ink-400 mt-0.5 mb-2">JPG, PNG до 5 МБ (необязательно)</div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-ink-600 underline hover:text-ink-900 transition-colors"
          >
            {photoFile ? `Выбрано: ${photoFile.name}` : "Выбрать фото"}
          </button>
          {photoFile && (
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="ml-3 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Убрать
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
            className="hidden"
          />
        </div>
      </div>

      <Input label="ФИО" name="fullName" required />
      <Input label="Логин" name="login" required autoComplete="off" />
      <Input label="Пароль" name="password" type="password" required minLength={3} autoComplete="new-password" />
      <Input label="Телефон" name="phone" type="tel" required placeholder="+7 (999) 000-00-00" />

      <div>
        <label className="field-label">Зал</label>
        <select
          className="field-input bg-transparent"
          value={hallName}
          onChange={(e) => onHallChange(e.target.value as "male" | "female")}
        >
          <option value="female">Женский зал</option>
          <option value="male">Мужской зал</option>
        </select>
      </div>

      <div>
        <label className="field-label">Разряд (1–5)</label>
        <input name="rank" type="number" min={1} max={5} defaultValue={3} className="field-input" required />
      </div>

      <div>
        <label className="field-label">Опыт (лет)</label>
        <input name="experienceYears" type="number" min={0} max={50} defaultValue={1} className="field-input" required />
      </div>

      <div className="md:col-span-2">
        <label className="field-label">Описание</label>
        <textarea name="bio" rows={3} className="field-input resize-none" placeholder="Кратко о специализации мастера" />
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Категории (для подписи на карточке)</div>
        <div className="flex flex-wrap gap-2 mt-2">
          {MASTER_SPECIALTY_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleSpecialty(tag)}
              className={classNames(
                "text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors",
                specialties.includes(tag)
                  ? "bg-ink-700 text-cream-50 border-ink-700"
                  : "bg-cream-50 text-ink-400 border-cream-200 hover:border-ink-300",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="field-label">Услуги ({formatHallLabel({ name: hallName })})</div>
        <div className="mt-2 grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-cream-200 rounded-xl p-3">
          {hallServices.length === 0 && (
            <p className="text-sm text-ink-400 col-span-2">Нет услуг для этого зала</p>
          )}
          {hallServices.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
              <input
                type="checkbox"
                checked={serviceIds.includes(s.id)}
                onChange={() => toggleService(s.id)}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Сохранение…" : "Создать мастера"}
        </Button>
      </div>
    </form>
  );
}
