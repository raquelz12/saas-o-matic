import { useState, type FormEvent, type ReactNode } from 'react';
import { ErrorState } from '../../shared/ErrorState.tsx';
import { countryName } from './CustomerCard.tsx';
import {
  errorsFromApi,
  validateLocally,
  type Field,
  type FieldErrors,
  type FormValues,
} from './customerFormErrors.ts';
import styles from './NewCustomerForm.module.css';
import { PLAN_LABELS, PLANS } from './plans.ts';
import { useCountries } from './useCountries.ts';
import { useCreateCustomer } from './useCreateCustomer.ts';

export const COUNTRIES_ERROR = 'No se han podido cargar los países.';

const EMPTY_VALUES: FormValues = { companyName: '', taxId: '', email: '', country: '', plan: '' };

const inputId = (field: Field) => `customer-${field}`;
const errorId = (field: Field) => `customer-${field}-error`;

/** Atributos comunes de cada control: id, nombre y enlace accesible a su error. */
function controlProps(field: Field, error: string | undefined) {
  return {
    id: inputId(field),
    name: field,
    className: styles.control,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId(field) : undefined,
  };
}

type FieldProps = { field: Field; label: string; error: string | undefined; children: ReactNode };

// Etiqueta, control y error junto al campo (spec 3.7). El error es texto de JSX (RF-44).
function FormField({ field, label, error, children }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={inputId(field)} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId(field)} className={styles.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

type SelectProps = { value: string; error: string | undefined; onChange: (value: string) => void };

// País: catálogo de `GET /countries` con el nombre en `es-ES`, ordenado por nombre (RF-37).
function CountrySelect({ value, error, onChange }: SelectProps) {
  const countries = useCountries();
  const options = (countries.data?.items ?? [])
    .map(({ code }) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return (
    <FormField field="country" label="País" error={error}>
      <select
        {...controlProps('country', error)}
        value={value}
        disabled={!countries.isSuccess}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="">{countries.isPending ? 'Cargando países…' : 'Selecciona un país'}</option>
        {options.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      {countries.isError && (
        <ErrorState
          message={COUNTRIES_ERROR}
          onRetry={() => {
            void countries.refetch();
          }}
        />
      )}
    </FormField>
  );
}

// Plan: enum del frontend (RF-37).
function PlanSelect({ value, error, onChange }: SelectProps) {
  return (
    <FormField field="plan" label="Plan" error={error}>
      <select
        {...controlProps('plan', error)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="">Selecciona un plan</option>
        {PLANS.map((plan) => (
          <option key={plan} value={plan}>
            {PLAN_LABELS[plan]}
          </option>
        ))}
      </select>
    </FormField>
  );
}

type TextProps = SelectProps & { field: Field; label: string; type: 'text' | 'email' };

function TextField({ field, label, type, value, error, onChange }: TextProps) {
  return (
    <FormField field={field} label={label} error={error}>
      <input
        {...controlProps(field, error)}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </FormField>
  );
}

/**
 * Estado del formulario de alta. Valida en local los obligatorios y las longitudes; si pasan,
 * envía los valores tal cual (el backend normaliza) y reparte los `details[]` del 422 o del 409
 * por campo. El error de un campo desaparece al editarlo.
 */
function useNewCustomerForm() {
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const mutation = useCreateCustomer();

  const change = (field: Field) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const local = validateLocally(values);
    setErrors(local);
    setGeneralError(null);
    if (Object.keys(local).length > 0) return;
    mutation.mutate(values, {
      onError: (error) => {
        const result = errorsFromApi(error);
        setErrors(result.fields);
        setGeneralError(result.general);
      },
    });
  };

  return { values, errors, generalError, isPending: mutation.isPending, change, submit };
}

// Formulario de alta (RF-36), con los errores junto a cada campo (spec 3.7).
export function NewCustomerForm() {
  const { values, errors, generalError, isPending, change, submit } = useNewCustomerForm();

  const text = (field: Field, label: string, type: 'text' | 'email' = 'text') => (
    <TextField
      field={field}
      label={label}
      type={type}
      value={values[field]}
      error={errors[field]}
      onChange={change(field)}
    />
  );

  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      {text('companyName', 'Nombre de empresa')}
      {text('taxId', 'Identificador fiscal')}
      {text('email', 'Email', 'email')}
      <CountrySelect value={values.country} error={errors.country} onChange={change('country')} />
      <PlanSelect value={values.plan} error={errors.plan} onChange={change('plan')} />
      {generalError && <ErrorState message={generalError} />}
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? 'Creando…' : 'Crear cliente'}
      </button>
    </form>
  );
}
