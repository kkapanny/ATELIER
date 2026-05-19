import { verifyAccessToken } from "../lib/jwt.js";
import { HttpError } from "./error.js";

/**
 * Достаёт JWT из заголовка Authorization: Bearer <token>, кладёт payload в req.user.
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return next(new HttpError(401, "unauthorized"));
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new HttpError(401, "invalid_token"));
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Bearer" && token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // ignore — гостевой режим
    }
  }
  next();
}
