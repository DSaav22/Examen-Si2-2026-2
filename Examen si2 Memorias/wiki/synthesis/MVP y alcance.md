---
tipo: synthesis
fuentes: 6
actualizado: 2026-09-22
tags: [mvp, parcial]
---

# MVP y alcance

Cerrado en [[Decisiones del parcial]]. El 19 sep el dueño pidió cubrir **RF01–RF25 y RNF** del PDF Garzón (dominio), con stack Nest/React/RN.

## Entra (alcance acordado)

Catálogo matricial multi-sucursal, temporadas/colecciones, proveedores, registro clienta, compra web + **móvil**, POS (abrir/vender/cerrar), reservas + encargado, kardex, pasarela simulada, historial, [[Probador virtual]] 2D+pose, [[Asistente IA]] de ficha, [[Reportes generativos]] + inventario, cola offline POS, Azure (deploy).

## No entra

CMS de comercio (Shopify, Magento, WooCommerce, PrestaShop) y un stack distinto del curso (Flutter, Angular, FastAPI, Spring como backend de este parcial). Cobro bancario real y NIT real: no. Su lugar es la simulación.

## Decisión del 23 sep (noche)

Entran también, y se implementa lo que alcance antes de la defensa: probador 3D, bot, PWA, precio mayorista, transferencia entre almacenes, despacho, devolución y factura simulada. Pagos: simulación; Stripe solo en modo prueba si hace falta pasarela. Detalle: [[Casos de uso]] UC28–UC35 y [[Decisiones del parcial]].

## Realidad del código (22 sep)

[[contexto-completo-proyecto]] / [[Estado del codigo]]: núcleo POS+catálogo+inventario+reservas **sí**; probador y “IA” **no cerrados** (prototipo / reglas). En el informe y la demo, separar *alcance* de *madurez*.
