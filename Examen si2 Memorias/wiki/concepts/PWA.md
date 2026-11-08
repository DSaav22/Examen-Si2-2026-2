---
tipo: concept
fuentes: 2
actualizado: 2026-11-08
tags: [pwa, offline, web, segundo-parcial]
---

# PWA (Progressive Web App)

En el primer parcial el audio la nombró como opción para el offline, y el canon no la obligaba. [[transcripcion-audio-clase-ecommerce]]

En el segundo parcial es **obligatoria** para la web: "estamos hablando de que esto debe ser PWA". [[transcripcion-audio-segundo-parcial]]

## Qué hay que aprovechar

- **Offline:** service worker con caché de la aplicación y de datos, más almacenamiento local (IndexedDB) y cola de operaciones.
- **Instalable:** manifiesto para que aparezca como app en el celular, útil para quien no quiere instalar la app móvil.
- **Notificaciones push:** Web Push con claves VAPID, aun con la página cerrada.
- Sincronización en segundo plano cuando vuelve la red (Background Sync donde el navegador lo soporte; reintento al abrir en los demás).

## Estado en el código (8 nov, hecho)

**Service worker `sw.js` (v2):**

- La interfaz se sirve desde caché: recargar sin red abre el POS con el turno, el catálogo, las fotos y el stock guardados.
- Las lecturas de la API en una lista blanca (tienda, catálogo, sucursales, turno, política) van primero a la red, con 4 s de espera, y caen a la copia si falla.
- La clave de caché incluye la tienda y un hash del token, para no mezclar datos entre tiendas ni usuarios.
- La disponibilidad de stock se excluye a propósito: el POS la descuenta localmente al vender sin red.

**Instalable:** el manifiesto tiene `id` y atajos a POS, Catálogo y Sincronización. El botón "Instalar app" usa `beforeinstallprompt`.

**Web Push:** claves VAPID en el backend y suscripción por usuario y tienda (`PushSuscripcion`). Toda notificación interna también sale como push, y las suscripciones vencidas (404/410) se borran. En la interfaz está el botón "Activar notificaciones".

La sincronización en segundo plano se hace con reintento al abrir la app, al recuperar la red y cada 30 s. Background Sync no está en todos los navegadores.

Detalle de cola, conflictos e idempotencia en [[Modo offline]].

## Relacionado

[[Modo offline]] · [[React]] · [[Mapa del segundo parcial]]
