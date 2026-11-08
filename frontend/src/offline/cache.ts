import { tiendaActiva } from '../tienda'
import { esFalloRed } from './red'

const PREFIJO = 'ensayar_cache'

const clave = (nombre: string) => `${PREFIJO}:${tiendaActiva()}:${nombre}`

export function guardarCache<T>(nombre: string, valor: T) {
  try {
    localStorage.setItem(clave(nombre), JSON.stringify({ valor, en: Date.now() }))
  } catch {
    /* almacenamiento lleno: se sigue sin copia local */
  }
}

export function leerCache<T>(nombre: string): T | null {
  try {
    const raw = localStorage.getItem(clave(nombre))
    return raw ? (JSON.parse(raw) as { valor: T }).valor : null
  } catch {
    return null
  }
}

export function borrarCache(nombre: string) {
  localStorage.removeItem(clave(nombre))
}

/** Pide al servidor y guarda la copia; sin red devuelve la última copia guardada. */
export async function conCache<T>(nombre: string, pedir: () => Promise<T>): Promise<{ datos: T; deCache: boolean }> {
  try {
    const datos = await pedir()
    guardarCache(nombre, datos)
    return { datos, deCache: false }
  } catch (err) {
    const copia = esFalloRed(err) ? leerCache<T>(nombre) : null
    if (copia === null) throw err
    return { datos: copia, deCache: true }
  }
}
