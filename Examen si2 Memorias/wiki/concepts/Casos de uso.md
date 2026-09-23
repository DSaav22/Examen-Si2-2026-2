---
tipo: concept
fuentes: 7
actualizado: 2026-09-23
tags: [puds, inicio, codigo]
---

# Casos de uso

Texto breve: `docs/parcial/02-puds/01-fase-inicio.md` §3.5.  
**Detalle en ficha (formato Tatiana: propósito, flujo, excepción y espacio de diagrama):** `docs/parcial/02-puds/casos-de-uso-detalle.md`.  
Módulos: `docs/parcial/02-puds/modulos.md`. Análisis y diseño: `docs/parcial/02-puds/analisis-diseno.md`.

El informe los da por implementados. La puesta al día del código de UC28–UC35 queda para un paso posterior.

**Críticos:** [[UC03 Probador]], [[UC07 Venta POS]], [[UC10 Reporte generativo]]. UC05 reutiliza el cobro de UC07. UC27 es la simulación de pago (Stripe en modo prueba). UC28 es el modo 3D del probador. UC29 es el bot.

## Ya estaban en el informe (UC01–UC13)

| ID | Nombre | Actor | En código |
|----|--------|-------|-----------|
| UC01 | Consultar catálogo | Clienta, Admin | Sí |
| UC02 | Ver ficha y variantes | Clienta | Sí |
| UC03 | Probador virtual | Clienta | 2D y, con modelo cargado, 3D (UC28) |
| UC04 | Consultar la ficha | Clienta | Respuesta con datos de la prenda |
| UC05 | Comprar en línea | Clienta | Sí, `POST /ventas` |
| UC06 | Abrir caja | Cajero | Sí |
| UC07 | Venta POS | Cajero | Sí |
| UC08 | Cerrar caja | Cajero | Sí |
| UC09 | Administrar catálogo | Admin | Sí |
| UC10 | Pedir reporte | Admin, Encargado | Sí, reglas + SQL acotado |
| UC11 | Reservar prenda | Clienta | Sí |
| UC12 | Atender reservas | Encargado | Sí |
| UC13 | Ingresar mercadería | Proveedor | Sí |

## Están en el código y no estaban en la lista

| ID | Nombre | Actor | Dónde |
|----|--------|-------|--------|
| UC14 | Registrarse | Clienta | `POST /auth/registro` |
| UC15 | Iniciar y cerrar sesión | Todos | `POST /auth/login`, `logout` |
| UC16 | Cambiar clave | Usuario con sesión | `POST /auth/cambiar-clave` |
| UC17 | Gestionar favoritos | Clienta | `/cliente/favoritos` |
| UC18 | Perfil y direcciones | Clienta | `/cliente/perfil`, `/cliente/direcciones` |
| UC19 | Ver historial de compras | Clienta, caja, encargado | `GET /ventas/historial` |
| UC20 | Opinar un producto | Clienta | opiniones en catálogo |
| UC21 | Pedir alerta de producto | Clienta | `POST .../alertas` |
| UC22 | Aplicar cupón | Clienta, cajero | cupón en la venta; tope de usos a revisar |
| UC23 | Gestionar usuarios | Admin | `/usuarios` |
| UC24 | Sucursales, temporadas y colecciones | Admin | módulo `meta` |
| UC25 | Ajustar inventario y ver kardex | Encargado, Admin | `POST /inventario/ajuste`, movimientos |
| UC26 | Moderar opiniones y ver auditoría | Admin | módulo `admin` |
| UC27 | Simular un pago | Cajero, clienta | Efectivo, QR, tarjeta o transferencia en modo prueba (Stripe de prueba) |

## En el producto (UC28–UC35)

El informe los describe como implementados. El código se alinea después.

| ID | Nombre | Comportamiento en el informe |
|----|--------|------------------------------|
| UC28 | Probador 3D | Volumen y caída de tela si hay modelo; si el equipo no alcanza, queda el 2D |
| UC29 | Bot de la tienda | Responde con catálogo, stock y pedidos de esa clienta |
| UC30 | Precio mayorista | Precio distinto si la cuenta es mayorista y se llega al mínimo |
| UC31 | Transferir stock | Sale de un almacén y entra en otro, misma transacción |
| UC32 | Despachar pedido | Venta en línea pasa a enviada, con seguimiento simulado |
| UC33 | Devolver una venta | Repone stock y revierte el pago simulado |
| UC34 | Comprobante simulado | Ticket con NIT de prueba; no va a un servicio tributario |
| UC35 | PWA | Tienda instalable; sin red, la caja usa la cola |

El diagrama UML (UC01–UC35) se dibuja en Enterprise Architect. Sigue fuera el CMS ajeno y el stack que no es el del parcial (Flutter, Angular, FastAPI, Spring).
