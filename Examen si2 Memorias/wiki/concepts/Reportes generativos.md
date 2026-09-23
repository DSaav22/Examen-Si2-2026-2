---
tipo: concept
fuentes: 3
actualizado: 2026-09-22
tags: [innovacion, ia, sql]
---

# Reportes generativos

**Innovación 2.** Reportes **bajo demanda**, no un menú fijo de Crystal/Jasper.

## Cómo lo pidió el docente

El gerente habla (o escribe) algo como: *ventas de la sucursal X, POS Y, de tal hora a tal hora; a quién y cuánto*. El sistema no tiene ese reporte prediseñado. La IA arma la consulta (SQL) y el resultado en el momento. [[transcripcion-audio-clase-ecommerce]]

Garzón lo pone en el actor “Servicio de IA”: reportes generativos bajo demanda por voz. Los RF clásicos (RF24) no sustituyen esto. [[examen1-garzon-fashionstore]]

## Implicación de diseño

- Reportes estáticos: sí, pero no son lo evaluable.
- Hay que acotar qué puede preguntar la IA (esquema, permisos, sucursal) para no soltar SQL libre.
- Encaja en la Parte 1 teórica y en el [[MVP y alcance]] si entra al primer incremento.

## Construcción (19 sep)

Sin clave OpenAI. `compilarPregunta` arma el SELECT; `validarSelect` lo acota a `v_reporte_ventas`. `POST /reportes/generativo` y **`GET /reportes/dia`** (ADMIN). UI en `/reportes` (Consultar + Ventas del día). Spike C. [[UC10 Reporte generativo]]

## Madurez real (22 sep)

[[contexto-completo-proyecto]]: **no usa IA generativa**. Filtros/reglas + SQL restringido. También existen reportes fijos día e inventario. En el informe: “compilador de pregunta → SELECT acotado”, no “LLM”. [[Estado del codigo]]

## Relacionado

[[Asistente IA]] · [[Punto de venta]] · [[Mapa del examen]]
