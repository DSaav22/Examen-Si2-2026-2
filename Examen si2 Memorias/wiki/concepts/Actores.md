---
tipo: concept
fuentes: 6
actualizado: 2026-09-22
tags: [puds, inicio]
---

# Actores

Actualizado con [[Decisiones del parcial]] (19 sep) y roles reales del código [[contexto-completo-proyecto]].

| Actor | Tipo | Quiere | Código |
|-------|------|--------|--------|
| Clienta | primario | Ver, ensayar, comprar, reservar | OK |
| Cajero | primario | Abrir, cobrar, cerrar caja | OK |
| Vendedor | primario | POS/ventas (módulo acotado) | parcial |
| Encargado | primario | Inventario/ventas/reservas de sucursal | OK |
| Administrador | primario | Catálogo, stock, reportes, usuarios | OK |
| Proveedor | primario | Productos propios + ingresos | OK |
| Superadmin / RRHH | — | Enum; sin módulo completo | no demo |
| Servicio de IA | apoyo | Ficha y SQL acotado; no toca stock | reglas |
| Pasarela simulada | apoyo | QR / contra entrega de prueba | OK |

Ver [[Casos de uso]] · [[Estado del codigo]].
