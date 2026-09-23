---
tipo: source
fuentes: 0
actualizado: 2026-09-23
tags: [codigo, sesion]
---

# Código al 23 sep (tarde)

Observación del working tree de EnsayAR el 23 de septiembre, después de cerrar los casos que el informe ya describía y el código no. No hay archivo en `raw/`: la fuente es el repo (`backend/`, `frontend/`, `movil/`). Canon de *qué hay hoy*: [[Estado del codigo]].

## Qué se cerró en código

- Nueve casos que estaban a medias: cupón con tope, perfil y direcciones, foto de variante, moderación de opiniones, usuarios activos, pago con tarjeta de prueba, NIT de prueba en el ticket, PWA instalable.
- Bot de tienda: `POST /ia/bot`, solo rol CLIENTA. Usa Azure OpenAI `gpt-4.1-mini` (Brasil South). Si el modelo no responde, contesta con reglas. No ejecuta SQL ni ve otras clientas.
- Reportes: el modelo propone el `SELECT`; `validarSelect` sigue siendo la única puerta a PostgreSQL (`v_reporte_ventas`).
- Probador 3D: si `urlModelo` tiene texto, volumen CSS (giro y color). Si está vacío, overlay 2D. Sin Three.js y sin generación de imagen.
- Precio mayorista en el servidor, transferencia entre almacenes, pedido con despacho y seguimiento `VESTA-…`, devolución que repone stock y, si había pago simulado aprobado, lo marca reembolsado.

## Qué no entró

Generación de foto (cuota de imagen en 0 en las regiones permitidas). El móvil no consumió estos casos. El sitio ya publicado en Azure es un corte anterior: este código está en local y no está commiteado.
