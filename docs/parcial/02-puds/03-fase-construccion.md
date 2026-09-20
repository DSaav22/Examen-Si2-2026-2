# Parte 2 — Proceso Unificado: Fase de Construcción (en curso)

**Sistema:** EnsayAR  
**Corte:** spikes A + B + C (UC03 / UC07 / UC10)  
**Fecha:** 19 de septiembre de 2026  

La Construcción implementa casos de uso sobre el baseline de Elaboración. Este corte deja el núcleo que comparte la venta POS y la compra en línea.

## Qué se construyó

- Proyecto `backend/` (NestJS + Prisma + PostgreSQL).
- Modelo físico alineado al [[Modelo de dominio]]: producto, variante, stock por almacén, turno, venta, línea.
- `POST /ventas`:
  - `FOR UPDATE` por variante (ordenada) para evitar deadlock;
  - descuento transaccional;
  - `409 STOCK_INSUFICIENTE` si no alcanza;
  - idempotencia por `uuid` único.
- Seed de spike: 1 polera M negra, stock = 1, turno abierto.
- Test `ventas.spike-b.spec.ts` (se corre con `npm run spike:b`).

## Criterio del spike B (Elaboración §8)

| Condición | Cómo se verifica |
|-----------|------------------|
| Una cobra, la otra falla | `Promise.allSettled` de dos `cobrar` sobre la última unidad |
| Stock final = 0 | `stock_almacen.cantidad` |
| El mismo uuid no duplica | segundo `cobrar` con el mismo uuid devuelve la misma venta |

## Cómo correrlo

1. PostgreSQL local: usuario `postgres`, contraseña `diego`, base `ensayar`.
2. En `backend/`: `npm run spike:b`.

## Auth + catálogo (19 sep)

- `POST /auth/login` y `GET /auth/me` (JWT 12 h).
- Roles: ADMIN, CAJERO, CLIENTA. Seed: `admin|cajero|clienta@ensayar.bo` / `diego`.
- Catálogo público de lectura; escrituras solo ADMIN.
- `POST /ventas` exige CAJERO o ADMIN.

## Spike C — reportes generativos (19 sep)

- Vista `v_reporte_ventas` (migración `20260919160000_vista_reportes`).
- Compilador de pregunta en español → `SELECT` sobre esa vista (sin clave LLM).
- `validarSelect`: un solo SELECT, sin DML/DDL, solo la vista, `LIMIT 200`.
- `POST /reportes/generativo` (ADMIN). Audita en `reporte_ejecuciones`.
- Web: `/reportes` (texto + dictado Web Speech).
- Test: `npx jest src/reportes/sql-seguro.spec.ts`.

## Spike A — pose (19 sep, corte 2)

- Web: MediaPipe Pose (hombros 11/12) ancla el overlay; fallback dos toques o recuadro fijo.
- Móvil: toque en hombro izquierdo y derecho.
- `GET /catalogo/variantes/:id/overlay` + SVG `/overlay-polera.svg`.

## UC04 + cola + online (19 sep)

- `POST /ia/ficha` (pregunta → campos de la prenda).
- POS: efectivo o QR simulado; cola `localStorage` si no hay red; sync al volver.
- Clienta: **Pedir** contra entrega (`POST /ventas` canal `online`).

## Azure

IaC en `infra/` + `azure.yaml`. Plan: `.azure/deployment-plan.md`. No se provisionó: no hay `az login` en esta sesión. Ver Transición.
