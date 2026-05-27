import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "./config.js";
import { errorHandler, notFound } from "./middleware/error.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import hallsRoutes from "./modules/halls/halls.routes.js";
import servicesRoutes from "./modules/services/services.routes.js";
import mastersRoutes from "./modules/masters/masters.routes.js";
import appointmentsRoutes from "./modules/appointments/appointments.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.routes.js";
import reviewsRoutes from "./modules/reviews/reviews.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use("/uploads", express.static(join(__dirname, "..", "uploads")));
  app.use(morgan(config.env === "production" ? "combined" : "dev"));

  const limiter = rateLimit({ windowMs: 60_000, max: 200 });
  app.use("/api/", limiter);

  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/halls", hallsRoutes);
  app.use("/api/v1/services", servicesRoutes);
  app.use("/api/v1/masters", mastersRoutes);
  app.use("/api/v1/appointments", appointmentsRoutes);
  app.use("/api/v1/notifications", notificationsRoutes);
  app.use("/api/v1/reviews", reviewsRoutes);
  app.use("/api/v1/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
