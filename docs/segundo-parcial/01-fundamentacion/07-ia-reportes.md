# 7. Inteligencia artificial para reportes dinámicos

## 7.1 Introducción y alcance del capítulo

En el segundo parcial, el docente pidió reforzar los reportes de EnsayAR con un mecanismo en el que el usuario expresa en lenguaje natural, por texto o por voz, el reporte que necesita, y el sistema lo construye en el momento. Un mismo pedido puede combinar varios criterios de selección, cálculos, agrupaciones y ordenamientos, y el resultado debe poder verse en pantalla, en PDF o en Excel. El ejemplo dado en clase resume la exigencia: "sácame una lista de los clientes que me muestre su nombre, su dirección, su email, de todos aquellos clientes que me deben, de tal monto a tal monto, por ventas al crédito". La misma consigna fija el vocabulario del problema: "un reporte tiene filas, columnas, criterios, agrupaciones, ordenación".

Este capítulo fundamenta cómo se estructura un sistema de inteligencia artificial capaz de generar reportes totalmente dinámicos, desde la teoría y desde la implementación. Primero se caracteriza el reporte y se revisa la evolución de las interfaces en lenguaje natural a bases de datos. Luego se analizan los riesgos de que un modelo escriba SQL sin restricciones y se justifica el enfoque adoptado: una capa semántica con una representación intermedia, en la que la IA traduce el pedido a una especificación JSON y nunca a SQL. Después se describe la arquitectura en tubería, la ingeniería de prompts, la voz, la ambigüedad, la seguridad, la exportación, la disponibilidad y la evaluación, y se cierra con un ejemplo completo con datos reales.

Las afirmaciones sobre la implementación corresponden al código del módulo de reportes inteligentes del backend (NestJS 11, Prisma 6 y PostgreSQL), a la pantalla web en React 19 y a la pantalla móvil en React Native con Expo. Los ejemplos se obtuvieron ejecutando el servicio sobre la tienda de demostración "vesta", con datos sintéticos.

## 7.2 Del reporte estático al reporte dinámico

### 7.2.1 Reportes estáticos, parametrizados y ad hoc

En los sistemas de información tradicionales, un reporte es un artefacto diseñado de antemano: un desarrollador define la consulta, maqueta el formato y lo publica en un menú. Herramientas como Crystal Reports o JasperReports popularizaron este **reporte estático**. Su ventaja es el control, porque la consulta se revisa una sola vez y su rendimiento se conoce. Su desventaja es la rigidez: cada necesidad nueva exige un ciclo de desarrollo.

El **reporte parametrizado** agrega flexibilidad sin cambiar la estructura: el usuario completa algunos huecos, como un rango de fechas o una sucursal. Cubre bien las preguntas recurrentes, pero no las imprevistas.

El **reporte ad hoc o dinámico** deja que el usuario decida en el momento qué datos quiere, con qué criterios, cómo agruparlos y en qué orden. Históricamente se ofreció mediante constructores visuales de consultas, que exigen conocer la estructura de los datos. La IA generativa propone reemplazar ese constructor por una conversación. Los reportes estáticos no desaparecen: en EnsayAR siguen existiendo los reportes fijos del primer parcial, como el reporte del día, y la analítica con aprendizaje automático se documenta en otro capítulo. El reporte dinámico cubre las preguntas que nadie previó.

### 7.2.2 Anatomía de un reporte

Para que una máquina construya reportes, primero hay que descomponer el concepto en piezas formales. A partir de la consigna del docente y de la estructura de una consulta SQL de lectura, se identifican los siguientes componentes:

| Componente | Pregunta que responde | Equivalente SQL |
|---|---|---|
| Fuente | ¿De qué entidad de negocio se habla? | FROM y JOIN |
| Filas | ¿Qué representa cada renglón? | Granularidad de la fuente |
| Columnas | ¿Qué datos se muestran? | Lista del SELECT |
| Criterios | ¿Qué registros entran? | WHERE |
| Agrupaciones | ¿Cómo se resumen los registros? | GROUP BY |
| Agregaciones | ¿Qué cálculo se hace por grupo? | SUM, AVG, COUNT, MIN, MAX |
| Criterios sobre totales | ¿Qué grupos entran? | HAVING |
| Ordenación | ¿En qué secuencia se presentan? | ORDER BY |
| Límite | ¿Cuántos renglones como máximo? | LIMIT |
| Totales | ¿Cuánto suman las columnas numéricas? | Fila de pie |
| Formato | ¿Dónde se entrega? | Pantalla, PDF o Excel |

La **granularidad** depende de la fuente: en un reporte de ventas cada fila puede ser una prenda vendida, y en uno de clientes, una clienta. Al agrupar, cada fila pasa a representar un grupo. La distinción entre **criterios sobre registros** (WHERE) y **criterios sobre totales** (HAVING) es sutil para el usuario, pero decisiva para el motor: "ventas de más de 2000 Bs" puede referirse a ventas individuales o a meses cuyo total supera ese monto, según haya o no una agrupación.

### 7.2.3 El reporte como consulta declarativa

Todos estos componentes son **declarativos**: describen qué se quiere, no cómo obtenerlo. Si un reporte puede describirse como un conjunto finito de decisiones, entender el pedido se reduce a llenar una estructura de datos con ellas. Construir el SQL deja de ser tarea de la IA y pasa a ser tarea de un compilador determinista. Esta es la idea central del diseño de EnsayAR.

## 7.3 Interfaces en lenguaje natural a bases de datos

### 7.3.1 Primera generación: sistemas sintácticos, semánticos y de representación intermedia

Androutsopoulos, Ritchie y Thanisch (1995), en una revisión clásica sobre las interfaces en lenguaje natural a bases de datos (NLIDB, por sus siglas en inglés), sitúan los primeros prototipos a fines de los sesenta y principios de los setenta. El más conocido es LUNAR, que consultaba análisis químicos de rocas lunares y, como sus contemporáneos, estaba atado a una base de datos concreta. En los ochenta destacó CHAT-80, escrito en Prolog, que traducía preguntas en inglés a expresiones Prolog.

La revisión distingue tres familias de arquitecturas. En los **sistemas sintácticos**, el árbol sintáctico de la pregunta se traduce directamente a una consulta. En los de **gramática semántica**, las categorías de la gramática ya son conceptos del dominio. En los de **lenguaje de representación intermedia**, la pregunta se transforma primero en una expresión lógica independiente de la base, y un módulo separado la traduce al lenguaje de consulta. Esta última familia anticipa la idea central de este capítulo: separar la comprensión del lenguaje de la generación de la consulta.

Los problemas que identificaron esos trabajos siguen vigentes: la portabilidad entre bases de datos, la ambigüedad, la dificultad del usuario para saber si una pregunta rechazada excede la cobertura lingüística del sistema o su cobertura conceptual, y la necesidad de que el sistema explique qué entendió.

### 7.3.2 Text-to-SQL neuronal y los conjuntos de evaluación

Con el aprendizaje profundo, el problema se reformuló como traducción: dada una pregunta y un esquema, producir la consulta SQL. Este planteamiento se conoce como text-to-SQL y su avance dependió de grandes conjuntos anotados. WikiSQL (Zhong et al., 2017, citado en Hong et al., 2024) ofreció muchos pares pregunta-consulta, pero sobre tablas únicas.

Spider (Yu et al., 2018) elevó la exigencia: 10 181 preguntas y 5693 consultas SQL complejas sobre 200 bases de datos con múltiples tablas, de 138 dominios. Separó las bases de entrenamiento de las de prueba, de modo que el modelo debe generalizar a esquemas nuevos, e incluyó muchos más GROUP BY, HAVING, ORDER BY y consultas anidadas que los conjuntos previos. En su publicación original, el mejor modelo lograba un 12,4 % de coincidencia exacta.

BIRD (Li et al., 2023) acercó la evaluación al mundo real: 12 751 pares pregunta-SQL sobre 95 bases que suman 33,4 GB, de 37 dominios profesionales. Su énfasis está en los **valores** almacenados: datos sucios, la necesidad de conocimiento externo para relacionar la pregunta con esos valores y la eficiencia de las consultas. En el artículo original, GPT-4 alcanzaba un 54,89 % de exactitud de ejecución, frente a un 92,96 % humano.

Esta literatura usa dos métricas principales. La **coincidencia exacta** compara componente por componente la consulta generada con la de referencia. La **exactitud de ejecución** compara los resultados de ejecutar ambas. La sección 7.15 retoma estas ideas.

### 7.3.3 El cambio que introdujeron los modelos de lenguaje de gran escala

Brown et al. (2020) mostraron que un modelo suficientemente grande, GPT-3 con 175 000 millones de parámetros, resuelve tareas nuevas sin reentrenamiento, a partir de instrucciones y unos pocos ejemplos incluidos en el texto de entrada. Este aprendizaje en contexto transformó el text-to-SQL: basta con describir el esquema en el prompt y agregar ejemplos resueltos. La revisión de Hong et al. (2024) organiza las técnicas surgidas desde entonces: enlace de esquema (schema linking), descomposición en subtareas, selección de ejemplos, autocorrección a partir de errores de ejecución y ajuste fino. También registra conjuntos más exigentes, como Spider 2.0, orientado a flujos empresariales.

Los LLM resolvieron gran parte del problema lingüístico: entienden paráfrasis, sinónimos, errores de tipeo y el español coloquial de Bolivia. Pero no resolvieron por sí solos los problemas de **confiabilidad, seguridad y gobierno de los datos** que aparecen al ejecutar una consulta generada sobre la base de producción de un negocio.

## 7.4 Riesgos de dejar que el modelo escriba SQL libre

La arquitectura más directa consiste en enviar al modelo el esquema y la pregunta, recibir SQL y ejecutarlo. En un sistema SaaS multi-inquilino que maneja ventas, deudas y datos personales, esta arquitectura presenta cinco riesgos.

**Inyección SQL.** OWASP la define como la situación en la que datos no confiables pasan a formar parte de la sintaxis de una consulta y alteran su lógica. Recomienda parametrizar los valores y restringir las partes estructurales (tablas, columnas, dirección de orden) a una lista blanca definida por la aplicación. Si el modelo escribe toda la consulta, toda la estructura es dinámica, y un usuario puede redactar su pedido para que el modelo incluya sentencias no deseadas (inyección de instrucciones o prompt injection).

**Alucinación de tablas y columnas.** El modelo produce el texto más probable, no necesariamente el correcto. Ante "el teléfono de la clienta", puede inventar una columna inexistente o elegir otra parecida con distinto significado. BIRD documenta precisamente la dificultad de relacionar la pregunta con los valores reales.

**Fuga entre inquilinos.** En EnsayAR, todas las tiendas comparten la base y cada fila lleva su identificador de tienda. Si el modelo escribe la consulta, el aislamiento depende de que recuerde el filtro en cada tabla y subconsulta. Un solo olvido expondría los datos de una tienda ante otra.

**Consultas costosas.** Una consulta libre puede generar productos cartesianos o recorrer tablas completas sin límite. En un servicio compartido, la consulta pesada de un inquilino degrada el servicio de todos.

**No determinismo.** La misma pregunta puede producir consultas distintas en ejecuciones distintas. En un reporte de gestión, dos personas que piden lo mismo deben ver lo mismo, y el auditor debe poder reproducir lo ejecutado.

A estos riesgos se suma la **disponibilidad**: si el único camino pasa por un servicio externo de IA, una credencial vencida deja al negocio sin reportes. Este riesgo se materializó durante el desarrollo: la clave de Azure OpenAI responde con el código HTTP 401, y aun así el módulo sigue funcionando (sección 7.14).

En el primer parcial, el modelo proponía una consulta SQL sobre una vista de ventas y un validador comprobaba que fuera un SELECT sobre esa vista. Era seguro, pero limitado a una sola vista. Para el segundo parcial se lo reemplazó por el enfoque siguiente.

## 7.5 Enfoque adoptado: capa semántica y representación intermedia

### 7.5.1 Las capas semánticas en la industria

La inteligencia de negocios llegó a una respuesta parecida por razones de gobierno de datos. Una **capa semántica** se interpone entre los usuarios y las tablas físicas y describe los datos en términos del negocio: dimensiones, medidas, relaciones y reglas de cálculo. Los usuarios, y hoy también los agentes de IA, consultan esa capa, y ella genera el SQL.

Según su documentación, **LookML**, el lenguaje de modelado de Looker, describe dimensiones, agregados, cálculos y relaciones, y Looker usa ese modelo para construir las consultas. Las expresiones SQL se escriben una sola vez y se reutilizan para generar consultas ad hoc, mientras el usuario de negocio elige dimensiones, medidas y filtros sin escribir SQL. LookML separa la estructura de la consulta (cómo se unen las tablas) de su contenido (columnas, cálculos y filtros).

La **dbt Semantic Layer**, basada en MetricFlow, define métricas sobre los modelos existentes y resuelve automáticamente las uniones. Su documentación destaca la consistencia: si una métrica cambia, el cambio llega a todas las herramientas, y los asistentes de IA pueden consultar métricas gobernadas en lugar de adivinar sobre las tablas crudas.

**Cube** organiza el modelo en cubos con medidas (datos cuantitativos) y dimensiones (datos categóricos). Al pedir una medida junto con una dimensión, genera automáticamente una consulta con GROUP BY, y ofrece vistas para controlar qué parte del modelo se expone.

Las tres herramientas comparten una tesis: el usuario elige entre piezas previamente revisadas y un generador determinista arma el SQL. EnsayAR la adopta a escala de un módulo, con un catálogo propio en TypeScript.

### 7.5.2 La especificación como contrato entre la IA y el compilador

El propio código resume el enfoque: el modelo "no ve la base ni escribe SQL: recibe el catálogo semántico y devuelve una especificación JSON que después valida y compila el backend". La IA queda confinada a lo que hace bien, comprender el lenguaje, y se la excluye de lo riesgoso: la sintaxis SQL, los joins y los filtros de seguridad.

La especificación es una representación intermedia en el sentido de Androutsopoulos et al. (1995): no depende de cómo se almacenan los datos, sino de cómo los nombra el negocio. Contiene los componentes de 7.2.2: título, fuente, columnas con agregación opcional, filtros (campo, operador, valor, segundo valor y agregación opcional), agrupaciones, orden, límite y formato. Tres productores pueden generarla: el modelo de IA, el intérprete por reglas y el usuario, al editar los criterios en pantalla. Todos pasan por el mismo validador y el mismo compilador.

### 7.5.3 Comparación de enfoques

| Aspecto | SQL libre generado por el modelo | Especificación sobre capa semántica |
|---|---|---|
| Superficie de inyección | Toda la consulta | Solo valores, siempre parametrizados |
| Campos inventados | Posibles | Rechazados por el validador |
| Aislamiento por tienda | Depende del modelo | Fijo en cada fuente |
| Costo de la consulta | Impredecible | Joins revisados y límite máximo |
| Reproducibilidad | Baja | La especificación se guarda y se recompila |
| Funcionamiento sin IA | Imposible | Intérprete por reglas |
| Expresividad | Máxima | Acotada al catálogo |

El costo es la expresividad: no se puede pedir lo que el catálogo no describe. Es una decisión consciente, porque en un sistema de gestión es preferible un reporte que dice "ese dato no existe" a uno que inventa una respuesta plausible.

## 7.6 Arquitectura en tubería

El módulo se organiza como una tubería (pipeline) de ocho etapas. Cada una recibe una representación del pedido y entrega otra más precisa: audio, texto, texto normalizado, especificación propuesta, especificación validada, SQL con parámetros, filas, y finalmente presentación y registro de auditoría.

> Figura 7.1: Tubería del reporte inteligente. De izquierda a derecha: captura (texto o voz), normalización, interpretación (modelo de Azure OpenAI con respaldo por reglas), validación contra el catálogo, compilación a SQL parametrizado, ejecución dentro de una transacción con la tienda fijada en la sesión, presentación (tabla, barras, narración, PDF o Excel) y auditoría. Debajo, la capa semántica alimenta la interpretación, la validación y la compilación.

El servicio expone cinco rutas, protegidas por autenticación JWT y por un guardia que solo admite los roles ADMIN, ENCARGADO y SUPERADMIN:

| Método | Ruta | Función |
|---|---|---|
| GET | /reportes/inteligente/catalogo | Fuentes, campos, operadores, ejemplos y estado del modelo |
| POST | /reportes/inteligente | Pregunta en lenguaje natural, devuelve el reporte |
| POST | /reportes/inteligente/interpretar | Pregunta, devuelve solo la especificación |
| POST | /reportes/inteligente/ejecutar | Especificación editada, devuelve el reporte |
| POST | /reportes/inteligente/exportar | Especificación o pregunta, devuelve PDF o Excel |

### 7.6.1 Etapa 1: captura

La entrada es un texto de entre 3 y 600 caracteres, validado en el controlador. Puede escribirse o dictarse: en la web, con la Web Speech API del navegador; en el móvil, con el micrófono del teclado del sistema. En ambos casos, el backend recibe texto (sección 7.10).

### 7.6.2 Etapa 2: normalización

Antes de interpretar conviene reducir la variabilidad superficial. La función normalizarTexto, común a todo el módulo, descompone los caracteres con la forma Unicode NFD, elimina los diacríticos y pasa a minúsculas, de modo que "Sácame" y "SACAME" son idénticos. El intérprete por reglas agrega una segunda capa: quita la puntuación y las palabras "Bs" o "bolivianos" junto a las cifras, elimina el punto de miles ("3.000" pasa a "3000"), convierte la coma decimal y transforma los números dichos en palabras en cifras ("mil quinientos" pasa a "1500").

### 7.6.3 Etapa 3: interpretación

EnsayAR tiene dos intérpretes con la misma salida. El **intérprete por modelo** envía a Azure OpenAI (deployment gpt-4.1-mini) un prompt con el catálogo y los valores de la tienda, junto con la pregunta recortada a 600 caracteres, y pide JSON (sección 7.8). El **intérprete por reglas** aplica expresiones regulares y heurísticas en español (sección 7.9). Se intenta primero el modelo. Si no está configurado, no responde, devuelve algo que no es JSON o propone una especificación inválida, interviene el intérprete por reglas.

### 7.6.4 Etapa 4: validación

Toda especificación, venga de donde venga, pasa por validarEspecificacion, que aplica una lista blanca: fuente existente, campos de esa fuente, operadores acordes al tipo, agregaciones con sentido y valores bien formados. También normaliza: completa columnas por defecto, ordena los extremos de un rango y acota el límite (sección 7.12).

### 7.6.5 Etapa 5: compilación

El compilador traduce la especificación validada a un único SELECT parametrizado. Es una función pura y determinista: la misma especificación produce siempre el mismo SQL y los mismos parámetros. Solo concatena expresiones del catálogo, revisadas a mano, y todo valor del usuario va como parámetro numerado ($1, $2, etc.) con conversión de tipo explícita. Sus reglas principales son estas:

- El reporte se considera agrupado si hay agrupaciones, si alguna columna o filtro lleva agregación o si alguna columna ya es un agregado, como el número de tickets.
- En un reporte agrupado, cada medida recibe la agregación indicada o la agregación por defecto del campo; si no tiene, la suma.
- Todo dato descriptivo que aparezca como columna en un reporte agrupado se convierte en grupo implícito, para que la consulta siempre sea válida.
- El GROUP BY se escribe por posición de columna (GROUP BY 1, 2).
- Los filtros sobre registros van al WHERE y los filtros sobre agregados, al HAVING.
- El ORDER BY usa la posición de la columna, o su expresión si no está en la salida, siempre con NULLS LAST.
- Solo se agregan los joins opcionales que necesitan los campos usados.
- La consulta cierra con un LIMIT entero, ya acotado por el validador.

Sin orden explícito, un reporte agrupado se ordena de mayor a menor por la última medida agregada, y uno sin agrupar, por el orden por defecto de la fuente. Ordenar un reporte agrupado por un dato no agrupado produce el error ORDEN_INVALIDO.

### 7.6.6 Etapa 6: ejecución aislada por tienda

La consulta se ejecuta en una transacción de Prisma con dos sentencias. La primera es SELECT set_config('app.tienda_id', identificador, true). Según la documentación de PostgreSQL, si el tercer argumento (is_local) es verdadero, el valor solo rige durante la transacción actual. La segunda es la consulta compilada. Cada fuente incluye en su condición base current_setting('app.tienda_id', true), que devuelve el valor fijado o NULL si no existe. Como el filtro pertenece a la definición de la fuente, ningún intérprete puede omitirlo. El identificador proviene del contexto de inquilino de la petición, nunca del texto del usuario.

Luego los resultados se serializan: los decimales y enteros grandes pasan a números y las fechas a cadenas AAAA-MM-DD. Por último, se calculan los totales de las columnas totalizables.

### 7.6.7 Etapa 7: presentación, narración y exportación

La respuesta incluye el título, el motor que interpretó (modelo, reglas o edición manual), la especificación, una descripción en lenguaje natural de lo entendido, columnas, filas, totales, narración, avisos, SQL, parámetros y tiempo en milisegundos. Las secciones 7.11 y 7.13 describen cómo se usan.

### 7.6.8 Etapa 8: auditoría

Cada ejecución se guarda en la tabla reporte_ejecuciones, que corresponde al modelo ReporteEjecucion: pregunta (hasta 500 caracteres), SQL ejecutado, cantidad de filas, especificación completa en JSON, usuario y fecha. La tienda se asigna por defecto con current_setting('app.tienda_id'). Guardar la especificación, y no solo el SQL, permite reproducir el reporte: el compilador es determinista y los valores de los filtros están dentro de la especificación. Las exportaciones vuelven a ejecutar la especificación, así que también quedan registradas.

## 7.7 La capa semántica de EnsayAR en detalle

### 7.7.1 Fuentes

El catálogo define seis fuentes. Cada una declara su FROM con los joins obligatorios, una condición base con el aislamiento por tienda y las reglas de negocio, joins opcionales, campos, columnas por defecto, medidas al agrupar, orden por defecto, campo de fecha y medida principal.

| Fuente | Cada fila es | Campos | Condición base, además de la tienda |
|---|---|---|---|
| Ventas | Una línea de venta | 28 | Venta cobrada o devuelta, con unidades no devueltas |
| Clientes | Una clienta registrada | 15 | Usuario con rol CLIENTA |
| Créditos | Una cuenta por cobrar | 15 | Ninguna |
| Inventario | Una variante en un almacén | 16 | Ninguna |
| Productos | Un producto del catálogo | 12 | Ninguna |
| Movimientos | Un movimiento de kardex | 13 | Ninguna |

En total hay 99 campos. Lo que no está en el catálogo no se puede pedir: no existen, por ejemplo, el hash de la contraseña, el teléfono ni el costo de compra.

### 7.7.2 Anatomía de un campo

Cada campo tiene una **clave** estable (por ejemplo, deuda), una **etiqueta** visible ("Deuda (saldo crédito)"), un **tipo** (texto, entero, numero, dinero, fecha, fechahora o logico) y una **expresión SQL** fija, como COALESCE(cr.deuda, 0). Además declara sus **sinónimos**, sin tildes y en minúsculas; para la deuda son, entre otros, "debe", "deben", "adeuda", "saldo" y "por cobrar". Puede indicar también los **joins** opcionales que necesita y si ya es un **agregado** (como COUNT(DISTINCT v.id)), lo que obliga a agrupar. Otros atributos marcan las **dimensiones** numéricas que no se suman, como el año o la hora; la lista cerrada de **valores** de una enumeración, como los medios de pago, y la **agregación por defecto**: el precio unitario se promedia, la deuda se suma y los días de mora toman el máximo.

Un campo es **medida** si es entero, numero o dinero y no está marcado como dimensión. Es la misma distinción entre medidas y dimensiones que usan Cube y LookML, y gobierna buena parte de las decisiones del validador y del compilador.

### 7.7.3 Agregaciones

| Agregación | SQL generado | Etiqueta |
|---|---|---|
| suma | SUM(e) | Total ... |
| promedio | ROUND(AVG(e)::numeric, 2) | Promedio ... |
| conteo | COUNT(e) | N.º de ... |
| conteo_distinto | COUNT(DISTINCT e) | ... distintos |
| minimo | MIN(e) | ... mínimo |
| maximo | MAX(e) | ... máximo |

### 7.7.4 Joins opcionales y cálculos encapsulados

Las expresiones complejas se encapsulan en joins laterales que solo se agregan cuando algún campo los usa:

- **Dirección de la clienta**: un LEFT JOIN LATERAL toma una sola dirección y prefiere la etiquetada "Casa", para no repetir clientas con varias direcciones.
- **Crédito de la clienta**: otro join lateral resume sus cuentas por cobrar (deuda, total vendido a crédito, créditos abiertos, días de mora y próximo vencimiento).
- **Importe neto**: el importe de una línea prorratea el descuento de cupón de la venta y descuenta lo devuelto; para eso, un join lateral calcula el total bruto de la venta.

La unidad de inclusión es el join, no el campo: si el reporte usa solo la deuda, se agrega el join de crédito completo. El catálogo prevé dependencias entre joins (joinsRequieren), aunque ninguna fuente las usa todavía.

### 7.7.5 Tiempo y zona horaria

Las fechas se guardan en UTC, pero el negocio piensa en la hora de Bolivia. Toda expresión de fecha convierte la columna con AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz', y "hoy" se calcula en esa zona, de modo que "ventas de ayer" significa ayer en La Paz. El mes se representa como texto AAAA-MM, que se ordena cronológicamente de forma alfabética, y el día de la semana se obtiene con EXTRACT(ISODOW) sobre un arreglo de nombres en español.

### 7.7.6 Datos agregados para el ejemplo del docente

El ejemplo del docente supone ventas al crédito y deudas, que el sistema del primer parcial no tenía. Se incorporaron así:

- El medio de pago "credito" del punto de venta exige una clienta (de lo contrario, responde CREDITO_REQUIERE_CLIENTA), fija un plazo de 30 días y no suma dinero a la caja.
- El modelo CuentaCobrar guarda monto, saldo y vencimiento de cada venta al crédito. Una restricción CHECK exige que el saldo esté entre cero y el monto.
- El modelo AbonoCredito guarda los pagos parciales, con una restricción CHECK de monto positivo. El abono descuenta el saldo con un UPDATE condicional, para que dos abonos simultáneos nunca lo dejen negativo, y es idempotente mediante la cabecera Idempotency-Key.
- Una devolución de una venta al crédito ajusta el saldo de la cuenta.

## 7.8 Ingeniería de prompts aplicada

La ingeniería de prompts consiste en diseñar las instrucciones y el contexto que recibe un modelo de lenguaje para que resuelva una tarea con precisión. En EnsayAR, la función promptInterprete arma el prompt, que se envía como mensaje de sistema. Su diseño responde a seis decisiones.

### 7.8.1 Contexto de esquema

El prompt describe la base en términos de la capa semántica, no de las tablas físicas. Para cada fuente incluye su clave, su descripción y sus campos con tipo, indicando si el campo "ya es total" y, en las enumeraciones, sus valores. También enumera las agregaciones y los operadores por tipo de dato, el formato de fechas (AAAA-MM-DD), la fecha de hoy en la hora de Bolivia, para resolver expresiones como "el mes pasado", y la moneda (Bs). Esto equivale a un enlace de esquema resuelto de antemano: en lugar de buscar entre decenas de tablas, el modelo recibe solo los 99 campos con significado de negocio.

### 7.8.2 Valores reales del dominio

BIRD mostró que muchos errores provienen de desconocer los valores almacenados. Si el usuario dice "Sopocachi", el modelo no sabe si es una sucursal, una ciudad o una clienta, ni cómo está escrito. EnsayAR arma un **diccionario de la tienda** que guarda en caché 60 segundos por tienda: sucursales, ciudades, categorías y ocasiones (de hasta 500 productos), colores (hasta 100) y proveedores (hasta 100). El prompt incluye hasta 40 valores de cada lista, con la instrucción de usarlos "tal cual". El diccionario también reúne nombres de productos y de clientas, pero solo los usa el intérprete por reglas; el prompt no los envía, lo que reduce su tamaño y evita exponer nombres de personas al servicio externo.

### 7.8.3 Aprendizaje con pocos ejemplos

Siguiendo a Brown et al. (2020), el prompt incluye cuatro ejemplos resueltos (few-shot), cada uno con un patrón distinto:

1. El caso del docente, con columnas explícitas y un rango de deuda.
2. Un "top 5" de productos más vendidos del mes, con agrupación, orden por suma y formato Excel.
3. Una agrupación por dos niveles con un criterio sobre el total del grupo (HAVING), en PDF.
4. Un pedido que menciona el teléfono, un dato inexistente, resuelto con un aviso.

Los ejemplos también documentan el formato: el modelo aprende la forma exacta de los filtros y del orden con más fidelidad que con una descripción abstracta.

### 7.8.4 Salida JSON estructurada

La petición a Azure OpenAI incluye response_format con el tipo json_object (JSON mode). Según la documentación de Microsoft, este modo garantiza un JSON válido pero no la adhesión a un esquema, y exige que la palabra "JSON" figure en los mensajes. El prompt la incluye ("RESPONDE SOLO este JSON") junto con la plantilla del objeto esperado. La documentación recomienda, cuando es posible, structured outputs: response_format de tipo json_schema con strict activado, que obliga al modelo a seguir un esquema.

En EnsayAR, la garantía de esquema la da el validador propio, porque hay reglas que dependen del catálogo y que un esquema JSON genérico expresa con dificultad, como que un campo pertenezca a la fuente elegida. Antes de interpretar la respuesta, leerJson elimina posibles delimitadores de bloque de código y rechaza cualquier respuesta que no sea un objeto.

### 7.8.5 Temperatura y determinismo

La temperatura controla la aleatoriedad del muestreo. EnsayAR usa 0,2, un máximo de 700 tokens y un tiempo límite de 25 segundos. La temperatura baja reduce la variabilidad, pero no la elimina. El determinismo real lo aportan el compilador, que sí es determinista, y la especificación guardada en la auditoría.

### 7.8.6 Datos inexistentes: avisar, no inventar

La regla más importante del prompt dice: "Si piden un dato que no existe (teléfono, CI, costo…), no lo inventes: omítelo y explícalo en avisos". El servicio acepta hasta cinco avisos del modelo y los muestra al usuario. El intérprete por reglas aplica la misma política con patrones para teléfono, documento de identidad o NIT, edad o cumpleaños, y costo o margen. En esos casos responde, por ejemplo: "El dato teléfono no se registra en el sistema; se omitió del reporte". En un reporte de cobranzas, una columna de teléfonos inventados sería peor que una columna ausente.

Otras reglas completan la guía. Si el usuario no indica columnas, quedan vacías y el sistema pone las habituales. Si se agrupa, las medidas llevan agregación, y un criterio sobre el total de un grupo la lleva en el filtro. "Más vendidos" ordena por suma de unidades o de importe, y "top N" fija el límite. Para nombres parciales se usa el operador contiene, y el formato solo es PDF o Excel si se pide.

## 7.9 El intérprete por reglas

El intérprete por reglas es un analizador de dominio restringido que produce la misma especificación que el modelo. No compite con un LLM en cobertura lingüística: garantiza que el módulo funcione sin IA y sirve de referencia determinista. Procesa el texto en este orden:

1. **Avisos** de datos inexistentes.
2. **Formato**: "en Excel", "planilla" u "hoja de cálculo" fijan Excel; "en PDF" o "para imprimir", PDF.
3. **Fechas absolutas**, antes que los números, para que "2025" no se lea como monto: rangos ("del 3 al 15 de marzo"), días con mes y año, fechas ISO o con barras, meses sueltos y años. Si el mes nombrado es posterior al actual y no se indica el año, se asume el anterior.
4. **Fechas relativas**: hoy, ayer, esta semana, este mes, el mes pasado, este año, el año pasado, el último trimestre (90 días), el último semestre (180) y "los últimos N días, semanas, meses o años", con un tope de 3650 días.
5. **Límite**: "top 10" o "los 5", si el número no va seguido de una unidad de tiempo o de cantidad.
6. **Fuente**: "sin ventas" lleva a productos; en otro caso, gana la fuente cuyo sinónimo aparece primero en la frase, con una prioridad fija para los empates.
7. **Menciones de campos**, buscando los sinónimos del más largo al más corto y sin solapamientos.
8. **Orden explícito**: "ordenado por deuda de mayor a menor", "alfabético".
9. **Agrupaciones**: "por sucursal", "de cada categoría", "agrupado por mes", encadenadas con comas, "y" o "e" ("por sucursal y medio de pago"), además de rankings y superlativos.
10. **Criterios numéricos**: "de 500 a 3000", "más de", "al menos", "menos de", "hasta". Cada número se asigna a la medida mencionada más cerca o a la que sugiere el contexto; en clientes, "deben" apunta a la deuda. Si hay agrupación, el criterio recibe la agregación por defecto y va al HAVING.
11. **Palabras clave por fuente**: medios de pago y canal en ventas; mayoristas y morosas en clientes; vencidos o pagados en créditos; agotados en inventario; tipos de movimiento en el kardex.
12. **Valores del diccionario**: tallas, sucursales, ciudades, categorías, colores, productos, proveedores y clientas. Gana la coincidencia de mayor puntaje según su longitud, si es completa y si va precedida por el nombre del campo.
13. **Fechas** sobre el campo de fecha de la fuente; si no lo tiene, se avisa.
14. **Orden implícito**: "los que más deben" ordena por deuda descendente; "más vendidos", por unidades o importe; un período agrupado, cronológicamente; en otro caso, por la medida filtrada.
15. **Columnas**: si el usuario nombró dos o más datos, se muestran esos; si no, las habituales. Se agregan la medida filtrada y la de orden, para que se vea el dato que justifica la selección.

Los números dictados se convierten con una pequeña gramática de numerales que trata unidades, decenas, centenas, "mil" y la conjunción "y": "treinta y cinco" pasa a 35 y "mil quinientos", a 1500.

## 7.10 Reconocimiento de voz

### 7.10.1 Fundamentos

El reconocimiento automático del habla (ASR) convierte una señal de audio en texto mediante redes neuronales entrenadas con grandes volúmenes de audio transcrito. Whisper (Radford et al., 2022) se entrenó con 680 000 horas de supervisión multilingüe y multitarea y generaliza sin ajuste fino. Para un sistema de reportes, el ASR suma errores propios: palabras mal reconocidas, números en letras, falta de puntuación y nombres del dominio que el modelo acústico desconoce.

### 7.10.2 Alternativas tecnológicas

- **Web Speech API**: según MDN, tiene una parte de síntesis y otra de reconocimiento asíncrono (SpeechRecognition), que puede usar un servicio de la plataforma del usuario, la opción por defecto, o ejecutarse localmente. No requiere claves, pero depende del navegador.
- **Azure Speech**: ofrece transcripción en tiempo real con resultados intermedios, transcripción rápida, por lotes y modelos personalizados, además de listas de frases para mejorar el reconocimiento de términos del dominio.
- **Whisper**: modelo abierto que puede ejecutarse en un servidor propio o consumirse como servicio, sobre archivos de audio.

### 7.10.3 Implementación en EnsayAR

La web usa la Web Speech API, configurada con el idioma es-BO, resultados intermedios activados y modo no continuo. El texto parcial aparece en vivo en el cuadro de la pregunta y, al terminar de hablar, si tiene al menos tres caracteres, el reporte se genera sin otro clic. Si el micrófono no tiene permiso, se muestra un mensaje específico, y si el navegador no implementa la API, se sugiere usar Chrome, Edge o el dictado del teclado del celular. En el móvil se usa el micrófono del teclado del sistema, lo que evita dependencias nativas adicionales. Azure Speech y Whisper quedan como alternativas futuras, sobre todo para sesgar el reconocimiento con el vocabulario de la tienda.

### 7.10.4 Normalización posterior al reconocimiento

Como el backend siempre recibe texto, la robustez frente al ASR depende de la normalización y de la interpretación. El verificador incluye este caso: "dame los clientes que me deben de cien a mil quinientos bolivianos con su correo" debe producir un filtro de deuda entre 100 y 1500. Las fechas relativas se resuelven contra la fecha de hoy en La Paz, que el servicio calcula y entrega tanto al prompt como al intérprete por reglas.

## 7.11 Ambigüedad y su resolución

En los reportes, la ambigüedad puede ser léxica (una palabra con varios significados), de referencia (a qué entidad alude un nombre), de alcance (si un criterio aplica a registros o a grupos) o de omisión (lo que el usuario da por supuesto). EnsayAR combina cuatro mecanismos para resolverla.

**Sinónimos por campo y por fuente.** "Clienta", "cliente" y "compradora" designan el mismo campo. La misma palabra puede cambiar de significado según la fuente: "monto" es la deuda en clientes, el monto original en créditos y el importe en ventas. Por eso los sinónimos se resuelven después de elegir la fuente.

**Valores del diccionario.** Si "Sopocachi" coincide con parte del nombre de la sucursal "La Paz Sopocachi", se genera un filtro de sucursal que contiene ese texto. Las comparaciones ignoran tildes y mayúsculas en ambos lados: en el texto se aplica normalizarTexto, y en SQL, translate(lower(...)) con la misma tabla de equivalencias. Así, "Fernandez" encuentra "Fernández".

**Valores por defecto explícitos.** Lo omitido se completa con valores declarados en el catálogo: columnas habituales, medidas al agrupar, orden por defecto, límite de 200 filas y formato pantalla. Al estar escritos, son predecibles y documentables.

**Transparencia y criterios editables.** La pantalla muestra lo entendido como etiquetas: la fuente, cada criterio ("Deuda (saldo crédito) entre Bs 500,00 y Bs 3.000,00"), cada agrupación y el orden. El usuario puede quitar un criterio o una agrupación con la marca × e invertir el orden con un clic. Cada acción reenvía la especificación modificada a la ruta de ejecución con el motor "manual", sin volver a interpretar el texto. Androutsopoulos et al. (1995) describen una solución análoga en NLIDB clásicas como TQA, cuyo módulo de paráfrasis convertía la consulta interpretada de vuelta a lenguaje natural para que el usuario detectara malentendidos. Los mensajes de error, por su parte, enumeran los datos disponibles en la fuente, lo que ayuda a distinguir un problema de redacción de un dato que no existe. Los avisos completan el mecanismo: datos inexistentes, períodos ignorados, caída del modelo o resultados truncados por el límite.

## 7.12 Seguridad

La seguridad se diseñó en capas, para que la falla de una no comprometa el sistema.

**Valores parametrizados.** El compilador nunca inserta valores del usuario en el texto SQL. Cada valor se referencia como $n con conversión explícita (::numeric, ::date, ::text, ::text[] o ::int), y los comodines de LIKE (%, _ y la barra invertida) se escapan. Es la defensa primaria que recomienda OWASP.

**Lista blanca de estructura.** Fuente, columnas, joins, agregaciones, operadores y dirección de orden solo pueden tomar valores definidos en el código. Cada violación tiene un código propio:

| Código | Causa |
|---|---|
| ESPECIFICACION_VACIA | No llegó un objeto |
| FUENTE_DESCONOCIDA | La fuente no está en el catálogo |
| CAMPO_NO_PERMITIDO | El campo no pertenece a la fuente |
| AGREGACION_DESCONOCIDA | La agregación no existe |
| AGREGACION_DOBLE | Se agrega algo que ya es un total |
| AGREGACION_INVALIDA | Suma o promedio de un dato no numérico |
| OPERADOR_INVALIDO | El operador no corresponde al tipo del campo |
| VALOR_INVALIDO | Número, fecha, texto o lista mal formados |
| AGRUPACION_INVALIDA | Agrupar por una medida o más de 4 niveles |
| DEMASIADAS_COLUMNAS | Más de 20 columnas |
| DEMASIADOS_FILTROS | Más de 15 criterios |

El compilador agrega ORDEN_INVALIDO, y el controlador, FALTA_REPORTE cuando una exportación no trae especificación ni pregunta. El servicio los devuelve como HTTP 400 con el código y un mensaje legible.

Los operadores dependen del tipo. Los textos admiten igual, distinto, contiene, no_contiene, en, vacio y no_vacio. Los números admiten igual, distinto, mayor, mayor_igual, menor, menor_igual y entre. Las fechas admiten, además de igual, desde, hasta y entre, los períodos hoy, ayer, ultimos_dias, esta_semana, este_mes, mes_anterior, este_anio y anio_anterior. Los valores también se acotan: los textos a 120 caracteres, las listas a entre 1 y 30 elementos y los días a entre 1 y 3650. Un valor de enumeración debe coincidir con uno admitido.

**Límite de filas.** Por defecto se devuelven 200 filas, con un máximo de 2000, y se avisa si el resultado alcanza el límite. Junto con los joins revisados, esto acota el costo de cualquier consulta.

**Aislamiento multi-inquilino.** La tienda se fija con set_config en la transacción y cada fuente la exige con current_setting. Además, los modelos de Prisma asignan por defecto el identificador de tienda con current_setting('app.tienda_id').

**Roles.** Solo ADMIN, ENCARGADO y SUPERADMIN usan el módulo; un cajero recibe 403.

**El cliente nunca envía SQL ni filas.** La exportación recibe una especificación o una pregunta, y el servidor vuelve a validar, compilar y ejecutar. Un cliente alterado no puede pedir un PDF con datos arbitrarios.

**Mínima exposición al proveedor de IA.** El modelo recibe el catálogo, algunos valores de catálogo de la tienda y la pregunta, pero no filas, nombres de clientas ni montos. Tampoco redacta la narración del resultado.

## 7.13 Generación del Excel, del PDF y de la narración automática

### 7.13.1 Excel

El Excel se genera en el servidor con exceljs. La hoja "Reporte" tiene un encabezado con la tienda, el título, los criterios, la fecha de generación, la cantidad de filas, el intérprete y los avisos. Los datos se escriben con su tipo real, así que el usuario puede seguir calculando, y cada columna recibe un formato según su tipo (#,##0.00 para dinero, dd/mm/yyyy para fechas). Al final va una fila TOTAL. La hoja tiene autofiltro, encabezado inmovilizado e impresión apaisada ajustada al ancho. Una segunda hoja, "Cómo se generó", documenta los criterios, el intérprete, los parámetros y el SQL, lo que convierte cada archivo en un artefacto auditable.

### 7.13.2 PDF

El PDF se genera con pdfkit en A4 apaisado, con el mismo encabezado. El ancho de cada columna depende del largo típico de su contenido (percentil 90 de las primeras 200 filas). Las filas alternan el color de fondo, los números se alinean a la derecha y los textos largos se truncan con puntos suspensivos. Cuando la tabla no cabe, se agrega una página y se repite la fila de títulos. Al final va la fila TOTAL y cada página lleva un pie con el título, la tienda y "Página i de n".

### 7.13.3 Narración automática

La generación de lenguaje natural (NLG) puede basarse en plantillas, que se completan con valores, o en modelos neuronales que redactan libremente y pueden alucinar cifras. Un número inventado en el resumen de un reporte de gestión es inaceptable, por eso EnsayAR usa plantillas: el código lo define como un "resumen escrito a partir de los números reales del resultado (no lo inventa un modelo)".

La función narrar enuncia la cantidad de filas, la fuente y el total de la primera columna de dinero sumable. Si hay una dimensión, una medida y más de una fila, nombra la fila que encabeza el ranking y su porcentaje del total listado. Por último, enumera los criterios. Si no hay resultados, lo dice y repite los criterios. La fila de totales sigue una regla explícita: se suman las agregaciones de suma y conteo, las medidas cuya agregación por defecto es la suma y los conteos de filas, pero nunca promedios, máximos ni números de tickets distintos, porque su suma no tendría sentido.

## 7.14 Disponibilidad: cortacircuito y degradación controlada

En los sistemas distribuidos, el patrón cortacircuito (circuit breaker) evita seguir llamando a una dependencia que falla: tras una falla, el circuito "se abre" durante un tiempo y las peticiones toman un camino alternativo sin esperar el error.

EnsayAR implementa una versión simple. El cliente del modelo devuelve null ante cualquier problema: falta de configuración, respuesta HTTP no exitosa (como el 401 actual), error de red o los 25 segundos de espera agotados. Al recibir null, el servicio marca el modelo como caído durante cinco minutos, agrega el aviso "El modelo de IA no respondió; se usó el intérprete local por reglas" y sigue con las reglas. Durante esos cinco minutos, las peticiones van directo a las reglas. La ruta de catálogo informa si el modelo está configurado y disponible, y la pantalla web ajusta su encabezado ("IA generativa" o "Intérprete local"). Si el modelo responde con una especificación inválida, el circuito no se abre, porque el servicio funciona: se avisa del rechazo y se usan las reglas.

Esto es una **degradación controlada**: ante la falla de la IA, el sistema pasa a un modo de menor cobertura lingüística, con la misma seguridad, el mismo formato de salida y la misma auditoría. Hoy la clave de Azure OpenAI responde 401 y el módulo atiende todos los ejemplos del capítulo con reglas locales. Cuando se renueve la clave, el modelo volverá a intervenir sin cambios de código.

## 7.15 Evaluación

### 7.15.1 Verificación automatizada del módulo

El proyecto incluye un verificador de extremo a extremo (npm run verificar:reportes), que requiere el backend levantado y los datos sintéticos de npm run datos:reportes. Según la documentación del proyecto, esos datos son 34 clientas, 320 ventas en 180 días y créditos con abonos. El verificador tiene 24 chequeos obligatorios y uno condicional:

| Grupo | Qué se comprueba |
|---|---|
| Intérprete por reglas (9, uno condicional) | Ejemplo del docente; números dictados; top 10 con período y Excel; agrupación por dos niveles; créditos vencidos en PDF; HAVING con meses en orden; "2000 a 5000" como monto y no como año; valores reales de la tienda (si existe la sucursal Sopocachi); aviso por teléfono |
| Compilador y ejecución (5) | Siete especificaciones corren en PostgreSQL; coincidencia con un cálculo independiente; montos como parámetros; aislamiento por tienda; rechazo de campos, fuentes y operadores inválidos |
| API, exportación y permisos (5) | Ruta principal; Excel válido con hoja técnica; PDF de una página y PDF paginado sin hojas en blanco; inyección tratada como texto; 400 por campo prohibido y 403 para cajero |
| Crédito y abonos (6) | Crédito sin clienta rechazado; cuenta creada sin sumar a caja; abono idempotente; abonos simultáneos sin saldo negativo; listado de créditos; devolución que cancela la deuda |

El chequeo de inyección envía como valor de un filtro el texto "x'; DROP TABLE ventas; --". El reporte devuelve cero filas y la tabla de ventas sigue existiendo, porque el valor viaja como parámetro y se trata como texto.

### 7.15.2 Comparación con SQL independiente

El chequeo más importante se inspira en la exactitud de ejecución. Para el ejemplo del docente, el verificador calcula con una consulta escrita a mano cuántas clientas tienen un saldo total en el rango: agrupa cuentas_cobrar por clienta y filtra con HAVING SUM(saldo) BETWEEN 100 AND 500. Luego comprueba que el reporte devuelve esa misma cantidad de filas y que todas las deudas listadas están dentro del rango. Así, el motor se contrasta con una fuente de verdad que no comparte código con el compilador.

### 7.15.3 Cómo medir la precisión del intérprete con IA

Los chequeos anteriores validan las reglas y el resto de la tubería. Para medir el intérprete con modelo cuando la clave esté vigente, se propone este protocolo, inspirado en Spider y BIRD:

1. Reunir unas cien preguntas redactadas por personas ajenas al desarrollo, que cubran las seis fuentes e incluyan agrupaciones, HAVING, fechas relativas, valores del diccionario, datos inexistentes y dictado por voz.
2. Escribir a mano la especificación de referencia de cada pregunta.
3. Medir por componente, al estilo de la coincidencia exacta de Spider: fuente, precisión y exhaustividad de columnas, filtros y agrupaciones, orden, límite y formato.
4. Medir la exactitud de ejecución comparando las filas de la especificación de referencia con las de la generada.
5. Calcular la tasa de validez, es decir, cuántas respuestas del modelo superan el validador sin recurrir a las reglas.
6. Correr el mismo conjunto con el modelo y con las reglas, para cuantificar la ganancia de la IA.
7. Repetir cada pregunta varias veces para medir la estabilidad con temperatura 0,2.

Comparar especificaciones componente por componente es mucho más simple que comparar SQL, otra ventaja de la representación intermedia.

## 7.16 Ejemplo completo paso a paso

Esta sección recorre la tubería con el pedido del docente, usando una respuesta real del servicio en la tienda de demostración. Los datos de las clientas son sintéticos.

### 7.16.1 Pedido

El administrador envía a POST /reportes/inteligente el texto: "Sácame una lista de los clientes que me muestre su nombre, su dirección, su email, de todos aquellos clientes que me deben de 500 a 3000 bolivianos por ventas al crédito".

### 7.16.2 Normalización e interpretación

El modelo no responde (la clave da 401), así que el servicio abre el cortacircuito, agrega el aviso y usa las reglas. La normalización elimina tildes y mayúsculas y quita "bolivianos" junto a la cifra, de modo que queda "de 500 a 3000". Luego el intérprete:

1. No encuentra formato, por lo que deja pantalla.
2. No encuentra fechas: el patrón de años solo reconoce cifras 20XX precedidas de "en", "del" o "año".
3. Elige la fuente clientes, cuyo sinónimo aparece primero; "crédito" y "ventas" vienen después.
4. Detecta nombre, dirección, email y "deben", sinónimo de la deuda.
5. Reconoce "de 500 a 3000" como rango y lo asigna a la medida más cercana, la deuda.
6. No agrega "deuda mayor a cero", que la palabra "deben" dispararía, porque ya hay un filtro sobre la deuda.
7. Ordena por la medida filtrada, de mayor a menor.
8. Muestra exactamente los datos nombrados.

### 7.16.3 Especificación validada

```json
{
  "titulo": "Clientes · Deuda (saldo crédito) entre Bs 500,00 y Bs 3.000,00",
  "fuente": "clientes",
  "columnas": [
    { "campo": "nombre" },
    { "campo": "direccion" },
    { "campo": "email" },
    { "campo": "deuda" }
  ],
  "filtros": [
    { "campo": "deuda", "op": "entre", "valor": 500, "valor2": 3000 }
  ],
  "agrupar": [],
  "orden": [{ "campo": "deuda", "dir": "desc" }],
  "limite": 200,
  "formato": "pantalla"
}
```

El validador aceptó la fuente, los cuatro campos y el operador entre, admitido para el tipo dinero. Generó el título automáticamente, porque las reglas no lo proponen, y fijó el límite por defecto.

### 7.16.4 SQL generado y parámetros

```sql
SELECT COALESCE(NULLIF(u.nombre, ''), u.email) AS "nombre",
       COALESCE(dir.detalle, 'Sin dirección') AS "direccion",
       u.email AS "email",
       COALESCE(cr.deuda, 0) AS "deuda"
FROM usuarios u JOIN cuentas cu ON cu.id = u.cuenta_id
LEFT JOIN LATERAL (
    SELECT d.detalle, d.ciudad FROM direcciones_cliente d
    WHERE d.usuario_id = u.id
    ORDER BY (d.etiqueta = 'Casa') DESC, d.id LIMIT 1) dir ON true
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(c.saldo), 0) AS deuda, COALESCE(SUM(c.monto), 0) AS fiado,
           COUNT(*) FILTER (WHERE c.saldo > 0)::int AS abiertos,
           COALESCE(MAX(GREATEST(0, (now() AT TIME ZONE 'America/La_Paz')::date - (c.vence_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz')::date)) FILTER (WHERE c.saldo > 0), 0)::int AS mora,
           MIN(c.vence_en) FILTER (WHERE c.saldo > 0) AS proximo
    FROM cuentas_cobrar c WHERE c.clienta_id = u.id) cr ON true
WHERE u.tienda_id = current_setting('app.tienda_id', true) AND u.rol = 'CLIENTA'
  AND COALESCE(cr.deuda, 0) BETWEEN $1::numeric AND $2::numeric
ORDER BY 4 DESC NULLS LAST
LIMIT 200
```

Los parámetros son [500, 3000]. Solo se agregaron los joins de dirección y crédito; el de compras quedó fuera porque ningún campo pedido lo usa. El aislamiento por tienda y el rol CLIENTA vienen de la condición base de la fuente. Los montos no aparecen en el texto, sino como $1 y $2. Antes, en la misma transacción, se ejecutó set_config('app.tienda_id', identificador de la tienda, true).

### 7.16.5 Resultado

La consulta tardó 30 milisegundos y devolvió 8 filas, con una deuda total de Bs 7.709,19. Las tres primeras:

| Nombre | Dirección | Email | Deuda (Bs) |
|---|---|---|---|
| Elena Gutiérrez | Av. América #1956, zona Barrio Hamacas | elena.gutierrez@sint.ensayar.bo | 1.925,05 |
| Andrea Soliz | Av. San Martín #2774, zona Equipetrol | andrea.soliz@sint.ensayar.bo | 1.153,15 |
| Wendy Salazar | Av. San Martín #2236, zona Obrajes | wendy.salazar@sint.ensayar.bo | 1.145,00 |

### 7.16.6 Narración y avisos

La narración fue: "8 filas de clientes, con deuda (saldo crédito) de Bs 7.709,19. Encabeza Elena Gutiérrez con Bs 1.925,05 (25% del total listado). Criterios: Deuda (saldo crédito) entre Bs 500,00 y Bs 3.000,00." El único aviso fue: "El modelo de IA no respondió; se usó el intérprete local por reglas." En pantalla, el usuario ve las etiquetas de la fuente, el criterio y el orden, y puede quitar el criterio, invertir el orden o descargar el reporte en Excel o PDF. Si el pedido hubiera terminado con "en Excel", el archivo se habría solicitado automáticamente.

## 7.17 Ejemplos complementarios: agrupación y criterio sobre totales

### 7.17.1 Agrupación por dos niveles

Pedido: "ventas por sucursal y medio de pago de los últimos 180 días". Llegó dentro de los cinco minutos posteriores a la caída detectada en el ejemplo anterior, así que el cortacircuito lo envió directo a las reglas, sin intentar el modelo; por eso no trae avisos. El intérprete eligió ventas, encadenó las dos dimensiones, tradujo el período a ultimos_dias con valor 180 y usó las medidas por defecto de la fuente al agrupar.

```json
{
  "fuente": "ventas",
  "columnas": [{ "campo": "tickets" }, { "campo": "importe" }],
  "filtros": [{ "campo": "fecha", "op": "ultimos_dias", "valor": 180 }],
  "agrupar": ["sucursal", "medio_pago"],
  "orden": [{ "campo": "importe", "agregacion": "suma", "dir": "desc" }],
  "limite": 200,
  "formato": "pantalla"
}
```

```sql
SELECT s.nombre AS "sucursal",
       v.medio_pago::text AS "medio_pago",
       COUNT(DISTINCT v.id) AS "tickets",
       SUM(ROUND((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario * v.total / NULLIF(br.total, 0), 2)) AS "suma_importe"
FROM lineas_venta lv
  JOIN ventas v ON v.id = lv.venta_id
  JOIN variantes va ON va.id = lv.variante_id
  JOIN productos p ON p.id = va.producto_id
  JOIN almacenes a ON a.id = v.almacen_id
  JOIN sucursales s ON s.id = a.sucursal_id
JOIN LATERAL (SELECT SUM(x.cantidad * x.precio_unitario) AS total FROM lineas_venta x WHERE x.venta_id = v.id) br ON true
WHERE lv.tienda_id = current_setting('app.tienda_id', true) AND v.estado IN ('cobrada', 'devuelta_parcial', 'devuelta') AND lv.cantidad > lv.cantidad_devuelta
  AND ((v.creada_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz')::date)::date BETWEEN (now() AT TIME ZONE 'America/La_Paz')::date - ($1::int - 1) AND (now() AT TIME ZONE 'America/La_Paz')::date
GROUP BY 1, 2
ORDER BY 4 DESC NULLS LAST
LIMIT 200
```

El parámetro es [180]. El importe, sin agregación en la especificación, recibió en el compilador su agregación por defecto (suma) y pasó a llamarse suma_importe. Los tickets ya son un agregado y se usan tal cual. El join del total bruto se agregó porque lo necesita la expresión del importe.

Resultaron 12 grupos, con un importe total de Bs 227.518,58, en 73 milisegundos. Los tres primeros:

| Sucursal | Medio de pago | Tickets | Total importe (Bs) |
|---|---|---|---|
| Santa Cruz Centro | efectivo | 81 | 56.884,80 |
| Santa Cruz Centro | qr | 51 | 34.584,93 |
| La Paz Sopocachi | efectivo | 51 | 31.829,17 |

La narración fue: "12 filas de ventas, con total importe de Bs 227.518,58. Encabeza Santa Cruz Centro · efectivo con Bs 56.884,80 (25% del total listado). Criterios: Fecha en los últimos 180 días." Al estar agrupado y tener entre 2 y 15 filas, la web muestra además un gráfico de barras. Entre los grupos aparece el medio "credito" (19 tickets en Sopocachi y 15 en Santa Cruz Centro), lo que confirma que las ventas al crédito ya forman parte del análisis.

### 7.17.2 Criterio sobre el total del grupo (HAVING)

Pedido: "ventas por mes del último semestre con más de 2000 Bs". Como el reporte está agrupado por mes, "más de 2000" se refiere al total de cada mes. El intérprete asignó el número a la medida principal de ventas (importe) con agregación suma.

```json
{
  "fuente": "ventas",
  "columnas": [{ "campo": "tickets" }, { "campo": "importe" }],
  "filtros": [
    { "campo": "importe", "op": "mayor", "agregacion": "suma", "valor": 2000 },
    { "campo": "fecha", "op": "ultimos_dias", "valor": 180 }
  ],
  "agrupar": ["mes"],
  "orden": [{ "campo": "mes", "dir": "asc" }],
  "limite": 200,
  "formato": "pantalla"
}
```

El SQL se muestra abreviado. Los puntos suspensivos reemplazan el FROM, los joins y la condición base, idénticos a los del ejemplo anterior:

```sql
SELECT to_char((v.creada_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz'), 'YYYY-MM') AS "mes",
       COUNT(DISTINCT v.id) AS "tickets",
       SUM(ROUND((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario * v.total / NULLIF(br.total, 0), 2)) AS "suma_importe"
...
  AND ((v.creada_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/La_Paz')::date)::date BETWEEN (now() AT TIME ZONE 'America/La_Paz')::date - ($2::int - 1) AND (now() AT TIME ZONE 'America/La_Paz')::date
GROUP BY 1
HAVING SUM(ROUND((lv.cantidad - lv.cantidad_devuelta) * lv.precio_unitario * v.total / NULLIF(br.total, 0), 2)) > $1::numeric
ORDER BY 1 ASC NULLS LAST
LIMIT 200
```

Los parámetros son [2000, 180]. El criterio con agregación fue al HAVING y el de fecha al WHERE. Los parámetros se numeran según el orden de los filtros en la especificación, no según las cláusulas, por eso el monto es $1. El orden es cronológico porque se agrupa por un período y no se pidió límite.

Resultaron siete meses, de 2026-05 a 2026-11, en 42 milisegundos:

| Mes | Tickets | Total importe (Bs) |
|---|---|---|
| 2026-05 | 20 | 16.199,45 |
| 2026-06 | 56 | 33.404,30 |
| 2026-07 | 38 | 30.842,61 |
| 2026-08 | 61 | 42.803,75 |
| 2026-09 | 57 | 38.473,46 |
| 2026-10 | 65 | 43.306,92 |
| 2026-11 | 38 | 22.488,09 |

Con los datos de demostración, todos los meses superan los Bs 2.000, así que el HAVING no excluye ninguno; con un umbral de 30 000 Bs, en cambio, se filtrarían varios. Mayo aparece incompleto porque los 180 días empiezan a mitad de ese mes, y noviembre está en curso.

## 7.18 Limitaciones y trabajo futuro

**Cobertura del catálogo.** Solo se puede pedir lo que describen las seis fuentes y sus 99 campos. Quedan fuera, por ejemplo, las reservas para probador, las suscripciones, los turnos de caja, las devoluciones como fuente propia y el costo de compra, que no se registra. Agregar una fuente no modifica el compilador ni el validador.

**Una fuente por reporte.** Las preguntas que cruzan granularidades distintas, como "stock y venta del mes por producto y sucursal", solo se resuelven en parte con joins laterales. Una extensión posible son las fuentes compuestas, al estilo de los explores de LookML.

**Gráficos y edición limitados.** La web solo muestra barras para reportes agrupados de 2 a 15 filas, y el móvil no muestra gráficos. La especificación podría incluir un tipo de visualización (líneas para series de tiempo, barras apiladas para dos dimensiones), también presente en el PDF. Además, la web permite quitar criterios e invertir el orden, pero no cambiar el valor de un criterio ni agregar uno nuevo, y en el móvil los criterios no se editan.

**Sinónimos estáticos.** Los sinónimos están en el código. La tabla de ejecuciones, que ya guarda la pregunta y la especificación, permitiría aprender sinónimos: detectar los reportes que el usuario corrige, proponer sinónimos nuevos a un administrador e incorporarlos al catálogo de la tienda.

**Aislamiento a nivel de aplicación.** El filtro por tienda está en cada fuente, pero la base no lo impone. Según la documentación de PostgreSQL, con Row-Level Security habilitado, todo acceso debe estar permitido por una política, y sin políticas rige una denegación por defecto. Políticas basadas en current_setting('app.tienda_id'), con un rol de solo lectura para el módulo, sumarían una barrera independiente del código. La misma documentación advierte que los superusuarios, los roles con BYPASSRLS y normalmente los dueños de las tablas no quedan sujetos a las políticas, así que el rol de la aplicación debe ser distinto del propietario.

**Caché.** Hoy solo el diccionario se guarda 60 segundos. Podrían guardarse también las interpretaciones de preguntas idénticas y, por poco tiempo, los resultados de especificaciones idénticas. La dbt Semantic Layer documenta una caché de resultados similar.

**Salida estricta y voz del dominio.** Pasar de JSON mode a structured outputs, con un esquema derivado del catálogo, reduciría las respuestas inválidas. Integrar Azure Speech con listas de frases tomadas del diccionario mejoraría el reconocimiento de sucursales, productos y proveedores.

**Evaluación pendiente del modelo.** Con la clave actual no fue posible medir el intérprete con IA. El protocolo de 7.15.3 queda listo para aplicarse cuando se renueve.

## 7.19 Conclusiones del capítulo

Generar reportes dinámicos con IA no se reduce a pedirle SQL a un modelo. Para que un sistema de gestión pueda confiar en esos reportes, la IA debe ocupar un lugar preciso dentro de una arquitectura mayor. En EnsayAR, ese lugar es la traducción del lenguaje natural a una especificación que expresa, en términos del negocio, fuente, columnas, criterios, agrupaciones, agregaciones, criterios sobre totales, orden, límite y formato.

Alrededor de esa traducción, los componentes deterministas aportan lo que el modelo no garantiza: un catálogo que define qué se puede pedir, un validador por lista blanca, SQL parametrizado y reproducible, aislamiento por tienda, una narración que no inventa cifras, exportaciones auditables y un registro de cada ejecución. La degradación al intérprete por reglas asegura que el negocio no se quede sin reportes cuando la IA falla, como demuestra el estado actual del proyecto.

El diseño combina la representación intermedia de las primeras NLIDB, la capa semántica de la inteligencia de negocios y la capacidad lingüística de los modelos actuales. Así, un usuario puede pedir con su voz la lista de clientas que le deben entre 500 y 3000 bolivianos, con nombre, dirección y email, y recibirla en segundos en pantalla, en PDF o en Excel.

## Referencias del capítulo

1. Androutsopoulos, I., Ritchie, G. D., & Thanisch, P. (1995). Natural Language Interfaces to Databases – An Introduction. Natural Language Engineering, Cambridge University Press. arXiv: cmp-lg/9503016. https://arxiv.org/abs/cmp-lg/9503016
2. Yu, T., Zhang, R., Yang, K., et al. (2018). Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task. Proceedings of the 2018 Conference on Empirical Methods in Natural Language Processing (EMNLP), 3911–3921. arXiv: 1809.08887. https://arxiv.org/abs/1809.08887
3. Li, J., Hui, B., Qu, G., et al. (2023). Can LLM Already Serve as A Database Interface? A BIg Bench for Large-Scale Database Grounded Text-to-SQLs (BIRD). arXiv: 2305.03111. https://arxiv.org/abs/2305.03111
4. Hong, Z., Yuan, Z., Zhang, Q., Chen, H., Dong, J., Huang, F., & Huang, X. (2024). Next-Generation Database Interfaces: A Survey of LLM-based Text-to-SQL. arXiv: 2406.08426. https://arxiv.org/abs/2406.08426
5. Brown, T. B., Mann, B., Ryder, N., et al. (2020). Language Models are Few-Shot Learners. arXiv: 2005.14165. https://arxiv.org/abs/2005.14165
6. Radford, A., Kim, J. W., Xu, T., Brockman, G., McLeavey, C., & Sutskever, I. (2022). Robust Speech Recognition via Large-Scale Weak Supervision. arXiv: 2212.04356. https://arxiv.org/abs/2212.04356
7. Microsoft. How to use JSON mode with Azure OpenAI in Microsoft Foundry Models. Microsoft Learn. https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/json-mode
8. Microsoft. How to use structured outputs with Azure OpenAI. Microsoft Learn. https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/structured-outputs
9. Microsoft. What is speech to text? Azure Speech. Microsoft Learn. https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-to-text
10. Mozilla. Web Speech API. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
11. dbt Labs. dbt Semantic Layer. dbt Developer Hub. https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl
12. Google Cloud. Introduction to LookML. Looker Documentation. https://cloud.google.com/looker/docs/what-is-lookml
13. Cube Dev. Data modeling: Getting started. Cube Documentation. https://cube.dev/docs/product/data-modeling/overview
14. OWASP Foundation. SQL Injection Prevention Cheat Sheet. OWASP Cheat Sheet Series. https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
15. PostgreSQL Global Development Group. PostgreSQL 18 Documentation: 9.28 System Administration Functions; 5.9 Row Security Policies. https://www.postgresql.org/docs/current/functions-admin.html y https://www.postgresql.org/docs/current/ddl-rowsecurity.html
