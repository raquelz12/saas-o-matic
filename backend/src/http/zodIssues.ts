import type { ZodError } from 'zod';
import type { ErrorDetail } from '../shared/errors.ts';

type ZodIssue = ZodError['issues'][number];

/** Parte de la petición validada; en la raíz da nombre al campo (`field: "body"`). */
export type RequestPart = 'params' | 'query' | 'body';

/** Issues de campo del catálogo 3.2 (sin `DUPLICATE`, que es un 409). */
const CATALOG_ISSUES: ReadonlySet<string> = new Set([
  'REQUIRED',
  'INVALID_TYPE',
  'UNKNOWN_FIELD',
  'OUT_OF_RANGE',
  'INVALID_LENGTH',
  'INVALID_FORMAT',
  'INVALID_CHECKSUM',
  'UNSUPPORTED_VALUE',
]);

/** Orígenes numéricos de `too_small` / `too_big`; el resto son longitudes. */
const NUMERIC_ORIGINS: ReadonlySet<string> = new Set(['number', 'int', 'bigint']);

/** Issue por defecto para códigos de zod sin regla propia (R-108). */
const FALLBACK_ISSUE = 'INVALID_FORMAT';

/** Valor de la entrada original en `path`, o `undefined` si no existe. */
function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = input;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current;
}

/** `params.issue` de un refine, si es un issue del catálogo. */
function customIssue(issue: ZodIssue): string | undefined {
  if (issue.code !== 'custom') return undefined;
  const value: unknown = issue.params?.['issue'];
  return typeof value === 'string' && CATALOG_ISSUES.has(value) ? value : undefined;
}

/** Issue del catálogo para un issue de zod cuyo valor está presente. */
function issueOf(issue: ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return 'INVALID_TYPE';
    case 'too_small':
    case 'too_big':
      return NUMERIC_ORIGINS.has(issue.origin) ? 'OUT_OF_RANGE' : 'INVALID_LENGTH';
    case 'invalid_value':
      return 'UNSUPPORTED_VALUE';
    case 'invalid_format':
      return 'INVALID_FORMAT';
    default:
      return customIssue(issue) ?? FALLBACK_ISSUE;
  }
}

/** Ruta del campo unida por `.`; la raíz se nombra con la parte de la petición. */
function fieldOf(path: readonly PropertyKey[], part: RequestPart): string {
  return path.length === 0 ? part : path.map(String).join('.');
}

/** Detalles de un issue: uno por clave en `unrecognized_keys`, uno en el resto. */
function detailsOf(issue: ZodIssue, input: unknown, part: RequestPart): ErrorDetail[] {
  if (issue.code === 'unrecognized_keys') {
    return issue.keys.map((key) => ({
      field: fieldOf([...issue.path, key], part),
      issue: 'UNKNOWN_FIELD',
    }));
  }
  // Ausente o `null` → REQUIRED con cualquier código: zod da `invalid_value` en un enum ausente.
  const value = valueAt(input, issue.path);
  const missing = issue.path.length > 0 && (value === undefined || value === null);
  return [{ field: fieldOf(issue.path, part), issue: missing ? 'REQUIRED' : issueOf(issue) }];
}

/**
 * Traduce los issues de zod 4 al catálogo de la spec 3.2 (architecture §5).
 * Necesita la entrada original para distinguir `REQUIRED` de `INVALID_TYPE`.
 * Se queda con el primer issue de cada campo: un campo que falla en un paso
 * no se evalúa en los siguientes (spec 3.1).
 */
export function translateIssues(
  issues: readonly ZodIssue[],
  input: unknown,
  part: RequestPart,
): ErrorDetail[] {
  const byField = new Map<string, ErrorDetail>();
  for (const detail of issues.flatMap((issue) => detailsOf(issue, input, part))) {
    if (!byField.has(detail.field)) byField.set(detail.field, detail);
  }
  return [...byField.values()];
}
