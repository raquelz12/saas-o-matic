# 06- ADRs

## 1.Prompt inicial

Necesito que redactes los ADRs de mi proyecto SaaS-O-Matic. Te adjunto la especificación, mis decisiones de arquitectura (A-01 a A-37) y el documento de arquitectura.

Las decisiones ya están tomadas por mí. Tu trabajo es redactarlas, no decidir. No cambies ninguna decisión ni propongas otra distinta como si fuera la elegida.

## ADRs a redactar

| Nº | Título | Decisiones de origen |
|---|---|---|
| 001 | Monorepo con npm workspaces | A-01, A-02, A-38 |
| 002 | Express 5 con organización por módulos y capas | A-07, A-08, A-09, A-11, A-12 |
| 003 | better-sqlite3 sin ORM y migraciones SQL propias | A-15, A-16, A-17, A-18 |
| 004 | Cálculo del coste solo en el backend, con endpoint de preview | Spec RF-26, RB-10 |
| 005 | TanStack Query para el estado del servidor, con debounce en el preview | A-23, A-26 |
| 006 | Dinero en céntimos enteros y redondeo half-up | Spec RB-05, RB-14 |
| 007 | Reglas de arquitectura impuestas con ESLint | A-05, A-36 |

## Plantilla obligatoria

    # ADR-00X · Título

    Relacionado con: (IDs de decisiones A-XX y requisitos RF/RB de la spec)

    ## Contexto
    Qué problema hay que resolver y qué restricciones impone la spec. 2-4 frases.

    ## Opciones consideradas
    2-3 opciones reales, cada una con sus pros y contras en una línea.

    ## Decisión
    La opción elegida y por qué, usando mis motivos de decisiones-iniciales.md.

    ## Consecuencias
    Positivas y negativas. Incluye siempre al menos una negativa o un coste real.

## Reglas
- Usa como motivo principal el que yo escribí en decisiones-iniciales.md. Puedes ampliarlo, pero no contradecirlo.
- Las alternativas tienen que ser reales y razonables, no puestas para perder.
- Máximo media página por ADR. Sin relleno.
- No inventes requisitos que no estén en la spec.
- Si al redactar detectas que una decisión mía choca con la spec, con architecture.md o con otra decisión, no lo corrijas: indícalo al final en una sección "Incoherencias detectadas".

## Formato de salida
1. Cada ADR en un bloque de código markdown separado, con el nombre de archivo encima (p. ej. `001-monorepo-npm-workspaces.md`).
2. Al final, un `README.md` índice con una tabla: Nº (enlazado), título y estado.
3. Después, la sección "Incoherencias detectadas" (o "Ninguna").

## 2.Respuesta IA

Todos los documentos de /adr y el /adr/README.md