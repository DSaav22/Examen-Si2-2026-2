# 5. Pagos para países de habla hispana

> Capítulo a cargo del segundo integrante (punto 5 de la consigna). Contenido esperado:

## 5.1 Medios de pago en la región

Tarjetas, transferencias inmediatas y billeteras por país (QR interoperable en Bolivia, Yape y Plin en Perú, PIX como referencia regional, SPEI en México, PSE y Nequi en Colombia, Mercado Pago en el Cono Sur, Bizum en España).

## 5.2 Pasarelas y costos

Comparación de pasarelas que operan en la región: comisión porcentual, cargo fijo, costo del cambio de moneda, plazo de acreditación, cobertura por país y requisitos de alta. Recomendación para un SaaS que cobra suscripciones en varias monedas.

## 5.3 Integración en EnsayAR

Integración con una pasarela real en modo de pruebas: creación del intento de pago, redirección o checkout embebido, webhook firmado, idempotencia con la `claveIdempotencia` que ya usa la suscripción (`TransaccionPasarela` en el modelo de dominio) y conciliación de pagos.

## 5.4 Seguridad y cumplimiento

PCI DSS y tokenización (la plataforma no guarda datos de tarjeta), verificación de firmas de webhook, reintentos y manejo de pagos duplicados o rechazados.
