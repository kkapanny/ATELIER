import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";

export const REMINDERS_QUEUE = "reminders";

let queue = null;
function getQueue() {
  if (queue) return queue;
  queue = new Queue(REMINDERS_QUEUE, { connection: createRedisConnection() });
  return queue;
}

/**
 * Планирует push-напоминания для записи:
 * - reminder_24h (за 24 часа до начала)
 * - reminder_3h  (за 3 часа до начала)
 * - repeat_visit (через repeatAfterDays — если передано)
 *
 * Создаёт записи в таблице notifications и ставит отложенные задачи в BullMQ.
 */
export async function scheduleReminders(appointment, opts = {}) {
  const start = new Date(appointment.startsAt).getTime();
  const planned = [
    { type: "reminder_24h", at: start - 24 * 60 * 60 * 1000 },
    { type: "reminder_3h", at: start - 3 * 60 * 60 * 1000 },
  ];
  if (opts.repeatAfterDays) {
    planned.push({
      type: "repeat_visit",
      at: start + opts.repeatAfterDays * 24 * 60 * 60 * 1000,
    });
  }

  const now = Date.now();
  for (const item of planned) {
    if (item.at <= now) continue; // прошло — не ставим
    try {
      const notif = await prisma.notification.create({
        data: {
          appointmentId: appointment.id,
          type: item.type,
          plannedAt: new Date(item.at),
          status: "queued",
        },
      });
      await getQueue().add(
        item.type,
        { notificationId: notif.id, appointmentId: appointment.id, type: item.type },
        { delay: item.at - now, attempts: 5, backoff: { type: "exponential", delay: 60_000 } }
      );
    } catch (e) {
      console.error("[reminders] schedule error:", e.message);
    }
  }
}

export async function cancelReminders(appointmentId) {
  try {
    await prisma.notification.updateMany({
      where: { appointmentId, status: "queued" },
      data: { status: "failed", errorMessage: "cancelled" },
    });
    // Сами BullMQ-задачи не отменяем поштучно — worker увидит изменённый статус и пропустит.
  } catch (e) {
    console.error("[reminders] cancel error:", e.message);
  }
}
