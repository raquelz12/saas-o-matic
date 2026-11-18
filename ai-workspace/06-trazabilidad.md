# Trazabilidad y desviaciones

Revisión final del producto contra la spec (v1.2), hecha en la tarea T-36. Tiene tres partes:
- la matriz CA → test,
- la verificación manual de CA-91,
- la lista de desviaciones respecto a la spec.

## 1. Resumen

| Dato | Valor |
|---|---|
| CA en la spec (sección 6) | 109: CA-01 a CA-107, CA-109 y CA-110 |
| CA con test automático | 108 |
| CA con verificación manual | 1: CA-91 (sección 3) |
| CA sin cubrir | 0 |
| CA que no existe | CA-108. Ninguna revisión lo creó: es un error de rango en R-78 (plan, observación 7) |

**Cómo se comprueba.** `npm run check:ca` ([scripts/check-ca.ts](../scripts/check-ca.ts)) se ejecuta en CI después de los tests. El script:
- saca los CA de las filas `| CA-XX |` de la spec;
- busca los `CA-XX` en los `*.test.ts(x)` de `backend/` y `frontend/`, sin contar los comentarios;
- falla en tres casos: un CA de la spec que no tiene test ni está marcado como manual, un test que cita un CA que no existe en la spec y un CA marcado como manual que sí tiene test.

Los CA manuales están en la constante `MANUAL` del script.

**Qué no cuenta el script.** Solo comprueba que algún test cita cada CA, no que el test verifique lo que pide el CA. Esa correspondencia se revisó en cada tarea (columna «Tarea» de la matriz de cobertura del [plan](03-plan/plan.md#matriz-de-cobertura)).

**Filas de la spec sin CA.** Algunas filas de las tablas 3.6.7, 3.6.8 y RB-03/RB-07 no tienen CA. Están cubiertas por tests nombrados con su sección (`3.6.7: …`, `RB-07: …`), según R-99 a R-102. El arranque con migración y seed de tasas (R-71) tampoco tiene CA y se prueba con un test sin CA (T-12).

## 2. Matriz CA → tests

Generada con `npm run check:ca -- --matrix`. Si se añade o se mueve un test con CA, hay que regenerarla y sustituir la tabla.

| CA | Tests |
|---|---|
| CA-01 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-02 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-03 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-04 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-05 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-06 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-07 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-08 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-09 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-10 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-11 | `backend/test/api/simulations.preview.test.ts` |
| CA-12 | `backend/src/modules/simulations/domain/pricing.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-13 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-14 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-15 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-16 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-17 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-18 | `backend/src/modules/simulations/domain/quote.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-19 | `backend/test/api/simulations.history.test.ts` |
| CA-20 | `backend/test/api/simulations.preview.test.ts` |
| CA-21 | `backend/test/api/simulations.create.test.ts` |
| CA-22 | `backend/test/api/simulations.create.test.ts` |
| CA-23 | `backend/test/api/simulations.history.test.ts` |
| CA-24 | `backend/test/api/simulations.create.test.ts`<br>`backend/test/api/simulations.preview.test.ts` |
| CA-25 | `backend/test/api/simulations.create.test.ts` |
| CA-26 | `backend/test/db/schema.test.ts` |
| CA-27 | `backend/test/db/schema.test.ts` |
| CA-28 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-29 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-30 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-31 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-32 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-33 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-34 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-35 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-36 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-37 | `backend/test/api/simulations.preview.validation.test.ts` |
| CA-38 | `backend/test/api/customers.create.test.ts` |
| CA-39 | `backend/src/modules/customers/domain/companyName.test.ts`<br>`backend/test/api/customers.create.test.ts` |
| CA-40 | `backend/src/modules/customers/domain/companyName.test.ts`<br>`backend/test/api/customers.create.test.ts` |
| CA-41 | `backend/src/modules/customers/domain/companyName.test.ts`<br>`backend/test/api/customers.create.test.ts` |
| CA-42 | `backend/test/api/customers.create.test.ts` |
| CA-43 | `backend/src/modules/customers/domain/companyName.test.ts`<br>`backend/test/api/customers.create.test.ts` |
| CA-44 | `backend/test/api/customers.create.test.ts` |
| CA-45 | `backend/src/modules/customers/domain/email.test.ts`<br>`backend/test/api/customers.create.test.ts` |
| CA-46 | `backend/test/api/customers.create.test.ts` |
| CA-47 | `backend/test/api/customers.create.test.ts` |
| CA-48 | `backend/test/api/customers.create.test.ts` |
| CA-49 | `backend/test/api/customers.create.test.ts` |
| CA-50 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-51 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-52 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-53 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-54 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-55 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-56 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-57 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-58 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-59 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-60 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-61 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-62 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-63 | `backend/test/api/customers.taxid.test.ts` |
| CA-64 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-65 | `backend/src/modules/customers/domain/taxId.test.ts`<br>`backend/test/api/customers.taxid.test.ts` |
| CA-66 | `backend/test/api/customers.taxid.test.ts` |
| CA-67 | `backend/test/api/customers.taxid.test.ts` |
| CA-68 | `backend/test/api/customers.taxid.test.ts` |
| CA-69 | `backend/src/modules/customers/domain/searchKey.test.ts`<br>`backend/test/api/customers.search.test.ts` |
| CA-70 | `backend/src/modules/customers/domain/searchKey.test.ts`<br>`backend/test/api/customers.search.test.ts` |
| CA-71 | `backend/test/api/customers.search.test.ts` |
| CA-72 | `backend/test/api/customers.search.test.ts` |
| CA-73 | `backend/test/api/customers.search.test.ts` |
| CA-74 | `backend/test/api/customers.search.test.ts` |
| CA-75 | `backend/test/api/customers.search.test.ts` |
| CA-76 | `backend/test/api/customers.search.test.ts` |
| CA-77 | `backend/test/api/customers.search.test.ts` |
| CA-78 | `backend/test/api/customers.detail.test.ts` |
| CA-79 | `backend/test/api/customers.detail.test.ts` |
| CA-80 | `backend/test/api/simulations.history.test.ts` |
| CA-81 | `backend/test/api/simulations.history.test.ts` |
| CA-82 | `backend/test/api/countries.test.ts` |
| CA-83 | `backend/test/api/customers.create.test.ts` |
| CA-84 | `backend/test/api/customers.create.test.ts` |
| CA-85 | `backend/test/api/customers.create.test.ts` |
| CA-86 | `backend/test/api/customers.detail.test.ts` |
| CA-87 | `backend/test/api/app.test.ts` |
| CA-88 | `backend/test/api/app.test.ts` |
| CA-89 | `backend/test/api/simulations.create.test.ts` |
| CA-90 | `frontend/src/pages/Dashboard.test.tsx` |
| CA-91 | **Manual** |
| CA-92 | `frontend/src/features/simulation/Simulator.test.tsx` |
| CA-93 | `frontend/src/pages/CustomerDetailSave.test.tsx` |
| CA-94 | `frontend/src/pages/NewCustomer.test.tsx` |
| CA-95 | `frontend/src/pages/NewCustomer.test.tsx` |
| CA-96 | `frontend/src/pages/NewCustomer.test.tsx` |
| CA-97 | `frontend/src/features/currency/MoneyTotal.test.tsx`<br>`frontend/src/features/currency/conversion.test.ts` |
| CA-98 | `frontend/src/features/currency/MoneyTotal.test.tsx`<br>`frontend/src/features/currency/conversion.test.ts` |
| CA-99 | `frontend/src/pages/CustomerDetail.test.tsx` |
| CA-100 | `frontend/src/features/currency/CurrencySelector.test.tsx` |
| CA-101 | `frontend/src/features/currency/CurrencySelector.test.tsx` |
| CA-102 | `frontend/src/features/currency/CurrencySelector.test.tsx` |
| CA-103 | `frontend/src/features/currency/useFxRates.test.ts` |
| CA-104 | `frontend/src/features/currency/CurrencySelector.test.tsx` |
| CA-105 | `frontend/src/pages/CustomerDetail.test.tsx`<br>`frontend/src/pages/Dashboard.test.tsx` |
| CA-106 | `backend/test/api/customers.search.test.ts` |
| CA-107 | `backend/test/api/customers.search.test.ts` |
| CA-109 | `backend/test/api/customers.search.test.ts` |
| CA-110 | `backend/test/api/customers.taxid.test.ts` |

## 3. Verificación manual: CA-91

| Campo | Valor |
|---|---|
| CA | CA-91: el detalle de cliente a 360 px y en escritorio. Las tarjetas se adaptan sin scroll horizontal |
| Por qué es manual | jsdom no maqueta, así que el desbordamiento no se puede medir en un test de componente, y E2E está descartado (spec 6.10, R-64) |
| Verificado | A mano, en T-31b (2026-11-18), por quien dirige el proyecto |
| Cómo | Anchos de 360 px y de escritorio, con clientes y simulaciones creados por la API |
| Resultado | Sin scroll horizontal. El desglose por tramos es una lista y no una tabla precisamente para eso (R-129) |
| Pendiente | **Repetir después del rediseño del CSS** (decisión del usuario, plan T-31b). Hay tres cambios posteriores a la verificación de T-31b: el simulador (T-32 y T-33) y los estilos de la rama `review-front`. Ninguno de los tres se ha comprobado a 360 px |

## 4. Desviaciones respecto a la spec

### 4.1 Implementado fuera de la spec o de forma distinta

| # | Qué | Diferencia con la spec | Ref. |
|---|---|---|---|
| 1 | Seed demo (`npm run db:seed:demo`) | La spec 4.7 solo tiene `db:migrate` y `db:seed`. Se queda como herramienta de desarrollo, fuera del contrato: crea 10 clientes ficticios por el mismo camino que `POST /customers` y no crea simulaciones. R-93 dejaba dos opciones, añadirlo a la spec o documentarlo así; queda documentado aquí | R-93, R-132 |
| 2 | Orden de `details` en el 422 del alta | Sigue el orden en que zod emite los issues, así que el checksum del identificador va al final. El ejemplo de 5.3 lo pone en otro orden; se trata como ilustrativo | R-111 |
| 3 | `search` formado solo por marcas combinantes (p. ej. U+0301) | La clave de nombre queda vacía y devuelve todos los clientes, como si `search` estuviera vacío (RF-14). Es una limitación conocida que no se ha tratado | R-114 |
| 4 | Refresco de tipos de cambio que falla | RF-41 dice que los tipos se piden de nuevo al caducar. Si ese refresco falla, se siguen usando los tipos caducados y no hay otro intento automático hasta recargar, porque el reintento es manual (RF-43). Riesgo aceptado | R-122, R-123 |
| 5 | Código `NETWORK_ERROR` | No está en el catálogo de 5.1. Es solo del frontend: fallo de red, respuesta que no es JSON o error sin la forma 5.1 | R-120 |
| 6 | Instalación con `npm ci --ignore-scripts` | No es de la spec, pero afecta a «arrancar sin pasos manuales». En Windows sin herramientas de C++, `npm ci` intenta compilar better-sqlite3 aunque trae binarios precompilados. CI sigue usando `npm ci` | R-133 |
| 7 | CA-108 | No existe en la spec. La matriz del plan lo da como error de rango de R-78 y no se ha inventado ningún CA para ocupar el hueco | R-78, plan obs. 7 |

### 4.2 Huecos de la spec resueltos con una decisión

Son puntos que la spec no fijaba. Se resolvieron durante la implementación; cuando el review-log pone «decisión del usuario», la decisión no es de la IA.

| Tema | Qué no fijaba la spec | Decisión | Ref. |
|---|---|---|---|
| Normalizadores | Qué issue gana si fallan la longitud y el formato; caracteres que son `\s` y de control a la vez | Gana la longitud. Se normaliza antes de validar (el tabulador y U+FEFF se colapsan). `toUpperCase` va antes del formato | R-103 |
| Traductor de zod | `REQUIRED` en enums, varios issues por campo, códigos sin regla | Ausente o `null` → `REQUIRED` con cualquier código. Se queda el primer issue de cada campo. Un código sin regla da `INVALID_FORMAT` | R-108 |
| `page` y `pageSize` | El `issue` de un valor no válido (3.5, RF-28) | Sin formato `^[1-9][0-9]*$` → `INVALID_FORMAT`; por encima del máximo → `OUT_OF_RANGE`; repetido → `INVALID_TYPE`. `MAX_PAGE` 2 147 483 647 | R-109 |
| Longitud de `search` | Si se mide antes o después del trim, y en qué unidad | En code points y después del trim | R-114 |
| Tasa inexistente | Qué hacer si no hay tasa para el país del cliente | Se trata como un bug: 500 sin código nuevo. La FK lo impide | R-115 |
| Paginación en el frontend | Cuántas páginas hay con `total = 0` | Una página, con los dos botones deshabilitados. Sin resultados no se muestra la paginación | R-119, R-126 |
| Rutas del frontend | Las rutas, salvo `/customers/{id}` | `/`, `/customers/new` y `/customers/:id`, sin ruta comodín | R-118 |
| Símbolo de divisa | Cómo pintar la divisa | `currencyDisplay: 'narrowSymbol'` (`€`, `$`, `£`, `¥`), como en los literales de CA-97 y CA-98 | R-121 |
| API de cambio | Campos exigidos además de `result` y las cuatro divisas | También se exigen `time_next_update_unix` y `time_last_update_utc` | R-122 |
| Atribución y fecha de la tasa | El texto del enlace, el formato de la fecha y dónde va | Enlace «Rates By Exchange Rate API» en el pie. «Tipos del {fecha}» junto al selector, en `es-ES` y hora local | R-123 |
| Buscador | Si vuelve a la página 1 en cada tecla; qué hace con más de 100 caracteres; el texto del estado vacío | Vuelve a la página 1 cuando cambia el texto debounced. `maxLength={100}`. «No se han encontrado clientes.» | R-125, R-126 |
| Tarjeta del listado | Cómo se pinta el plan | Con su código (`STARTER`…) | R-126 |
| Formulario de alta | Validación en el cliente y textos de error | Solo obligatorios y longitudes que nunca rechazan un valor válido: en `taxId`, solo el mínimo; el máximo y el checksum los decide el backend. Un texto por cada `issue` | R-127 |
| Detalle de cliente | Qué datos se muestran; qué hacer con un `:id` no válido en la URL; el formato de las fechas | Todos los campos menos `id`, con el plan por su etiqueta. Un `:id` no válido muestra «Cliente no encontrado.» sin hacer la petición. Fechas en `es-ES` y hora local | R-128 |
| Historial | Formato de la tasa y del último tramo, y textos de los estados | «21 %» a partir de los puntos básicos; «Usuarios desde 51» cuando `to` es `null`; textos propios para carga, error y vacío | R-129 |
| Simulador | Valores iniciales, valores no válidos en GB y llamadas, y textos | 1 usuario, 0 GB y 0 llamadas. Con un valor no válido no se pide el preview, se mantiene la última proyección y el campo muestra un aviso | R-130 |
| Guardar simulación | Qué pasa con un control no válido, y qué ve el usuario al guardar o si falla | El botón se deshabilita con un control no válido o mientras guarda. No hay mensaje de éxito. Si falla, se muestra un aviso y se reintenta pulsando otra vez | R-131 |
