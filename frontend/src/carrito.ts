import type { LineaCarrito } from './types'

const CLAVE = 'ensayar_carrito'

export function leerCarrito(): LineaCarrito[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as LineaCarrito[]
  } catch {
    return []
  }
}

export function guardarCarrito(lineas: LineaCarrito[]) {
  localStorage.setItem(CLAVE, JSON.stringify(lineas))
  window.dispatchEvent(new CustomEvent('ensayar_carrito_actualizado', { detail: lineas }))
}

export function agregarAlCarrito(linea: Omit<LineaCarrito, 'cantidad'>) {
  const actual = leerCarrito()
  const i = actual.findIndex(l => l.varianteId === linea.varianteId)
  if (i >= 0) actual[i] = { ...actual[i], ...linea, cantidad: actual[i].cantidad + 1 }
  else actual.push({ ...linea, cantidad: 1 })
  guardarCarrito(actual)
  return actual
}

export function vaciarCarrito() {
  guardarCarrito([])
}

export function totalCarrito(lineas = leerCarrito()) {
  return lineas.reduce((acc, l) => acc + l.precio * l.cantidad, 0)
}
