import { Link, Outlet } from 'react-router';
import styles from './Layout.module.css';

// Cabecera, contenido y pie comunes a todas las páginas. El selector de divisa (cabecera) y la
// atribución de open.er-api (pie) llegan en T-28.
export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          SaaS-O-Matic
        </Link>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer} />
    </div>
  );
}
