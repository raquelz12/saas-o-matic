import { Link, Outlet } from 'react-router';
import { CurrencySelector } from '../features/currency/CurrencySelector.tsx';
import styles from './Layout.module.css';

// Atribución que pide open.er-api, la API de tipos de cambio (RF-41).
export const FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';

// Cabecera con el selector de divisa, contenido y pie con la atribución, comunes a todas las
// páginas. El `CurrencyProvider` está en `main.tsx` (architecture §1).
export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          SaaS-O-Matic
        </Link>
        <CurrencySelector />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <a href={FX_ATTRIBUTION_URL}>Rates By Exchange Rate API</a>
      </footer>
    </div>
  );
}
