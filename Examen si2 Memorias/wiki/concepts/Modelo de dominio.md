---
tipo: concept
fuentes: 6
actualizado: 2026-09-23
tags: [puds, elaboracion]
---

# Modelo de dominio

Producto 1—\* Variante (talla × color). Stock vive en **StockAlmacen(variante, almacén)** con `cantidad` y `reservado`. Disponible = cantidad − reservado. Venta (en línea o POS) tiene líneas; el POS exige CajaTurno abierto. Reserva aparta sin vender. ReporteEjecucion es traza, no stock.

Texto: `docs/parcial/02-puds/02-fase-elaboracion.md` (capítulo 4, sección 4.6). Figura: Enterprise Architect. Inventario: [[Inventario matricial]].
