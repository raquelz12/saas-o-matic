export type TaxIdResult = 'OK' | 'INVALID_FORMAT' | 'INVALID_CHECKSUM';

const SPANISH_TAX_ID_LENGTH = 9;
const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const NIE_PREFIXES = 'XYZ';
const SPECIAL_NIF_PREFIXES = 'KLM';
const CIF_CONTROL_LETTERS = 'JABCDEFGHI';
const CIF_LETTER_ONLY = 'PQRSNW';
const CIF_DIGIT_ONLY = 'ABEH';
const CIF_DIGIT_OR_LETTER = 'CDFGJUV';

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

function isCifInitial(char: string): boolean {
  return (CIF_LETTER_ONLY + CIF_DIGIT_ONLY + CIF_DIGIT_OR_LETTER).includes(char);
}

/** Pasos 1–4 de 3.6.6: D a partir de los 7 dígitos centrales. */
function cifControlValue(digits: string): number {
  let sum = 0;
  [...digits].forEach((char, index) => {
    const digit = Number(char);
    if (index % 2 === 1) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    }
  });
  return (10 - (sum % 10)) % 10;
}

/** CIF (3.6.6): formato, forma exigida por la letra inicial y valor del control. */
function checkCif(initial: string, digits: string, control: string): TaxIdResult {
  const controlIsDigit = isDigit(control);
  if (!allDigits(digits) || (!controlIsDigit && !CIF_CONTROL_LETTERS.includes(control))) {
    return 'INVALID_FORMAT';
  }
  const formAllowed = controlIsDigit
    ? !CIF_LETTER_ONLY.includes(initial)
    : !CIF_DIGIT_ONLY.includes(initial);
  if (!formAllowed) {
    return 'INVALID_CHECKSUM';
  }
  const value = cifControlValue(digits);
  const expected = controlIsDigit ? String(value) : CIF_CONTROL_LETTERS.charAt(value);
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
  if (isCifInitial(first)) {
    return checkCif(first, middle, control);
  }
  return 'INVALID_FORMAT';
}
