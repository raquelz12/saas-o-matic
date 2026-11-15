import { normalizeCompanyName } from './companyName.ts';

const COMBINING_MARKS = /\p{M}/gu;

/**
 * Clave de búsqueda por nombre (RF-12, RB-13, spec 4.4): normalización de RF-02, minúsculas,
 * NFD y sin marcas combinantes. Sirve para `company_name_search` y para el texto buscado.
 * No valida. Limitación conocida (spec 1.7): `ß`, `æ`, `ø` y `ł` no se descomponen.
 */
export function searchKey(raw: string): string {
  return normalizeCompanyName(raw).toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}
