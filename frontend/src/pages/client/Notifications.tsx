import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { enableWebPush, disableWebPush } from "@/lib/push";
import { toast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

export function ClientNotifications() {
  const qc = useQueryClient();
  const { data: devices = [] } = useQuery({
    queryKey: ["push-devices"],
    queryFn: async () => (await api.get("/notifications/devices")).data,
  });

  async function handleEnable() {
    const res = await enableWebPush();
    if (res.ok) {
      toast("Push-уведомления включены", "Этот браузер подписан");
      qc.invalidateQueries({ queryKey: ["push-devices"] });
    } else {
      toast("Не удалось включить push", reasonText(res.reason), "error");
    }
  }

  async function handleDisable() {
    await disableWebPush();
    toast("Push-уведомления отключены", undefined, "info");
    qc.invalidateQueries({ queryKey: ["push-devices"] });
  }

  return (
    <div className="page-shell max-w-3xl">
      <h1 className="font-display text-4xl text-ink-700">Push-уведомления</h1>
      <p className="text-ink-400 text-sm mt-2">
        Атомарные напоминания за 24 часа, за 3 часа и о повторной записи доставляются по
        стандарту Web Push API через Service Worker. Не нужно ставить мессенджеры.
      </p>

      <div className="bg-white border border-cream-200 rounded-2xl p-6 mt-8 flex items-center gap-5">
        <div className="flex-1">
          <div className="font-display text-xl text-ink-700">Push в этом браузере</div>
          <div className="text-sm text-ink-400 mt-1">Включается одной кнопкой; в любой момент можно отозвать.</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEnable}>Включить</Button>
          <Button variant="secondary" onClick={handleDisable}>Отключить</Button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-2xl text-ink-700 mb-3">Подписанные устройства</h2>
        {devices.length === 0 && (
          <div className="bg-white border border-dashed border-cream-300 rounded-xl p-8 text-center text-ink-400">
            Подписанных устройств пока нет.
          </div>
        )}
        {devices.map((d: any) => (
          <div key={d.id} className="bg-white border border-cream-200 rounded-xl p-4 flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-ink-700">{d.userAgent || "Браузер"}</div>
              <div className="text-xs text-ink-400 mt-1">подписан {formatDate(d.createdAt, "d MMMM yyyy")}</div>
            </div>
            <span className="pill-cream">активна</span>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white border border-cream-200 rounded-2xl p-6">
        <h2 className="font-display text-xl text-ink-700">Типы напоминаний</h2>
        <div className="space-y-4 mt-4">
          <ToggleRow title="За 24 часа до визита" desc="Базовое напоминание о записи на следующий день" />
          <ToggleRow title="За 3 часа до визита" desc="Чтобы не забыть собраться и выйти вовремя" />
          <ToggleRow title="Напоминание о повторной записи" desc="На основе совета мастера: 28/14/30 дней" />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-center justify-between border-b border-cream-200 last:border-b-0 pb-3 last:pb-0">
      <div>
        <div className="text-sm text-ink-700">{title}</div>
        <div className="text-xs text-ink-400">{desc}</div>
      </div>
      <Toggle defaultChecked />
    </div>
  );
}

function reasonText(r?: string) {
  if (r === "denied") return "Разрешение отклонено в браузере";
  if (r === "unsupported") return "Браузер не поддерживает Web Push API";
  if (r === "no_vapid") return "На сервере не сконфигурированы VAPID-ключи";
  return undefined;
}
