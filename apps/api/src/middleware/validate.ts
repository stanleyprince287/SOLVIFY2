import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

type Source = 'body' | 'query' | 'params';

/** Replaces the request property with parsed (and coerced) data. Server-side validation is authoritative. */
export const validate =
  (schema: ZodTypeAny, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };