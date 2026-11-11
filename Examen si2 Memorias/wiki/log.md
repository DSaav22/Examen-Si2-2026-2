# Log

Cronología append-only. No reescribir entradas viejas.

## [2026-09-12] init | Esqueleto LLM Wiki

Capas `raw/` + `wiki/` + `AGENTS.md`. Carpetas vacías: sources, concepts, entities, synthesis, queries. Pendiente: primer ingest (programa del curso).

## [2026-09-12] ingest | Transcripción audio e-commerce

Problema de la cadena de ropa femenina, omnicanal, probador virtual y reportes generativos. Flutter/PWA/23-sep quedan marcados como no canónicos.

## [2026-09-12] ingest | Examen 1 Garzón FashionStore

PDF de otro docente: RF01–25, actores, reservas, PUDS, stack FastAPI/Angular/Flutter y calendario 05/13/20/22 sep. Se usa como complemento, no como mandatorio.

## [2026-09-12] ingest | Stack y metodología del parcial

Canon: NestJS + React + React Native + PostgreSQL + Azure. UP (Booch et al.). Documento en 3 partes. Primer sprint 18 sep, ciclos de 3 semanas.

## [2026-09-12] lint | Conflictos de stack y fechas

Documentados en [[Contradicciones entre fuentes]]. Gana la clase de stack para tecnología/calendario y el audio para problema/innovaciones.

## [2026-09-12] ingest | Corrección: solo el parcial

El dueño anula sprints y el 18 sep. Canon de fecha: presentación **23 de septiembre**. Alcance de la wiki: únicamente el examen parcial + PUDS. Actualizados mapa, cronograma, MVP, contradicciones e índice.

## [2026-09-12] query | ¿Alcanza la info para documentar? Factibilidad

Sí para Parte 2 Inicio y temario Parte 1. Producto al 23 solo si el probador es overlay 2D+pose (no VTO 3D de tela) y el SQL generativo va acotado. Archivado en [[Factibilidad]].

## [2026-09-12] query | Fase Inicio PUDS

Decisiones: EnsayAR, probador 2D+pose, pagos simulados, reservas fuera. Artefacto formal en `docs/parcial/02-puds/01-fase-inicio.md`. Wiki: [[Fase Inicio]], 10 CU breves, riesgos, arquitectura candidata. Siguiente: Elaboración (UC03, UC07, UC10).

## [2026-09-12] query | Fase Elaboración PUDS

UC03, UC07 y UC10 en formato expandido + SSD. Modelo de dominio (producto/variante/stock/venta/turno). Baseline: un POST /ventas, stock en servidor, probador en cliente, SQL solo v_reporte_ventas. Spikes A/B/C. Formal: `docs/parcial/02-puds/02-fase-elaboracion.md`.

## [2026-09-12] query | Construcción: backend + spike B

NestJS + Prisma en `backend/`. `POST /ventas` con FOR UPDATE, 409 si no hay stock, uuid idempotente. Test `npm run spike:b` (pide PostgreSQL). Docker Desktop no estaba instalado en esta máquina; el spike queda listo para cuando haya Postgres.

## [2026-09-19] query | Postgres local + spike B en verde

Sin Docker. `DATABASE_URL` = `postgres` / `diego`, base `ensayar`. Migración aplicada. Spike B: una cobra, la otra falla, stock 0, uuid no duplica.

## [2026-09-19] query | Auth JWT + CRUD catálogo

Login/me, roles, GET catálogo público, escrituras ADMIN. POST /ventas con JWT cajero/admin. Verificado: admin crea producto; clienta recibe 403.

## [2026-09-19] query | Frontend React login + POS

`frontend/` Vite. Login, catálogo, caja (abrir turno y cobrar). Verificado en navegador: cajero cobró polera Bs 89.90. API caja `/caja/turno-abierto|abrir|cerrar`.

## [2026-09-19] query | Spike C + spike A

Vista `v_reporte_ventas`, compilador texto→SQL acotado, `POST /reportes/generativo` ADMIN, UI `/reportes`. Overlay `GET /catalogo/variantes/:id/overlay`, web `/probar/:id` y Expo `movil/` (cámara + 2D). Tests sql-seguro en verde. Azure queda fuera de este corte.

## [2026-09-19] query | Pendientes del 23: pose, docs, Azure

MediaPipe Pose (hombros) + toques. Parte 1 y Parte 3 en `docs/parcial/`. Cola offline POS, `POST /ia/ficha`, pedido contra entrega. Bicep + `azure.yaml`; no se provisionó (sin `az login`). Transición: `02-puds/04-fase-transicion.md`.

## [2026-09-19] query | Huecos locales vs examen

Azure queda aplazado. Los módulos Nest del MVP ya existen. Falta sobre todo UI: filtros, ficha, carrito/QR online, cierre/arqueo, admin de variante/stock. Archivado en [[Huecos locales vs examen]].

## [2026-09-19] query | UI local de los huecos

Filtros, `/ficha/:id`, carrito + QR, cierre/arqueo, admin variante+stock. Verificado: falda M beige; arqueo cajero 289.90 = 0; pedido clienta QR Bs 149.50. Azure sigue aplazado.

## [2026-09-19] query | Qué falta después de la UI local

Los 10 CU ya tienen camino. Queda pulido: foto de cuerpo, urlFoto, reporte fijo del día, probar cola offline a mano, PDF ticket, seed más rico. Azure aplazado. Actualizado [[Huecos locales vs examen]].

## [2026-09-19] query | Pulido local: foto, ticket, día, seed

Foto de cuerpo + demo en `/probar`. `urlFoto` en catálogo/ficha + `POST /catalogo/imagenes`. `GET /reportes/dia` y botón Ventas del día. Ticket imprimible. Catálogo enriquecido. Actualizado [[Huecos locales vs examen]].

## [2026-09-19] query | Verificación local de lo afirmado

Thumbs, foto demo, cobro+ticket, ventas del día, sql-seguro, spike:b. Actualizado log.

## [2026-09-19] query | Ampliar a RF01–RF25 Garzón

Dominio Garzón entra completo (reservas, encargado, proveedor, temporadas, multi-sucursal, kardex, compra móvil, pago sandbox, reporte inventario). Stack sigue Nest/React/RN. Decisiones y MVP actualizados. Matriz en [[Huecos locales vs examen]]. Spike B sigue verde. Azure: `az login` OK, IaC listo; falta instalar `azd` para `azd up`.

## [2026-09-19] lint | Cierre de huecos blandos

`ForbiddenException` clienta solo cancela reserva. Admin edita producto/descuento en ficha. Proveedor crea variante al alta. Encargado lista `GET /ventas/sucursal`. Smoke OK (403, patch 15%, variante BLU-*, ventas sucursal).

## [2026-09-19] lint | Cierre auditoría top-7

Hold stock en QR + claim atómico en `pagos/simular`. Máquina de estados reservas + `FOR UPDATE`. Precio efectivo web/POS/móvil. Vaciar carrito tras reserva. Overlay PNG + API por LAN en Expo. Cola offline no descarta stock fail. Validación de turno de caja en cobro POS.

## [2026-09-19] query | Re-auditoría post top-7

Fixes 1–7 OK. Se corrigieron: sintaxis `catch/finally` móvil, estado React en Reservas, PNG en `frontend/public`, Ficha precio/stock, CAJERO fuerza `canal=pos`. Quedan altos no bloqueantes: invariante stock vs ajuste, IDOR GET reserva, abrir caja multi-sucursal.

## [2026-09-19] lint | Cierre 4 altos restantes

`STOCK_MENOR_QUE_RESERVADO` en ajuste/upsert. Ownership en `GET /reservas/:id`. Cajero solo abre caja de su sucursal. POS encola también ante fallo de red/API (no solo `!navigator.onLine`).

## [2026-09-19] query | Auditoría #3

Fixes previos OK (upsert stock parcial sin FOR UPDATE). Sin críticos de camino feliz. Altos: uuid idempotente sin clientaId, turno fuera de TX, completar reserva sin Venta, scope encargado/proveedor, turno UI null en blip, cola sin descartar, Android emu localhost.

## [2026-09-19] lint | Cierre altos auditoría #3

`upsertStock` con FOR UPDATE. `mismoPayload` incluye `clientaId`. Turno con lock dentro de TX de cobro. Completar reserva crea `Venta` cobrada. Scope sucursal/proveedor en inventario y PUT stock. POS: `cargarTurno({soft})` + descartar ítems de cola.

## [2026-09-19] query | Auditoría #4

Fixes #3 OK. Sin críticos auth/IDOR. Altos nuevos: `contra_entrega` sin hold, reservas `almacenes[0]`, sql-seguro bypasseable, movimientos encargado truncados, JWT fallback, Pos hooks, assetUrl Azure, 401, móvil LAN/tunnel.

## [2026-09-22] ingest | Pull merge rama Andres → main

Fast-forward `5c95fc2` → `fad2bb1`. Andrés: Vesta UI, admin/, cliente (favoritos/perfil), 4 migraciones comerciales, cupones, JWT revoke. Fixes Diego de stock/seguridad **sobreviven**. Riesgos: `migrate deploy` local, `demo:catalog` pisa `reservado`, links `?coleccion=` rotos, POS roles ≠ caja, cupón sin `usoMaximo`.

## [2026-09-22] query | Cómo armar el documento del parcial

Canon: [[Documento del examen]] + [[stack-metodologia-parcial]] (3 partes). Artefactos ya en `docs/parcial/` (01–03). Parte 2 = PUDS Inicio→Transición, no diario de commits. Garzón solo nutre investigación Parte 1.

## [2026-09-22] ingest | Contexto completo del proyecto

Fuente: `raw/2026-09-22-contexto-completo-proyecto.md` → [[contexto-completo-proyecto]]. Snapshot código 22 sep (EnsayAR + UI Vesta). Nueva síntesis [[Estado del codigo]]. Actualiza MVP, contradicciones, huecos RF, Construcción, actores, arquitectura, probador/reportes/IA, offline, POS, stack, EnsayAR, index. Acorde al repo; tensión: alcance aspiracional 19 sep vs madurez real (probador/IA no cerrados).

## [2026-09-23] ingest | Ejemplos informe Tatiana + Lozada

PDFs → `raw/2026-09-23-ejemplo-informe-tatiana-autogo.pdf` (172 p.) y `…-lozada-asistencia-mecanica.pdf` (63 p.). Fuentes wiki + [[Comparacion informes ejemplo]] + [[Checklist informe EnsayAR]]. Tatiana = modelo de profundidad; Lozada = CU OK pero incompleto. Ninguno trae Adopción (Parte 3 propia sí). Actualiza [[Documento del examen]] e index.

## [2026-09-23] ingest | Transcripción literal stack/PUD

`raw/2026-09-12-transcripcion-audio-stack-metodologia-parcial.md` → [[transcripcion-audio-stack-metodologia-parcial]]. Misma clase que [[stack-metodologia-parcial]] (notas). Confirma: 3 partes; PUD con fases×disciplinas; ciclo≈sprint; stack Nest/React/RN; 18 sep = Scrum semestre (fuera del parcial). Actualiza [[Proceso Unificado]], [[Cronograma]], stack source, index.

## [2026-09-23] lint | Cuerpo del informe en docs/parcial

Decisión: escribir el Word por capítulos en `docs/parcial/` (no en wiki). Wiki → [[Indice del informe]] + [[Documento del examen]]. Estructura: portada, perfil, marco, 4 fases PUD, pruebas, adopción, cierre. README maestro con tabla. Contenido previo migrado a `02-marco-teorico` y `08-adopcion-capacitacion`.

## [2026-09-23] query | Casos de uso vs código y alcance ampliado

El código ya tenía UC14–UC27 fuera de la primera lista. El informe documenta UC01–UC35 como comportamiento del sistema, con flujo en `docs/parcial/02-puds/casos-de-uso-detalle.md`. El código de UC28–UC35 se alinea después.

## [2026-09-23] query | Índice al estilo Tatiana

El informe suma módulos (`modulos.md`), fichas UC01–UC35 con espacio de diagrama y análisis/diseño (`analisis-diseno.md`). Las fases PUD y la Parte III se mantienen. El Word nuevo quedó en `EnsayAR-Informe-Primer-Parcial-numerado.docx` porque el archivo principal estaba abierto.

## [2026-09-23] query | Índice idéntico al de Tatiana

El Word `docs/parcial/EnsayAR-Informe-Primer-Parcial.docx` sigue el índice de `raw/inbox/Examen SI2 1.pdf`: Parte I perfil 1.1–1.8, Parte II marco 2.1–2.3 (módulos), Parte III requisitos con ciclos, fichas, análisis, diseño, implementación, pruebas, y cierre (conclusión, recomendación, bibliografía, URL y QR). La capacitación quedó en 3.4.4. Dominio y stack siguen siendo EnsayAR.

## [2026-09-23] ingest | Código de la tarde (UC28–UC35 y bot)

Fuente [[codigo-23-sep]] (working tree, sin archivo en `raw/`). Canon nuevo: [[Estado del codigo]]. Local: bot `POST /ia/bot`, reportes con modelo + `validarSelect`, probador 3D CSS si hay `urlModelo`, mayorista, transferencia, despacho `VESTA-`, devolución con reembolso simulado, PWA y NIT de prueba. Falta: deploy de este corte, móvil (sigue 2D y sin bot), imagen generada (cuota 0), commit. Actualiza casos de uso, asistente, probador, reportes, Azure, React Native, huecos e índice.

## [2026-09-25] ingest | Móvil Vesta + probador sin cámara + scroll web

Fuente [[codigo-24-sep-movil-web]] (working tree). Paridad pantallas/nav Expo con storefront Vesta; demo en Expo web `:8081`. Probador: SUBIR FOTO / SILUETA DEMO cuando no hay cámara; HUD con contraste. Frontend: full-bleed sin `100vw` (scroll horizontal arreglado). Backend: quitado `ignoreDeprecations: "6.0"` (tsc 5.9). Canon: [[Estado del codigo]]. Actualiza [[UC03 Probador]], [[Probador virtual]], [[React Native]], [[Huecos locales vs examen]], índice.

## [2026-11-08] ingest | Consigna del segundo parcial (2 audios)

Fuente pegada en el chat → `raw/2026-11-08-transcripcion-audio-segundo-parcial.md` → [[transcripcion-audio-segundo-parcial]]. Nuevo ciclo sobre EnsayAR: SaaS multi-tienda, offline web (PWA) + móvil (SQLite) con idempotencia y conflictos de stock, reportes generativos con voz y PDF/Excel, analítica ML supervisada + no supervisada con datos sintéticos, pagos para países hispanohablantes, monolito modular, metodología ICONIX. PDF hasta 11 nov 8:00. Nuevas: [[Mapa del segundo parcial]], [[Brecha segundo parcial]], [[ICONIX]], [[ICONIX vs Proceso Unificado]], [[SaaS multi-tenant]], [[PWA]], [[Analitica con IA]]. Actualiza offline, reportes, pagos, PU, arquitectura, stack, documento, cronograma, contradicciones, índice y canon de `AGENTS.md`. ICONIX investigado en iconixprocess.wordpress.com y Rosenberg/Stephens. Brecha revisada contra el repo en `863d62e` (la wiki de código seguía en 25 sep).

## [2026-11-08] query | Punto 1 del segundo parcial: SaaS multi-tienda en código

Working tree sobre `863d62e` (sin commit). S1–S9 implementados y verificados: `verificar:tenancy`, `verificar:saas` (15 chequeos) y recorrido en navegador (landing, registro y verificación, pago rechazado y aprobado, alta automática, vitrina `/t/:slug`, selector de tienda, métricas, panel de la dueña). Estrategia S8 justificada en [[SaaS multi-tenant]]: base compartida con `tienda_id` en capas; RLS completa queda como evolución. Actualiza [[Brecha segundo parcial]]. Sigue: offline, reportes, analítica, pagos, documento ICONIX.

## [2026-11-08] query | Punto 2 del segundo parcial: offline web y móvil

Working tree sin commit. O1–O10 implementados:

- `POST /sync/lote`, interceptor `Idempotency-Key` en 11 endpoints, `UPDATE` condicional de stock con conflicto visible, política offline y ventana por tienda;
- en la web: service worker v2 con datos, cola IndexedDB, página `/sincronizacion` y Web Push;
- en el móvil: `expo-sqlite`.

Verificado con `verificar:offline` (14 chequeos) y recorrido en navegador:
- venta y clienta sin red, conflicto forzado de la última unidad, "Vender lo disponible", recarga completa sin red y alta de producto sin red en la web;
- el mismo flujo en la app móvil (Expo web).

Detalle, sagas y guion para la defensa en [[Modo offline]] y [[PWA]]. Actualiza [[Brecha segundo parcial]]. Sigue: reportes, analítica, pagos, documento ICONIX.

## [2026-11-08] query | Punto 3 del segundo parcial: reportes generativos

Working tree sin commit. R1–R3 implementados:

- capa semántica de 6 fuentes;
- especificación JSON validada;
- compilador a SQL parametrizado con HAVING y agrupación en varios niveles, filtrado por tienda;
- intérprete por modelo con respaldo por reglas (Azure da 401);
- voz con Web Speech en la web y dictado del teclado en el móvil;
- Excel con `exceljs` y PDF con `pdfkit`, desde web y móvil.

Para el ejemplo del docente se agregó la venta al crédito: `CuentaCobrar`, `AbonoCredito`, la pantalla `/creditos` y la opción en el POS. El crédito queda solo en línea.

Verificado con `verificar:reportes` (24 chequeos) y recorrido en navegador:
- el ejemplo del docente;
- ventas por mes con HAVING;
- sucursal × medio de pago con barras;
- quitar un criterio;
- ver el SQL;
- el PDF de 7 páginas sin hojas en blanco;
- `/creditos`.

Detalle en [[Reportes generativos]]. Actualiza [[Brecha segundo parcial]] y [[Modo offline]]. Sigue: analítica, pagos, documento ICONIX.

## [2026-11-08] query | Contexto y pendientes del segundo parcial

Andrés compartió una lista de pedidos del docente para continuar EnsayAR en el segundo parcial. Registrada como fuente conversacional [[pedidos-segundo-parcial-2026-11-08]] y organizada en [[Pendientes segundo parcial]]: continuidad, POS, multitenancy, suscripciones, sincronización/offline, integridad, voz, aprendizaje automático, nube e ICONIX. La consigna original y sus detalles aún no están disponibles; se identificaron preguntas abiertas. El PUD del primer parcial permanece como antecedente histórico.

## [2026-11-08] query | Comparación de pedidos y audios del segundo parcial

Contrastados [[pedidos-segundo-parcial-2026-11-08]] y [[transcripcion-audio-segundo-parcial]] en [[Comparacion pedidos y audio segundo parcial]]. Se precisan los tres caminos, SaaS, offline/PWA, reportes, arquitectura, nube, pagos, ICONIX y entrega; se distinguen requisitos y limitaciones de la transcripción del estado de implementación.

## [2026-11-09] query | Decisiones de arquitectura para el segundo parcial

Andrés eligió una base PostgreSQL con un esquema por tienda, para implementar más adelante; PWA web; SQLite móvil; idempotencia y rollback. Registradas en [[decisiones-arquitectura-2026-11-09]], [[Pendientes segundo parcial]] y [[SaaS multi-tenant]], distinguiendo la decisión futura del modelo actual con `tiendaId`. También se dejó constancia de voz móvil, pagos simulados y monolito modular. No se modificó código ni base de datos.

## [2026-11-09] query | Planes y suscripciones retail

Decisiones y flujo propuesto, funcionalidades detectadas, fuentes de pagos y pruebas pendientes de baja de plan en [[Planes y suscripciones retail]].

## [2026-11-09] query | Auditoría del flujo de suscripciones

Se documentaron hallazgos, diseño propuesto, separación de pagos y pruebas en [[Auditoria suscripciones y ciclo de vida]].

## [2026-11-09] query | Planes aceptados y pagos por país

Se registran los tres planes y el flujo aprobados en [[Planes y suscripciones retail]], y las fuentes y restricciones en [[Metodos de pago por pais 2026]].

## [2026-11-09] query | Documento del segundo parcial con ICONIX

Documento armado en `docs/segundo-parcial`:

- **Fundamentación.** Capítulos 1 a 8: perfil del incremento, marco teórico del primer ciclo, SaaS, multi-tenant, offline/PWA/sync e IA para reportes. Pagos (5) y analítica (8) quedan como esqueleto para el compañero.
- **ICONIX.** Capítulo 9, de 9.0 a 9.4, generado desde `iconix/casos.py`. El modelo de EA tiene 156 diagramas y se suma la Figura 9.0.1 del proceso.
- **Adopción.** Capítulo 10: autoservicio, guías por rol y simulacros.
- **Cierre.** Capítulos 11 a 14: conclusiones, recomendaciones, bibliografía y anexos con comandos y regeneración de EA.
- **Capturas.** Seis capturas de GUI tomadas con Playwright (`iconix/capturas.py`).
- **Salida.** `_build_docx.py` produce el `.docx` y, mediante Word, el `.pdf` (unas 240 páginas, con índice de campos).

Correcciones de paso:
- UC42 y UC43 ahora usan las clases reales del cliente (`Red`, `ColaOffline`, `CacheLocal`).
- UC46 se hace en la Pantalla Sincronización.

Actualiza [[ICONIX]] y [[Brecha segundo parcial]].

## [2026-11-09] update | Diagramas en UML 2.5 y documento enriquecido con el informe de otro grupo

Se tomó del PDF de otro grupo, con las mismas funcionalidades, solo la explicación funcional; sus tecnologías no se usaron. El modelo de EA pasa a 160 diagramas.

- **Despliegue (`iconix/arquitectura.py`).** Nodos «device» anidados (PC o tablet, teléfono, grupo de recursos de Azure, App Service Plan y servidor PostgreSQL Flexible), con «executionEnvironment», artefactos, especificaciones de despliegue (nombres de variables, sin valores) y caminos de comunicación con protocolo.
- **Componentes.** Backend y clientes con conectores de ensamblaje por interfaz y puerto «API REST». También se agregó la manifestación de artefactos.
- **Máquinas de estado (`iconix/estados.py`).** La operación offline en el dispositivo (estado compuesto) y `OperacionSync` en el servidor.
- **Secuencias.** Mensajes con argumentos leídos del TypeScript, `alt` en el paso donde decide cada alterno (`ALTERNOS` en `generar_ea.py`; los alternos de IA se recuperan con reglas) y `loop` en UC44.
- **Casos de uso.** Sujeto del sistema dibujado. Las clases de diseño tienen firmas completas e inyección como asociación.
- **Texto.** RNF01–RNF12, reglas RN01–RN15, plan de pruebas y casos CP01–CP19.
- **Informe.** Figuras de arquitectura y estados en páginas horizontales; PDF de 274 páginas.

## [2026-11-10] query | Pruebas SaaS, offline y reportes

Se registraron resultados y límites de la revisión sobre la copia de demostración en [[Pruebas SaaS offline y reportes 2026-11-10]].

## [2026-11-10] update | Clasificación de datos multitenant

Se clasificaron los modelos globales y locales y se documentaron las relaciones y el alta futura en `docs/DOMINIO_MULTITENANT.md`. El contrato se contrasta con el modelo Prisma; el aislamiento físico sigue pendiente.

## [2026-11-10] update | Clientes Prisma por esquema

Se añadió un servicio experimental de clientes de plataforma y por tienda, con pruebas de lectura concurrente en el laboratorio. El tráfico real, la autorización y las transacciones mixtas siguen pendientes; ver `docs/MIGRACION_ESQUEMAS_TIENDA.md`.

## [2026-11-10] update | Enums por ámbito

Se verificaron enums y valores por defecto en plataforma y dos esquemas de tienda del laboratorio; lecturas y escrituras por cliente funcionaron con rollback. El aprovisionamiento definitivo, acceso a relaciones y transacciones mixtas siguen pendientes.

## [2026-11-10] update | Plan para completar conexiones por esquema

Se documentaron el estado de los pilotos, los trabajos pendientes, la estrategia de implementación y los criterios de prueba en [[Pendientes conexiones por esquema]].

## [2026-11-11] update | Seguridad y versión de esquemas

Se probó aislamiento SQL con un rol temporal y se incorporó un registro inicial de migraciones por tienda, con una primera migración aplicada en el laboratorio. El backend sigue usando una cuenta privilegiada y faltan migraciones y pruebas operativas adicionales; ver [[Pendientes conexiones por esquema]].

## [2026-11-11] update | Persistencia offline web

Se hicieron atómicos el reintento, la fusión y la migración de la cola web; se probaron en IndexedDB y se verificó reapertura de una página sin red. La sincronización se bloquea explícitamente en modo por esquemas hasta migrar el servidor; ver [[Modo offline]].

## [2026-11-11] update | Analítica sintética

Se añadieron dos modelos entrenados con datos sintéticos y un tablero web con pruebas HTTP de plan, roles y aislamiento. Las métricas se refieren solo a datos sintéticos y queda pendiente la validación real; ver [[Analitica con IA]].


## [2026-11-11] query | Avance de los cinco bloques

Se contrastaron los requisitos con el código local y las pruebas previas. Estimaciones y verificaciones actuales en [[Avance cinco bloques 2026-11-11]].

## [2026-11-11] query | Auditoría funcional UC36 a UC54

Se ejecutaron pruebas unitarias, compilación y suites HTTP sobre una copia exclusiva. SaaS/offline/reportes/crédito pasan en tablas compartidas y analítica en esquemas, pero no están integrados en el mismo modo. Se reprodujeron 503 de sincronización/analítica y 500 de sesión en una transición parcial. Push inactivo y pagos simulados. Ver [[Auditoria funcional UC36 a UC54 2026-11-11]]; el informe distingue pruebas actuales de pendientes visuales/móviles.


## [2026-11-11] update | Integración completa de Analítica con IA en modo habitual y por esquemas

Se resolvió el bloqueo `HTTP 503 (ANALITICA_REQUIERE_ESQUEMAS)` en `AnaliticaService`. El servicio ahora admite funcionamiento seguro dual:
1. **Modo habitual (tablas compartidas / `public` con `tienda_id`):** utiliza `PrismaService` con aislamiento estricto por `tiendaId` en ventas, líneas y variantes, y cálculo de disponibilidad descontando reservas y devoluciones.
2. **Modo por esquemas (`TENANT_SCHEMAS_PERFILES=true`):** utiliza `PrismaEsquemasService.clienteTienda(tiendaId)`.

Se implementaron pruebas unitarias de servicio (`analitica.service.spec.ts`) y se validó en laboratorio `ensayar_copia` (puerto 55443):
- 401 sin sesión / token ausente.
- 403 para roles no autorizados (ej. CAJERO).
- 403 para planes sin módulo `analitica` (ej. Plan Inicial y Crecimiento).
- 200 para tienda con Plan Cadena autorizada (ej. Vesta en tablas compartidas y tiendas sintéticas en esquemas).
- Resistencia a manipulación de cabecera `X-Tienda`.
- Manejo correcto de tiendas sin ventas en los últimos 28/90 días (estado vacío informativo).
- Ambos modelos de ML (regresión lineal y k-means) mantienen entrenamiento reproducible y evaluación en conjunto separado de prueba.
- Compilación de backend y frontend verificadas. Panel web accesible en `/analitica`. Ver [[Analitica con IA]].

## [2026-11-11] update | Auditoría de fuentes académicas y alcance documental ICONIX

Auditoría integral de fuentes canónicas (docente titular, audio 8 nov), contraste con la wiki y delimitación del alcance formal del informe ICONIX del segundo parcial.
- **Pagos simulados:** Se rectificó la afirmación de la wiki que exigía un sandbox externo vivo (Stripe/PayPal/Libélula). Conforme a la aclaración confirmada por el dueño del proyecto, el docente acepta pagos simulados integrales y realistas (`docs/PAGOS_SIMULADOS.md`, `metodos-pais.ts`, `pagos.controller.ts`) con reglas por país (BO, PE, BR), reservas de inventario e idempotencia. Se actualizaron [[Pasarelas de pago]], [[Mapa del segundo parcial]], [[Brecha segundo parcial]] y [[Contradicciones entre fuentes]].
- **Arquitectura y brechas:** Se formalizó la distinción entre la arquitectura operativa de tablas compartidas con `tienda_id` (donde corren SaaS, offline y reportes) y el piloto de esquemas PostgreSQL independientes.
- **Entregable formal:** Se generó el documento de homologación y matriz de requisitos en `docs/segundo-parcial/05-verificacion/iconix-01-fuentes-y-alcance.md` con la redacción propuesta para la sección «Alcance» del informe académico.

## [2026-11-11] update | Operación offline web/PWA completada y verificada en navegador real

Se finalizaron y probaron de extremo a extremo las capacidades offline de la web PWA:
- **Service Worker v3:** Inclusión de `/api/catalogo/disponibilidad`, `/api/pagos/metodos` y `/api/usuarios` en la lista de lectura cacheada (`API_LECTURA`), con limpieza de versiones obsoletas y reapertura sin red confirmada en Edge.
- **Restricción de operaciones en línea:** El POS bloquea medios de pago digitales (QR, tarjeta, transferencia, crédito) al desconectarse la red, defaulting seguro a efectivo. En el carrito web se previene el checkout sin conexión con mensajes descriptivos.
- **Aislamiento multitienda en IndexedDB:** Reactividad ante cambio de tienda (`ensayar:tienda_cambiada`), garantizando que la cola local no mezcle operaciones entre tiendas diferentes.
- **Resolución de conflictos y remap de clientas:** Detección de `STOCK_INSUFICIENTE` con opción de reintento "Vender lo disponible" atómico con nuevo UUID, y fusión automática de clientas con correo preexistente.
- **Batería de pruebas automatizadas en Microsoft Edge:** Se incorporó el script `frontend/scripts/run-edge-tests.mjs` (`npm --prefix frontend run test:offline`) que valida contra el navegador real en perfil aislado:
  1. Activación de SW y navegación offline (`verificar-pwa-offline.mjs`).
  2. Integridad transaccional y rollback de IndexedDB (`verificar-cola-idb.mjs`).
  3. Flujo completo offline: registro triple (venta, cliente, producto), supervivencia a recarga sin red, aislamiento por tienda, conflicto de stock con reintento, e idempotencia (`verificar-flujo-offline-completo.mjs`).
- **Verificación backend:** 14 pruebas de `backend/scripts/verificar-offline.ts` superadas sobre la base de datos `ensayar_copia`. Ver [[Modo offline]].

## [2026-11-11] update | Perfiles y reportes inteligentes por esquema

Se migró sin borrar la fuente la tienda que carecía de esquema en `ensayar_copia`, tras un respaldo. El descubrimiento de perfiles ya no usa usuarios de `public` como alternativa y falla si falta un esquema. Los reportes inteligentes consultan y registran sus ejecuciones en el esquema activo. Se verificaron dos tiendas y exportaciones en una copia aislada; la migración del resto de módulos continúa pendiente. La batería general conserva una prueba SaaS fallida por un mock incompleto de `updateMany`.

## [2026-11-11] update | Informe completo en formato APA 7 con carátula oficial

- **Contenido.** Capítulo 5 (pagos: métodos por país, costos con fuentes, Bolivia/PayPal, PCI DSS, saga con reembolso) y capítulo 8 (analítica: pronóstico de demanda con Random Forest y segmentación RFM con k-means sobre datos sintéticos) completos. Sección 1.10 con la evaluación de la arquitectura heredada y los tres caminos (se eligió modificar capas). Anexo 14.2 con URL de Azure y código QR (URL antigua; pendiente la nueva).
- **Figuras.** Las 12 figuras conceptuales de los capítulos 3, 4, 6 y 7 se dibujan con `imagenes/fundamentacion/_figuras.py`.
- **Formato.** `_build_docx.py` aplica APA 7: Times New Roman 12, interlineado doble, márgenes de 2,54 cm, sangría de 1,27 cm, niveles de título APA, tablas con solo bordes horizontales, figuras con número y título arriba y nota abajo, número de página arriba a la derecha y referencias en una sola lista con sangría francesa (capítulo 13).
- **Carátula.** La oficial está en `portada-oficial.docx` y Word la inserta sin cambios al exportar.
- **Tono.** Se quitaron las referencias por capítulo y las frases de borrador. PDF de 383 páginas.

## [2026-11-11] update | Figuras de fundamentación en Enterprise Architect

- **Figuras.** Las figuras conceptuales de los capítulos 3, 4, 6 y 7 pasan a ser diagramas UML 2.5 del modelo `EnsayAR-ICONIX.eapx`, paquete "9 Fundamentacion", generados con `iconix/fundamentacion.py` y exportados como `imagenes/ea/fun-*.png`: componentes (planos, capas de aislamiento), actividad con particiones (ciclo de suscripción, tubería del reporte), despliegue (silo, bridge y pool), secuencia (resolución de la tienda, conflicto de stock, saga con fragmento alt) y máquinas de estados (service worker, operación offline). Se retiraron las figuras de matplotlib.
- **Ajustes.** La antigua figura 3.1 se quitó porque repetía la tabla de modelos de entrega; la de PACELC (6.1) quedó como tabla. En las secuencias, los mensajes normales llevan `PDATA4='0'` para que EA no dibuje como retorno las llamadas hacia la izquierda.
- **Formato.** El número de página va en el pie, abajo a la derecha. PDF de 386 páginas.
