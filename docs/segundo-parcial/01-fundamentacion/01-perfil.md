# 1. Perfil del proyecto

## 1.1 Introducción

EnsayAR nació en el primer ciclo como una plataforma omnicanal para una cadena de moda femenina: catálogo con variantes de talla y color, punto de venta, inventario por almacén, reservas, probador virtual 2D y 3D, bot de la tienda y reportes en lenguaje natural, todo sobre un único stock compartido por la web, la app móvil y la caja. El nombre une *ensayar* (probarse la ropa) y *AR* (realidad aumentada).

El segundo ciclo cambia la escala del producto. EnsayAR deja de ser el sistema de una cadena y pasa a ser un **software como servicio**: cualquier tienda de ropa de un país de habla hispana entra a la página comercial, elige un plan, verifica su correo, paga y recibe su propia tienda lista para operar, sin hablar con nadie. Todas las tiendas comparten la misma aplicación y la misma base de datos, pero cada una ve solo sus datos. Una misma persona puede administrar varias tiendas con un solo inicio de sesión.

El cambio de escala trae exigencias que una sola cadena no tenía:

- **Conectividad irregular.** Muchas tiendas operan con internet inestable, así que la caja debe poder vender, registrar clientas y dar de alta productos sin red, y sincronizar después sin duplicar nada ni vender dos veces la última unidad.
- **Preguntas que nadie previó.** Las dueñas hacen preguntas que no estaban en ningún menú: el reporte se pide por texto o por voz, puede cruzar varias tablas y se entrega en pantalla, en PDF o en Excel.
- **Analítica y cobros regionales.** La plataforma ofrece analítica con aprendizaje automático y cobra en monedas y medios de pago de toda la región.

El segundo ciclo es un **incremento**: todo lo construido en el primero sigue funcionando y se presenta. La arquitectura de monolito modular en NestJS, los clientes React y Expo y PostgreSQL se conservan; lo que cambia es que cada módulo opera dentro de una tienda, y que el proceso se documenta con ICONIX en lugar del Proceso Unificado.

## 1.2 Objetivo general

Convertir EnsayAR en una plataforma SaaS multi-tienda para el comercio de moda de los países de habla hispana, que permita a cualquier tienda suscribirse y operar de forma aislada, vender con o sin conexión en web y móvil, pedir reportes complejos en lenguaje natural, obtener analítica predictiva y cobrar con medios de pago regionales, documentando el incremento con la metodología ICONIX.

## 1.3 Objetivos específicos

Del primer ciclo, que se mantienen:

1. Modelar el inventario matricial (producto, variante de talla y color, stock por almacén) con disponible igual a cantidad menos reservado, compartido por web, móvil y caja.
2. Ofrecer catálogo, ficha, favoritos, opiniones, carrito, compra, reservas y probador virtual 2D y 3D en la web (PWA) y en la app Expo.
3. Operar el punto de venta con apertura y cierre de caja, cupones, precio mayorista, transferencias, despacho, devoluciones y comprobante simulado.
4. Gestionar los roles de clienta, cajero, encargado, administrador y proveedor.

Del segundo ciclo:

5. Aislar los datos de cada tienda en una base compartida, de modo que ninguna consulta pueda leer ni modificar datos de otra tienda aunque el código olvide filtrar.
6. Automatizar el alta de una tienda: página de planes, registro, verificación del correo, pago de la suscripción y creación de la tienda con su sucursal, almacén y administrador.
7. Permitir que una persona con varias tiendas use un solo inicio de sesión y cambie de tienda, y dar al dueño de la plataforma métricas de suscripciones con proyección.
8. Vender, registrar clientas y dar de alta productos sin conexión en la PWA y en la app móvil, con identificadores generados en el dispositivo, sincronización idempotente, conflicto de stock resuelto en la base y una ventana offline configurable por tienda.
9. Generar reportes desde lenguaje natural, por texto o voz, con filtros, cálculos, agrupaciones y orden sobre varias tablas, sin que el modelo de IA escriba SQL, y exportarlos a PDF y Excel.
10. Incorporar analítica con un modelo supervisado y uno no supervisado entrenados con datos sintéticos, y una pasarela de pago real en modo de pruebas para la región.

## 1.4 Descripción del problema

| Pregunta | Respuesta |
|----------|-----------|
| ¿Quién lo padece? | Las tiendas de ropa pequeñas y medianas de la región, que no pueden pagar un sistema propio, y las cadenas que operan con conectividad irregular. |
| ¿Cuál es el problema? | Un sistema instalado por tienda es caro de mantener; un sistema en la nube que se detiene sin internet no sirve en una caja; y los reportes fijos no responden las preguntas reales de la dueña. |
| ¿Cuál es el impacto? | Ventas perdidas cuando cae la red, stock vendido dos veces entre cajas, decisiones sin datos y costos de cobro altos por usar pasarelas pensadas para otros mercados. |
| ¿Qué se propone? | EnsayAR como SaaS: alta automática de tiendas, aislamiento por tienda, operación sin conexión con sincronización segura, reportes generativos, analítica y pagos regionales. |

El problema del primer ciclo sigue vigente dentro de cada tienda: si cada canal lleva su propio saldo, la última unidad de una talla y color puede venderse dos veces. El segundo ciclo lo agrava, porque ahora dos cajas pueden vender esa unidad **sin conexión**, y el conflicto recién aparece al sincronizar. La solución es la misma en ambos casos: el descuento de stock es una actualización condicional en la base, que solo se aplica si queda disponible.

## 1.5 Alcance del incremento

| Punto de la consigna | Qué se construyó | Estado |
|---|---|---|
| 1. SaaS multi-tienda | Página de planes, registro con verificación de correo, suscripción con pago idempotente, alta automática de la tienda, selector de tiendas con un solo login, límites por plan y panel de métricas (MRR, ARR, ARPU, churn, proyección a 6 meses). Aislamiento con `tienda_id` en 36 modelos y una extensión de Prisma que falla cerrada; modalidad piloto con un esquema PostgreSQL por tienda (sección 4.12). | Hecho y verificado (`verificar:tenancy`, `verificar:saas`); esquemas validados en laboratorio |
| 2. Operación sin conexión | PWA con service worker, caché de datos y cola IndexedDB; app móvil con SQLite; UUID en el cliente; sincronización por lotes con estado por operación; idempotencia en 11 rutas; conflicto de la última unidad visible y resoluble; ventana offline de 1 a 30 días; Web Push. | Hecho y verificado (`verificar:offline`) |
| 3. Reportes generativos | Capa semántica de 6 fuentes, intérprete con Azure OpenAI y respaldo por reglas, especificación JSON validada, SQL parametrizado aislado por tienda, voz en web y móvil, PDF y Excel; ventas al crédito y abonos. | Hecho y verificado (`verificar:reportes`) |
| 4. Analítica con aprendizaje automático | Pronóstico de demanda con regresión lineal, segmentación RFM con k-medias, datos sintéticos reproducibles y tablero web `/analitica` (capítulo 8; UC52 y UC53). | Hecho y verificado con datos sintéticos (`verificar-analitica-http.ts`) |
| 5. Pagos para países hispanohablantes | Estudio de costos por país, catálogo de métodos de 22 países con validación en el servidor, puerto de pasarela con adaptador simulado, idempotencia y compensación por reembolso (capítulo 5). | Implementado en modo simulado; falta el adaptador al entorno de pruebas de una pasarela real |

El alcance funcional del primer ciclo (catálogo, caja, inventario, reservas, probadores, bot, mayorista, transferencias, despacho, devoluciones y reportes) se mantiene completo y ahora opera dentro de cada tienda. Sus casos de uso UC01 a UC35 se revisaron con robustez y secuencia en el capítulo 9.

## 1.6 Características del sistema

- **Multi-tienda:** una aplicación, una base y muchas tiendas aisladas; la tienda se resuelve por el token de sesión y, antes del login, por la cabecera `X-Tienda` con el slug de la tienda.
- **Autoservicio:** la tienda se crea sola al aprobarse el pago, sin intervención humana.
- **Una cuenta, varias tiendas:** la identidad (Cuenta) es global y la membresía (Usuario) es por tienda.
- **Offline-first en caja:** la venta en efectivo, el registro de clientas y el alta de productos funcionan sin red; los pagos con QR, tarjeta y el crédito exigen conexión.
- **Sincronización segura:** UUID del dispositivo, clave de idempotencia, una transacción por operación y actualización condicional del stock.
- **Reportes generativos:** texto o voz, la IA propone y el servidor valida y compila; salida en pantalla, PDF o Excel.
- **Omnicanal:** un saldo por variante y almacén; web, móvil y caja compiten por la misma unidad.
- **Probador 2D y 3D, bot de tienda, precio mayorista, despacho y devoluciones**, heredados del primer ciclo.

## 1.7 Stack tecnológico

| Capa | Tecnología | Uso en el segundo ciclo |
|------|------------|-------------------------|
| API | NestJS 11 + TypeScript | Monolito modular; contexto de tienda con AsyncLocalStorage |
| Acceso a datos | Prisma 6 | Extensión que filtra e inyecta `tiendaId`; transacciones con `set_config` para SQL crudo |
| Base de datos | PostgreSQL | Base compartida con columna de tienda y valor por defecto desde la sesión |
| Web | React 19 + Vite, PWA | Service worker, IndexedDB, Web Speech API, Web Push |
| Móvil | Expo SDK 53 / React Native | `expo-sqlite`, NetInfo, `expo-file-system` y `expo-sharing` |
| IA | Azure OpenAI | Intérprete de reportes, bot y ficha; respaldo por reglas cuando no responde |
| Exportación | exceljs, pdfkit | Excel con hoja "Cómo se generó"; PDF A4 apaisado paginado |
| Modelado | Enterprise Architect 15 | Modelo ICONIX generado por automatización desde `casos.py` |

## 1.8 Situaciones de uso del incremento

**Situación 1: una tienda nueva.** La dueña de una boutique de Quito entra a la página de planes, elige el plan inicial por tres meses, registra su cuenta y confirma el correo. Paga con la tarjeta de prueba; si pulsa pagar dos veces, el cobro se hace una sola vez. Al aprobarse el pago la plataforma crea su tienda con sucursal, almacén y su usuario administrador, y la deja dentro sin pedir otro login.

**Situación 2: dos cajas sin internet.** En una tienda se corta la red. Dos cajeros venden en efectivo la última blusa talla M. Ambos tickets quedan pendientes en sus dispositivos. Al volver la red, el primer lote se aplica; el segundo encuentra el stock en cero y queda en conflicto, visible en la pantalla de sincronización, donde el cajero decide vender lo disponible o descartar. El stock nunca queda negativo.

**Situación 3: la pregunta de la dueña.** La dueña dicta: "clientes con nombre, dirección y email que me deben de 500 a 3000 bolivianos por ventas al crédito, en PDF". El sistema arma la especificación, la valida, la compila a SQL con parámetros, la ejecuta solo sobre su tienda y descarga el PDF con los criterios y los totales.

**Situación 4: una dueña con dos tiendas.** La administradora de Vesta también administra Aurora Boutique. Desde el selector de la barra lateral cambia de tienda; el sistema emite un token nuevo para Aurora y le muestra sus productos, sin pedir la clave otra vez.

## 1.9 Consideraciones

| Tema | Criterio |
|------|----------|
| Pagos | El pago de la suscripción y de las ventas es de prueba; no hay cobro bancario real. La conexión con el entorno de pruebas de una pasarela real se describe en el capítulo 5. |
| IA | La clave de Azure OpenAI del entorno de demostración responde 401; mientras no se renueve, el intérprete por reglas atiende los reportes. |
| Móvil | La operación sin red se probó en Expo web; en Android se verificó que el paquete compila. |
| Datos de demo | Tiendas Vesta y nueve tiendas `demo-*` de distintos países con historia de suscripciones; 34 clientas y 320 ventas sintéticas de 180 días para reportes. |
| Fuera de alcance | Cobro bancario real, facturación fiscal real y aislamiento con políticas RLS en la base (documentado como evolución). |

## 1.10 Evaluación de la arquitectura heredada y estrategia de evolución

Un segundo ciclo de desarrollo pone a prueba las decisiones del primero. Los requisitos nuevos (varias tiendas en una sola instalación, operación sin conexión, reportes generados desde lenguaje natural, analítica y pagos regionales) no estaban previstos cuando se diseñó EnsayAR, y la forma en que la arquitectura los absorbe mide su calidad.

### 1.10.1 Alternativas consideradas

Ante un cambio de requisitos de esta magnitud existen tres caminos. El primero es reutilizar la arquitectura sin cambios y agregar los módulos nuevos alrededor; es el más rápido, pero no sirve cuando el requisito nuevo afecta a todas las capas, como ocurre con el aislamiento por tienda. El segundo es modificar las capas afectadas y conservar el resto; exige analizar con cuidado el impacto, pero aprovecha el código probado. El tercero es descartar la versión anterior y reconstruir el sistema con una arquitectura pensada para los requisitos nuevos; resuelve los problemas de fondo a costa de repetir todo el trabajo del primer ciclo y de volver a probar funciones que ya operaban.

### 1.10.2 Evaluación por capa

La tabla siguiente resume cómo respondió cada capa de la arquitectura del primer ciclo a los requisitos nuevos.

| Capa | Arquitectura del primer ciclo | Cambio requerido en el segundo ciclo | Valoración |
|---|---|---|---|
| Organización del backend | Monolito modular NestJS con un módulo por área | Se agregaron los módulos de plataforma, tenencia, sincronización, reportes inteligentes y créditos sin modificar los existentes | La modularidad absorbió el crecimiento |
| Acceso a datos | Prisma sobre PostgreSQL, una sola tienda | Columna `tienda_id` en 36 modelos y una extensión de Prisma que la aplica en todas las consultas | Cambio transversal, pero concentrado en un punto gracias al ORM |
| Transacciones | Venta con bloqueo de stock y UUID único | Se reutilizaron para la sincronización y se agregaron la idempotencia y la actualización condicional | Base sólida; se extendió sin reescribir |
| Cliente web | React con una cola de ventas en IndexedDB | Service worker, caché de datos, cola para clientas y productos, Web Push | Se amplió el mecanismo existente |
| Cliente móvil | React Native con Expo | Base local SQLite y sincronización por lotes | Se agregó una capa de persistencia |
| Reportes | Reportes predefinidos y consulta por voz simple | Capa semántica, compilador de SQL parametrizado y exportación | Se reemplazó el intérprete; la interfaz se conservó |
| Infraestructura | App Service y PostgreSQL Flexible en Azure, definidos con Bicep | Sin cambios de topología | Adecuada para la escala actual |

### 1.10.3 Camino elegido

EnsayAR siguió el segundo camino: modificar capas. La arquitectura del primer ciclo resistió el cambio en lo esencial. El monolito modular permitió agregar áreas completas sin tocar las existentes, y las decisiones de integridad del primer ciclo (identificadores únicos generados en el cliente y bloqueo del stock dentro de una transacción) resultaron ser exactamente la base que necesitaba la sincronización sin conexión. El único cambio verdaderamente transversal fue el aislamiento por tienda, que afectó a todos los modelos de datos; aun así, se resolvió en un único punto del acceso a datos y no en cada servicio, lo que confirma el valor de haber centralizado la persistencia en un ORM.

Reconstruir el sistema no estaba justificado: los 35 casos de uso del primer ciclo siguen operando dentro de cada tienda y se verificaron de nuevo con robustez y secuencia en el capítulo 9. El costo de rehacerlos habría consumido el tiempo necesario para los requisitos nuevos sin aportar una mejora proporcional.

La evaluación también identifica los límites de la arquitectura actual. El aislamiento depende de la aplicación y no de la base de datos, por lo que la incorporación de políticas de seguridad por fila de PostgreSQL es la evolución natural (sección 4.10). Para las tiendas que requieran aislamiento físico, el modelo de base compartida ya cuenta con una alternativa implementada y validada en laboratorio: un esquema PostgreSQL por tienda, que se activa por configuración (sección 4.12). Por último, si el módulo de analítica adopta modelos más costosos de entrenar, será el primer candidato a separarse del monolito como un servicio independiente (sección 8.7).
