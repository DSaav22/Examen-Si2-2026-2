---
tipo: synthesis
fuentes: 5
actualizado: 2026-09-12
tags: [puds, construccion]
---

# Fase Construcción (PUDS)

En curso. Formal: `docs/parcial/02-puds/03-fase-construccion.md`. Código: `backend/`.

## Corte actual — Spike B

`POST /ventas` con lock de fila, stock transaccional e `uuid` idempotente. Es el contrato de [[UC07 Venta POS]] (y el de la compra en línea).

Correr: Docker o Postgres local, luego `npm run spike:b` en `backend/`.

## Siguiente

Spike C (reportes) o Auth + catálogo, según se quiera cerrar riesgo o pantallas. Spike A vive en `movil/`.
