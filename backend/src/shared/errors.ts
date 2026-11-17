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
