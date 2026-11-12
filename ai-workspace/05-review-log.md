# Review log
 
Hallazgos sobre lo generado por la IA y la decisión tomada sobre cada uno.
 
Origen: P = revisión propia · IA = revisión cruzada
 
## Fase 1 — Especificación
 
| ID | Origen | Sección | Problema | Decisión | Estado |
|---|---|---|---|---|---|
| R-01 | P | RF-38 | El preview no tiene debounce ni cancelación: el slider satura peticiones y una respuesta vieja puede pisar a una nueva | | Pendiente |
| R-02 | P | RF-43 | La API de cambio no tiene timeout | | Pendiente |
| R-03 | P | General | Faltan los no funcionales: `.env` y versión de Node | | Pendiente |
| R-04 | P | 3.1 / 5.3 | 3.1 dice que se para en el primer fallo, pero 5.3 devuelve errores de pasos distintos | | Pendiente |
| R-05 | P | 3.1 | El país se valida después del checksum, que depende de él | | Pendiente |
| R-06 | P | CA-25 | Pide 405 en una ruta que no existe (`/simulations/:id`) | | Pendiente |
| R-07 | P | RF-11–13 | No se escapan los comodines `%` y `_` de LIKE en la búsqueda | | Pendiente |
| R-08 | P | RF-42 | El half-up con floats en el frontend falla en casos como `1.005` | | Pendiente |
| R-09 | P | RF-38 | No dice que el simulador depende de un cliente (`customerId`) | | Pendiente |
| R-10 | IA | 5.1 | La regla de 405 alcanza al preflight `OPTIONS` de CORS y rompe todos los POST desde el front | | Pendiente |
| R-11 | IA | RB-09 / 5.2 | La tasa se guarda como snapshot, pero `tiers` se recalcula con los precios actuales: si cambian, Σ `subtotalCents` ≠ `baseCents` | | Pendiente |
| R-12 | IA | RF-31 / 3.2 | RF-31 solo lista 400, 404, 409 y 422; el catálogo añade 405, 415 y 500 | | Pendiente |
| R-13 | IA | 4.1 / 4.4 | `company_name` no tiene `CHECK` de longitud y `customers` no tiene triggers de inmutabilidad, aunque RF-10 la exige | | Pendiente |
| R-14 | IA | 3 / 4.7 | La sección 3 llama "provisionales" a los nombres de campo, que ya fija la 5; 4.7 delega decisiones al README | | Pendiente |
| R-15 | IA | Enunciado 3.2 | No hay estructura de carpetas ni de capas (back y front) | | Pendiente |
| R-16 | IA | Enunciado 3.2–3.3 | No se definen las directrices para la IA (CLAUDE.md, tamaño de archivo, lint) ni la estructura de `/ai-workspace` | | Pendiente |
| R-17 | IA | 6 | Hay casos de aceptación, pero no estrategia de tests: framework, tipo, ejecución, trazabilidad CA→test y tests de front | | Pendiente |
| R-18 | IA | 4.7 | El README no fija driver de SQLite, SQLite ≥ 3.37 para `STRICT`, puertos ni comando de arranque conjunto | | Pendiente |
| R-19 | IA | RF-34 | El "dashboard" del enunciado se reduce al buscador; no se define qué más muestra | | Pendiente |
| R-20 | IA | RF-43 | Solo hay estados de carga y error para la API de cambio; faltan los del backend propio y los estados vacíos | | Pendiente |
| R-21 | IA | RF-13 | Una búsqueda como `-`, `.` o solo espacios normaliza a vacío y `LIKE '%%'` devuelve todo | | Pendiente |
| R-22 | IA | RB-13 | La rama de nombre de la búsqueda no aplica trim, colapso de espacios ni NFC | | Pendiente |
| R-23 | IA | RF-12 | `ß`, `æ`, `ø` y `ł` no se descomponen con NFD: `lodz` no encuentra `Łódź` | | Pendiente |
| R-24 | IA | RF-02 | Solo se excluye la categoría Cc: se aceptan Cf (`U+200B`, `U+202E`) y surrogates sueltos | | Pendiente |
| R-25 | IA | RF-02 / RF-04 | No se define qué es "espacio" (NBSP, `U+2009`…); `toUpperCase` cambia la longitud (`ß` → `SS`) | | Pendiente |
| R-26 | IA | 3.1 | No se dice si un JSON válido que no es objeto (`[]`, `null`, `42`) es 400 o 422 | | Pendiente |
| R-27 | IA | 5.1 | No hay límite de tamaño del body | | Pendiente |
| R-28 | IA | 5.1 | No se fija la precedencia entre 415 y 400 ni qué variantes de `Content-Type` se aceptan | | Pendiente |
| R-29 | IA | 3.4 / 3.5 | `customerId`, `:id` y `page` no tienen máximo: valores > 2^53 o > int64 provocan un 500 en SQLite | | Pendiente |
| R-30 | IA | 3.5 | No se define el parseo de la query: `page=1.0`, `+1`, `01`, parámetros repetidos, `search[]=` | | Pendiente |
| R-31 | IA | 1.7 | Además de `10.0`, entran `1e3` (como 1000) y `-0`; no está documentado | | Pendiente |
| R-32 | IA | General | No hay autenticación ni decisión documentada al respecto (p. ej. bind solo a localhost) | | Pendiente |
| R-33 | IA | General | No se fija como regla usar consultas parametrizadas ni una política de logs con datos personales (email, DNI) | | Pendiente |
| R-34 | IA | RF-39 | Un doble clic en Guardar crea simulaciones duplicadas | | Pendiente |
| R-35 | IA | RF-41 | No se valida la respuesta de la API de cambio: divisa ausente, tipo ≤ 0 o NaN, `result: "error"` con HTTP 200 | | Pendiente |
| R-36 | IA | RF-41 | La caché "de sesión" no tiene TTL: una pestaña abierta días usa tipos caducados. Falta revisar la atribución de open.er-api | | Pendiente |
| R-37 | IA | 3.6 | `00000000T` y `X0000000T` son válidos por algoritmo; no se decide si se aceptan | | Pendiente |
| R-38 | IA | 3.6 | No se define si es `INVALID_FORMAT` o `INVALID_CHECKSUM` un DNI que acaba en dígito, una letra fuera de la tabla o un CIF con letra fuera de `JABCDEFGHI` | | Pendiente |
| R-39 | IA | RF-13 | No se dice si la búsqueda aplica las validaciones de RF-04 o solo las transformaciones: `B123` tiene 4 caracteres y CA-71 fallaría | | Pendiente |
| R-40 | IA | RF-15 | La collation `BINARY` ordena mal mayúsculas y acentos, y sin desempate por `id` la paginación no es determinista | | Pendiente |
| R-41 | IA | RF-03 / RF-02 | No está fijada la versión de zod (v3 y v4 aceptan emails distintos) ni la unidad de longitud (UTF-16, code points o bytes) | | Pendiente |
| R-42 | IA | RF-38 | No se dice si cambiar el almacenamiento o las llamadas dispara un preview, aunque no afectan al coste | | Pendiente |
| R-43 | IA | RF-35 | El historial no muestra usuarios, almacenamiento, llamadas ni tramos | | Pendiente |
| R-44 | IA | RF-40 | No se definen la divisa por defecto ni si la elección persiste al recargar | | Pendiente |
| R-45 | IA | RF-41 | No se dice qué campo es la "fecha de la tasa" (`time_last_update_utc`) ni su formato | | Pendiente |
| R-46 | IA | RF-42 / CA-97 | No se fija el locale de `Intl.NumberFormat`; con `es-ES` no se agrupan 4 cifras (RB-15 pone `4 774` y CA-97 `4774`) | | Pendiente |
| R-47 | IA | RF-21 | No se decide si los precios de los tramos van en código o en BD (las tasas van en BD) | | Pendiente |
| R-48 | IA | 5.1 | No se decide entre CORS y proxy de Vite; con proxy, `CORS_ORIGIN` sobra | | Pendiente |
| R-49 | IA | 4.7 | No se dice si el seed es `INSERT OR IGNORE` o `REPLACE`; con `REPLACE`, cada arranque revierte las tasas editadas | | Pendiente |
| R-50 | IA | RF-34 | No se dice si el buscador dispara por tecla (¿con debounce?) o al enviar, ni si un cambio de texto resetea a la página 1 | | Pendiente |
| R-51 | IA | RF-39 | Tras guardar, no se dice si se vuelve a la página 1 del historial ni si se conserva el formulario | | Pendiente |
| R-52 | IA | RF-43 | Si la API de cambio falla con USD seleccionado, no se dice si se revierte a EUR ni si el reintento es automático | | Pendiente |
| R-53 | IA | RF-36 / 3.7 | No se dice si la longitud se valida en el front antes o después de normalizar: `"  A  "` pasa en el front y da 422 en el back | | Pendiente |
| R-54 | IA | RB-08 | Dice "exacto en EUR"; lo que se garantiza es exacto en céntimos (solo redacción) | | Pendiente |