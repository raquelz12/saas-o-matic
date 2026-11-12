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