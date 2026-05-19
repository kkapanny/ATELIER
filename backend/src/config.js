import "dotenv/config";

/**
 * Разрешённые Origin для CORS (credentials: true).
 * В .env можно указать несколько через запятую: http://localhost:5173,http://127.0.0.1:5173
 */
function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || "http://localhost:5173";
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const set = new Set(list);
  // В dev автоматически разрешаем и localhost, и 127.0.0.1 (разные Origin в браузере).
  if ((process.env.NODE_ENV || "development") !== "production") {
    set.add("http://localhost:5173");
    set.add("http://127.0.0.1:5173");
  }
  return [...set];
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  corsOrigins: parseCorsOrigins(),

  /**
   * Secure-cookie только по HTTPS. В Docker по умолчанию http://localhost — без Secure.
   * В проде за HTTPS выставить COOKIE_SECURE=true.
   */
  cookieSecure: process.env.COOKIE_SECURE === "true",

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@atelier.local",
  },
};
