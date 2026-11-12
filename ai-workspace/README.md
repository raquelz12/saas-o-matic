# AI Workspace

Esta carpeta documenta cómo se ha diseñado y construido la herramienta con la ayuda de IA: las especificaciones previas al código, las decisiones de arquitectura, los prompts clave y la revisión de lo generado.

El principio de trabajo es Spec-Driven Development: primero se define el problema con precisión y después se delega la escritura de código a la IA, tarea a tarea y siempre contra una especificación revisada.

## Estructura
 
| Carpeta / archivo | Contenido | Estado |
|---|---|---|
| `01-specs/` | Especificación funcional: requisitos, reglas de negocio, validaciones, modelo de datos, contrato de la API y casos de aceptación | v0.1 |
| `02-architecture/` | Directrices para la IA, estructura del proyecto y registro de decisiones (ADRs) | Pendiente |
| `03-plan/` | Plan de implementación dividido en tareas con criterios de aceptación | Pendiente |
| `04-prompts/` | Prompts clave y conversaciones relevantes con la IA, en orden cronológico | En curso |
| `05-review-log.md` | Registro de revisiones: problemas detectados en lo generado por la IA, decisiones tomadas y su motivo | En curso |
| `screenshots/` | Capturas de conversaciones referenciadas desde los demás documentos | En curso |

## Orden de lectura recomendado

1. `04-prompts/01-spec-inicial.md`: cómo arrancó la especificación y qué decisiones aporté.
2. `01-specs/spec.md`: la especificación resultante.
3. `05-review-log.md`: qué se revisó, qué se corrigió y qué se descartó.
