/** Logger de la aplicación. Se inyecta para poder sustituirlo en los tests. */
export interface Logger {
  info(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
}

/** Único punto del backend que escribe en `console` (CLAUDE.md). */
export const logger: Logger = {
  info: (message, ...meta) => console.info(message, ...meta),
  warn: (message, ...meta) => console.warn(message, ...meta),
  error: (message, ...meta) => console.error(message, ...meta),
};
