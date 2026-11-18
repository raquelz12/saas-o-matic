import styles from './states.module.css';

type Props = { label?: string };

// Estado de carga de una vista (RF-43).
export function LoadingState({ label = 'Cargando…' }: Props) {
  return (
    <div role="status" className={styles.state}>
      <p className={styles.message}>{label}</p>
    </div>
  );
}
