import { Link } from 'react-router';
import { CustomerList } from '../features/customers/CustomerList.tsx';
import { CustomerSearch } from '../features/customers/CustomerSearch.tsx';
import styles from '../features/customers/customers.module.css';
import { useCustomerSearch } from '../features/customers/useCustomerSearch.ts';

// Dashboard (RF-34): buscador, listado paginado de clientes y botón de alta, sin KPIs.
export function Dashboard() {
  const { search, setSearch, setPage, query } = useCustomerSearch();
  return (
    <section>
      <div className={styles.header}>
        <h1>Clientes</h1>
        <Link to="/customers/new" className={styles.newButton}>
          Nuevo cliente
        </Link>
      </div>
      <CustomerSearch value={search} onChange={setSearch} />
      <CustomerList query={query} onPageChange={setPage} />
    </section>
  );
}
