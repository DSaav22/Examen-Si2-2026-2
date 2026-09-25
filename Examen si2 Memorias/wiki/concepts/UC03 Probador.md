---
tipo: concept
fuentes: 6
actualizado: 2026-09-25
tags: [puds, cu, elaboracion]
---

# UC03 — Usar probador virtual

Expandido en Elaboración. Actor: clienta. Pre: ficha + variante con `urlOverlay` (o camino IA). Post: vio overlay / vista realista; **no vende ni reserva**.

Flujo clásico: cámara (o foto) → pose en el dispositivo → anclar PNG a hombros. Fallback si no hay pose.

API overlay: `GET /catalogo/variantes/{id}/overlay`. Vista realista: `POST /ia/probar` (imagen base64 + variante). Video no sube al servidor.

## Móvil (24–25 sep)

En PC / Expo web **sin cámara** el botón «Vista realista» quedaba deshabilitado a propósito (`permiso.granted`). Ya no: **SUBIR FOTO** o **SILUETA DEMO** habilitan la IA. HUD en panel oscuro (legible sobre fotos claras). [[codigo-24-sep-movil-web]]

Web `/probar/:id` y Expo `movil/` (también `--web` en `:8081`). Detalle y SSD: `docs/parcial/02-puds/02-fase-elaboracion.md` §2. Spike A. [[Probador virtual]] · [[Estado del codigo]]
