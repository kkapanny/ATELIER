import { FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export function ClientProfile() {
  const qc = useQueryClient();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/users/me")).data,
  });

  const update = useMutation({
    mutationFn: async (body: any) => (await api.patch("/users/me", body)).data,
    onSuccess: () => {
      toast("Профиль обновлён");
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    update.mutate({
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      email: fd.get("email") || undefined,
      gender: fd.get("gender"),
    });
  }

  if (!me) return <div className="page-shell">Загрузка…</div>;
  const profile = me.client ?? me.master;

  return (
    <div className="page-shell">
      <h1 className="font-display text-4xl text-ink-700">Редактирование профиля</h1>
      <form onSubmit={onSubmit} className="mt-8 max-w-2xl bg-white rounded-3xl border border-cream-200 p-8 grid grid-cols-2 gap-5">
        <div className="col-span-2"><Input label="ФИО" name="fullName" defaultValue={profile.fullName} /></div>
        <Input label="Телефон" name="phone" defaultValue={profile.phone || me.phone || ""} />
        <Input label="Email" name="email" defaultValue={me.email || ""} />
        <div>
          <label className="field-label">Пол</label>
          <select name="gender" className="field-input bg-transparent" defaultValue={profile.gender}>
            <option value="female">Женский</option>
            <option value="male">Мужской</option>
          </select>
        </div>
        <div />
        <div className="col-span-2 mt-2">
          <Button disabled={update.isPending}>{update.isPending ? "Сохранение…" : "Сохранить"}</Button>
        </div>
      </form>
    </div>
  );
}
