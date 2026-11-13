# 05- Arquitectura ajustes

## 1.Prompt inicial

He revisado tu propuesta, necesito que apliques estos cambios donde sea necesario sin cambiar nada más que lo necesario. Y quita la sección de objeciones si no hay más conflictos entre la arquitectura y la spec.


| ID | Origen | Sección | Problema | Decisión | Estado |
|---|---|---|---|---|---|
| R-60 | IA | A-26 | TanStack Query no hace debounce, solo cancelación. Además choca con A-32, que testea "el hook de debounce". | Añadir hook propio | Pendiente |
| R-61 | IA | A-23 | Por defecto reintenta 3 veces automáticamente. RF-43 exige que el reintento sea siempre manual. | retry: false global y refetchOnWindowFocus: false; el botón llama a refetch(). | Pendiente |
| R-62 | IA | A-10 | country se valida contra tax_rates dentro de la misma fase que acumula errores en un único 422. | El middleware sigue siendo genérico, pero acepta una fábrica de schema: buildCreateCustomerSchema(paísesSoportados), con los países leídos por petición. | Pendiente |
| R-63 | IA | A-17 y A-20 | (migrar al arrancar, seed demo)	Si al arrancar solo se migra, tax_rates queda vacía y la app no funciona "sin pasos manuales". Si el seed demo se mezcla con el de tasas, contamina los tests | Al arrancar: migraciones más seed de tasas. Clientes demo en un comando aparte, insertados a través del service para que pasen la normalización y el checksum. Nunca en tests. | Descartado |
| R-64 | IA | A-32 | Con E2E descartado, algunos CA de 6.9 quedan sin test automático. CA-91 no es verificable en jsdom. | Verficación manual | Pendiente |
| R-65 | P | Arq. S3 (Importes), RB-14, CA-97 | <Money cents> como único punto de conversión convierte el total directamente. En JPY sale 27.505 en vez de 27.506. | Importes sueltos con <Money cents>; el total con <MoneyTotal baseCents taxCents>, que suma los dos importes ya redondeados. | Pendiente |
| R-66 | P | Arq. S4 paso 3, Spec 3.1.2 y 5.1 | express.json en modo estricto rechaza null o 42 con 400, y el spec pide 422 con field: "body". | express.json({ limit: '10kb', strict: false }) así el parser acepta cualquier valor JSON. | Pendiente |
| R-67 | P | Arq. S5 (traductor), Spec 3.5, CA-79 | La regla "límite numérico → OUT_OF_RANGE" da un issue incorrecto en GET /customers/0, que debe ser INVALID_FORMAT. | Se define el schema de :id como un string con ^[1-9][0-9]*$ y el máximo en un único refine que emite INVALID_FORMAT; el traductor no cambia. | Pendiente |
| R-68 | P | Arq. S5 (traductor), Spec 3.2 y 3.5 | El traductor no cubre UNSUPPORTED_VALUE, INVALID_FORMAT de email ni el parámetro de query repetido. Además, el spec no fija el issue de page/pageSize inválidos. | Añadir los tres mapeos al traductor. | Pendiente |
| R-69 | P | Spec 3.5 | El propio spec fija el parser de query simple, pero con ese parser una petición como search[]=x llega con la clave literal "search[]". Eso daría UNKNOWN_FIELD, no el INVALID_TYPE que pide el mismo apartado. | Ajustar el spec a lo que el parser hace de forma natural: un parámetro repetido da INVALID_TYPE y la forma search[]= da UNKNOWN_FIELD. Añadir el CA-109 para cubrir los dos casos. | Pendiente |
| R-70 | P | Arq. S5 (traductor), Spec 3.1.5 y 5.3 | El checksum del identificador no depende solo de su campo, también del país. Si se implementa como una validación a nivel de objeto, zod no la ejecuta cuando otro campo ya ha fallado, y se pierde la acumulación de errores que pide el spec. | Montar el checksum de forma que se ejecute aunque fallen otros campos. Añadir el CA-110: CIF con checksum incorrecto más email inválido → 422 con los dos errores. | Pendiente |
| R-71 | P | Arq. S1 (server.ts) y S7, Spec 4.7, R-63 | No estan alineadas las ideas del spec, arquitectura ni el R-63. | Que el servidor migre y cargue las tasas al arrancar, que se añada al spec y la R-63 pase a aceptada. | Pendiente |
| R-72 | P | Arq. S1 y S2 (countries) | El módulo de países no tiene service, y según la tabla de capas el controller no puede hablar directamente con el repositorio. | Añadir un service sencillo a countries. | Pendiente |
| R-73 | P | Arq. S1 y S4, Spec 5.1 y 5.10 | El spec rechaza cualquier parámetro de query desconocido en todos los endpoints, pero la arquitectura solo valida la query en los listados. | Crear en http/ un schema de query vacío y estricto, y aplicarlo a todas las rutas que no admiten parámetros de query. | Pendiente |
| R-74 | P | Arq. S1 (app.ts), S6 y S7, CA-89 | Si createApp solo recibe la base de datos, no hay forma de meterle un repositorio que falle a propósito para probar el 500 de CA-89. La propia S7 ya habla de createApp(deps). | Que createApp reciba sus dependencias, con la opción de sustituirlas, y que createTestApp permita pasar esos sustitutos. | Pendiente |
| R-75 | P | Arq. S6, Spec S6 (cabecera) | El spec dice que los casos de tramos (CA-01 a CA-08) se prueban a través del preview, pero la tabla de tests de la arquitectura solo los tiene en dominio. | Probarlos también a nivel de API, o como mínimo el ejemplo del enunciado (CA-04). | Pendiente |
| R-76 | P | RB-14, RF-40 | La divisa se aplica también al historial, pero no está definido cómo convertir el desglose por tramos. Si cada subtotal se convierte y redondea por separado, su suma puede no coincidir con la base convertida. | Convertir cada subtotal por separado y documentar en RB-14 que la suma puede diferir de la base en una unidad mínima, igual que ya se acepta con el total. | Pendiente |
| R-77 | P | Arq. S1 (árbol), enunciado S3 y S4, RNF-01 | En la estructura de carpetas falta la carpeta ai-workspace y el README. Tampoco aparece el campo engines del package.json que exige RNF-01. | Añadir todo eso al árbol de carpetas. | Pendiente |
| R-78 | P | Arq. S6 (tabla de tests) | Los casos nuevos que salen de esta revisión (CA-108 a CA-110) no están asignados a ninguna capa de tests. | Añadirlos a la fila de tests de API. | Pendiente |

Al final indicame que ha cambiado.

## Respuesta IA

He aplicado R-60 a R-78 en arquitectura-propuesta.md y he quitado la sección de objeciones: no veo más conflictos entre la arquitectura y la spec, siempre que la spec recoja los cambios que tú mismo has decidido en R-69, R-71 y R-76.

*Spec v1.1 y architecture.md*