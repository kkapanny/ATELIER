import { Worker } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { sendPush, setupWebPush } from "../lib/webpush.js";
import { REMINDERS_QUEUE } from "./reminders.queue.js";

setupWebPush();

const TITLES = {
  reminder_24h: "Напоминание за 24 часа",
  reminder_3h: "Скоро визит! Через 3 часа",
  repeat_visit: "Время записаться снова",
};

export function startRemindersWorker() {
  const worker = new Worker(
    REMINDERS_QUEUE,
    async (job) => {
      const { notificationId, appointmentId, type } = job.data;

      const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
      if (!notif || notif.status !== "queued") return; // отменили — пропускаем

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { master: true, service: true, client: { include: { user: true } } },
      });
      if (!appointment) return;
      if (appointment.status === "cancelled" || appointment.status === "no_show") return;

      const subs = await prisma.pushSubscription.findMany({
        where: { userId: appointment.client.userId },
      });
      if (subs.length === 0) {
        await prisma.notification.update({
          where: { id: notif.id },
          data: { status: "failed", errorMessage: "no_subscriptions" },
        });
        return;
      }

      const payload = {
        title: TITLES[type] || "ATELIER",
        body: `${appointment.master.fullName} · ${appointment.service.name} · ${formatDate(appointment.startsAt)}`,
        url: "/client/cabinet",
        appointmentId: appointment.id,
      };

      let anyOk = false;
      for (const sub of subs) {
        const result = await sendPush(sub, payload);
        if (result.ok) anyOk = true;
        if (result.expired) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }

      await prisma.notification.update({
        where: { id: notif.id },
        data: anyOk
          ? { status: "sent", sentAt: new Date() }
          : { status: "failed", errorMessage: "delivery_failed" },
      });
    },
    { connection: createRedisConnection(), concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[reminders] job ${job?.id} failed:`, err.message);
  });

  return worker;
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
}
