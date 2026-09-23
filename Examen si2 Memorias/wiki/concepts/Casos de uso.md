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

El informe y el código local (23 sep, tarde) coinciden en UC01–UC35. El sitio de Azure publicado es un corte anterior. Detalle: [[Estado del codigo]]. Fuente: [[codigo-23-sep]].

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
| UC10 | Pedir reporte | Admin, Encargado | Sí. El modelo propone el SQL; `validarSelect` lo acota |
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
| UC22 | Aplicar cupón | Clienta, cajero | cupón en la venta; `VESTA10` con tope de usos |
| UC23 | Gestionar usuarios | Admin | `/usuarios` |
| UC24 | Sucursales, temporadas y colecciones | Admin | módulo `meta` |
| UC25 | Ajustar inventario y ver kardex | Encargado, Admin | `POST /inventario/ajuste`, movimientos |
| UC26 | Moderar opiniones y ver auditoría | Admin | módulo `admin` |
| UC27 | Simular un pago | Cajero, clienta | Efectivo, QR, tarjeta o transferencia en modo prueba (Stripe de prueba) |

## En el producto (UC28–UC35)

En local, el 23 sep por la tarde, estos casos ya tienen código. No están en el Azure publicado ni en el móvil, salvo el probador 2D de Expo.

| ID | Nombre | En código local |
|----|--------|-----------------|
| UC28 | Probador 3D | Sí en web. Volumen CSS si hay `urlModelo`; si no, 2D. El móvil sigue solo en 2D |
| UC29 | Bot de la tienda | Sí. `POST /ia/bot`, solo CLIENTA. No está en Expo |
| UC30 | Precio mayorista | Sí. Lo cobra el servidor. La ficha y el admin lo editan. El móvil no lo muestra |
| UC31 | Transferir stock | Sí. Encargado o admin, una transacción |
| UC32 | Despachar pedido | Sí. `/despacho` y seguimiento en el historial web |
| UC33 | Devolver una venta | Sí. Historial de la clienta y POS. Repone stock y reembolsa el pago simulado si estaba aprobado |
| UC34 | Comprobante simulado | Sí. NIT `990000000` |
| UC35 | PWA | Sí. Manifest y service worker de la web |

El diagrama UML (UC01–UC35) se dibuja en Enterprise Architect. Sigue fuera el CMS ajeno y el stack que no es el del parcial (Flutter, Angular, FastAPI, Spring).
