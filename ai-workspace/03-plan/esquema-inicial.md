# Esquema inicial del plan

Esquema propio, hecho antes de pedir a la IA el plan detallado.

## Criterios de orden
- Primero la estructura, ya que sin ello no se puede hacer lo demás.
- El dominio va antes que la API porque es lo más crítico y se puede testear aislado.
- Cada tarea se tiene que poder integrar en main por sí sola.
- El frontend va cuando la api esté terminada y probada.

## Hitos

### M0 · Estructura
- Montar el monorepo con TS, lint y tests
- Configurar GitHub Actions

### M1 · Dominio
- Cálculo por tramos e impuesto
- Validación del DNI/NIE/CIF/NIF
- Normalización de los campos

### M2 · Base del backend
- Configuración, app.ts, server.ts y logger
- Conexión a SQLite, migraciones y seed de tasas
- Errores y validaciones

### M3 · Endpoints
- Creación de todos los GET y POST

### M4 · Frontend
- Base: router, TanStack Query, cliente de la API y estilos globales
- Divisas: API de tipos de cambio, contexto de divisa y funciones de conversión
- Buscador y dashboard
- Formulario de alta de cliente
- Detalle del cliente con su historial
- Simulador: slider, preview en tiempo real y guardado

### M5 · Cierre
- Seed de clientes demo
- README con instrucciones de arranque
- Revisión final contra la spec

## Dudas para la IA
- ¿El mapeador de errores de zod va en la misma tarea que el middleware de errores o en una aparte?
- ¿Conviene separar en dos tareas el alta de cliente (validación y endpoint) por su tamaño?
- ¿La conversión de divisa y el half-up del frontend deben tener una tarea propia con TDD, igual que el dominio del backend?