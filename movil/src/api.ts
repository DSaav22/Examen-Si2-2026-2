import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_POR_DEFECTO } from './theme'

const CLAVE_API = 'ensayar_api'
let base = API_POR_DEFECTO

export function apiBase() {
  return base
}

export async function cargarApiBase() {
  const saved = await AsyncStorage.getItem(CLAVE_API)
  if (saved) base = saved.replace(/\/$/, '')
  return base
}

export async function guardarApiBase(url: string) {
  base = url.trim().replace(/\/$/, '')
  await AsyncStorage.setItem(CLAVE_API, base)
  return base
}

export function assetUrl(path: string) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

function mensajeError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const b = body as Record<string, unknown>
  if (typeof b.codigo === 'string') return b.codigo
  if (b.message && typeof b.message === 'object') {
    const m = b.message as Record<string, unknown>
    if (typeof m.codigo === 'string') return m.codigo
  }
  if (typeof b.message === 'string') return b.message
  if (Array.isArray(b.message)) return b.message.map(String).join(', ')
  return fallback
}

export async function api<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(`${base}${path}`, { ...init, headers })
  } catch {
    throw new Error(`No se alcanza la API en ${base}. Revisa que el backend esté encendido y que el teléfono esté en el mismo Wi-Fi.`)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : undefined
  if (!res.ok) throw new Error(mensajeError(body, res.statusText))
  return body as T
}
