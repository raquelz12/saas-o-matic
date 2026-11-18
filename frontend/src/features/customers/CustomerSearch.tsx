import styles from './customers.module.css';

/** Límite de `search` en `GET /customers` (spec 5.4): más largo, el backend responde 422. */
export const SEARCH_MAX_LENGTH = 100;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

// Buscador por nombre de empresa o identificador fiscal (RF-34). El debounce lo aplica
// `useCustomerSearch`: aquí el input es controlado y recibe cada tecla.
export function CustomerSearch({ value, onChange }: Props) {
  return (
    <label className={styles.search}>
      <span className={styles.searchLabel}>Buscar por empresa o identificador fiscal</span>
      <input
        type="search"
        className={styles.searchInput}
        value={value}
        maxLength={SEARCH_MAX_LENGTH}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </label>
  );
}
