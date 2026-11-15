export type TaxIdResult = 'OK' | 'INVALID_FORMAT' | 'INVALID_CHECKSUM';

const SPANISH_TAX_ID_LENGTH = 9;
const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIXES = 'XYZ';
const SPECIAL_NIF_PREFIXES = 'KLM';

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function allDigits(value: string): boolean {
  return [...value].every(isDigit);
}

/** Letra de control (3.6.3, paso 2 en adelante): válida si coincide con tabla[n mod 23]. */
function checkControlLetter(digits: string, control: string): TaxIdResult {
  if (!allDigits(digits) || !CONTROL_LETTERS.includes(control)) {
    return 'INVALID_FORMAT';
  }
  const expected = CONTROL_LETTERS[Number(digits) % CONTROL_LETTERS.length];
  return control === expected ? 'OK' : 'INVALID_CHECKSUM';
}

/**
 * Valida un identificador fiscal español ya normalizado (RF-05, spec 3.6).
 * El tipo se detecta comprobando cada posición, sin regex. Nunca lanza.
 */
export function validateSpanishTaxId(normalized: string): TaxIdResult {
  if (normalized.length !== SPANISH_TAX_ID_LENGTH) {
    return 'INVALID_FORMAT';
  }
  const first = normalized.charAt(0);
  const middle = normalized.slice(1, 8);
  const control = normalized.charAt(8);

  if (isDigit(first)) {
    return checkControlLetter(first + middle, control);
  }
  const nieIndex = NIE_PREFIXES.indexOf(first);
  if (nieIndex >= 0) {
    return checkControlLetter(String(nieIndex) + middle, control);
  }
  if (SPECIAL_NIF_PREFIXES.includes(first)) {
    return checkControlLetter(middle, control);
  }
  // Las iniciales de CIF se añaden en T-08; hasta entonces, como cualquier otra.
  return 'INVALID_FORMAT';
}
