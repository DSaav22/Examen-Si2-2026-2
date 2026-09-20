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
