# Auditoría de Fuentes Académicas y Alcance Documental ICONIX — EnsayAR (Segundo Parcial)

**Fecha:** 11 de noviembre de 2026  
**Proyecto:** EnsayAR — Sistema de Información II  
**Destino:** `docs/segundo-parcial/05-verificacion/iconix-01-fuentes-y-alcance.md`  
**Estado:** Documento de auditoría y homologación de requisitos para el Coordinador  

---

## 1. Resumen Ejecutivo y Metodología de la Auditoría

El presente informe audita las fuentes canónicas del docente, los registros de clase, la síntesis analítica de la wiki de memorias y el estado verificado del repositorio de EnsayAR. Su propósito es fijar el **alcance documental formal del informe ICONIX del Segundo Parcial**, eliminando ambigüedades, desmitificando afirmaciones desactualizadas de la wiki y alineando la entrega con las directrices ratificadas por el dueño del proyecto.

### Principios Rectores de la Auditoría
1. **Fidelidad estricta a la evidencia:** Distinción obligatoria entre lo *implementado en código*, *probado y funcionando en laboratorio*, *parcial*, *simulado*, *pendiente* y *no verificado*.
2. **Homologación de Pagos:** Se rectifica formalmente la tesis inicial de la wiki que exigía un sandbox externo (Stripe/PayPal/Libélula). Conforme a la aclaración docente ratificada por el dueño del proyecto, **el docente acepta pagos simulados integrales y realistas** (reglas de negocio, validación por país, estados pendiente/aprobado/rechazado, idempotencia y reserva de stock) sin requerir contratos mercantiles ni integración con pasarelas externas.
3. **Realidad Arquitectónica Dual:** El sistema cuenta con una arquitectura operativa en tablas compartidas con `tienda_id` (plenamente funcional en SaaS, offline y reportes) y una arquitectura en transición hacia un esquema PostgreSQL por tienda (donde opera analítica con ML, pero que bloquea la sincronización offline y las altas con error 503/500). El alcance documental debe transparentar esta dualidad sin proclamar una migración total no consolidada.
4. **Cero Invención de Rúbricas:** No se asumen rúbricas no suministradas; las obligaciones derivan exclusivamente de la consigna oral canónica del docente (clase del 8 de noviembre de 2026) y de las evidencias de código.

---

## 2. Inventario de Rutas y Fuentes Consultadas

| Tipo de Fuente | Ruta Local / Identificador | Descripción y Relevancia |
|---|---|---|
| **Fuente Cruda (Docente)** | `Examen si2 Memorias/raw/2026-11-08-transcripcion-audio-segundo-parcial.md` | Transcripción textual de los dos audios de la clase presencial del docente titular que define el incremento del segundo parcial. |
| **Fuente Wiki (Docente)** | `Examen si2 Memorias/wiki/sources/transcripcion-audio-segundo-parcial.md` | Extracción analítica y estructuración de consignas, fechas de entrega y advertencias docentes. |
| **Síntesis Wiki (Docente)** | `Examen si2 Memorias/wiki/synthesis/Mapa del segundo parcial.md` | Mapeo estructurado de requisitos clasificados por códigos internos (B, S, O, R, A, P, D). |
| **Síntesis Wiki (Backlog)** | `Examen si2 Memorias/wiki/synthesis/Pendientes segundo parcial.md` | Backlog inicial y preguntas abiertas del proyecto al 8–9 de noviembre. |
| **Fuente Externa (Contraste)** | `Examen si2 Memorias/wiki/sources/examen1-garzon-fashionstore.md` | Guía de la docente paralela (Ing. Angélica Garzón). Sirve de contraste metodológico; no define stack ni fechas de este grupo. |
| **Fuente 1er Parcial (Docente)** | `Examen si2 Memorias/wiki/sources/transcripcion-audio-clase-ecommerce.md` | Audio fundacional del problema de negocio (moda femenina, probador virtual, reportes por voz, omnicanalidad). |
| **Fuente 1er Parcial (Corrección)**| `Examen si2 Memorias/wiki/sources/correccion-alcance-parcial.md` | Delimitación del alcance original del primer ciclo al 23 de septiembre. |
| **Decisiones del Equipo** | `Examen si2 Memorias/wiki/sources/decisiones-arquitectura-2026-11-09.md` | Registro de acuerdos del equipo (esquema por tienda, PWA, SQLite, idempotencia, pagos simulados). |
| **Conceptos Wiki** | `Examen si2 Memorias/wiki/concepts/Pasarelas de pago.md` | Análisis de medios de pago, comisiones e interpretación de simulación. |
| **Conceptos Wiki** | `Examen si2 Memorias/wiki/concepts/SaaS multi-tenant.md` | Modelos de aislamiento multi-inquilino y comparación de enfoques. |
| **Síntesis de Brechas** | `Examen si2 Memorias/wiki/synthesis/Brecha segundo parcial.md` | Comparativa histórica entre los requisitos exigidos y el código al 8-9 de noviembre. |
| **Síntesis de Conflictos** | `Examen si2 Memorias/wiki/synthesis/Contradicciones entre fuentes.md` | Matriz de inconsistencias entre audios, enunciados paralelos y acuerdos. |
| **Especificación de Pagos** | `docs/PAGOS_SIMULADOS.md` | Contrato técnico de pagos simulados parametrizados por país (BO, PE, BR, etc.). |
| **Especificación Multitenant**| `docs/DOMINIO_MULTITENANT.md` | Separación de modelos globales y locales a la tienda. |
| **Guía de Migración** | `docs/MIGRACION_ESQUEMAS_TIENDA.md` | Plan y estado de pilotos de migración hacia esquemas PostgreSQL. |
| **Informe Actual (Cap. 1)** | `docs/segundo-parcial/01-fundamentacion/01-perfil.md` | Capítulo del informe con la formulación del problema, objetivos y alcance preliminar. |
| **Informe Actual (Cap. 9)** | `docs/segundo-parcial/02-iconix/01-requisitos.md` | Matriz ICONIX preliminar (requisitos, RNF, reglas de negocio y modelo de dominio). |
| **Evidencia de Auditoría** | `docs/segundo-parcial/05-verificacion/2026-11-11-auditoria-uc36-uc54.md` | Resultados de ejecución de pruebas HTTP y DB sobre copia de auditoría para UC36 a UC54. |

---

## 3. Clasificación de Requisitos por Origen

Para estructurar la trazabilidad del proyecto, los requisitos se dividen rigurosamente en tres niveles de procedencia:

### Nivel 1: Requisitos de Base Heredados del Primer Parcial
Son las capacidades funcionales y no funcionales que conformaron la línea base del sistema monotienda aprobado en el primer ciclo. El docente ordenó explícitamente: *«En el segundo parcial tienen que presentar el 100% de lo que hace el primer parcial y estas características […] Nada se elimina»*.
- **Catálogo e Inventario Matricial:** Gestión de productos, temporadas, colecciones y variantes bidimensionales (talla × color) con control de disponible (`cantidad - reservado`).
- **Punto de Venta Omnicanal (POS):** Ventas de mostrador y pedidos web compitiendo por el mismo inventario; apertura, arqueo y cierre de turnos de caja; cupones y devoluciones.
- **Probador Virtual (AR):** Visualización de prendas en 2D y 3D sobre modelos corporales.
- **Asistente Virtual y Bot de Ventas:** Respuestas básicas sobre existencias y fichas determinísticas.
- **Reportes por Voz (Prototipo Inicial):** Consultas elementales en lenguaje natural vía micrófono hacia SQL acotado.
- **Reservas de Prendas:** Apartado presencial de prendas para retiro en sucursal.
- **Arquitectura Base:** Monolito modular en NestJS, TypeScript, PostgreSQL y clientes en React (web) y React Native / Expo (móvil).

### Nivel 2: Incrementos del Segundo Parcial (Exigencias Canónicas del Docente)
Requisitos incorporados en la clase del 8 de noviembre de 2026, los cuales transforman el sistema en una plataforma multitienda con resiliencia de red e inteligencia analítica:
- **SaaS Multi-Tienda Autoservicio:** De una tienda a un ecosistema multitienda. Landing comercial pública con planes (1, 3 y 12 meses; tarifas según volumen de usuarios y sucursales), suscripción autoservicio, alta desatendida del espacio de trabajo y verificación obligatoria de correo electrónico.
- **Gestión Unificada de Identidad:** Capacidad de administrar múltiples tiendas con una única cuenta global (un solo login) y alternar entre ellas sin reautenticación.
- **Modo Offline Integral (Web PWA y Móvil SQLite):** La web debe operar como Progressive Web App (PWA) y el móvil con persistencia local (SQLite). Ambas interfaces deben permitir ventas en caja, registro de clientas y alta de productos sin conexión a internet.
- **Sincronización Idempotente y Resolución de Conflictos:** Generación de UUIDs en cliente; cola persistente; protocolo de sincronización por lotes; cabecera `Idempotency-Key` en operaciones críticas; y resolución determinística del conflicto de stock (dos ventas simultáneas de la última unidad sin conexión) mediante actualización condicional en base de datos.
- **Reportes Generativos Avanzados:** Consultas en lenguaje natural (texto o voz) de alta complejidad (cruces relacionales, agrupaciones, cálculos dinámicos, ordenamiento) con exportación obligatoria a pantalla, PDF formal y hoja de cálculo Excel.
- **Analítica de Datos con Aprendizaje Automático:** Obligatoriedad de implementar **modelos supervisados y no supervisados** entrenados con **datos sintéticos** reproducibles, proyectados en paneles analíticos (dashboards).
- **Pagos Internacionales Simulados Realistas:** Cobertura de medios de pago para la región hispanohablante (incorporando dinámicas como QR boliviano, transferencias, billeteras como Yape/Plin/Pix y tarjetas de prueba) simulando las reglas del negocio financiero sin imponer pasarelas de cobro reales.
- **Metodología ICONIX:** Sustitución formal del Proceso Unificado (PUDS) del primer parcial por ICONIX (Requisitos, Modelo de Dominio, Análisis de Robustez, Diseño Detallado con Diagramas de Secuencia, Diagramas de Clases y Trazabilidad a Código).

### Nivel 3: Decisiones Propias del Equipo de Desarrollo
Decisiones de ingeniería adoptadas por el equipo para materializar los pedidos del docente:
- **Estrategia Dual de Tenancy:** Implementación inicial sólida mediante base de datos compartida con columna `tienda_id`, `AsyncLocalStorage` y extensión transaccional de Prisma que falla cerrada; acompañada de una línea de investigación arquitectónica hacia esquemas PostgreSQL independientes (`tenant_<slug>`).
- **Arquitectura de Sincronización:** Definición de una política de ventana offline por tienda (1 a 30 días, configurable, 7 días por defecto) y matriz estricta que prohíbe pagos electrónicos y créditos sin conexión (solo efectivo en offline).
- **Procesamiento de Voz Híbrido:** Uso de la Web Speech API en navegadores compatibles y teclado de dictado por voz nativo en dispositivos móviles, con traducción de números en texto hablado a cifras numéricas.
- **Motor Interno de Pagos por Tienda (`docs/PAGOS_SIMULADOS.md`):** Determinación del país a través del registro oficial de la tienda; reserva atómica de inventario ante pagos pendientes; aprobación o rechazo determinístico por referencia; e idempotencia de estados.

---

## 4. Matriz de Fuentes y Requisitos del Segundo Parcial

| ID | Área | Descripción del Requisito | Fuente Concreta | Interpretación Técnica en EnsayAR | Módulos y Casos de Uso Afectados | Estado de Claridad |
|---|---|---|---|---|---|---|
| **B1** | Base | 100% del primer parcial operativo (catálogo, POS, probador, reportes, bot, pagos, reservas). | Audio 1 (min 3:00, 7:00); `Mapa` B1 | La funcionalidad previa no se reemplaza; se refactoriza para operar contextualizada dentro de un inquilino. | Catálogo, Ventas, Caja, IA, Reservas; UC01 a UC35 | **Confirmado** (Mandato docente) |
| **B2** | Base | Despliegue en nube (Azure/AWS) para web, API y móvil. | Audio 1 (min 19:00), Audio 2 (min 37:00); `Mapa` B2 | Despliegue de backend y base en Azure; web como PWA pública; backend móvil consumiendo API en nube. | Infraestructura Bicep/Azure, App Mobile | **Confirmado** (Mandato docente) |
| **B3** | Base | Monolito modular preparado para microservicios. | Audio 1 (min 23:00, 27:00), Audio 2 (min 57:00); `Mapa` B3 | Código estructurado en módulos NestJS independientes con bajo acoplamiento, aptos para futura extracción. | Todos los módulos de `backend/src/` | **Confirmado** (Mandato docente) |
| **B4** | Base | Stack tecnológico: NestJS, PostgreSQL, React, React Native / Expo. | Audio 1 (min 27:00); `Mapa` B4 | Se mantiene la tecnología base acordada en el corte canónico de septiembre. | Todo el repositorio | **Confirmado** (Mandato docente) |
| **S1** | SaaS | Arquitectura multitienda (multi-tenant) sobre una sola aplicación. | Audio 1 (min 9:00); `Mapa` S1 | Múltiples comercios independientes alojados en el mismo sistema sin interferencia de datos. | `tenancy`, `plataforma`; UC10, UC15, UC19, UC48 | **Confirmado** (Mandato docente) |
| **S2** | SaaS | Landing comercial pública con catálogo de módulos, planes y precios. | Audio 1 (min 9:00), Audio 2 (min 41:00); `Mapa` S2 | Página de acceso público estilo suscripción (tipo Netflix) donde se visualizan planes y prestaciones. | `frontend/src/plataforma/Planes.tsx`; UC36 | **Confirmado** (Mandato docente) |
| **S3** | SaaS | Planes con duraciones (1, 3, 12 meses) y niveles escalonados por recursos. | Audio 2 (min 41:00); `Mapa` S3 | Planes Inicial, Crecimiento y Empresa con límites de usuarios, sucursales y productos; descuentos por período. | `tenancy/plan-limites.service.ts`; UC23, UC24, UC36, UC38, UC39 | **Confirmado** (Mandato docente) |
| **S4** | SaaS | Autoservicio total: registro, suscripción y pago desatendidos. | Audio 1 (min 9:00), Audio 2 (min 43:00); `Mapa` S4 | El suscriptor se da de alta y efectúa el pago sin asistencia ni intervención del administrador de la plataforma. | `plataforma.service.ts`; UC36, UC38, UC39 | **Confirmado** (Mandato docente) |
| **S5** | SaaS | Aprovisionamiento automático del espacio de trabajo al aprobarse el pago. | Audio 1 (min 9:00); `Mapa` S5 | La creación de tienda, sucursal inicial, almacén principal y credencial de administrador ocurre en una sola transacción. | `plataforma.service.ts`; UC38 | **Confirmado** (Mandato docente) |
| **S6** | SaaS | Verificación obligatoria de existencia de correo electrónico. | Audio 2 (min 43:00); `Mapa` S6 | Generación de token temporal de verificación; la cuenta permanece bloqueada hasta validar el correo. | `auth/cuentas.service.ts`; UC37 | **Confirmado** (Mandato docente) |
| **S7** | SaaS | Una cuenta global para administrar varias tiendas con un solo login. | Audio 2 (min 43:00); `Mapa` S7 | Entidad `Cuenta` global asociada a múltiples membresías `Usuario` locales. Selector de tienda con refresco de JWT. | `auth`, `tenancy`; UC14, UC40 | **Confirmado** (Mandato docente) |
| **S8** | SaaS | Estrategia de aislamiento justificada y defendida técnicamente. | Audio 1 (min 9:00), Audio 2 (min 45:00, 47:00); `Mapa` S8 | Justificación teórica y práctica: aislamiento por discriminador `tienda_id` (operativo) vs esquema por tienda (en transición). | Capítulo 4 del informe, `prisma-tenant.extension.ts` | **Confirmado** (Mandato docente) |
| **S9** | SaaS | Métricas de suscripción y proyecciones para el dueño de la plataforma. | Audio 2 (min 41:00); `Mapa` S9 | Tablero del operador con MRR, ARR, ARPU, tasa de cancelación (churn) y estimación lineal a 6 períodos. | `plataforma.service.ts`; UC41 | **Confirmado** (Mandato docente) |
| **O1** | Offline | Web como PWA capaz de operar sin conexión en caja, clientes y productos. | Audio 1 (min 11:00, 15:00), Audio 2 (min 55:00); `Mapa` O1 | PWA con Service Worker v2, IndexedDB y capacidad de procesar ventas offline con persistencia local. | `frontend/public/sw.js`, `frontend/src/offline/`; UC08, UC09, UC35, UC42, UC43 | **Confirmado** (Mandato docente) |
| **O2** | Offline | Móvil con persistencia local en SQLite y paridad de funciones offline. | Audio 1 (min 11:00, 13:00), Audio 2 (min 53:00); `Mapa` O2 | `expo-sqlite` con tablas de operaciones y catálogo en caché local para operar de forma idéntica sin señal. | `movil/src/operaciones.tsx`; UC42, UC43 | **Confirmado** (Mandato docente) |
| **O3** | Offline | Sincronización completa, bidireccional y predecible al retornar la red. | Audio 1 (min 11:00), Audio 2 (min 53:00, 57:00); `Mapa` O3 | Endpoint `POST /sync/lote` que evalúa lote atómicamente, asignando estados individuales por operación. | `sync/sync.service.ts`; UC44 | **Confirmado** (Mandato docente) |
| **O4** | Offline | Generación de identificadores libres de colisión en clientes desconectados. | Audio 1 (min 21:00); `Mapa` O4 | Uso sistemático de UUIDv4 en web y móvil para Ventas, Clientes, Productos y Variantes. | Clientes web/móvil y DTOs de sincronización; UC42, UC43, UC44 | **Confirmado** (Mandato docente) |
| **O5** | Offline | Resolución determinística del conflicto de stock de la última unidad. | Audio 1 (min 21:00), Audio 2 (min 53:00); `Mapa` O5 | `UPDATE StockAlmacen ... WHERE cantidad - reservado >= n`. Si falla, la operación queda en `conflicto_stock` sin saldo negativo. | `ventas.service.ts`, `sync.service.ts`; UC05, UC07, UC45 | **Confirmado** (Escenario obligatorio de examen) |
| **O6** | Offline | Garantía de idempotencia ante reintentos por red inestable (doble clic). | Audio 1 (min 23:00), Audio 2 (min 57:00); `Mapa` O6 | Interceptor y tabla `OperacionSync`/`Idempotencia`: claves únicas que impiden duplicar inserciones monetarias. | `sync/idempotencia.interceptor.ts`; UC05, UC06, UC07, UC25, UC38, UC44, UC51 | **Confirmado** (Escenario obligatorio de examen) |
| **O7** | Offline | Atomicidad con rollback local y justificación de sagas en microservicios. | Audio 1 (min 23:00), Audio 2 (min 57:00); `Mapa` O7 | Transacciones ACID en Prisma para monolito; defensa conceptual de patrones de compensación (Sagas) para microservicios. | Transacciones de backend y Capítulos 2 y 6 del informe; UC07, UC31, UC44 | **Confirmado** (Mandato docente) |
| **O8** | Offline | Delimitación estricta de operaciones permitidas y prohibidas sin red. | Audio 1 (min 25:00), Audio 2 (min 53:00); `Mapa` O8 | Matriz de política: efectivo sí; pagos electrónicos, crédito y emisión de tarjetas quedan prohibidos en offline. | `backend/src/sync/politica.ts`; UC27, UC42, UC46, UC50 | **Confirmado** (Mandato docente) |
| **O9** | Offline | Ventana de validez offline configurable según política de negocio. | Audio 2 (min 53:00); `Mapa` O9 | Parámetro `diasVentanaOffline` en Tienda (1 a 30 días, 7 por defecto); rechazo de paquetes caducados al sincronizar. | `tenancy`, `sync`; UC42, UC46 | **Confirmado** (Mandato docente) |
| **O10**| Offline | Capacidades PWA complementarias: instalación de escritorio/móvil y Web Push. | Audio 1 (min 15:00), Audio 2 (min 55:00); `Mapa` O10 | Manifiesto PWA instalable con atajos. Web Push con protocolo VAPID para notificaciones de stock y sincronización. | `sw.js`, `notificaciones.service.ts`; UC35, UC47 | **Confirmado** (Mandato docente; Push verificado inactivo en local) |
| **R1** | Reportes | Petición de reportes analíticos mediante lenguaje natural por texto o voz. | Audio 1 (min 17:00), Audio 2 (min 59:00); `Mapa` R1 | Entrada de usuario por texto o captura de voz; orquestador que analiza intención y parámetros de negocio. | `reportes.service.ts`; UC48 | **Confirmado** (Mandato docente) |
| **R2** | Reportes | Soporte para consultas complejas (múltiples filtros, cruces, agrupaciones, órdenes). | Audio 1 (min 17:00), Audio 2 (min 59:00); `Mapa` R2 | Capa semántica validada de 6 fuentes; compilación a especificación abstracta y generación de SQL parametrizado aislado por tienda. | `reportes/capa-semantica.ts`; UC33, UC48, UC49, UC50, UC51 | **Confirmado** (Mandato docente) |
| **R3** | Reportes | Renderizado dinámico en pantalla y exportación nativa a PDF y Excel. | Audio 1 (min 17:00), Audio 2 (min 59:00); `Mapa` R3 | Generación de PDF apaisado paginado (`pdfkit`) y libro de Excel con metadatos de auditoría (`exceljs`). | `reportes.service.ts`; UC49 | **Confirmado** (Mandato docente) |
| **A1** | Analítica| Incorporación obligatoria de modelos supervisados y no supervisados. | Audio 2 (min 35:00); `Mapa` A1 | Modelo predictivo de ventas futuras (supervisado) y modelo de segmentación de clientas por comportamiento (no supervisado). | `backend/src/analitica/`; UC52, UC53 | **Confirmado** (Mandato docente) |
| **A2** | Analítica| Entrenamiento y calibración sustentados en datasets sintéticos propios. | Audio 2 (min 35:00); `Mapa` A2 | Generación algorítmica de transacciones y perfiles sintéticos para evitar sesgos y reproducir escenarios sin datos reales. | Scripts de generación sintética en `backend/src/analitica/`; UC52, UC53 | **Confirmado** (Mandato docente) |
| **A3** | Analítica| Despliegue de resultados analíticos a través de tableros visuales (dashboards). | Audio 2 (min 35:00); `Mapa` A3 | Endpoints analíticos que consolidan clusters, tendencias y proyecciones gráficas para la toma de decisiones. | `frontend/src/pages/Analitica.tsx`; UC52, UC53 | **Confirmado** (Mandato docente) |
| **P1** | Pagos | Cobertura conceptual y funcional para la región de habla hispana. | Audio 2 (min 49:00); `Mapa` P1 | Catálogo de métodos por país: QR (Bolivia), Billeteras móviles (Yape/Plin en Perú, Pix en Brasil), tarjeta y transferencia. | `pagos/metodos-pais.ts`, `docs/PAGOS_SIMULADOS.md`; UC54 | **Confirmado** (Mandato docente) |
| **P2** | Pagos | Estudio de costos, comisiones bancarias y conveniencia para el cliente. | Audio 2 (min 49:00); `Mapa` P2 | Análisis comparativo documental en el Capítulo 5 del informe sobre costos de pasarelas locales e internacionales. | Capítulo 5 del informe | **Confirmado** (Mandato docente) |
| **P3** | Pagos | Simulación rigurosa y realista de la operativa de pago sin pasarela externa. | Audio 2 (min 49:00); Aclaración confirmada por Dueño | **Interpretación Rectificada:** No exige sandbox bancario real con cuentas vivas. El docente acepta simulación integral gobernada por tienda y estados transaccionales. | `pagos.controller.ts`, `docs/PAGOS_SIMULADOS.md`; UC54 | **Confirmado con Aclaración Docente** |
| **P4** | Pagos | Documentación de restricciones operativas locales (QR en Bolivia, cobros PayPal). | Audio 2 (min 49:00); `Mapa` P4 | Justificación técnica de las limitaciones bancarias locales en Bolivia y alternativas de cobro regional. | Capítulo 5 del informe | **Confirmado** (Mandato docente) |
| **D1** | ICONIX | Proceso de desarrollo guiado por la metodología ICONIX (no PUDS, no Scrum). | Audio 1 (min 29:00); `Mapa` D1 | Adopción formal de las 4 fases ICONIX: Requisitos, Robustez, Diseño Detallado e Implementación/Pruebas. | Documento completo del informe y modelo `.eapx` | **Confirmado** (Mandato docente) |
| **D2** | ICONIX | Capítulos teóricos obligatorios añadidos al documento del examen. | Audio 1 (min 33:00), Audio 2 (min 41:00, 47:00); `Mapa` D2 | Redacción detallada de fundamentos: SaaS, Tenancy, Pagos en español, PWA/Offline/Sync/Idempotencia, IA generativa y analítica. | Capítulos 1 al 8 del informe | **Confirmado** (Mandato docente) |
| **D3** | ICONIX | Conservación documental del primer parcial como antecedente del ciclo. | Audio 1 (min 14:00, 19:00); `Mapa` D3 | El informe del segundo parcial incluye el historial del primer ciclo como base sobre la cual se monta el incremento. | Capítulos de adopción y cierre | **Confirmado** (Mandato docente) |
| **D4** | Defensa | Dominio conceptual riguroso y defensa oral de la arquitectura elegida. | Audio 1 (min 37:00), Audio 2 (min 47:00); `Mapa` D4 | El equipo debe justificar oralmente las decisiones (multi-tenant, rollback, sincronización, PWA) sin depender de la UI. | Toda la sustentación del proyecto | **Confirmado** (Mandato docente) |

---

## 5. Auditoría de Contradicciones y Discrepancias

Se identificaron **cinco contradicciones estructurales** entre las fuentes del docente, los artículos de síntesis de la wiki, el código fuente y el borrador actual del informe ICONIX:

```
+----------------------------------------------------------------------------------------------------+
|                                    MAPA DE CONTRADICCIONES                                         |
+----------------------------------------------------------------------------------------------------+
| 1. PAGOS:          Wiki inicial exigía "Sandbox Externo"  vs  Docente acepta Simulación Realista   |
| 2. MULTITENANCY:   Decisión "Esquemas PostgreSQL"         vs  Código operativo en "Tablas Compartidas"|
| 3. OFFLINE / SYNC: Wiki reportaba "100% Hecho al 8 Nov"   vs  Auditoría: Sync 503 en Esquemas      |
| 4. RUTAS ICONIX:   Doc EA: GET /analitica/prediccion/etc  vs  Backend expone GET /analitica/panel  |
| 5. WEB PUSH:       Informe lista Push como operativo      vs  Local responde activo=false sin VAPID|
+----------------------------------------------------------------------------------------------------+
```

### Contradicción 1: Exigencia de Pasarela Real Externa vs. Aceptación de Simulación Realista
* **Antecedente en la Wiki (`Pasarelas de pago.md`, `Brecha segundo parcial.md`):** La wiki consignó: *«La simulación debe ser real: integración con el sandbox de una pasarela, no un botón inventado. Lo que existe hoy (`PagoSimulado`, QR simulado) no alcanza»*. Asimismo, la brecha P1–P4 afirmaba que el módulo estaba en "cero" por no contar con credenciales activas de Stripe o Libélula.
* **Fuente Canónica del Docente (Audio 2, min 49:00):** El docente indicó: *«Sí van a tener que hacer seguramente algún tipo de... acceder, por decir si alguien que va a hacer un pago necesita suscribir un contrato formal con ese con un banco determinado. Pero es una simulación que no sea en base a lo que ustedes se imaginan. Tiene que ser una simulación real. Con todo el contenido que no la han hecho porque simplemente no es el mismo, no tienen la cuenta del banco o por cualquier otra razón. Pero que no sea un procedimiento que debe saberse para posibilitar que nuestro sistema haga cobros en línea…»*.
* **Aclaración Confirmada por el Dueño del Proyecto:** El docente **acepta pagos simulados para este parcial**. No exige suscripción de cuentas mercantiles ni integración efectiva con un sandbox externo si no se dispone del mismo. Lo que penaliza es un botón trivial e ingenuo sin lógica de negocio.
* **Realidad en Código (`docs/PAGOS_SIMULADOS.md`, `backend/src/pagos/`):** El sistema cuenta con una arquitectura de simulación seria: valida los métodos permitidos según el país oficial de la tienda (Pix en BR, Yape/Plin en PE, QR en BO, Tarjeta bancaria), gestiona transitoriamente reservas de inventario con estado `pendiente`, simula aprobación o rechazo mediante referencias trazables (`SIM:<metodo>:<id>`) y protege el cobro con idempotencia.
* **Resolución para el Informe:** Rectificar la afirmación de la wiki. El informe debe documentar el subsistema de pagos como **«Simulación Formal de Pasarela de Pagos por País»**, explicando la lógica de negocio simulada y descartando cualquier afirmación falsa de integración con pasarelas externas reales.

### Contradicción 2: Decisión de Esquemas PostgreSQL vs. Tablas Compartidas en Código
* **Decisión en Wiki (`decisiones-arquitectura-2026-11-09.md`):** Se definió como rumbo técnico la adopción de *«una base de datos PostgreSQL compartida con un esquema por tienda»*.
* **Estado en Informe (`01-perfil.md`, `01-requisitos.md`):** El texto preliminar del informe describe el aislamiento como implementado exclusivamente mediante `tienda_id` compartido con una extensión de Prisma (`RNF02`, `S8`).
* **Realidad Técnica (`2026-11-11-auditoria-uc36-uc54.md`, `MIGRACION_ESQUEMAS_TIENDA.md`):** La base del proyecto opera con tablas compartidas y `tienda_id` (donde pasan `verificar:saas`, `verificar:offline` y `verificar:reportes`). Existe una implementación paralela para esquemas (`PrismaEsquemasService`, pilotos de catálogo y analítica), pero la migración está incompleta: en modo esquemas, la verificación de cuentas y altas de tiendas heredadas arroja error HTTP 500 (`ESQUEMA_TIENDA_INEXISTENTE`) y el endpoint `/sync/lote` arroja HTTP 503 `SYNC_ESQUEMAS_NO_DISPONIBLE`.
* **Resolución para el Informe:** El informe debe transparentar que la arquitectura en producción académica validada para SaaS y Offline es la de **tablas compartidas con aislamiento contextual estricto (`AsyncLocalStorage` + Extensión Prisma que falla cerrada)**, presentando el modelo de **esquemas por tienda como un incremento arquitectónico en fase de transición/piloto**, donde actualmente reside el módulo de analítica. No se debe declarar la migración de esquemas como terminada ni generalizada.

### Contradicción 3: Evaluación de la Sincronización Offline (Wiki vs. Código)
* **Afirmación en Wiki (`Brecha segundo parcial.md`):** Indicaba que los requisitos O1 a O10 estaban *"Hecho (8 nov)"*.
* **Realidad de Auditoría (`2026-11-11-auditoria-uc36-uc54.md`):** Si bien los algoritmos de resolución de stock (O5), generación de UUIDs (O4) e idempotencia (O6) pasaron las pruebas de estrés HTTP/DB en tablas compartidas:
  1. La sincronización se bloquea intencionalmente con HTTP 503 al activar el modo de esquemas (`verificar-sync-esquemas-bloqueo.ts`).
  2. Las pruebas se ejecutaron mediante simuladores de cliente y fixtures; no se realizó corte de señal en un dispositivo Android físico ni en navegador real con corte de interfaz de red.
  3. El rol CAJERO recibe 403 al intentar listar o descartar conflictos en el panel administrativo central, requiriendo el rol ENCARGADO o ADMIN (comportamiento por diseño de seguridad, pero que difiere del flujo libre del cajero en caja).
* **Resolución para el Informe:** Documentar la capacidad de sincronización offline como **implementada y verificada a nivel de protocolos de API y base de datos bajo tablas compartidas**, señalando con rigor que la ejecución en esquemas y la verificación en hardware móvil físico permanecen como pruebas no concluidas.

### Contradicción 4: Discrepancia en Rutas de Analítica y Pagos en ICONIX
* **En el Modelo ICONIX / Documentación (`01-requisitos.md`, diagramas de secuencia):** Los casos de uso UC52, UC53 y UC54 hacen referencia a rutas REST teóricas: `GET /analitica/prediccion`, `GET /analitica/segmentos` y `POST /pagos/pasarela`.
* **En el Código Fuente Real del Backend:** Dichas rutas devuelven HTTP 404. Los endpoints reales implementados y probados son:
  - Analítica integrada: `GET /analitica/panel` (agrupa proyecciones y clustering bajo el servicio de analítica).
  - Pagos simulados: `GET /pagos/metodos`, `POST /ventas` (con discriminador `metodoPasarela`) y `POST /pagos/:id/simular` (resolución de aprobación/rechazo de pagos pendientes).
* **Resolución para el Informe:** Actualizar las fichas y diagramas de ICONIX en el informe para que coincidan unívocamente con los contratos de API verdaderamente implementados en el backend.

### Contradicción 5: Notificaciones Web Push (Declaración vs. Entorno Local)
* **En el Informe (`RNF10`, `O10`):** Se lista Web Push como una funcionalidad completada para avisos de sincronización y stock.
* **En la Auditoría Técnica:** Una inspección directa de solo lectura sobre la instancia local del backend reveló que `GET /push/clave` responde `{ activo: false }` por ausencia de llaves VAPID configuradas en el entorno local, y el endpoint de prueba responde 200 con `enviadas: 0`.
* **Resolución para el Informe:** Clasificar Web Push como **funcionalidad implementada a nivel de código y arquitectura PWA, pero no verificada en entrega física en el entorno local de auditoría** por falta de suscripción a un servicio de mensajería push externo con llaves activas.

---

## 6. Dictamen y Homologación sobre Pagos Simulados

Conforme a la instrucción del dueño del proyecto y la revisión de la transcripción de la clase:

1. **Superación del Criterio de "Sandbox Obligatorio":** Se deja sin efecto formal la interpretación vertida en `Pasarelas de pago.md` que descalificaba el sistema de pagos por no utilizar Stripe, Libélula o PayPal. El audio docente establece que la simulación es válida siempre que incorpore el contenido formal y procedimental de una transacción financiera.
2. **Naturaleza del Módulo Implementado:** El código en `backend/src/pagos/metodos-pais.ts` y `docs/PAGOS_SIMULADOS.md` no es un botón estático inventado:
   - Modela la **territorialidad del comercio**: el país lo define la tienda (no el navegador del cliente), habilitando canales válidos: Bolivia (QR, Efectivo, Tarjeta, Transferencia), Perú (Yape, Plin), Brasil (Pix).
   - Implementa **reserva temporal de inventario**: cuando una venta se crea con pago electrónico pendiente, el stock se reserva inmediatamente para impedir sobreventas.
   - Aplica **máquina de estados**: el endpoint de resolución simulada aprueba (consolidando la venta, afectando caja y descontando stock definitivamente) o rechaza (liberando la reserva de stock y cancelando la venta).
   - Garantiza **idempotencia**: reintentar la resolución de un pago ya aplicado no duplica movimientos de caja ni registros contables.
3. **Pauta de Redacción para el Informe:** En todos los capítulos del informe ICONIX (especialmente Capítulos 1, 5 y 9), el módulo de pagos debe describirse taxativamente como:
   > *«Subsistema de Pagos Simulados Multipaís con Control Transaccional de Inventario e Idempotencia, diseñado para modelar la operativa regional de cobro sin intermediación de pasarelas bancarias externas vivas»*.

---

## 7. Dictamen sobre la Arquitectura Multitenant

Respecto al aislamiento de tiendas (S1, S8, RNF02):

1. **Estado de Tablas Compartidas (Baseline Verificado):**
   - 36 tablas con clave `tiendaId`.
   - Inyección contextual mediante `TenantMiddleware` y `AsyncLocalStorage`.
   - Extensión de cliente Prisma que intercepta todas las operaciones CRUD y falla cerrada (`TENANT_REQUERIDO`) ante peticiones no autenticadas.
   - Parámetro por defecto en PostgreSQL: `tienda_id DEFAULT current_setting('app.tienda_id')`.
   - Esta solución superó 15 validaciones automatizadas de seguridad e integridad en `verificar:saas` y `verificar:tenancy`.
2. **Estado de Esquemas por Tienda (Incremento en Transición):**
   - Propuesto en la decisión del 9 de noviembre para maximizar el aislamiento lógico y facilitar respaldos independientes.
   - Se crearon clientes dinámicos en `PrismaEsquemasService` y pilotos en `/catalogo/categorias` y `/analitica/panel`.
   - **Limitación comprobada:** La sincronización offline `/sync/lote` y las altas automáticas desatendidas no están consolidadas en este modo, arrojando bloqueos 503 y 500 en la base de auditoría.
3. **Pauta de Redacción para el Informe:** El informe no debe sostener que el sistema funciona completamente en esquemas independientes. Debe documentar:
   - Como **arquitectura primaria implementada y operativa**: el modelo de base de datos compartida con discriminador y filtrado forzado por extensión Prisma.
   - Como **arquitectura en evolución / piloto tecnológico**: la separación física por esquemas PostgreSQL, documentando sus beneficios, el éxito del módulo de analítica sobre dicho enfoque y las restricciones pendientes de migración para la sincronización transaccional.

---

## 8. Texto Propuesto para la Sección «Alcance» del Informe ICONIX

A continuación se presenta la propuesta formal de texto para sustituir o actualizar la **Sección 1.5 («Alcance del incremento»)** del Capítulo 1 y alimentar la **Sección 9.1 («Requisitos»)** del Capítulo 9:

***

### 1.5 Alcance del Sistema e Incrementos del Segundo Ciclo

El presente informe documenta el incremento evolutivo de **EnsayAR**, transformando la solución monotienda construida en el primer ciclo en una plataforma **SaaS Multi-Tienda con soporte Offline-First, Inteligencia de Reportes Dinámicos, Analítica de Datos y Pagos Regionales Simulados**, modelada integralmente bajo la metodología **ICONIX**.

Para garantizar la honestidad técnica y académica del documento, el alcance se estructura diferenciando lo efectivamente implementado y validado en código, de las capacidades simuladas, los módulos en transición arquitectónica y las restricciones no verificadas:

```
+---------------------------------------------------------------------------------------------------------+
|                                    ESTRUCTURA DEL ALCANCE DOCUMENTAL                                    |
+---------------------------------------------------------------------------------------------------------+
| [A] NÚCLEO IMPLEMENTADO Y VERIFICADO                                                                    |
|     - Base heredada 1er parcial: Catálogo matricial, POS, reservas, probador virtual, bot, caja.       |
|     - SaaS Multi-Tienda (Modo Compartido): Planes (1/3/12 meses), landing pública, autoservicio,       |
|       alta desatendida, verificación de correo, multi-membresía con un solo login, métricas SaaS.      |
|     - Offline & Sync (Web/Móvil): PWA (Service Worker v2), SQLite local, UUIDs cliente, lote sync,     |
|       idempotencia en 11 rutas, resolución de conflicto de stock en base sin saldo negativo,            |
|       ventana offline configurable (1 a 30 días, 7 defecto).                                            |
|     - Reportes Generativos: Capa semántica 6 fuentes, NLP/voz a especificación abstracta, SQL          |
|       parametrizado aislado por tienda, exportación nativa a PDF y Excel formal.                        |
|                                                                                                         |
| [B] CAPACIDADES SIMULADAS FORMALES                                                                      |
|     - Pasarela de Pagos Multipaís: Reglas por país (BO, PE, BR, etc.), reserva temporal de inventario,  |
|       resolución determinística (aprobado/rechazado) e idempotencia sin pasarela bancaria externa viva. |
|                                                                                                         |
| [C] CAPACIDADES EN TRANSICIÓN ARQUITECTÓNICA / PILOTO                                                    |
|     - Multitenancy por Esquemas: PrismaEsquemasService y piloto de analítica operativa en esquemas.     |
|       (La sincronización offline permanece acoplada a tablas compartidas con bloqueo 503 en esquemas). |
|     - Analítica ML: Modelos supervisado y no supervisado entrenados con datasets sintéticos propios     |
|       expuestos vía endpoint consolidado `/analitica/panel`.                                            |
|                                                                                                         |
| [D] ALCANCE PENDIENTE / NO VERIFICADO EN PRODUCCIÓN                                                     |
|     - Notificaciones Web Push: Lógica implementada; inactiva en local por ausencia de credenciales VAPID.|
|     - Verificación Móvil en Hardware: Pruebas ejecutadas en emulador/API; pendiente prueba en Android   |
|       físico bajo corte prolongado de red de telecomunicaciones.                                        |
+---------------------------------------------------------------------------------------------------------+
```

#### 1.5.1 Detalle del Alcance por Subsistema

1. **Plataforma SaaS Multi-Tienda (S1–S9):**
   - *Implementado y Verificado:* Registro público y selección de planes comerciales; verificación de cuenta por correo electrónico (con visualización de enlace para entornos de demostración); autoservicio con provisión automática de tienda, sucursales y cuenta administrador; gestión de membresías permitiendo que un usuario gestione varias tiendas mediante un selector sin reautenticación; límites operativos por plan (usuarios, sucursales y catálogo); y tablero de control financiero para el operador de la plataforma con cálculo de MRR, ARR, ARPU, Churn y proyección lineal a 6 períodos.
   - *Modelo de Aislamiento:* Totalmente funcional y auditado bajo base de datos PostgreSQL compartida con columna discriminadora `tienda_id`, controlada por `TenantMiddleware` con `AsyncLocalStorage` y extensión de Prisma que aplica políticas cerradas.
2. **Operación Offline y Protocolo de Sincronización (O1–O9):**
   - *Implementado y Verificado:* PWA web instalable con Service Worker v2 y almacenamiento IndexedDB; aplicación móvil con almacenamiento relacional local mediante SQLite; generación de identificadores libres de colisión (UUIDv4) en clientes desconectados; procesamiento de ventas en efectivo, altas de clientes y creación de productos sin red; cola local persistente; protocolo de sincronización por lotes (`POST /sync/lote`); mitigación de envíos repetidos mediante cabecera `Idempotency-Key` en 11 rutas del backend; y resolución garantizada de sobreventa de última unidad mediante actualización atómica condicional en base de datos (`UPDATE ... WHERE cantidad - reservado >= n`), marcando operaciones en conflicto sin admitir stock negativo.
3. **Inteligencia en Reportes Dinámicos (R1–R3):**
   - *Implementado y Verificado:* Procesamiento de lenguaje natural mediante prompts estructurados con respaldo determinístico por reglas; capa semántica que valida especificaciones abstractas sobre 6 áreas del negocio (evitando inyecciones o ejecuciones libres de SQL); compilación segura a sentencias parametrizadas restringidas a la tienda activa; captura de instrucciones vía texto o interfaz Web Speech API/dictado móvil; y exportación automática a hojas de cálculo Excel (con metadatos de auditoría y fórmulas) y documentos PDF formateados y paginados.
4. **Subsistema de Pagos Simulados (P1–P4):**
   - *Simulación Formal Verificada:* Motor de medios de pago parametrizado por el país de registro de la tienda (QR para Bolivia, transferencias locales, billeteras móviles regionales como Yape/Plin/Pix y tarjetas de ensayo); reserva temporal de stock durante el estado de pago pendiente; procesamiento determinístico de aprobación o rechazo mediante simulación transaccional; e idempotencia que bloquea doble acreditación.
   - *Límite Documental:* No se afirma ni documenta integración operativa con pasarelas externas reales (Stripe, Libélula o PayPal en producción) ni contratos bancarios comerciales.
5. **Analítica de Datos y Aprendizaje Automático (A1–A3):**
   - *Implementado en Piloto:* Servicio de analítica desplegado sobre esquemas PostgreSQL independientes que expone el endpoint `GET /analitica/panel`; incorpora algoritmos supervisados para predicción de series de demanda y modelos no supervisados para clustering y segmentación de clientes, entrenados algorítmicamente mediante generadores de datos sintéticos representativos.
6. **Límites Técnicos y Exclusiones del Alcance Actual:**
   - *Transición a Esquemas:* La migración física hacia un esquema independiente por tienda se encuentra en etapa de piloto funcional; la sincronización offline (`POST /sync/lote`) no opera bajo esquemas (bloqueada por seguridad técnica 503).
   - *Web Push (O10):* El módulo se encuentra codificado pero desactivado en la instancia local (`activo=false`) debido a la falta de configuración de llaves VAPID de producción.
   - *Pruebas en Hardware Móvil:* La app móvil ha sido verificada en entornos de desarrollo y transacciones API simuladas; no se incluye certificación de pruebas físicas bajo cortes prolongados de cobertura celular en dispositivos Android de producción.

***

---

## 9. Lista de Acciones y Dependencias para el Coordinador

Para asegurar la coherencia absoluta del informe final antes de su compilación y defensa, se recomienda al Coordinador del Proyecto aplicar las siguientes acciones de armonización documental:

1. **Ajuste de Capítulos Teóricos (Capítulos 1 y 5):**
   - Sustituir en el Capítulo 5 cualquier referencia que mencione que los pagos *"no alcanzan"* o que *"falta conectar la pasarela real en sandbox"*. En su lugar, plasmar el análisis de comisiones bancarias hispanas y describir el subsistema de simulación por país implementado en `docs/PAGOS_SIMULADOS.md`.
2. **Homologación de Rutas en el Capítulo 9 (ICONIX):**
   - Corregir en las fichas de los casos de uso UC52, UC53 y UC54 las rutas desactualizadas (`GET /analitica/prediccion` y `POST /pagos/pasarela`) cambiándolas formalmente a `GET /analitica/panel` y `POST /pagos/:id/simular`.
3. **Consistencia en el Diagrama y Fichas de Casos de Uso:**
   - En UC44 (Sincronización), aclarar en el flujo alternativo que en entornos con esquemas de base de datos no migrados el sistema responde 503 por política de protección de datos, operando de forma estándar bajo el modelo compartido.
   - En UC45 (Conflictos de Stock), especificar que el listado y descarte administrativo centralizado requiere rol `ENCARGADO` o `ADMIN`, mientras que el cajero resuelve localmente en su cola de ventas.
4. **Clarificación del Alcance Multitenant (Capítulo 4):**
   - Mantener como defensa primaria del examen el diseño de tablas compartidas con `tienda_id` y aislamiento cerrado mediante Prisma, documentando la migración a esquemas por tienda como la evolución de arquitectura emprendida por el equipo.
5. **Compilación del Documento:**
   - Una vez integrados estos textos, reejecutar el pipeline de construcción `python _build_docx.py` para regenerar la entrega oficial en Word y PDF antes del límite fijado por la cátedra.
