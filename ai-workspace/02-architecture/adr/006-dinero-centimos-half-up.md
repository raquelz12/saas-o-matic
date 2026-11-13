# ADR-006 · Dinero en céntimos enteros y redondeo half-up

Relacionado con: RF-22, RF-24, RF-42 · RB-05, RB-08, RB-14 · Spec 2.2, 4.1

## Contexto
La spec obliga a que todos los importes del backend sean céntimos de EUR enteros, sin coma flotante, y las tasas puntos básicos (convenciones, 4.1). El impuesto se redondea con half-up (RB-05). La conversión a otras divisas también usa half-up, aplicado por separado a la base y al impuesto (RB-14).

## Opciones consideradas
- **Céntimos enteros + half-up con aritmética entera:** exacto y se guarda como `INTEGER` / obliga a convertir en cada visualización y a vigilar las unidades.
- **Euros como `number` con `Math.round`:** lo más directo / tiene los errores de coma flotante (`1.005`) que la spec descarta (RF-42).
- **Librería decimal también en el backend (big.js, decimal.js):** aritmética exacta sin cambiar de unidad / SQLite no tiene tipo decimal (habría que usar TEXT o REAL), y el dominio deja de estar libre de dependencias.

## Decisión
Céntimos enteros, tasas en puntos básicos y half-up. En el backend, el módulo `money` calcula `impuesto = floor((base × tasa_bp + 5000) / 10000)` y `total = base + impuesto`. En el frontend, la conversión usa big.js con `roundHalfUp` a los decimales que indica `Intl.NumberFormat`: la base y el impuesto se convierten por separado y el total es la suma de los dos ya redondeados.

## Consecuencias
- Siempre se cumple `base + impuesto = total`, garantizado además por un `CHECK` en la base de datos.
- El producto máximo (517 000 × 10 000) queda muy por debajo de `Number.MAX_SAFE_INTEGER`, así que no hace falta BigInt.
- El total mostrado puede diferir en una unidad mínima del total convertido directamente (el caso de JPY en RB-15), y lo mismo pasa con la suma de los tramos convertidos. Se acepta por diseño.
- Hay dos implementaciones de half-up (entera en el backend, big.js en el frontend) que hay que testear por separado, y big.js es una dependencia más.