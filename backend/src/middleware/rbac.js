import { HttpError } from "./error.js";

/**
 * Простой RBAC: пускает только если роль текущего пользователя входит в список.
 * Использование: router.get("/admin", authenticate, requireRole("admin"), handler)
 */
export const requireRole = (...allowed) =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "unauthorized"));
    if (!allowed.includes(req.user.role)) return next(new HttpError(403, "forbidden"));
    next();
  };
