# ADR-004 · Cálculo del coste solo en el backend, con endpoint de preview

Relacionado con: RF-21, RF-22, RF-26, RF-38 · RB-06, RB-10 · Spec 3.7

## Contexto
El simulador tiene que mostrar la base, el impuesto y el total en tiempo real (RF-38), y lo que se guarda tiene que coincidir con lo que se previsualizó (RB-10). La tasa vive en la base de datos y puede cambiar (RB-06), y la spec evita duplicar lógica de negocio en el frontend (3.7).

## Opciones consideradas
- **Calcular en el frontend para la proyección y en el backend al guardar:** proyección instantánea, sin red / hay dos implementaciones de los tramos que pueden divergir, y el frontend necesita conocer la tasa vigente.
- **Compartir el módulo de dominio entre frontend y backend:** una sola implementación que se ejecuta en los dos lados / requiere el paquete compartido descartado en A-06, y la tasa también tiene que llegar al frontend.
- **Calcular solo en el backend, con endpoint de preview:** una única fuente de verdad / cada cambio es una petición y depende de la red.

## Decisión
El coste se calcula solo en el backend. RF-26 exige `POST /simulations/preview` con el mismo body, las mismas validaciones y el mismo cálculo que `POST /simulations`, pero sin persistir. Los dos endpoints llaman a la misma función del service (cliente → tasa → `calculateQuote`), y `/preview` simplemente omite la persistencia. Esa función única es lo que garantiza RB-10.

## Consecuencias
- Los tramos, el impuesto y el redondeo están en un único módulo puro, así que preview y guardado no pueden divergir.
- Un cambio de tasa en la tabla se aplica en la siguiente preview sin tocar el frontend.
- Cada movimiento del slider genera una petición, lo que obliga a tener debounce, cancelación y estado de error (ADR-005).
- Si el backend no responde, no hay proyección nueva: solo se mantiene la última, con un aviso (RF-43).