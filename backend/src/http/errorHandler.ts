import type { ErrorRequestHandler } from 'express';
import { AppError, MalformedJsonError, PayloadTooLargeError } from '../shared/errors.ts';
import type { Logger } from '../shared/logger.ts';

/** Errores de body-parser que forman parte del contrato (spec 3.1, paso 1). */
const BODY_PARSER_ERRORS: Record<string, () => AppError> = {
  'entity.parse.failed': () => new MalformedJsonError(),
  'entity.too.large': () => new PayloadTooLargeError(),
};

/** Traduce un error de body-parser conocido a su `AppError`; el resto, tal cual. */
function toAppError(err: unknown): unknown {
  if (typeof err !== 'object' || err === null || !('type' in err)) return err;
  const { type } = err;
  const translate = typeof type === 'string' ? BODY_PARSER_ERRORS[type] : undefined;
  return translate ? translate() : err;
}

/**
 * Manejador central de errores (architecture §5). Va el último en `app.ts`.
 * Un `AppError` se serializa con el formato 5.1; cualquier otro error es un 500 genérico
 * cuya traza va solo al logger, nunca a la respuesta.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (thrown: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(thrown);
      return;
    }
    const err = toAppError(thrown);
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
