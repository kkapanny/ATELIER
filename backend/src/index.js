import { createApp } from "./app.js";
import { config } from "./config.js";
import { setupWebPush } from "./lib/webpush.js";
import { startRemindersWorker } from "./queue/reminders.worker.js";

async function main() {
  setupWebPush();

  // Воркер очереди напоминаний — запускаем в том же процессе для упрощения
  // (в production выделяется отдельным контейнером).
  let worker = null;
  try {
    worker = startRemindersWorker();
    console.log("[queue] reminders worker started");
  } catch (e) {
    console.warn("[queue] worker not started:", e.message);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`🚀 ATELIER API запущен на http://localhost:${config.port}/api/v1`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[shutdown] получен сигнал ${signal}`);
    server.close();
    if (worker) await worker.close().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
