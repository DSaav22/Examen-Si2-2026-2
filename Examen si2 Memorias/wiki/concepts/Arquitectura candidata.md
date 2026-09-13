---
tipo: concept
fuentes: 5
actualizado: 2026-09-12
tags: [puds, inicio]
---

# Arquitectura candidata

[[React Native]] (clienta + cámara) y [[React]] (admin/POS) hablan con [[NestJS]]. Datos en [[PostgreSQL]] sobre [[Azure]]. IA y QR son puertos, no el núcleo.

Módulos API: Auth, Catalogo, Inventario, Ventas, Caja, IaFicha, IaReportes, Pagos.

Baseline cerrado en [[Fase Elaboracion]]: un `POST /ventas`, stock solo en servidor, probador solo en el cliente, SQL solo `v_reporte_ventas`.

Spikes: A overlay, B stock concurrente, C SELECT acotado.

Ver [[Stack del parcial]] y `docs/parcial/02-puds/02-fase-elaboracion.md` §7–8.
