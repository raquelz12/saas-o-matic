import type { ErrorRequestHandler } from 'express';
import { AppError } from '../shared/errors.ts';
import type { Logger } from '../shared/logger.ts';

/**
 * Manejador central de errores (architecture §5). Va el último en `app.ts`.
 * Un `AppError` se serializa con el formato 5.1; cualquier otro error es un 500 genérico
 * cuya traza va solo al logger, nunca a la respuesta.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof AppError) {
      res.status(err.status).json({
        error: { code: err.code, message: err.message, details: err.details },
      });
      return;
    }
    logger.error('Unhandled error', err);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: [] },
    });
  };
}
