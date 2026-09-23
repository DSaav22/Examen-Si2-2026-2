---
tipo: concept
fuentes: 6
actualizado: 2026-09-22
tags: [puds, inicio]
---

# Arquitectura candidata

[[React Native]] (clienta + cámara) y [[React]] (admin/POS/storefront Vesta) hablan con [[NestJS]]. Datos en [[PostgreSQL]] (local Docker; Azure Flexible Server en Bicep). IA y QR son puertos, no el núcleo. **No microservicios.** [[contexto-completo-proyecto]]

Módulos API reales: Auth, Catalogo, Inventario, Ventas, Caja, Reservas, Usuarios, Proveedores, Reportes, Pagos, Meta, Admin, Ia (experimental), Prisma.

Baseline cerrado en [[Fase Elaboracion]]: un `POST /ventas`, stock solo en servidor, probador solo en el cliente, SQL solo vistas/acotado.

Spikes: A overlay, B stock concurrente, C SELECT acotado.

Ver [[Stack del parcial]] · [[Estado del codigo]] · `docs/parcial/02-puds/02-fase-elaboracion.md` §7–8.
