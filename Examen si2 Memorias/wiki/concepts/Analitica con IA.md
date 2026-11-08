---
tipo: concept
fuentes: 1
actualizado: 2026-11-08
tags: [ia, ml, dashboards, segundo-parcial]
---

# Analítica con IA

Segundo tipo de reporte del segundo parcial, distinto de los [[Reportes generativos]]: análisis de datos con aprendizaje automático. [[transcripcion-audio-segundo-parcial]]

## Qué pide

- Aplicar **modelos supervisados y no supervisados**. Ambos son obligatorios.
- **Entrenar** los modelos, no solo llamar a una API.
- Entrenar con **datos sintéticos** generados para que muestren exactamente los patrones buscados.
- Mostrar resultados en **dashboards**.

## Ideas que encajan con una tienda de ropa SaaS

| Tipo | Modelo | Pregunta de negocio |
|------|--------|---------------------|
| Supervisado (regresión) | Pronóstico de demanda por variante y semana | ¿Cuánto reponer de cada talla y color? |
| Supervisado (clasificación) | Abandono de clientas o de tiendas suscritas | ¿Quién va a dejar de comprar o de pagar el plan? |
| No supervisado (clustering) | K-means sobre recencia, frecuencia y monto (RFM) | ¿Qué grupos de clientas existen? |
| No supervisado (anomalías) | Isolation Forest sobre ventas o arqueos | ¿Qué ventas o cajas son raras? |

## Encaje en la arquitectura

En la clase del primer parcial el docente reservó Python para microservicios. [[transcripcion-audio-stack-metodologia-parcial]] Un servicio de analítica en Python (scikit-learn) es un primer módulo separable del monolito modular, coherente con lo que pide ahora. Los dashboards irían en [[React]].

## Estado en el código

No hay nada de esto todavía. Ver [[Brecha segundo parcial]].

## Relacionado

[[Reportes generativos]] · [[Mapa del segundo parcial]]
