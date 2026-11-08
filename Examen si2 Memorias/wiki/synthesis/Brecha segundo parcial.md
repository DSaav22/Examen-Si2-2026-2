---
tipo: synthesis
fuentes: 3
actualizado: 2026-11-08
tags: [codigo, brecha, segundo-parcial, prioridades]
---

# Brecha: segundo parcial vs código actual

Contraste de los requisitos de [[Mapa del segundo parcial]] contra el repo al 8 nov (último commit `863d62e`, "amplía operaciones móviles y probador 3D"). La wiki de código se quedó en el 25 sep ([[Estado del codigo]]); hay commits posteriores no ingeridos, así que esta página revisó el repo directamente.

## Veredicto corto

El primer parcial deja una buena base para **offline e idempotencia** (venta con `uuid` único, bloqueo de stock con `FOR UPDATE`, cola del POS en IndexedDB, tablas `Dispositivo` y `OperacionSync`). El camino es el 2 del docente: modificar capas, no rehacer.

Al 8 nov están cerrados el punto 1 (SaaS, filas S), el punto 2 (offline, filas O) y el punto 3 (reportes generativos, filas R). **Siguen en cero: analítica con ML y pasarelas reales.**

## Por requisito

| Id | Requisito | Qué hay hoy | Brecha |
|----|-----------|-------------|--------|
| B2 | Despliegue en nube | Bicep en `infra/` y `azure.yaml`; según la wiki, el deploy publicado es anterior al corte del 25 sep | Volver a desplegar todo, incluido móvil apuntando a la API en nube |
| B3 | Monolito modular | 18 módulos Nest (auth, ventas, caja, reportes, ia…) | Documentarlo y marcar qué módulo se separaría primero |
| S1, S8 | Multi-tenant | **Hecho (8 nov).** `tienda_id` en 36 modelos, extensión Prisma que falla cerrada, defecto en la base y reportes con `set_config` | RLS con políticas por tabla queda como evolución |
| S2–S5 | Landing, planes, suscripción, alta automática | **Hecho.** `/planes`, asistente con pago simulado idempotente y alta automática de tienda, sucursal, almacén y admin | Pasarela real (ver P1–P4) |
| S6 | Verificar correo | **Hecho.** Token de verificación; sin confirmar no entra ni suscribe | En demo el enlace se muestra en pantalla si no hay SMTP |
| S7 | Un login, varias tiendas | **Hecho.** `Cuenta` global ↔ `Usuario` por tienda; selector sin re-login | — |
| S9 | Reportes de suscripciones | **Hecho.** `/plataforma/admin`: MRR, ARR, ARPU, churn, series de 12 meses, proyección a 6 | — |
| O1, O10 | Web PWA | **Hecho (8 nov).** Service worker v2 con caché de datos, cola IndexedDB para ventas, clientes y productos, instalable con atajos, Web Push con VAPID | — |
| O2 | Móvil offline | **Hecho.** `expo-sqlite` (tablas `operaciones` y `cache`), caja que vende y registra clientas sin red, NetInfo para reconectar | Probado en Expo web (respaldo AsyncStorage); en Android solo se verificó que el bundle compila |
| O3, O4 | Sync e IDs | **Hecho.** `POST /sync/lote` con estados por operación; UUID generado en el cliente para venta, cliente, producto y variantes | — |
| O5 | Último ítem en conflicto | **Hecho.** `UPDATE … WHERE cantidad - reservado >= n`; conflicto visible en el dispositivo, en `/sincronizacion` y por notificación | — |
| O6 | Idempotencia | **Hecho.** Cabecera `Idempotency-Key` en 11 endpoints (ventas, caja, pagos, inventario, altas, devoluciones) | — |
| O7 | Rollback | **Hecho.** Una transacción por operación; la de stock aborta todo. Sagas explicadas en [[Modo offline]] | — |
| O8, O9 | Qué es offline y cuánto tiempo | **Hecho.** Matriz `politica.ts` (4 sin red, 7 solo en línea); ventana 1–30 días por tienda, 7 por defecto | — |
| R1 | Voz | **Hecho (8 nov).** Web Speech API (`es-BO`) en la web; dictado del teclado en el móvil; números hablados ("mil quinientos") se convierten | Azure Speech si se quiere voz en navegadores sin la API |
| R2 | Reportes complejos | **Hecho.** Capa semántica de 6 fuentes (ventas, clientes, créditos, inventario, productos, movimientos) → especificación JSON validada → SQL parametrizado con filtros, HAVING, agrupación en varios niveles, orden y límite, filtrado por tienda. Ventas al crédito y abonos nuevos para el ejemplo del docente | El modelo Azure da 401: hoy interpreta el respaldo por reglas |
| R3 | PDF y Excel | **Hecho.** `exceljs` (hoja de datos con totales + hoja "Cómo se generó") y `pdfkit` (A4 apaisado, paginado, totales) desde web y móvil | — |
| A1–A3 | Analítica ML | No existe | Generador de datos sintéticos, un modelo supervisado y uno no supervisado, dashboards |
| P1–P4 | Pagos internacionales | `PagoSimulado` y QR simulado | Integrar en modo sandbox una pasarela real para hispanohablantes y documentar costos |

## Riesgo principal

Meter `tenant_id` toca casi todos los servicios. Conviene hacerlo **primero**, porque reportes, analítica y sincronización deben filtrar por tienda desde el inicio.

## Calendario

Hoy es 8 nov y el PDF vence el **11 nov a las 8:00**. Son unos tres días para código y documento. Hace falta priorizar.

## Relacionado

[[ICONIX vs Proceso Unificado]] · [[SaaS multi-tenant]] · [[Modo offline]] · [[PWA]] · [[Analitica con IA]] · [[Reportes generativos]] · [[Pasarelas de pago]]
