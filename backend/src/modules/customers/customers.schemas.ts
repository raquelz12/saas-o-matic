import { z } from 'zod';
import { normalizeCompanyName, validateCompanyName } from './domain/companyName.ts';
import { normalizeEmail, validateEmailLength } from './domain/email.ts';
import { normalizeTaxId, validateGenericTaxId, validateSpanishTaxId } from './domain/taxId.ts';

/** Planes de RF-09. */
export const PLANS = ['STARTER', 'BUSINESS', 'ENTERPRISE'] as const;

/** País cuyo identificador pasa por el algoritmo de control (RF-05, spec 3.6). */
const SPAIN = 'ES';

/** Campos de los que depende el checksum (spec 3.1, paso 5). */
const CHECKSUM_DEPENDENCIES: ReadonlySet<PropertyKey> = new Set(['taxId', 'country']);

/**
 * Convierte el resultado de un validador del dominio en un issue `custom` con
 * `params.issue`, que el traductor de `http/zodIssues.ts` pasa tal cual a `details`.
 * El dominio devuelve un único resultado, así que cada campo da como mucho un issue.
 */
function domainRule(validator: (normalized: string) => string) {
  return (value: string, ctx: z.RefinementCtx): void => {
    const result = validator(value);
    if (result !== 'OK') ctx.addIssue({ code: 'custom', params: { issue: result } });
  };
}

/** trim y mayúsculas: la normalización de `country` y `plan` (spec 3.3). */
function upperTrimmed() {
  return z.string().transform((value) => value.trim().toUpperCase());
}

/**
 * `email`: normalización → longitud (≤ 254) → `z.email()` (RF-03). El `pipe`
 * no evalúa `z.email()` si la longitud ya ha fallado.
 */
const emailField = z
  .string()
  .transform(normalizeEmail)
  .superRefine(domainRule(validateEmailLength))
  .pipe(z.email());

/** Para el `when` del checksum: el issue afecta a `taxId` o a `country`. */
function touchesChecksumInput(issue: { path?: PropertyKey[] }): boolean {
  const field = issue.path?.[0];
  return field !== undefined && CHECKSUM_DEPENDENCIES.has(field);
}

/**
 * Body de `POST /customers` (spec 3.3). Cada campo encadena normalización →
 * formato, y corta en su primer fallo (spec 3.1).
 *
 * El checksum (paso 5) es una regla del objeto porque depende de `taxId` y de
 * `country`. Con `when`, se ejecuta siempre que esos dos campos sean válidos,
 * aunque fallen otros o haya claves desconocidas, y su issue se acumula con
 * los demás (CA-110). Al ser del objeto, zod lo emite después de los issues de
 * los campos, y ese es el orden de `details` (R-111).
 *
 * Se construye en cada petición con los países leídos de `tax_rates`
 * (architecture §2). Se usa un refine y no `z.enum` porque `z.enum([])` no se
 * puede construir.
 */
export function buildCreateCustomerSchema(supportedCountries: readonly string[]) {
  const supported = new Set(supportedCountries);
  return z
    .strictObject({
      companyName: z
        .string()
        .transform(normalizeCompanyName)
        .superRefine(domainRule(validateCompanyName)),
      taxId: z.string().transform(normalizeTaxId).superRefine(domainRule(validateGenericTaxId)),
      email: emailField,
      country: upperTrimmed().refine((code) => supported.has(code), {
        params: { issue: 'UNSUPPORTED_VALUE' },
      }),
      plan: upperTrimmed().pipe(z.enum(PLANS)),
    })
    .superRefine(
      (customer, ctx) => {
        if (customer.country !== SPAIN) return;
        const result = validateSpanishTaxId(customer.taxId);
        if (result !== 'OK') {
          ctx.addIssue({ code: 'custom', path: ['taxId'], params: { issue: result } });
        }
      },
      { when: (payload) => !payload.issues.some(touchesChecksumInput) },
    );
}

/** Body validado y normalizado de `POST /customers`. */
export type CreateCustomerInput = z.output<ReturnType<typeof buildCreateCustomerSchema>>;
