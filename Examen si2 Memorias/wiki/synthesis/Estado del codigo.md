---
tipo: synthesis
fuentes: 3
actualizado: 2026-09-25
tags: [codigo, demo, informe, movil]
---

# Estado del código (25 sep, madrugada)

Canon de *qué hay hoy* en el working tree. El corte del 23 sep ([[codigo-23-sep]]) sigue valiendo para UC28–UC35 y bot. Este corte suma paridad móvil Vesta, probador sin cámara y scroll web: [[codigo-24-sep-movil-web]].

## Frase segura para el examen

> Plataforma omnicanal: catálogo Vesta (web + Expo), venta web y POS, inventario por almacén con transferencia, reservas, despacho simulado y devolución. React + Expo + NestJS + Prisma + PostgreSQL. Pagos, NIT y seguimiento son de prueba. El probador es 2D (cámara, foto o silueta) y, si la variante tiene modelo, volumen CSS en la web; en móvil hay vista realista por IA (`POST /ia/probar`) con foto subida o demo cuando no hay cámara. El bot y el reporte generativo llaman a Azure OpenAI en local. El sitio publicado todavía no tiene este corte.

## Hecho y demoable en local

Auth y roles, catálogo de 40 prendas demo, ficha, favoritos, carrito, cupón `VESTA10` con tope, POS con caja y cola offline, stock en transacción, reservas, proveedores, admin, moderación, PWA, ticket con NIT `990000000`.

| Caso | Qué hace el código |
|------|--------------------|
| UC03 / UC28 | Web `/probar/:id`: 2D + 3D CSS si `urlModelo`. Móvil: cámara **o** subir foto **o** silueta demo → Vista realista IA. No cambia stock. |
| UC10 | `POST /reportes/generativo`. El modelo arma el SQL; solo pasa si `validarSelect` lo acepta. |
| UC29 | `POST /ia/bot` con JWT de CLIENTA. En web sí; móvil aún sin bot integrado. |
| UC30–UC35 | Igual que [[codigo-23-sep]] (mayorista, transferencia, despacho, devolución, ticket, PWA). |

### Móvil (24–25 sep)

Expo 53 en `movil/`. Pantallas alineadas a Vesta: inicio, catálogo, ficha, bolsa, cuenta, asistente, drawer y bottom nav. Se demoable en **Expo web** (`http://localhost:8081`) sin emulador. API → Nest `:3000`.

### Web (24–25 sep)

Scroll de documento nativo; full-bleed sin `100vw` (antes desbordaba horizontalmente al lado de la scrollbar).

### Backend (24–25 sep)

`ignoreDeprecations: "6.0"` quitado del `tsconfig` (rompe tsc 5.9).

## Qué falta

- **Publicar este corte.** Azure sigue en un deploy anterior. No está todo commiteado.
- **Móvil** aún sin: bot UC29, volumen 3D, mayorista, historial con seguimiento, devolución. El total del carrito en algunos flujos lo arma el cliente.
- **Foto generada / Flux:** depende de cuota en Azure AI Services (`FLUX.2-pro`).
- Fuera de alcance: pago bancario real, envío real, NIT ante impuestos, RRHH completo, CI/CD y E2E.

## Cómo consultarlo

Estado del código, UC03/móvil, scroll web o cómo levantar los 3 servicios → esta página manda sobre [[contexto-completo-proyecto]] y sobre la matriz vieja en [[Huecos locales vs examen]]. Fuente del corte: [[codigo-24-sep-movil-web]].
