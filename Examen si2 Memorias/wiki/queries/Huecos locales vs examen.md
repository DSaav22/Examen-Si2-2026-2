---
tipo: query
fuentes: 7
actualizado: 2026-09-22
tags: [examen, huecos, garzon, rf]
---

# ¿Qué falta frente a Garzón RF/RNF?

Canon dominio: PDF Garzón RF01–RF25 + RNF. Stack: Nest/React/RN ([[stack-metodologia-parcial]]). Madurez código: [[Estado del codigo]] (22 sep) — la matriz del 19 sep era optimista en RF13/25.

## Matriz RF01–RF25 (revisada 22 sep)

| RF | Estado | Nota |
|----|--------|------|
| 01 Registro clienta | OK | `POST /auth/registro` |
| 02 Usuarios/roles | OK | varios roles; SUPERADMIN/RRHH débiles |
| 03 Multi ciudad/sucursal | OK | SC + LP seed |
| 04–05 Productos / talla-color-temp | OK | catálogo + meta |
| 06 Proveedores | OK | portal básico |
| 07 Catálogo web+móvil | OK / móvil parcial | Expo prototipo |
| 08 Disp. por sucursal | OK | stock por almacén |
| 09–12 Reservas | OK | módulo + encargado |
| 13 Vestidor móvil | **prototipo** | no vender como cerrado |
| 14–16 Carrito / compra web+móvil | OK / móvil parcial | sin pedido/envío completo |
| 17–18 Venta/pago caja | OK | POS + caja |
| 19 Pasarela digital | OK académico | `PagoSimulado` |
| 20–22 Stock / movimientos | OK | TX + kardex; sin transferencias |
| 23 Temporadas/colecciones | OK | |
| 24 Reportes | OK | día + inventario + generativo por reglas |
| 25 IA | **académico / sin LLM** | ficha determinística; no chatbot |

## RNF01–09

Sin cambio sustancial: bcrypt+JWT, Nest REST, Expo, pagos sandbox. **Deploy nube:** Bicep/`azure.yaml` preparados; no confirmado en prod. [[contexto-completo-proyecto]]

## Seed demo

`npx prisma db seed` — `*@ensayar.bo` / `diego`.
