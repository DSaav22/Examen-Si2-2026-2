---
tipo: concept
fuentes: 6
actualizado: 2026-09-24
tags: [puds, inicio]
---

# Actores

Actualizado con la diferenciación **ADMIN vs SUPERADMIN** (bitácora solo superusuario) y la limpieza de VENDEDOR/RRHH.

| Actor | Tipo | Quiere | Código |
|-------|------|--------|--------|
| Clienta | primario | Ver, ensayar, comprar, reservar | OK |
| Cajero | primario | Abrir, cobrar, cerrar caja (incluye venta en piso) | OK |
| Encargado | primario | Inventario/ventas/reservas de sucursal | OK |
| Administrador | primario | Catálogo, stock, reportes, usuarios, POS; **sin bitácora** | OK |
| Superusuario | primario | Todo lo del administrador **más bitácora / auditoría** | OK |
| Proveedor | primario | Productos propios + ingresos | OK |
| Servicio de IA | apoyo | Ficha y SQL acotado; no toca stock | reglas |
| Pasarela simulada | apoyo | QR / contra entrega de prueba | OK |

**Notas**

- `VENDEDOR` y `RRHH` se eliminaron del enum: la venta en piso queda en **Cajero**; no hay módulo de personal.
- Invitada (sin cuenta) puede explorar y armar bolsa; al pagar crea/entra como Clienta.
- Solo `SUPERADMIN` crea/edita otros `SUPERADMIN` y consulta `/admin/bitacora`.

Ver [[Casos de uso]] · [[Estado del codigo]].
