/** Tienda activa del SaaS (slug). Viaja en la cabecera X-Tienda de cada petición. */
const CLAVE = 'ensayar_tienda'
const POR_DEFECTO = import.meta.env.VITE_TIENDA || 'vesta'

/** Datos locales que pertenecen a una tienda: se descartan al cambiar de tienda. */
const DATOS_DE_TIENDA = [
  'ensayar_carrito',
  'ensayar_favoritos',
  'ensayar_vistos',
  'ensayar_catalogo_offline',
  'ensayar_inventario_offline',
  'ensayar_sucursal',
]

export type TiendaSesion = { id: string; slug: string; nombre: string; plan: string | null }

export type TiendaDeCuenta = {
  tiendaId: string
  slug: string
  nombre: string
  rol: string
  vigente: boolean
  plan: string | null
  esDueno: boolean
}

export function tiendaActiva(): string {
  return localStorage.getItem(CLAVE) || POR_DEFECTO
}

export function fijarTienda(slug: string) {
  if (slug === tiendaActiva()) return
  for (const k of DATOS_DE_TIENDA) localStorage.removeItem(k)
  localStorage.setItem(CLAVE, slug)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ensayar:tienda_cambiada', { detail: slug }))
  }
}
