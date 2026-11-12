# 01- Especificación inicial

## 1.Prompt inicial

Quiero que me ayudes como arquitecto de software analista técnico a definir las especificaciones de un proyecto antes de programar nada. NO escribas código en esta conversación.

## Contexto
Estoy construyendo una herramienta interna para simular y presupuestar suscripciones SaaS multi-divisa. Se evalúa sobre todo mi capacidad de planificar y definir el problema antes de delegar el código a una IA. Te pego el enunciado completo:

## Mis decisiones hasta ahora
- Stack: Node+TS con SQLite y React.
- Dinero en céntimos enteros, sin float.
- El "Plan elegido" es informativo (Starter/Business/Enterprise) y no cambia el precio.
- Almacenamiento y llamadas API se guardan pero no entran en el coste.
- La conversión de divisa solo se hace en el frontend; en base de datos todo va en EUR.
- Se va a llevar una única tasa por país que va a ser el IVA general correspondiente. Si el país no está en la lista se rechaza desde POST. La lista de países va a ser la siguiente: España, Francia, Alemania, Italia, Portugal, Países Bajos y Reino Unido con sus respectivas tasas. El modo de redondeo va a ser half-up después de sumar el impuesto, es decir, sobre el total.
- Si el país seleccionado no es España, solo hace falta validarlo con longitud máxima, que no hayan cadenas innecesarias, etc. No hace falta validarlo como con España.
- Para la previsualización en tiempo real se hará un POST /simulations persistente y otro endpoint POST /simulations/preview.
- Como endpoints adicionales puedes incluir: 
GET /customers?search= (Buscador por nombre o identificador fiscal)
GET /customers/:id	(Vista de detalle del cliente)
GET /customers/:id/simulations	(Historial de simulaciones)
POST /simulations/preview	(Proyección en tiempo real sin duplicar la lógica en el frontend)
- Entradas se guardan las tres. Se guardan base, impuesto y total, en céntimos de euro todos. Así si el impuesto cambia se ve cual ha sido aplicado. Guarda la tasa aplicada junto con el resultado. Y sí, que sean inmutables, si se requiere, que se haga otra simulación, no se debe poder cambiar una ya guardada.
- La memoria en GB es suficiente y en entero. De llamadas a la API por mes y entero. Mínimo de usuarios debe ser 1 y máximo 500, aunque la API puede permitir hasta 1000, para protección de valores absurdos. Sí, se permiten 0 en almacenamiento y llamadas. Hay que añadir a mayores validación de campos: Los tres campos deben ser números enteros, sin decimales ni negativos, y fuera de rango se responde con 422 y mensaje de error uniforme.
- Incluye DNI, CIF, NIF y NIE. Se normaliza antes de validar para hacer la validación más fácil y se guarda normalizado. Se deduce por el formato pero no se guarda el tipo. Debe ser obligatorio en todo caso. El juego de caracteres debe ser alfanumérico tras normalizar y de entre 5 y 20 caracteres, ya normalizado. Fuera de rango o de formato inválido, error 422.
- El identificador fiscal es único por (country, tax_id), comparado ya normalizado, por lo que se ignoran mayúsculas, espacios y guiones. Duplicado error 409. El email no es único: se valida el formato, se normaliza y tiene un máximo de 254 caracteres. El nombre de empresa tampoco es único.
- El código de país será como ISO 3166-1 alpha-2.
- Los tramos de usuarios son contiguos y sin solapamiento. Los tramos son 1-10, 11-50 y 51 en adelante. 0 usuarios no se acepta.
- En cuanto a formatos: Nombre de empresa: trim y colapso de espacios internos repetidos, de 2 a 100 caracteres. Se aceptan caracteres Unicode, porque las empresas reales los usan. Se rechazan solo los caracteres de control. No hay que “sanear” HTML en el backend: se guarda tal cual y el frontend lo escapa al pintarlo. Email: trim, minúsculas, máximo 254 caracteres y validación de formato razonable con la librería del esquema (zod/pydantic), no con un regex casero ni el estándar RFC completo.
- Para el nombre de empresas para la búsqueda se aplica una coincidencia parcial, insensible a mayúsculas y acentos. Con el id fiscal se aplica la misma normalización que al guardarlo. Como el comparador de SQLite no ignora acentos, lo mejor es guardar una columna auxiliar y buscar sobre ella. Existirá paginación, por defecto 20, máximo 100. Una búsqueda vacía lista todos, paginados.
- La lista de divisas que sea EUR, USD, GBP y JPY. Se convierten subtotal e impuesto por separado, cada uno redondeado, y el total mostrado es su suma. Los decimales: se obtienen de la propia divisa en lugar de fijar 2. JPY da 0 decimales. El redondeo es solo de visualización: en base de datos todo sigue en EUR y céntimos.


## Lo que necesito
Un documento de especificación en Markdown con estas secciones:
1. Requisitos funcionales completos (con ID, título y definición con el formato "La herramienta debe...").
2. Reglas de negocio con ejemplos numéricos, incluyendo casos límite de los tramos.
3. Validaciones (campos y algoritmo del identificador fiscal español).
4. Modelo de datos SQLite.
5. Contrato de los endpoints (campos, tipos, códigos HTTP, errores).
6. Casos de prueba de aceptación.

## Cómo quiero que trabajes
- Antes de redactar nada, dime las ambigüedades, contradicciones o huecos que detectes en el enunciado y en mis decisiones, y pregúntame lo que necesites.
- No inventes reglas que no estén en el enunciado ni en mis decisiones: márcalas como "pendiente".
- Sé preciso y conciso, sin relleno.
- Responde de una sección a la vez para que pueda ir revisándolo.


## 2. Preguntas de la IA y mis respuestas

### Ronda 1 — Ambigüedades del enunciado y de las decisiones iniciales

P1 (IA): Indicas un máximo de 500 usuarios, aunque la API pueda permitir hasta 1000. ¿El límite de 500 es del slider y el de 1000 del backend, o el límite es 500 en ambos? 
R1 (yo): El slider del frontend va de 1 a 500 y el backend acepta de 1 a 1000.

P2 (IA): El redondeo half-up se aplica "sobre el total", pero la base y el impuesto se guardan por separado. ¿Se calcula impuesto = half_up(base × tasa) y total = base + impuesto para que siempre cuadren? 
R2 (yo): Sí, de acuerdo.

P3 (IA): ¿Qué tasas de IVA tiene cada país? ¿Van en una tabla de la base de datos o en configuración del código? 
R3 (yo): ES 21 %, FR 20 %, DE 19 %, IT 22 %, PT 23 % (continental), NL 21 % y GB 20 %, guardadas en una tabla por si cambian.

P4 (IA): En ISO 3166-1 alpha-2 el Reino Unido es GB, no UK. ¿Se usa GB? 
R4 (yo): Confirmo GB.

P5 (IA): El almacenamiento y las llamadas admiten 0, pero no tienen máximo. ¿Cuál es el techo? 
R5 (yo): 100 000 GB de almacenamiento y 1 000 000 de llamadas al mes.

P6 (IA): ¿POST /simulations/preview recibe customerId o el país directamente? 
R6 (yo): El mismo body que POST /simulations, pero sin persistir.

P7 (IA): ¿Qué formato tiene el error y qué códigos HTTP se usan para JSON malformado, país no soportado y cliente inexistente? 
R7 (yo): El formato { error: { code, message, details: [{ field, issue }] } }, con 400 para JSON malformado, 422 para país no soportado y 404 para cliente inexistente.

P8 (IA): Los campos desconocidos en el body, ¿se rechazan o se ignoran? 
R8 (yo): Se rechazan con 422.

P9 (IA): ¿Se acepta "10" como string? JSON no distingue 10.0 de 10. 
R9 (yo): Solo se aceptan números JSON.

P10 (IA): ¿Qué ocurre si falla la API de tipos de cambio? 
R10 (yo): Se muestra un aviso, todo pasa a EUR, el selector se deshabilita y aparece un botón de reintento. Las tasas se cachean en memoria durante la sesión y se muestra su fecha.

P11 (IA): "NIF" es el término paraguas. ¿Se incluyen además los NIF especiales K, L y M? 
R11 (yo): Sí, se incluyen DNI, NIF, CIF y NIE. (Quedó ambiguo y se aclaró en P24.)

P12 (IA): En el CIF, el carácter de control es letra, dígito o cualquiera de los dos según la letra inicial. ¿Se sigue la regla oficial? 
R12 (yo): Sí, se sigue la regla oficial.

P13 (IA): Al normalizar, ¿se eliminan también los puntos? ¿Se acepta el prefijo ES del NIF-IVA? 
R13 (yo): Se eliminan espacios, guiones y puntos, y el prefijo ES se rechaza.

P14 (IA): ¿Debe haber coherencia entre el tipo de identificador y el plan? Por ejemplo, un DNI de autónomo en un plan Enterprise. 
R14 (yo): No, ninguna regla lo impide.

P15 (IA): La búsqueda combina nombre e identificador con OR. ¿El identificador se busca con coincidencia parcial o exacta? 
R15 (yo): Coincidencia parcial sobre el valor normalizado.

P16 (IA): Quitar acentos convierte "ñ" en "n". ¿Es aceptable? 
R16 (yo): Sí.

P17 (IA): ¿Qué parámetros de paginación se usan? ¿La respuesta incluye el total? ¿Qué orden siguen los resultados? ¿Se pagina también el historial? 
R17 (yo): page y pageSize, con respuesta { items, page, pageSize, total }. Los clientes se ordenan por nombre y las simulaciones por fecha descendente. El historial también se pagina.

P18 (IA): La longitud del nombre, ¿se mide en code points tras normalizar a NFC? 
R18 (yo): Sí.

P19 (IA): No hay PUT ni DELETE de clientes. ¿Queda fuera de alcance? 
R19 (yo): Sí.

P20 (IA): ¿El plan es obligatorio y se limita a STARTER, BUSINESS y ENTERPRISE? 
R20 (yo): Sí, es obligatorio.

P21 (IA): ¿Los IDs son enteros autoincrementales y created_at va en ISO 8601 UTC? 
R21 (yo): Sí.

P22 (IA): ¿La divisa se aplica a toda la aplicación? ¿El redondeo de visualización es half-up? ¿Los decimales se toman de Intl.NumberFormat? 
R22 (yo): Sí a las tres.

P23 (IA): En B2B intracomunitario se aplicaría inversión del sujeto pasivo, pero el enunciado pide sumar el IVA del país. ¿Se ignora? 
R23 (yo): Se simplifica y se documenta.

### Ronda 2 — Huecos detectados al revisar la Ronda 1

P24 (IA): La R11 repite la lista original. ¿Se incluyen los NIF especiales K, L y M? 
R24 (yo): Sí, se incluyen K, L y M.

P25 (IA): El enunciado exige POST /customers, pero no lista un formulario de alta entre las vistas. ¿Debe haberlo? 
R25 (yo): Sí, debe haber un formulario de registro de clientes.

### Ronda 3 — Catálogos del formulario

P26 (IA): ¿De dónde saca el formulario los países y los planes? Opción A: GET /countries, que lee la tabla de tasas, y planes como enum en el frontend. Opción B: ambos fijados en el frontend. 
R26 (yo): Opción A.

### Ronda 4 — Paginación

P27 (IA): Si llega page < 1, pageSize > 100 o un valor no numérico, ¿se responde 422 o se ajusta al rango válido? 
R27 (yo): 422, que es lo más coherente.

### Ronda 5 — Revisión de las reglas de negocio

P28 (IA): RB-08 usa una tasa hipotética del 21,05 % solo para poder probar el half-up, porque con las tasas reales nunca actúa. ¿Te parece bien? 
R28 (yo): Apruebo RB-08.

P29 (IA): RB-15: al convertir la base y el impuesto por separado, en JPY el total mostrado (27 506) difiere en 1 yen del convertido directamente (27 505). ¿Se acepta por diseño? 
R29 (yo): Apruebo RB-15. Además, el algoritmo del identificador no debe ser un regex normal, sino un algoritmo de control.

### Ronda 6 — Pendientes de validaciones

P30 (IA): country y plan, ¿se normalizan con trim y mayúsculas antes de validarlos? 
R30 (yo): Sí.

P31 (IA): Si :id no es un entero, ¿se responde 422 o 404? 
R31 (yo): 422.

P32 (IA): ¿Cuál es la longitud máxima de search? 
R32 (yo): 100 caracteres.

P33 (IA): ¿details[] devuelve todos los errores de campo o solo el primero? 
R33 (yo): Todos.

P34 (IA): ¿Se valida también en el cliente? 
R34 (yo): Solo campos obligatorios y longitudes. El algoritmo fiscal se queda únicamente en el backend.

P35 (IA): Un DNI con 7 dígitos (sin el cero inicial), ¿se rellena con ceros o se rechaza? 
R35 (yo): Se rechaza.

P36 (IA): ¿Se aplica alguna restricción especial al CIF con provincia 00? 
R36 (yo): No.

### Ronda 7 — Revisión del modelo de datos

P37 (IA): ¿Te parecen bien las decisiones técnicas del modelo? Son las siguientes:
triggers de inmutabilidad;
CHECK de rangos y de total = base + impuesto;
snapshot de la tasa sin clave foránea;
409 apoyado en UNIQUE;
desempate por id;
búsqueda parcial sin índice.

R37 (yo): Sí, sigue con la sección 5.

### Ronda 8 — Pendientes del contrato de endpoints

P38 (IA): ¿Se añade el prefijo /api a todas las rutas? 
R38 (yo): Sí.

P39 (IA): Un POST con Content-Type distinto de JSON, ¿responde 400 o 415? 
R39 (yo): 415 UNSUPPORTED_MEDIA_TYPE.

P40 (IA): Los parámetros de query desconocidos, ¿se ignoran o se rechazan? 
R40 (yo): Se rechazan con 422.

P41 (IA): ¿Se incluye la cabecera Location en POST /simulations si no existe GET /simulations/:id? 
R41 (yo): No, se omite.

P42 (IA): ¿Se incluye en la respuesta el desglose por tramos (tiers), sin persistirlo? 
R42 (yo): Sí.

P43 (IA): ¿Cómo se configura el CORS para el frontend en desarrollo? 
R43 (yo): Con un origen permitido configurable por variable de entorno.

P44 (IA): Un método no permitido en una ruta existente, ¿responde 404 o 405? 
R44 (yo): 405 METHOD_NOT_ALLOWED.

## 4.Resultado

- 01-specs/spec-v01.md