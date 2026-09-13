---
tipo: concept
fuentes: 5
actualizado: 2026-09-12
tags: [puds, cu, elaboracion]
---

# UC10 — Pedir reporte generativo

Expandido en Elaboración. Actor: admin. Post: tabla + SQL visible + auditoría. **No escribe** ventas ni stock.

Solo `SELECT` sobre `v_reporte_ventas` (sucursal, cajero, hora, prenda, montos). Usuario de BD de solo lectura. `LIMIT` 200. Spike C.

Detalle: `docs/parcial/02-puds/02-fase-elaboracion.md` §4. [[Reportes generativos]]
