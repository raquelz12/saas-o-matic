import type { UseQueryResult } from '@tanstack/react-query';
import type { Customer, Page } from '../../api/types.ts';
import { EmptyState } from '../../shared/EmptyState.tsx';
import { ErrorState } from '../../shared/ErrorState.tsx';
import { LoadingState } from '../../shared/LoadingState.tsx';
import { Pagination } from '../../shared/Pagination.tsx';
import { CustomerCard } from './CustomerCard.tsx';
import styles from './customers.module.css';

export const EMPTY_MESSAGE = 'No se han encontrado clientes.';
export const ERROR_MESSAGE = 'No se han podido cargar los clientes.';

type Props = {
  query: UseQueryResult<Page<Customer>>;
  onPageChange: (page: number) => void;
};

// Listado paginado de clientes con sus estados de carga, error con reintento y vacío (RF-43).
export function CustomerList({ query, onPageChange }: Props) {
  if (query.isPending) return <LoadingState label="Cargando clientes…" />;
  if (query.isError) {
    return (
      <ErrorState
        message={ERROR_MESSAGE}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  const { items, page, pageSize, total } = query.data;
  if (items.length === 0) return <EmptyState message={EMPTY_MESSAGE} />;

  return (
    <>
      <ul className={styles.list} aria-label="Clientes">
        {items.map((customer) => (
          <li key={customer.id}>
            <CustomerCard customer={customer} />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </>
  );
}
