---
tipo: synthesis
fuentes: 5
actualizado: 2026-09-19
tags: [puds, construccion]
---

# Fase Construcción (PUDS)

En curso. Formal: `docs/parcial/02-puds/03-fase-construccion.md`. Código: `backend/`, `frontend/`, `movil/`.

## Corte actual — Spike B

`POST /ventas` con lock de fila, stock transaccional e `uuid` idempotente. Es el contrato de [[UC07 Venta POS]] (y el de la compra en línea).

Correr: PostgreSQL local (`postgres` / `diego`, base `ensayar`), luego `npm run spike:b` en `backend/`. Sin Docker.

## Auth + catálogo (19 sep)

Login JWT. Lectura de catálogo pública. Altas de producto/variante/stock: ADMIN. Ventas: CAJERO o ADMIN.

Usuarios seed (clave `diego`): `admin@ensayar.bo`, `cajero@ensayar.bo`, `clienta@ensayar.bo`.

## Frontend (19 sep)

`frontend/` en http://localhost:5173 — login, catálogo, POS. Cajero cobró una polera en la verificación.

## Spike C (19 sep)

`POST /reportes/generativo` (ADMIN). Pregunta en español → SELECT sobre `v_reporte_ventas`. Validador rechaza DML y otras tablas. UI en `/reportes`. Test `sql-seguro.spec.ts`.

## Spike A (19 sep)

`GET /catalogo/variantes/:id/overlay`. Overlay 2D (SVG) anclado al torso. Web `/probar/:id` y app Expo `movil/` (cámara + overlay). Pose por landmarks queda como mejora; hoy usa el fallback 4a.

## Pose, IA, cola, Azure (19 sep, corte 2)

MediaPipe en `/probar` + foto de cuerpo/demo. `POST /ia/ficha`. Cola offline del POS. Clienta pide contra entrega. Ticket imprimible. `GET /reportes/dia`. Catálogo con blazer. IaC Azure listo; falta `az login`. Parte 1 y 3 escritas. [[Documento del examen]]
