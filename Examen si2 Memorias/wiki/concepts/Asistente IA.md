---
tipo: concept
fuentes: 3
actualizado: 2026-09-22
tags: [ia, cliente]
---

# Asistente IA

IA de **lado cliente**, distinta de [[Reportes generativos]] (lado admin).

## Audio

El cliente pregunta detalles de la prenda que está viendo (material, cuidados, combinación). [[transcripcion-audio-clase-ecommerce]]

## Garzón

Recomendador según preferencias, historial, temporada, categoría, talla y stock. También chatbot. RF25: *al menos una* función de IA. [[examen1-garzon-fashionstore]]

Para el [[MVP y alcance]]: una de las dos caras de IA basta si la otra es el reporte por voz; el audio trata ambas como parte del paquete innovador.

Implementado: `POST /ia/ficha` responde precio, talla, color, ocasión y descripción. UI en Catálogo.

## Madurez real (22 sep)

[[contexto-completo-proyecto]]: asistente **determinístico** en `backend/src/ia/`. Sin OpenAI, embeddings ni chat libre. **No vender como chatbot.** Cumple RF25 académico si se explica como reglas sobre ficha. [[Estado del codigo]]
