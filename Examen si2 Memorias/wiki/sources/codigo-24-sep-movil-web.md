---
tipo: source
fuentes: 0
actualizado: 2026-09-25
tags: [codigo, sesion, movil, web, probador]
---

# Código 24–25 sep (móvil + web + probador)

Observación del working tree tras la sesión de paridad móvil Vesta, arreglo del probador sin cámara y scroll web. No hay archivo en `raw/`: la fuente es el repo (`movil/`, `frontend/`, `backend/`). Canon de *qué hay hoy*: [[Estado del codigo]].

## Qué se hizo

### Móvil (`movil/`, Expo web en `:8081`)

- Paridad visual y de pantallas con el storefront Vesta web: inicio, catálogo, ficha, bolsa, cuenta, asistente, menú lateral (drawer) y bottom nav.
- API y sesión alineadas al Nest en `:3000` (`apiBase` → localhost / host Expo / `10.0.2.2` en emulador).
- Probador: además de cámara, **SUBIR FOTO** (`expo-image-picker`) y **SILUETA DEMO** para PCs/web sin cámara.
- HUD del probador: panel oscuro fijo abajo (contraste legible sobre fotos claras); botón light con texto oscuro (antes blanco-sobre-blanco).
- Plugin `expo-image-picker` en `app.json`.

### Web storefront (`frontend/`)

- Scroll adecuado a desktop: se quitó el full-bleed con `100vw` / `calc(50% - 50vw)` que generaba overflow horizontal (franja a la derecha junto a la scrollbar en Windows).
- `scrollbar-gutter: stable`, `overflow-x: clip`, scrollbar fina; scroll nativo del documento.

### Backend (`backend/`)

- `tsconfig.json`: se eliminó `ignoreDeprecations: "6.0"` (inválido en TypeScript 5.9). Sin eso `nest start --watch` no compilaba.

## Cómo levantarlo en local

| Servicio | Comando | URL |
|----------|---------|-----|
| API | `npm run start:dev` en `backend/` | http://localhost:3000 |
| Web | `npm run dev` en `frontend/` | http://localhost:5173 |
| Móvil web | `npx expo start --web --port 8081` en `movil/` | http://localhost:8081 |

El móvil en **web** evita emulador y ahorra recursos. Expo no debe correr con `CI=1` si se quiere hot reload.

## Qué sigue sin cerrar (heredado del 23)

- Commit / deploy del corte a Azure.
- Móvil: bot, 3D CSS, mayorista, historial con seguimiento, devolución (aún no).
- Generación Flux try-on depende de cuota Azure AI (`POST /ia/probar`).

Ver [[Estado del codigo]] · [[UC03 Probador]] · [[React Native]]
