---
tipo: concept
fuentes: 3
actualizado: 2026-09-23
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

## Madurez real (23 sep, tarde)

El modelo propone `{titulo, sql}` sobre `v_reporte_ventas`. Si el SQL no pasa `validarSelect`, se usa el compilador por reglas. Luego narra hasta 12 filas. Sigue sin SQL libre. También existen el reporte del día y el de inventario. [[codigo-23-sep]] · [[Estado del codigo]]

## Relacionado

[[Asistente IA]] · [[Punto de venta]] · [[Mapa del examen]]
