# ADR-005 · TanStack Query para el estado del servidor, con debounce en el preview

Relacionado con: A-23, A-26 · RF-38, RF-39, RF-41, RF-43

## Contexto
El frontend consume la API propia (búsqueda, detalle, historial, países, preview) y la API de tipos de cambio. La spec pide estados de carga, error y vacío con reintento manual (RF-43), y cachear los tipos de cambio hasta `time_next_update_unix` (RF-41). También pide un preview con debounce de 250 ms en el que cada petición lleva su propio `AbortController` y solo se pinta la última respuesta (RF-38).

## Opciones consideradas
- **fetch + useState/useEffect:** sin dependencias / los estados, la caché, la cancelación y las carreras se resuelven a mano en cada vista.
- **TanStack Query:** estados, caché por key, cancelación mediante `signal` y `refetch` / es una dependencia más, con conceptos propios (keys, `staleTime`, `gcTime`).
- **SWR:** API parecida y más ligera / no pasa un `AbortSignal` al fetcher, así que la cancelación de RF-38 queda a mano.

## Decisión
TanStack Query, porque resuelve los estados de carga y error, el reintento, la caché de los tipos de cambio y la cancelación de peticiones (A-23). El reintento es siempre manual, mediante `refetch()` (RF-43), y la caché de tipos de cambio se calcula desde `time_next_update_unix`. El debounce y la cancelación del preview se resuelven con lo que da TanStack Query y no con un hook propio, porque es más sencillo (A-26).

## Consecuencias
- Todas las vistas siguen el mismo patrón (`isPending`, `isError`, `refetch`).
- La cancelación del preview viene incluida: cada query recibe su `signal` y solo se pinta la key actual.
- `keepPreviousData` no conserva la proyección cuando hay un error, así que la última proyección válida hay que guardarla aparte (RF-43).
- TanStack Query no trae debounce: si la key no cambia ya con debounce aplicado, se lanza una petición por cada movimiento del slider.