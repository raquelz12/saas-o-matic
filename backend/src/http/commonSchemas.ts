import { z } from 'zod';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE, MAX_PAGE_SIZE } from '../shared/pagination.ts';

/** Entero positivo en decimal, sin signo, ceros a la izquierda ni decimales (spec 3.5). */
const POSITIVE_INT = /^[1-9][0-9]*$/;

/** Máximo de `:id` (spec 3.5): el entero de 32 bits con signo. */
const MAX_ID = 2_147_483_647;

/**
 * `:id` de ruta: un único refine que cubre formato y máximo, para que cualquier
 * fallo dé `INVALID_FORMAT` (spec 3.5, CA-79) y nunca `OUT_OF_RANGE`.
 */
const idParam = z
  .string()
  .refine((value) => POSITIVE_INT.test(value) && Number(value) <= MAX_ID, {
    params: { issue: 'INVALID_FORMAT' },
  })
  .transform(Number);

/** Parámetros de `/customers/:id` y `/customers/:id/simulations`. */
export const idParamsSchema = z.strictObject({ id: idParam });

/**
 * Entero de query con formato `^[1-9][0-9]*$` (→ `INVALID_FORMAT`) y máximo
 * (→ `OUT_OF_RANGE`); ausente, toma el valor por defecto (RF-28).
 */
function positiveIntQuery(max: number, defaultValue: number) {
  return z
    .string()
    .regex(POSITIVE_INT)
    .transform(Number)
    .pipe(z.int().min(1).max(max))
    .default(defaultValue);
}

/** Campos de paginación, para componer queries que añaden otros (`search`, T-20). */
export const paginationQueryFields = {
  page: positiveIntQuery(MAX_PAGE, DEFAULT_PAGE),
  pageSize: positiveIntQuery(MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
};

/** Query de los listados paginados sin más parámetros. */
export const paginationQuerySchema = z.strictObject(paginationQueryFields);

/** Query de las rutas sin parámetros: cualquier clave → `UNKNOWN_FIELD` (spec 3.5). */
export const emptyQuerySchema = z.strictObject({});
