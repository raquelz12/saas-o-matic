import { describe, expect, it } from 'vitest';
import { searchKey } from './searchKey.ts';

describe('searchKey', () => {
  it('searchKey("Peña") = searchKey("PENA") = "pena"', () => {
    expect(searchKey('Peña')).toBe('pena');
    expect(searchKey('PENA')).toBe('pena');
  });

  it('CA-69: "PEÑA" encuentra "Peña Hermanos SA" y "Comercial Pena"', () => {
    const query = searchKey('PEÑA');
    expect(searchKey('Peña Hermanos SA')).toContain(query);
    expect(searchKey('Comercial Pena')).toContain(query);
  });

  it('CA-70: "logistica" encuentra "Logística Norte SL"', () => {
    expect(searchKey('Logística Norte SL')).toContain(searchKey('logistica'));
  });

  it('aplica la normalización de RF-02 (trim y colapso de \\s Unicode)', () => {
    expect(searchKey('  Peña   Hermanos  ')).toBe('pena hermanos');
  });

  it('da lo mismo con la entrada en NFC o en NFD', () => {
    expect(searchKey('Peña')).toBe(searchKey('Peña'));
  });

  it('"Müller & Söhne" → "muller & sohne"', () => {
    expect(searchKey('Müller & Söhne')).toBe('muller & sohne');
  });

  it('limitación conocida (spec 1.7): "Łódź" → "łodz", que no contiene "lodz"', () => {
    expect(searchKey('Łódź')).toBe('łodz');
    expect(searchKey('Łódź')).not.toContain(searchKey('lodz'));
  });

  it('no valida: una cadena vacía da ""', () => {
    expect(searchKey('   ')).toBe('');
  });
});
