/** Parámetros de paginación ya validados (RF-28, spec 3.5). */
export interface PageParams {
  page: number;
  pageSize: number;
}

/** Respuesta paginada de los listados (spec 5.2, `Page<T>`). */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  /** Elementos que cumplen el filtro, no los de la página. */
  total: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
/** Máximo de `page` (spec 3.5): el entero de 32 bits con signo. */
export const MAX_PAGE = 2_147_483_647;
