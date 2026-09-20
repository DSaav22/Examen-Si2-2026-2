---
tipo: concept
fuentes: 5
actualizado: 2026-09-19
tags: [puds, cu, elaboracion]
---

# UC10 — Pedir reporte generativo

Expandido en Elaboración. Actor: admin. Post: tabla + SQL visible + auditoría. **No escribe** ventas ni stock.

Implementado: compilador de pregunta + `validarSelect` + `POST /reportes/generativo`. Solo `SELECT` sobre `v_reporte_ventas`. `LIMIT` 200. UI admin `/reportes`. Spike C.

Detalle: `docs/parcial/02-puds/02-fase-elaboracion.md` §4. [[Reportes generativos]]
