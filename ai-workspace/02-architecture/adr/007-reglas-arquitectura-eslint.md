# ADR-007 · Reglas de arquitectura impuestas con ESLint

Relacionado con: A-05, A-36 · architecture.md §2 y §3

## Contexto
Las capas del backend y las dependencias entre `pages` y `features` en el frontend solo se mantienen si algo las comprueba automáticamente. Con código generado por IA es fácil que, por ejemplo, un controller acabe importando un repositorio. architecture.md define una tabla de importaciones permitidas y prohibidas para cada capa.

## Opciones consideradas
- **ESLint con `no-restricted-imports` por glob sobre los sufijos de archivo:** sin plugins, funciona en el editor y en CI / los patrones se escriben a mano y solo se comprueban los imports directos.
- **ESLint + `eslint-plugin-boundaries`:** reglas por tipo de elemento, más expresivas / añade una dependencia y configuración extra.
- **dependency-cruiser:** analiza el grafo completo de dependencias / es otra herramienta, fuera del flujo de lint.

## Decisión
ESLint + Prettier (A-05), porque con ESLint se pueden imponer las reglas de capas de forma automática. La tabla de capas se traduce a `no-restricted-imports` por glob, aprovechando los sufijos de archivo (`*.service.ts`, `*.repository.ts`…), sin plugins adicionales. En el frontend, la misma técnica impide que las features se importen entre sí, salvo la superficie pública de `currency`. El lint se ejecuta en CI.

## Consecuencias
- Una violación de capa falla en el editor y en CI, antes de llegar a revisión.
- No añade dependencias.
- Depende de la convención de nombres: un archivo mal nombrado se salta la regla.
- Los globs hay que mantenerlos a mano, y un re-export a través de un `index.ts` puede colar un import prohibido.