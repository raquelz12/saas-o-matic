import styles from './states.module.css';

type Props = { message: string };

// Estado vacío de una vista (RF-43).
export function EmptyState({ message }: Props) {
  return (
    <div className={styles.state}>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
