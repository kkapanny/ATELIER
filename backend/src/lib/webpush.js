import webpush from "web-push";
import { config } from "../config.js";

let configured = false;

/**
 * Лениво конфигурируем VAPID — если ключи не заданы, web-push останется
 * в режиме "no-op", а сервер продолжит работать (полезно для dev-окружения
 * без сгенерированных ключей).
 */
export function setupWebPush() {
  if (configured) return;
  if (!config.vapid.publicKey || !config.vapid.privateKey) {
    console.warn("[web-push] VAPID-ключи не заданы — push доставка отключена");
    return;
  }
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
  configured = true;
}

/**
 * Отправка уведомления одной push-подписке.
 * Возвращает { ok: true } или { ok: false, statusCode, expired }.
 */
export async function sendPush(subscription, payload) {
  if (!configured) setupWebPush();
  if (!configured) return { ok: false, statusCode: 0, expired: false };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dhKey, auth: subscription.authKey },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err) {
    const code = err?.statusCode ?? 0;
    const expired = code === 410 || code === 404;
    return { ok: false, statusCode: code, expired, error: err?.body || err?.message };
  }
}
