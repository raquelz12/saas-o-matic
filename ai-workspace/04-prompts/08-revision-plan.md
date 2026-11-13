# 08- Revisión Plan

## 1.Prompt inicial

Revisa las siguientes cosas comparandolas con @ai-workspace/03-plan/esquema-inicial.md  y  @ai-workspace/01-specs/spec.md   y @ai-workspace/02-architecture/architecture.md :
 Todos los CA están cubiertos en la matriz. Ninguno queda huérfano.
 Ningún CA aparece en dos tareas sin motivo. Si pasa, hay solape.
 Las dependencias tienen sentido. Por ejemplo, POST /customers necesita antes la validación fiscal, la normalización, la BD y el manejo de errores.
 El dominio va con TDD: tests primero y luego implementación.
 Ninguna tarea mezcla backend y frontend.
 Las tareas son de tamaño S o M. Una que toque más de 6-8 archivos es sospechosa.
 Los criterios de aceptación son verificables, no del tipo “funciona bien”.
 Están las tareas “invisibles”: configuración y .env, el manejo de 400/404/405/415, la CI, el seed demo y el README.
 No hay nada fuera de la spec: ni features inventadas ni dependencias no aprobadas.

Si las hay, dame cada cambio propuesto con este formato:
| ID | Origen | Sección | Problema | Decisión | Estado |
Con ID partiendo de R-79 y Origen como IA y Estado como Pendiente

## 2.Respuesta IA

Documento /03-plan/plan.md v1.0