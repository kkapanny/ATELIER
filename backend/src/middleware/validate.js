/**
 * Валидация тела запроса по Zod-схеме. После успешной проверки кладёт
 * безопасные данные в req.body.
 */
export const validateBody = (schema) =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    next();
  };

export const validateQuery = (schema) =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    req.validatedQuery = parsed.data;
    next();
  };
