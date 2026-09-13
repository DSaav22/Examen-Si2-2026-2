---
tipo: concept
fuentes: 5
actualizado: 2026-09-12
tags: [puds, cu, elaboracion]
---

# UC07 — Registrar venta POS

Expandido en Elaboración. Actor: cajero. Pre: [[Punto de venta]] con turno abierto. Post: venta `cobrada` + stock descontado en el almacén del turno.

Un `POST /ventas` transaccional (mismo contrato que la compra en línea). Offline: cola con `uuid`; el servidor es idempotente; el stock se descuenta al sincronizar.

`cobrarVenta`: stock' = stock − cantidad; no stock negativo (lock de fila). Spike B.

Detalle: `docs/parcial/02-puds/02-fase-elaboracion.md` §3.
