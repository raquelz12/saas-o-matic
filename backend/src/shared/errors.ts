/** Elemento de `details` del formato de error (RF-30). */
export interface ErrorDetail {
  field: string;
  issue: string;
}

/** Error controlado: el `errorHandler` lo serializa tal cual con el formato de la spec 5.1. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Ruta o recurso inexistente → 404 `NOT_FOUND` con `details: []` (spec 5.1). */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

/** JSON inválido o body vacío en un POST → 400 `MALFORMED_JSON` (spec 3.1, paso 1). */
export class MalformedJsonError extends AppError {
  constructor() {
    super(400, 'MALFORMED_JSON', 'Malformed JSON');
    this.name = 'MalformedJsonError';
  }
}

/** Body de más de 10 kB → 413 `PAYLOAD_TOO_LARGE` (spec 5.1). */
export class PayloadTooLargeError extends AppError {
  constructor() {
    super(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
    this.name = 'PayloadTooLargeError';
  }
}

/** POST con un `Content-Type` distinto de `application/json` → 415 (spec 5.1). */
export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported media type');
    this.name = 'UnsupportedMediaTypeError';
  }
}

/** Fallos de la fase de validación (spec 3.1, pasos 2–5), todos en un solo 422. */
export class ValidationError extends AppError {
  constructor(details: ErrorDetail[]) {
    super(422, 'VALIDATION_ERROR', 'Request validation failed', details);
    this.name = 'ValidationError';
  }
}

/**
 * Violación de una restricción `UNIQUE` → 409 `DUPLICATE`, asociado al campo que la
 * causa para que el frontend lo pinte junto a él (spec 5.3, RF-36).
 */
export class DuplicateError extends AppError {
  constructor(field: string) {
    super(409, 'DUPLICATE', 'Resource already exists', [{ field, issue: 'DUPLICATE' }]);
    this.name = 'DuplicateError';
  }
}

/** Ruta existente con un método no soportado → 405 `METHOD_NOT_ALLOWED` (spec 5.1). */
export class MethodNotAllowedError extends AppError {
  constructor() {
    super(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
    this.name = 'MethodNotAllowedError';
  }
}
