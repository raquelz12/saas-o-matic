export type CompanyNameResult = 'OK' | 'INVALID_LENGTH' | 'INVALID_FORMAT';

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;
const WHITESPACE_RUN = /\s+/gu;
const FORBIDDEN_CHARS = /[\p{Cc}\p{Cf}\p{Cs}]/u;

/** RF-02: NFC, trim y colapso de cualquier `\s` Unicode a un único U+0020. */
export function normalizeCompanyName(raw: string): string {
  return raw.normalize('NFC').replace(WHITESPACE_RUN, ' ').trim();
}

/**
 * RF-02 sobre el valor ya normalizado: 2–100 code points y sin `\p{Cc}`, `\p{Cf}` ni `\p{Cs}`.
 * Si fallan las dos reglas, gana la longitud.
 */
export function validateCompanyName(normalized: string): CompanyNameResult {
  const length = [...normalized].length;
  if (length < MIN_LENGTH || length > MAX_LENGTH) {
    return 'INVALID_LENGTH';
  }
  return FORBIDDEN_CHARS.test(normalized) ? 'INVALID_FORMAT' : 'OK';
}
