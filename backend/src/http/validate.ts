import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { type ErrorDetail, ValidationError } from '../shared/errors.ts';
import { type RequestPart, translateIssues } from './zodIssues.ts';

/**
 * Un schema, o una fábrica que lo construye en cada petición: así un schema
 * puede depender de datos de la BD, como los países de `tax_rates` (architecture §2).
 */
export type SchemaSource = ZodType | (() => ZodType);

export type ValidationSchemas = Partial<Record<RequestPart, SchemaSource>>;

/** Salida validada de cada parte; `undefined` en las partes sin schema. */
export interface Validated<B = unknown, Q = unknown, P = unknown> {
  body: B;
  query: Q;
  params: P;
}

/** Orden de las partes, y por tanto de `details`: el de la URL y luego el body. */
const PARTS: readonly RequestPart[] = ['params', 'query', 'body'];

function resolve(source: SchemaSource): ZodType {
  return typeof source === 'function' ? source() : source;
}

/**
 * Valida `params`, `query` y `body` con sus schemas y acumula los errores de
 * todas las partes en un solo 422 (spec 3.1, pasos 2–5). Si todo es válido,
 * deja la salida en `res.locals.validated`: en Express 5 `req.query` es de
 * solo lectura (ADR-002).
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const details: ErrorDetail[] = [];
    const validated: Validated = { body: undefined, query: undefined, params: undefined };
    for (const part of PARTS) {
      const source = schemas[part];
      if (source === undefined) continue;
      const input: unknown = req[part];
      const result = resolve(source).safeParse(input);
      if (result.success) validated[part] = result.data;
      else details.push(...translateIssues(result.error.issues, input, part));
    }
    if (details.length > 0) {
      next(new ValidationError(details));
      return;
    }
    res.locals['validated'] = validated;
    next();
  };
}

/**
 * Lee la salida que dejó `validate`. El tipo lo fija quien monta la ruta con
 * los mismos schemas; no se comprueba en tiempo de ejecución.
 */
export function getValidated<B = unknown, Q = unknown, P = unknown>(
  res: Response,
): Validated<B, Q, P> {
  return res.locals['validated'] as Validated<B, Q, P>;
}
