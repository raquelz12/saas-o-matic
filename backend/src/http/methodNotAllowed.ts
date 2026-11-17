import type { RequestHandler } from 'express';
import { MethodNotAllowedError } from '../shared/errors.ts';

/**
 * Último handler de cada ruta: `router.route('/x').get(...).all(methodNotAllowed)`.
 * Un método que la ruta no define → 405 `METHOD_NOT_ALLOWED` (spec 5.1, RF-31).
 * Sin cabecera `Allow`: la spec no la pide.
 */
export const methodNotAllowed: RequestHandler = (_req, _res, next) => {
  next(new MethodNotAllowedError());
};
