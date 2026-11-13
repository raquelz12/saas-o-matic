# ADR-002 · Express 5 con organización por módulos y capas

Relacionado con: A-07, A-08, A-09, A-11, A-12 · RF-30, RF-31 · Spec 3.5, 5.1

## Contexto
El backend expone 7 endpoints REST. Todos los errores tienen que seguir el formato uniforme de la spec (RF-30, RF-31), la entrada se valida con zod y hay lógica de dominio pura: los tramos y el identificador fiscal. La spec también pide el parser de query `simple` (3.5) y que el middleware de CORS vaya antes del manejador de 405 (5.1).

## Opciones consideradas
- **Express 5 organizado por módulos con capas:** es el framework más conocido, trae el parser `simple` por defecto y propaga los errores async / no valida nada por sí mismo, y `req.query` es de solo lectura.
- **Express organizado por tipo (`controllers/`, `services/`…):** familiar y sencillo al principio / cada funcionalidad queda repartida en varias carpetas y crece peor.
- **Fastify con un plugin por módulo:** validación, serialización y rendimiento integrados / tiene su propia curva de aprendizaje y zod necesita un type provider.

## Decisión
Express, por ser el más conocido (A-07), en su versión 5. El código se organiza por módulos (`customers`, `simulations`, `countries`) porque escala mejor (A-08). Cada módulo sigue la cadena routes → controller → service → repository, con un `domain/` puro: el service llama al dominio, nunca al revés (A-09). Los errores son tipados (`AppError`) y un único `errorHandler` los convierte al formato de la spec (A-11). La inyección es manual: `createApp(deps)` pasa los repositorios a los services, porque un contenedor está sobredimensionado para tres módulos (A-12).

## Consecuencias
- Cada funcionalidad cabe en una carpeta, y el dominio se testea sin Express ni base de datos.
- El formato de error sale de un único sitio, y los tests pueden sustituir repositorios a través de `createApp(deps)`.
- Como `req.query` es de solo lectura en Express 5, los datos validados tienen que ir a `res.locals`. El comportamiento con body vacío y parámetros repetidos está sin verificar hasta que existan CA-84 y CA-109.
- Cada módulo tiene más archivos, y `app.ts` hay que mantenerlo a mano cada vez que cambia una dependencia.