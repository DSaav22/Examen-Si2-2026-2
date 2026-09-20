---
tipo: concept
fuentes: 2
actualizado: 2026-09-19
tags: [flujo, garzon]
---

# Reservas de prendas

Flujo **fuerte en Garzón** (RF09–RF12). **Implementado** el 19 sep en EnsayAR.

## Flujo

1. Clienta arma ítems (carrito) y crea reserva con sucursal + horario.
2. Stock pasa a **reservado** (kardex `reserva`); disponible = cantidad − reservado.
3. Encargado ve bandeja `/reservas/sucursal`, prepara, confirma llegada, completa.
4. Cancelación libera stock (`liberacion`). Completar descuenta cantidad (compra en tienda).

API: `POST /reservas`, `GET /reservas/mias`, `GET /reservas/sucursal`, `PATCH /reservas/:id/estado`. UI: `/reservas` (clienta), `/encargado`. Móvil: pestaña Reservas.

## Relacionado

[[Decisiones del parcial]] · [[examen1-garzon-fashionstore]] · [[Punto de venta]]
