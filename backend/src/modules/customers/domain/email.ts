export type EmailLengthResult = 'OK' | 'INVALID_LENGTH';

const MAX_LENGTH = 254;

/** RF-03: trim y minúsculas. El formato lo valida `z.email()` en el schema. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** RF-03 sobre el valor ya normalizado: como máximo 254 code points. */
export function validateEmailLength(normalized: string): EmailLengthResult {
  return [...normalized].length > MAX_LENGTH ? 'INVALID_LENGTH' : 'OK';
}
