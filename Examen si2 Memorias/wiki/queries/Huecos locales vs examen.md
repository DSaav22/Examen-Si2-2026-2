---
tipo: query
fuentes: 6
actualizado: 2026-09-19
tags: [examen, huecos, garzon, rf]
---

# ¿Qué falta frente a Garzón RF/RNF?

Canon dominio: PDF Garzón RF01–RF25 + RNF. Stack: Nest/React/RN ([[stack-metodologia-parcial]]).

## Matriz RF01–RF25 (19 sep)

| RF | Estado | Dónde |
|----|--------|-------|
| 01 Registro clienta | OK | `POST /auth/registro` · `/registro` |
| 02 Usuarios/roles | OK | roles 5 · `/admin` · `CRUD /usuarios` |
| 03 Multi ciudad/sucursal | OK | SC + LP seed · CRUD `/sucursales` |
| 04 Productos | OK | catálogo |
| 05 Talla/color/cat/temporada | OK | variantes + `/temporadas` |
| 06 Proveedores | OK | `/proveedores` · portal `/proveedor` |
| 07 Catálogo web+móvil | OK | web + Expo |
| 08 Disp. por sucursal | OK | `GET /catalogo/disponibilidad` · filtro |
| 09–12 Reservas | OK | módulo reservas + encargado |
| 13 Vestidor móvil | OK | Expo cámara/overlay |
| 14–15 Carrito + compra web | OK | `/carrito` |
| 16 Compra móvil | OK | Expo carrito/checkout |
| 17–18 Venta/pago caja | OK | `/pos` + ticket |
| 19 Pasarela digital | OK | `PagoSimulado` sandbox |
| 20–21 Stock post-venta / sucursal | OK | transacción + multi-almacén |
| 22 Movimientos inventario | OK | kardex `/inventario` |
| 23 Temporadas/colecciones | OK | meta + seed |
| 24 Reportes ventas e inventario | OK | `/reportes` día + inventario + generativo |
| 25 IA | OK | ficha + reportes generativos |

## RNF01–09

| RNF | Cumplimiento |
|-----|----------------|
| 01 Seguridad credenciales | bcrypt + JWT |
| 02 Rendimiento catálogo | índices Prisma + listados |
| 03 Disponibilidad web+móvil | React + Expo |
| 04 Escalabilidad sucursales | modelo multi-sucursal |
| 05 Usabilidad | UI por rol |
| 06 Mantenibilidad | módulos Nest |
| 07 API REST | Nest (equiv. FastAPI del PDF) |
| 08 App móvil | React Native/Expo (equiv. Flutter) |
| 09 Pagos académicos | sandbox QR aprobar/rechazar |

**Deploy nube:** artefactos en `.azure/` + `azure.yaml`; provisionar con `azd up` cuando haya login Azure.

## Seed demo

`npx prisma db seed` — usuarios `*@ensayar.bo` / `diego` (admin, cajero, encargado, proveedor, clienta).
