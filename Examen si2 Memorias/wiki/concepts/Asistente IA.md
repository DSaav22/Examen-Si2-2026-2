---
tipo: concept
fuentes: 3
actualizado: 2026-09-23
tags: [ia, cliente]
---

# Asistente IA

IA de **lado cliente**, distinta de [[Reportes generativos]] (lado admin).

## Audio

El cliente pregunta detalles de la prenda que está viendo (material, cuidados, combinación). [[transcripcion-audio-clase-ecommerce]]

## Garzón

Recomendador según preferencias, historial, temporada, categoría, talla y stock. También chatbot. RF25: *al menos una* función de IA. [[examen1-garzon-fashionstore]]

Para el [[MVP y alcance]]: una de las dos caras de IA basta si la otra es el reporte por voz; el audio trata ambas como parte del paquete innovador.

`POST /ia/ficha` sigue respondiendo la ficha con reglas (precio, talla, color, ocasión).

## Madurez real (23 sep, tarde)

Hay chatbot de tienda: `POST /ia/bot`, JWT de CLIENTA, panel flotante en la web. El modelo es Azure OpenAI `gpt-4.1-mini` en Brazil South. El servidor le pasa catálogo, stock y los pedidos de esa clienta. No ejecuta SQL. Si piden el reporte de la empresa, responde que eso es de administración. Si el modelo no contesta, usa un resumen por reglas. [[codigo-23-sep]] · [[Estado del codigo]]

El móvil no llama a este endpoint. El Azure publicado tampoco, hasta el próximo deploy.
