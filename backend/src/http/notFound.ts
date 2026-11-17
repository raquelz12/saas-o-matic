import type { RequestHandler } from 'express';
import { NotFoundError } from '../shared/errors.ts';

/** Respaldo para cualquier ruta que no ha atendido nadie → 404 `NOT_FOUND` (CA-87). */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError());
};
