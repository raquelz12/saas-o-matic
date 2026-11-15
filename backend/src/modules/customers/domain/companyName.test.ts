import { describe, expect, it } from 'vitest';
import { normalizeCompanyName, validateCompanyName } from './companyName.ts';

function check(raw: string): string {
  return validateCompanyName(normalizeCompanyName(raw));
}

describe('normalizeCompanyName', () => {
  it('quita espacios iniciales y finales y colapsa los internos a U+0020', () => {
    expect(normalizeCompanyName('  Peña   Hermanos  SA  ')).toBe('Peña Hermanos SA');
  });

  it('trata NBSP (U+00A0) y U+2009 como espacios', () => {
    expect(normalizeCompanyName('Peña   Hermanos SA')).toBe('Peña Hermanos SA');
  });

  it('colapsa tabuladores y saltos de línea antes de validar (normalizar va antes que el formato)', () => {
    expect(normalizeCompanyName('Acme\t\r\nCorp')).toBe('Acme Corp');
  });

  it('trata U+FEFF como espacio (\\s de JS) y lo elimina en los extremos', () => {
    expect(normalizeCompanyName('﻿Acme﻿')).toBe('Acme');
  });

  it('aplica NFC: "Mu\\u0308ller" → "Müller" (6 code points)', () => {
    const normalized = normalizeCompanyName('Müller');
    expect(normalized).toBe('Müller');
    expect([...normalized]).toHaveLength(6);
  });

  it('no sanea el HTML', () => {
    expect(normalizeCompanyName('<b>Acme</b>')).toBe('<b>Acme</b>');
  });
});

describe('validateCompanyName: longitud', () => {
  it('CA-39: "A" → INVALID_LENGTH', () => {
    expect(check('A')).toBe('INVALID_LENGTH');
  });

  it('CA-40: 101 code points → INVALID_LENGTH', () => {
    expect(check('a'.repeat(101))).toBe('INVALID_LENGTH');
  });

  it('2 y 100 code points → OK (límites incluidos)', () => {
    expect(check('ab')).toBe('OK');
    expect(check('a'.repeat(100))).toBe('OK');
  });

  it('cuenta code points, no unidades UTF-16: 100 emojis → OK, 101 → INVALID_LENGTH', () => {
    expect(check('🚀'.repeat(100))).toBe('OK');
    expect(check('🚀'.repeat(101))).toBe('INVALID_LENGTH');
  });

  it('la longitud se mide tras normalizar: " A " → INVALID_LENGTH; solo espacios → INVALID_LENGTH', () => {
    expect(check(' A ')).toBe('INVALID_LENGTH');
    expect(check('   ')).toBe('INVALID_LENGTH');
  });

  it('si fallan longitud y formato, gana la longitud: "\\u0007" → INVALID_LENGTH', () => {
    expect(check('\u0007')).toBe('INVALID_LENGTH');
  });
});

describe('validateCompanyName: formato', () => {
  it('CA-41: carácter de control U+0007 → INVALID_FORMAT', () => {
    expect(check('Acme\u0007 SL')).toBe('INVALID_FORMAT');
  });

  it('CA-43: "Müller & Söhne GmbH" → OK (se acepta Unicode)', () => {
    expect(check('Müller & Söhne GmbH')).toBe('OK');
  });

  it.each([
    ['U+200B (Cf)', 'Acme​SL'],
    ['U+202E (Cf)', 'Acme‮SL'],
    ['surrogate suelto (Cs)', 'Acme\uD800SL'],
    ['emoji compuesto con ZWJ (U+200D es Cf)', 'Acme 👨‍👩‍👧'],
    ['U+0085 (Cc que no es \\s en JS)', 'Acme\u0085SL'],
  ])('%s → INVALID_FORMAT', (_label, raw) => {
    expect(check(raw)).toBe('INVALID_FORMAT');
  });

  it('emoji sin ZWJ → OK', () => {
    expect(check('Acme 🚀')).toBe('OK');
  });

  it('un tabulador interno se colapsa y no da INVALID_FORMAT', () => {
    expect(check('Acme\tCorp')).toBe('OK');
  });
});
