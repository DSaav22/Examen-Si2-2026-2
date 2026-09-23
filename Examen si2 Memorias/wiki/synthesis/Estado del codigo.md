---
tipo: synthesis
fuentes: 2
actualizado: 2026-09-23
tags: [codigo, demo, informe]
---

# Estado del código (23 sep, tarde)

Canon de *qué hay hoy* en el working tree. La foto del 22 sep quedó vieja: decía que no había chatbot, 3D, transferencias ni deploy. Fuente de este corte: [[codigo-23-sep]].

## Frase segura para el examen

> Plataforma omnicanal: catálogo Vesta, venta web y POS, inventario por almacén con transferencia, reservas, despacho simulado y devolución. React + Expo + NestJS + Prisma + PostgreSQL. Pagos, NIT y seguimiento son de prueba. El probador es 2D y, si la variante tiene modelo, volumen en el dispositivo. El bot y el reporte generativo llaman a Azure OpenAI en local. El sitio publicado todavía no tiene este corte.

## Hecho y demoable en local

Auth y roles, catálogo de 40 prendas demo, ficha, favoritos, carrito, cupón `VESTA10` con tope, POS con caja y cola offline, stock en transacción, reservas, proveedores, admin, moderación, PWA, ticket con NIT `990000000`.

| Caso | Qué hace el código |
|------|--------------------|
| UC03 / UC28 | `/probar/:id`. 2D (cámara o toques). 3D CSS si `urlModelo` no está vacío. El blazer `VESTA-DEMO-001` ya lo trae. No cambia stock. |
| UC10 | `POST /reportes/generativo`. El modelo arma el SQL; solo pasa si `validarSelect` lo acepta. |
| UC29 | `POST /ia/bot` con JWT de CLIENTA. Stock, tallas y pedidos de esa clienta. |
| UC30 | `precioMayorista` + `minimoMayorista` + cuenta `mayorista`. El precio lo fija el servidor al cobrar. |
| UC31 | `POST /inventario/transferencias`. Mismo almacén o sin stock: no mueve. |
| UC32 | Pedido al cobrar en línea. `/despacho` marca enviado y guarda `VESTA-…`. La clienta lo ve en `/historial`. |
| UC33 | `POST /devoluciones`. Repone stock. Si el pago simulado estaba aprobado, queda `reembolsado`. |
| UC34 / UC35 | Ticket de prueba. Manifest + service worker. |

Azure ya tiene un proyecto aparte: web `ensayar-web-2xhvsljjqvilk` y API `ensayar-api-2xhvsljjqvilk` en Brazil South, PostgreSQL B1ms, plan F1. La cuenta OpenAI `ensayar-openai` y el deployment `gpt-4.1-mini` existen. Esas variables ya están en el App Service de la API.

## Qué falta

- **Publicar este corte.** El sitio de Azure no tiene el bot, el 3D, mayorista, transferencia, despacho, devolución ni las 40 prendas hasta el próximo deploy de la API y de la web. No está commiteado.
- **Móvil** (`movil/`, Expo 53, TypeScript, React Native 0.79). Sigue en login, catálogo, probador **solo 2D**, carrito, compra y reserva. No tiene bot, volumen 3D, mayorista, historial con seguimiento ni devolución. El total del carrito lo calcula el teléfono con precio de detalle.
- **Foto generada.** Cuota de imagen en 0 en las regiones que la suscripción de estudiante deja usar. No hay endpoint de imagen.
- Siguen fuera del alcance: pago bancario real, envío real, NIT ante impuestos, almacén central, RRHH completo, CI/CD y pruebas E2E.

## Cómo consultarlo

Preguntar por el estado del código, por un UC28–UC35, por el bot o por el móvil. Esta página manda sobre [[contexto-completo-proyecto]] y sobre la matriz del 22 sep en [[Huecos locales vs examen]].
