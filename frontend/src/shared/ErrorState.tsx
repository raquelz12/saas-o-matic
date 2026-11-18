import styles from './states.module.css';

type Props = {
  message?: string;
  /** Si no se pasa, no hay botón de reintento (p. ej. un 404, R-91). */
  onRetry?: () => void;
};

// Estado de error de una vista con reintento manual (RF-43): el callback suele ser `refetch`.
export function ErrorState({ message = 'No se han podido cargar los datos.', onRetry }: Props) {
  return (
    <div role="alert" className={`${styles.state} ${styles.error}`}>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
