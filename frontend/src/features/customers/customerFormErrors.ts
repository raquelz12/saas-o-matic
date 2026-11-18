import { ApiError } from '../../api/client.ts';
import type { CreateCustomerInput } from '../../api/types.ts';

// Validación local y mensajes del formulario de alta (spec 3.7). En el cliente solo se comprueban
// los obligatorios y las longitudes tras trim y colapso de espacios; el algoritmo del identificador
// fiscal se ejecuta únicamente en el backend, y su respuesta es siempre la que manda.

export type Field = keyof CreateCustomerInput;
export type FormValues = CreateCustomerInput;
export type FieldErrors = Partial<Record<Field, string>>;

export const FIELDS: readonly Field[] = ['companyName', 'taxId', 'email', 'country', 'plan'];

export const GENERAL_ERROR = 'No se ha podido crear el cliente. Inténtalo de nuevo.';

const LENGTH_MESSAGES: Record<Field, string> = {
  companyName: 'Debe tener entre 2 y 100 caracteres.',
  taxId: 'Debe tener entre 5 y 20 caracteres.',
  email: 'Debe tener como máximo 254 caracteres.',
  country: 'Valor no válido.',
  plan: 'Valor no válido.',
};

const ISSUE_MESSAGES: Record<string, string> = {
  REQUIRED: 'Este campo es obligatorio.',
  INVALID_FORMAT: 'El formato no es válido.',
  INVALID_CHECKSUM: 'El identificador fiscal no es válido.',
  UNSUPPORTED_VALUE: 'Valor no admitido.',
  DUPLICATE: 'Ya existe un cliente con este identificador fiscal en este país.',
};

/** Texto de un issue de `details[]` (3.2) para un campo del formulario. */
export function issueMessage(field: Field, issue: string): string {
  if (issue === 'INVALID_LENGTH') return LENGTH_MESSAGES[field];
  return ISSUE_MESSAGES[issue] ?? 'Valor no válido.';
}

/** Longitud en code points tras trim y colapso de espacios `\s` Unicode (spec 3.7). */
function collapsedLength(value: string): number {
  return [...value.trim().replace(/\s+/gu, ' ')].length;
}

/** Issue de longitud, o `undefined` si la cumple. `taxId`: solo el mínimo (opción 1a, R-127). */
function lengthIssue(field: Field, length: number): string | undefined {
  if (field === 'companyName' && (length < 2 || length > 100)) return 'INVALID_LENGTH';
  if (field === 'taxId' && length < 5) return 'INVALID_LENGTH';
  if (field === 'email' && length > 254) return 'INVALID_LENGTH';
  return undefined;
}

export function validateLocally(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of FIELDS) {
    const length = collapsedLength(values[field]);
    const issue = length === 0 ? 'REQUIRED' : lengthIssue(field, length);
    if (issue) errors[field] = issueMessage(field, issue);
  }
  return errors;
}

export interface SubmitErrors {
  fields: FieldErrors;
  /** Aviso general cuando el error no corresponde a ningún campo del formulario. */
  general: string | null;
}

function isField(value: string): value is Field {
  return (FIELDS as readonly string[]).includes(value);
}

/** Reparte los `details[]` de un 422 o un 409 por campo; el resto va al aviso general. */
export function errorsFromApi(error: unknown): SubmitErrors {
  const details = error instanceof ApiError ? error.details : [];
  const fields: FieldErrors = {};
  let unmatched = details.length === 0;
  for (const { field, issue } of details) {
    if (!isField(field)) {
      unmatched = true;
    } else if (fields[field] === undefined) {
      fields[field] = issueMessage(field, issue);
    }
  }
  return { fields, general: unmatched ? GENERAL_ERROR : null };
}
