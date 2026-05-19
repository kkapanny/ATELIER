import { ZodError } from "zod";

/**
 * Удобный класс для бизнес-ошибок с кодом ответа.
 */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(_req, res) {
  res.status(404).json({ error: "not_found", message: "Маршрут не найден" });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "validation_error",
      message: "Некорректные данные",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error("[error]", err);
  res.status(500).json({ error: "internal_error", message: err.message || "Server error" });
}
