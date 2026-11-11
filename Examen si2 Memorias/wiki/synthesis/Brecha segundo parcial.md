---
tipo: synthesis
fuentes: 3
actualizado: 2026-11-09
tags: [codigo, brecha, segundo-parcial, prioridades]
---

# Brecha: segundo parcial vs código actual

Contraste de los requisitos de [[Mapa del segundo parcial]] contra el repo al 8 nov (último commit `863d62e`, "amplía operaciones móviles y probador 3D"). La wiki de código se quedó en el 25 sep ([[Estado del codigo]]); hay commits posteriores no ingeridos, así que esta página revisó el repo directamente.

## Veredicto corto

El primer parcial deja una buena base para **offline e idempotencia** (venta con `uuid` único, bloqueo de stock con `FOR UPDATE`, cola del POS en IndexedDB, tablas `Dispositivo` y `OperacionSync`). El camino es el 2 del docente: modificar capas, no rehacer.

Al 8 nov estaban cerrados el punto 1 (SaaS, filas S), el punto 2 (offline, filas O) y el punto 3 (reportes generativos, filas R) en tablas compartidas.

Al 11 nov (auditoría formal UC36–UC54):
- **Pagos (P1–P4):** El docente aclaró y aceptó pagos simulados. Se implementó el motor formal en `backend/src/pagos/metodos-pais.ts` y `docs/PAGOS_SIMULADOS.md` con reglas de país (BO, PE, BR), reservas atómicas de stock e idempotencia transaccional. No requiere sandbox bancario externo.
- **Analítica ML (A1–A3):** Implementada en `backend/src/analitica/` con modelos supervisado y no supervisado sobre datos sintéticos, expuestos en `GET /analitica/panel` sobre esquemas PostgreSQL.
- **Dualidad de arquitectura:** En tablas compartidas pasan SaaS, offline y reportes; en esquemas pasa analítica pero `/sync/lote` se bloquea con 503 y las altas devuelven 500 por tiendas heredadas. Falta unificar ambos modos.

Al 9 nov el documento del segundo parcial está armado en `docs/segundo-parcial`. Tiene 14 capítulos, el proceso ICONIX completo y las capturas de GUI, y se genera a `.docx` y `.pdf` con `_build_docx.py`. Los capítulos 5 (pagos) y 8 (analítica) son esqueletos que debe llenar el compañero.

## Por requisito

| Id | Requisito | Qué hay hoy | Brecha |
|----|-----------|-------------|--------|
| B2 | Despliegue en nube | Bicep en `infra/` y `azure.yaml`; según la wiki, el deploy publicado es anterior al corte del 25 sep | Volver a desplegar todo, incluido móvil apuntando a la API en nube |
| B3 | Monolito modular | 18 módulos Nest (auth, ventas, caja, reportes, ia…) | Documentarlo y marcar qué módulo se separaría primero |
| S1, S8 | Multi-tenant | **Hecho (8 nov).** `tienda_id` en 36 modelos, extensión Prisma que falla cerrada, defecto en la base y reportes con `set_config`. Piloto de esquemas en desarrollo | Completar migración a esquemas o documentar tablas compartidas como modelo oficial |
| S2–S5 | Landing, planes, suscripción, alta automática | **Hecho.** `/planes`, asistente con pago simulado idempotente y alta automática de tienda, sucursal, almacén y admin | En esquemas da 500 si hay tiendas heredadas; en compartidas funciona |
| S6 | Verificar correo | **Hecho.** Token de verificación; sin confirmar no entra ni suscribe | En demo el enlace se muestra en pantalla si no hay SMTP |
| S7 | Un login, varias tiendas | **Hecho.** `Cuenta` global ↔ `Usuario` por tienda; selector sin re-login | — |
| S9 | Reportes de suscripciones | **Hecho.** `/plataforma/admin`: MRR, ARR, ARPU, churn, series de 12 meses, proyección a 6 | — |
| O1, O10 | Web PWA | **Hecho (8 nov).** Service worker v2 con caché de datos, cola IndexedDB para ventas, clientes y productos, instalable con atajos. Web Push implementado | Web Push inactivo en local sin VAPID (`activo=false`) |
| O2 | Móvil offline | **Hecho.** `expo-sqlite` (tablas `operaciones` y `cache`), caja que vende y registra clientas sin red, NetInfo para reconectar | Probado en Expo web/emulador; falta prueba en Android físico con corte prolongado de red |
| O3, O4 | Sync e IDs | **Hecho.** `POST /sync/lote` con estados por operación; UUID generado en el cliente para venta, cliente, producto y variantes | En modo esquemas da 503 (`SYNC_ESQUEMAS_NO_DISPONIBLE`); funciona en tablas compartidas |
| O5 | Último ítem en conflicto | **Hecho.** `UPDATE … WHERE cantidad - reservado >= n`; conflicto visible en el dispositivo, en `/sincronizacion` y por notificación | — |
| O6 | Idempotencia | **Hecho.** Cabecera `Idempotency-Key` en 11 endpoints (ventas, caja, pagos, inventario, altas, devoluciones) | — |
| O7 | Rollback | **Hecho.** Una transacción por operación; la de stock aborta todo. Sagas explicadas en [[Modo offline]] | — |
| O8, O9 | Qué es offline y cuánto tiempo | **Hecho.** Matriz `politica.ts` (4 sin red, 7 solo en línea); ventana 1–30 días por tienda, 7 por defecto | — |
| R1 | Voz | **Hecho (8 nov).** Web Speech API (`es-BO`) en la web; dictado del teclado en el móvil; números hablados ("mil quinientos") se convierten | Azure Speech si se quiere voz en navegadores sin la API |
| R2 | Reportes complejos | **Hecho.** Capa semántica de 6 fuentes (ventas, clientes, créditos, inventario, productos, movimientos) → especificación JSON validada → SQL parametrizado con filtros, HAVING, agrupación en varios niveles, orden y límite, filtrado por tienda. Ventas al crédito y abonos nuevos para el ejemplo del docente | El modelo Azure da 401: hoy interpreta el respaldo por reglas |
| R3 | PDF y Excel | **Hecho.** `exceljs` (hoja de datos con totales + hoja "Cómo se generó") y `pdfkit` (A4 apaisado, paginado, totales) desde web y móvil | — |
| A1–A3 | Analítica ML | **Hecho en esquemas (11 nov).** Endpoint `/analitica/panel` con regresión de ventas (supervisado) y clustering de clientes (no supervisado) con datos sintéticos | Tablero visual y unificación con el modo de tablas compartidas |
| P1–P4 | Pagos internacionales | **Hecho con simulación formal (11 nov).** `metodos-pais.ts`, `docs/PAGOS_SIMULADOS.md` con métodos por país (BO, PE, BR), reservas de stock y resolución determinística | El docente acepta pagos simulados; no se requiere pasarela externa en producción |

## Riesgo principal

Meter `tenant_id` toca casi todos los servicios. Conviene hacerlo **primero**, porque reportes, analítica y sincronización deben filtrar por tienda desde el inicio.

## Calendario

Hoy es 8 nov y el PDF vence el **11 nov a las 8:00**. Son unos tres días para código y documento. Hace falta priorizar.

## Relacionado

[[ICONIX vs Proceso Unificado]] · [[SaaS multi-tenant]] · [[Modo offline]] · [[PWA]] · [[Analitica con IA]] · [[Reportes generativos]] · [[Pasarelas de pago]]
