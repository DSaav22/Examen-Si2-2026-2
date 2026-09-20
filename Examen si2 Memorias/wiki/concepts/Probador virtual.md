---
tipo: concept
fuentes: 2
actualizado: 2026-09-19
tags: [innovacion, ra, mvp]
---

# Probador virtual

**Innovación 1.** Sin esto, el docente del audio dice que el e-commerce de ropa **no despacha**.

## El problema

En tienda la clienta se ensaya 20 veces. En digital no ve textura, el color miente y la talla puede no calzar. Eso mata la conversión. [[transcripcion-audio-clase-ecommerce]]

## Qué tiene que hacer

- RA en tiempo real con la **cámara del teléfono**.
- La prenda sobre **su** cuerpo, no un maniquí.
- Integrado al catálogo (talla, color, fotos de la variante).
- Las reglas finas del vestidor las define el equipo.

Garzón pide lo mismo en RF13 y lo suma a un flujo de [[Reservas de prendas]] para probar también en vestidor físico. [[examen1-garzon-fashionstore]]

Vive en la app [[React Native]]. Complemento: [[Asistente IA]] para preguntas de la prenda.

## Decisión del parcial

MVP = cámara + pose + overlay **2D** de la variante; fallback foto de cuerpo completo. No hay deformación de tela 3D. [[Decisiones del parcial]] · [[Factibilidad]]

## Construcción (19 sep)

`GET /catalogo/variantes/:id/overlay`. Overlay SVG anclado al torso. Web `/probar/:id` (MediaPipe, toques, **foto de cuerpo** o demo) y Expo `movil/` (toques en hombros). [[UC03 Probador]]

## Relacionado

[[Plataforma omnicanal]] · [[Mapa del examen]] · [[MVP y alcance]]
