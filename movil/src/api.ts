import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiPorDefecto } from './theme'

const CLAVE_API = 'ensayar_api'
let base = apiPorDefecto()

/** Mensajes legibles cuando el backend solo manda `codigo`. */
const CODIGOS: Record<string, string> = {
  SIN_TOKEN: 'Tenés que iniciar sesión.',
  TOKEN_REVOCADO: 'Tu sesión expiró. Volvé a entrar.',
  TOKEN_INVALIDO: 'Tu sesión no es válida. Volvé a entrar.',
  SESION_INVALIDA: 'Tu sesión ya no es válida. Volvé a entrar.',
  CREDENCIALES: 'Email o contraseña incorrectos.',
  PERMISO_DENEGADO: 'No tenés permiso para esto.',
  EMAIL_EN_USO: 'Ese email ya está registrado.',
  FLUX_NO_CONFIG: 'Falta configurar Azure AI para la vista realista. Usá el overlay 2D.',
  FLUX_FALLO: 'No se pudo generar la vista. Probá el overlay 2D o otra foto.',
  SIN_FOTO: 'Falta la foto para generar la vista.',
  FOTO_GRANDE: 'La foto es demasiado pesada. Probá con una más liviana.',
  VARIANTE_NO: 'No encontramos esa prenda.',
  PRODUCTO_NO_EXISTE: 'No encontramos ese producto.',
}

export function apiBase() {
  return base
}

export async function cargarApiBase() {
  const saved = await AsyncStorage.getItem(CLAVE_API)
  if (saved) base = saved.replace(/\/$/, '')
  else base = apiPorDefecto()
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

function extractCodigo(body: Record<string, unknown>): string | undefined {
  if (typeof body.codigo === 'string') return body.codigo
  const msg = body.message
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    const nested = (msg as { codigo?: unknown }).codigo
    if (typeof nested === 'string') return nested
  }
  return undefined
}

function extractReadable(body: Record<string, unknown>): string {
  const raw = body.message
  if (Array.isArray(raw)) {
    return raw
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'constraints' in item) {
          return Object.values(
            (item as { constraints: Record<string, string> }).constraints,
          ).join(', ')
        }
        return ''
      })
      .filter(Boolean)
      .join('; ')
  }
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') {
    const nested = (raw as { message?: unknown }).message
    if (typeof nested === 'string') return nested
  }
  return ''
}

function mensajeError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const b = body as Record<string, unknown>
  const codigo = extractCodigo(b)
  const readable = extractReadable(b)
  const mapped = codigo ? CODIGOS[codigo] : undefined
  return readable || mapped || codigo || fallback
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
  } catch (err) {
    const abort =
      (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
      (err instanceof Error && /aborted|timeout/i.test(err.message))
    if (abort) {
      throw new Error('La petición tardó demasiado. Probá de nuevo.')
    }
    throw new Error(
      `No se alcanza la API en ${base}. Revisá que el backend esté encendido y que el teléfono esté en la misma Wi‑Fi (o usá http://10.0.2.2:3000 en el emulador Android).`,
    )
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  // Nest puede devolver 200 sin payload (por ejemplo, cuando no existe un turno abierto).
  // Para una respuesta exitosa eso equivale a `undefined`, no a un JSON inválido.
  if (res.ok && !text.trim()) return undefined as T
  let body: unknown
  try {
    body = text ? (JSON.parse(text) as unknown) : undefined
  } catch {
    throw new Error(text.slice(0, 160) || res.statusText || 'Respuesta inválida')
  }
  if (!res.ok) {
    const err = new Error(mensajeError(body, res.statusText || 'Error'))
    if (body && typeof body === 'object') {
      const codigo = extractCodigo(body as Record<string, unknown>)
      if (codigo) (err as Error & { codigo?: string }).codigo = codigo
    }
    ;(err as Error & { status?: number }).status = res.status
    throw err
  }
  return body as T
}
