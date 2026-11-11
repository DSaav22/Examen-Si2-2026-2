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
- La simulación debe ser **real en contenido y reglas de negocio**: no un botón ingenuo sin validación.

Ahora hay **dos cobros** distintos:

1. La plataforma cobra la **suscripción** a cada tienda ([[SaaS multi-tenant]]).
2. Cada tienda cobra a sus **clientas**.

## Aclaración confirmada sobre pagos simulados

*(Actualización 11 de noviembre de 2026)*

1. **Antecedente de interpretación:** Inicialmente se interpretó que la exigencia docente de «simulación real» obligaba a conectar un entorno sandbox externo vivo (como Stripe, PayPal o Libélula) y que el módulo simulado existente era insuficiente.
2. **Aclaración y ratificación docente:** El dueño del proyecto confirmó que **el docente acepta pagos simulados para este parcial**. No se exige integración con pasarelas externas reales ni cuentas comerciales vivas; la exigencia se enfoca en que la simulación refleje con rigor la lógica de negocio y las restricciones del dominio financiero.
3. **Implementación real en EnsayAR (`docs/PAGOS_SIMULADOS.md`):**
   - **Catálogo de métodos por país de la tienda:** Gobernado por `backend/src/pagos/metodos-pais.ts`. La tienda define los métodos válidos (QR boliviano en BO, Yape y Plin en PE, Pix en BR, tarjeta bancaria y transferencia).
   - **Reserva de inventario en pagos pendientes:** Los pagos electrónicos no confirmados generan un pago en estado `pendiente` con stock temporalmente reservado (`SIM:<metodo>:<venta>`), evitando sobreventas.
   - **Resolución determinística:** `POST /pagos/:id/simular` permite aprobar (descuenta stock definitivamente, afecta caja y cobra) o rechazar (cancela la venta y libera la reserva de stock).
   - **Idempotencia transaccional:** Reenviar el mismo resultado no duplica movimientos ni registros contables. No se permite operar pagos electrónicos sin conexión a internet (solo efectivo en offline).
   - **Límite de alcance:** No existe conexión con pasarelas bancarias externas en producción; se documenta y expone formalmente como simulación realista local.
