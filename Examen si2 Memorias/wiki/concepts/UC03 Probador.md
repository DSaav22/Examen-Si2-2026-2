---
tipo: concept
fuentes: 5
actualizado: 2026-09-19
tags: [puds, cu, elaboracion]
---

# UC03 — Usar probador virtual

Expandido en Elaboración. Actor: clienta. Pre: ficha + variante con `urlOverlay`. Post: vio el overlay; **no vende ni reserva**.

Flujo: cámara (o foto) → pose en el dispositivo → anclar PNG a hombros → puede cambiar color. Fallback si no hay pose.

API `GET /catalogo/variantes/{id}/overlay`. Video no sube al servidor. Overlay 2D al torso (fallback 4a). Web `/probar/:id` y Expo `movil/`.

Detalle y SSD: `docs/parcial/02-puds/02-fase-elaboracion.md` §2. Spike A. [[Probador virtual]]
