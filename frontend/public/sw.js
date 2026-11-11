const VERSION = 'v3'
const SHELL = `ensayar-shell-${VERSION}`
const ESTATICOS = `ensayar-estaticos-${VERSION}`
const API = `ensayar-api-${VERSION}`
const VIGENTES = [SHELL, ESTATICOS, API]

/**
 * Lecturas de la API que se guardan para consultarlas sin red. El POS además
 * mantiene su propia copia de inventario para descontar localmente con cada venta.
 */
const API_LECTURA = [
  '/api/tienda',
  '/api/catalogo/productos',
  '/api/catalogo/sucursales',
  '/api/catalogo/categorias',
  '/api/catalogo/stock',
  '/api/catalogo/disponibilidad',
  '/api/sucursales',
  '/api/temporadas',
  '/api/colecciones',
  '/api/caja/turno-abierto',
  '/api/sync/politica',
  '/api/pagos/metodos',
  '/api/usuarios',
]
const ESPERA_API_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/favicon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('ensayar-') && !VIGENTES.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function huella(texto) {
  if (!texto) return 'anon'
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(bytes).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** La copia de la API depende de la tienda y de la sesión: nunca se mezclan datos de dos tiendas. */
async function claveApi(request) {
  const url = new URL(request.url)
  url.searchParams.set('__tienda', request.headers.get('X-Tienda') || '')
  url.searchParams.set('__sesion', await huella(request.headers.get('Authorization')))
  return url.toString()
}

function conTiempo(promesa, ms) {
  return Promise.race([promesa, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

/** Red primero; si no hay red (o el servidor no responde) se usa la última copia. */
async function apiRedPrimero(request) {
  const clave = await claveApi(request)
  const cache = await caches.open(API)
  try {
    const resp = await conTiempo(fetch(request), ESPERA_API_MS)
    if (resp.ok) {
      await cache.put(clave, resp.clone())
      return resp
    }
    if (resp.status >= 500) return (await cache.match(clave)) || resp
    return resp
  } catch (err) {
    const copia = await cache.match(clave)
    if (copia) return copia
    throw err
  }
}

async function estaticoCachePrimero(request) {
  const cache = await caches.open(ESTATICOS)
  const copia = await cache.match(request)
  const red = fetch(request)
    .then((resp) => {
      if (resp.ok) cache.put(request, resp.clone())
      return resp
    })
    .catch(() => undefined)
  return copia || (await red) || Response.error()
}

async function navegacion(request) {
  const cache = await caches.open(SHELL)
  try {
    const resp = await fetch(request)
    if (resp.ok) cache.put('/', resp.clone())
    return resp
  } catch {
    return (await cache.match('/')) || Response.error()
  }
}

async function redPrimero(request) {
  const cache = await caches.open(ESTATICOS)
  try {
    const resp = await fetch(request)
    if (resp.ok) cache.put(request, resp.clone())
    return resp
  } catch {
    return (await cache.match(request)) || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    if (API_LECTURA.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
      event.respondWith(apiRedPrimero(request))
    }
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(navegacion(request))
    return
  }
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.startsWith('/catalogo/') ||
    url.pathname.startsWith('/icons/') ||
    ['image', 'font'].includes(request.destination)
  ) {
    event.respondWith(estaticoCachePrimero(request))
    return
  }
  event.respondWith(redPrimero(request))
})

self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch {
    datos = { titulo: 'EnsayAR', cuerpo: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo || 'EnsayAR', {
      body: datos.cuerpo || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: datos.tipo || undefined,
      data: { enlace: datos.enlace || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.enlace || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin)
      if (abierta) return abierta.focus().then(() => abierta.navigate(destino))
      return self.clients.openWindow(destino)
    }),
  )
})
