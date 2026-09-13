# Parte 2 — Proceso Unificado: Fase de Construcción (en curso)

**Sistema:** EnsayAR  
**Corte:** spike B (UC07 / R3)  
**Fecha:** 12 de septiembre de 2026  

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

1. `docker compose up -d` en la raíz (o un PostgreSQL local).
2. En `backend/`: `npm run spike:b`.

## Pendiente en Construcción

- Spike A (probador RN) y spike C (SQL acotado).
- Auth JWT, catálogo CRUD, apertura/cierre de caja, cola offline, Azure.
- Front React (POS/admin) y app React Native.
