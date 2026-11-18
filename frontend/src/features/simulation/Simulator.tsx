import { useId, useState } from 'react';
import type { SimulationInput } from '../../api/types.ts';
import { Projection } from './Projection.tsx';
import { SaveSimulationButton } from './SaveSimulationButton.tsx';
import styles from './Simulator.module.css';
import { usePreview } from './usePreview.ts';

/** El slider limita a 1–500 por usabilidad; la API acepta hasta 1000 (spec 1.7, 3.7). */
export const USERS_MIN = 1;
export const USERS_MAX = 500;
/** Rangos de 3.4 para almacenamiento y llamadas. */
export const STORAGE_MAX = 100_000;
export const API_CALLS_MAX = 1_000_000;

const INTEGER_FORMAT = new Intl.NumberFormat('es-ES');

type NumberFieldName = 'storageGb' | 'apiCallsPerMonth';
type FieldTexts = Record<NumberFieldName, string>;

const NUMBER_FIELDS: { name: NumberFieldName; label: string; max: number }[] = [
  { name: 'storageGb', label: 'Almacenamiento (GB)', max: STORAGE_MAX },
  { name: 'apiCallsPerMonth', label: 'Llamadas a la API / mes', max: API_CALLS_MAX },
];

/** Mensaje de un control numérico con un valor que no es un entero de 0 a `max`. */
export function rangeMessage(max: number): string {
  return `Debe ser un entero entre 0 y ${INTEGER_FORMAT.format(max)}.`;
}

/** Texto de un control como entero de 0 a `max`; si no lo es (vacío, decimal, fuera de rango), `undefined`. */
export function parseInteger(text: string, max: number): number | undefined {
  if (!/^[0-9]+$/.test(text)) return undefined;
  const value = Number(text);
  return value <= max ? value : undefined;
}

function clampUsers(value: number): number {
  return Math.min(USERS_MAX, Math.max(USERS_MIN, Math.round(value)));
}

type NumberFieldProps = {
  label: string;
  max: number;
  value: string;
  onChange: (value: string) => void;
};

// Control numérico con su error junto al campo (3.7). Un valor no válido no lanza preview.
function NumberField({ label, max, value, onChange }: NumberFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = parseInteger(value, max) === undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        className={styles.control}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {invalid && (
        <p id={errorId} className={styles.error}>
          {rangeMessage(max)}
        </p>
      )}
    </div>
  );
}

// Slider de usuarios de 1 a 500 con su valor visible (RF-38, CA-92).
function UsersSlider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Usuarios: <output htmlFor={id}>{INTEGER_FORMAT.format(value)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={USERS_MIN}
        max={USERS_MAX}
        step={1}
        value={value}
        className={styles.slider}
        onChange={(event) => {
          onChange(clampUsers(Number(event.target.value)));
        }}
      />
    </div>
  );
}

// Estado de los controles. Empieza en 1 usuario, 0 GB y 0 llamadas. El input del preview solo
// cambia cuando los tres controles son válidos; si no, se mantiene la última proyección.
function useSimulatorControls(customerId: number) {
  const [users, setUsers] = useState(USERS_MIN);
  const [texts, setTexts] = useState<FieldTexts>({ storageGb: '0', apiCallsPerMonth: '0' });
  const [input, setInput] = useState<SimulationInput>({
    customerId,
    users: USERS_MIN,
    storageGb: 0,
    apiCallsPerMonth: 0,
  });

  const valid =
    parseInteger(texts.storageGb, STORAGE_MAX) !== undefined &&
    parseInteger(texts.apiCallsPerMonth, API_CALLS_MAX) !== undefined;

  function update(nextUsers: number, nextTexts: FieldTexts): void {
    setUsers(nextUsers);
    setTexts(nextTexts);
    const storageGb = parseInteger(nextTexts.storageGb, STORAGE_MAX);
    const apiCallsPerMonth = parseInteger(nextTexts.apiCallsPerMonth, API_CALLS_MAX);
    if (storageGb === undefined || apiCallsPerMonth === undefined) return;
    setInput({ customerId, users: nextUsers, storageGb, apiCallsPerMonth });
  }

  return { users, texts, input, valid, update };
}

export type SimulatorProps = {
  customerId: number;
  /** Se llama tras guardar, para que el historial vuelva a la página 1 (RF-39). */
  onSaved: () => void;
};

// Simulador del detalle del cliente (RF-38, RF-39): controles, proyección en tiempo real y
// guardado. Guardar no resetea los controles.
export function Simulator({ customerId, onSaved }: SimulatorProps) {
  const { users, texts, input, valid, update } = useSimulatorControls(customerId);
  const preview = usePreview(input);

  return (
    <section className={styles.simulator} aria-labelledby="simulator-title">
      <h2 id="simulator-title">Simulador</h2>
      <div className={styles.controls}>
        <UsersSlider
          value={users}
          onChange={(value) => {
            update(value, texts);
          }}
        />
        {NUMBER_FIELDS.map(({ name, label, max }) => (
          <NumberField
            key={name}
            label={label}
            max={max}
            value={texts[name]}
            onChange={(value) => {
              update(users, { ...texts, [name]: value });
            }}
          />
        ))}
      </div>
      <SaveSimulationButton input={input} valid={valid} onSaved={onSaved} />
      <Projection preview={preview} />
    </section>
  );
}
