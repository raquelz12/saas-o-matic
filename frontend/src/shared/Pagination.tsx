import styles from './states.module.css';

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

/** Número de páginas a partir de `total` y `pageSize` (RF-28). Sin resultados hay una página. */
export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// Controles de paginación de un listado (RF-28). La página la guarda quien lo usa.
export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const pages = totalPages(total, pageSize);
  return (
    <nav aria-label="Paginación" className={styles.pagination}>
      <button
        type="button"
        className={styles.button}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        Página {page} de {pages}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Siguiente
      </button>
    </nav>
  );
}
