import { api } from "./api";

/**
 * Конвертация base64 → Uint8Array (для applicationServerKey).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Подписывает текущий браузер на web push:
 * 1) регистрирует Service Worker
 * 2) запрашивает у браузера разрешение
 * 3) создаёт PushSubscription через VAPID public key
 * 4) отправляет подписку на бэкенд
 */
export async function enableWebPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const { publicKey } = (await api.get("/notifications/vapid-public-key")).data as { publicKey: string };
  if (!publicKey) return { ok: false, reason: "no_vapid" };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
  });

  const json = subscription.toJSON();
  await api.post("/notifications/subscribe", {
    endpoint: json.endpoint,
    keys: json.keys,
    user_agent: navigator.userAgent,
  });
  return { ok: true };
}

export async function disableWebPush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.delete("/notifications/subscribe", { data: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  }
}
