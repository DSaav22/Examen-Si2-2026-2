---
tipo: concept
fuentes: 2
actualizado: 2026-09-12
tags: [pagos]
---

# Pasarelas de pago

## Medios pedidos

Audio: contra entrega, efectivo en caja, tarjeta, QR. [[transcripcion-audio-clase-ecommerce]]

Garzón: pasarela electrónica + pagos en caja. Parte teórica pide estudiar Libélula (local), PayPal y Stripe, y formas (débito, crédito, QR, transferencia). [[examen1-garzon-fashionstore]]

Entornos de prueba para lo académico (RNF09). Deploy real en [[Azure]], no localhost.

## Decisión del parcial

Contra entrega + QR **simulado**. Sin Stripe ni Libélula en el 23. [[Decisiones del parcial]]

## Segundo parcial

[[transcripcion-audio-segundo-parcial]] pide un capítulo "muy completo" y abrir los pagos al mundo:

- Mínimo: que funcione en **cualquier país de habla hispana** (menciona México, España y también Brasil).
- QR es típico en Bolivia, pero no en otros países.
- PayPal sirve para pagar desde Bolivia, pero cobrar es difícil.
- Comparar pasarelas locales e internacionales por **comisión**: elegir lo que menos cueste al cliente, porque la competencia cobra menos.
- Explicar qué hace falta en la vida real (contrato con un banco, cuenta de comercio) aunque no se tenga.
- La simulación debe ser **real**: integración con el sandbox de una pasarela, no un botón inventado.

Ahora hay **dos cobros** distintos:

1. La plataforma cobra la **suscripción** a cada tienda ([[SaaS multi-tenant]]).
2. Cada tienda cobra a sus **clientas**.

Lo que existe hoy (`PagoSimulado`, QR simulado) no alcanza. Ver [[Brecha segundo parcial]].
