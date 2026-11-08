import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiPorDefecto } from './theme'

const CLAVE_API = 'ensayar_api'
const CLAVE_TIENDA = 'ensayar_tienda'
const TIENDA_POR_DEFECTO = process.env.EXPO_PUBLIC_TIENDA || 'vesta'
let base = apiPorDefecto()
let tienda = TIENDA_POR_DEFECTO

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
  TIENDA_NO_EXISTE: 'No existe una tienda con esa dirección.',
  TIENDA_SUSPENDIDA: 'Esta tienda está suspendida.',
  SUSCRIPCION_VENCIDA: 'La suscripción de esta tienda venció. Avisale a la dueña.',
  TENANT_REQUERIDO: 'Falta indicar la tienda.',
}

export function apiBase() {
  return base
}

export async function cargarApiBase() {
  const [saved, slug] = await Promise.all([
    AsyncStorage.getItem(CLAVE_API),
    AsyncStorage.getItem(CLAVE_TIENDA),
  ])
  if (saved) base = saved.replace(/\/$/, '')
  else base = apiPorDefecto()
  tienda = slug || TIENDA_POR_DEFECTO
  return base
}

/** Slug de la tienda a la que habla la app (header X-Tienda). Con sesión, manda la tienda del token. */
export function tiendaActiva() {
  return tienda
}

export async function guardarTienda(slug: string) {
  tienda = slug.trim().toLowerCase() || TIENDA_POR_DEFECTO
  await AsyncStorage.setItem(CLAVE_TIENDA, tienda)
  return tienda
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

export type ApiError = Error & { red?: boolean; status?: number; codigo?: string }

/** Sin respuesta del backend (sin red, API caída o gateway): la operación puede guardarse y reintentarse. */
export function esFalloRed(err: unknown) {
  const e = err as ApiError
  return e?.red === true || e?.status === 502 || e?.status === 503 || e?.status === 504
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
  headers.set('X-Tienda', tienda)
  let res: Response
  try {
    res = await fetch(`${base}${path}`, { ...init, headers })
  } catch (err) {
    const abort =
      (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
      (err instanceof Error && /aborted|timeout/i.test(err.message))
    const fallo = new Error(
      abort
        ? 'La petición tardó demasiado. Probá de nuevo.'
        : `No se alcanza la API en ${base}. Revisá que el backend esté encendido y que el teléfono esté en la misma Wi‑Fi (o usá http://10.0.2.2:3000 en el emulador Android).`,
    )
    ;(fallo as Error & { red?: boolean }).red = true
    throw fallo
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

/** POST que devuelve un archivo (PDF/Excel): nombre según Content-Disposition y contenido como Blob. */
export async function apiArchivo(path: string, token: string | null, body: unknown) {
  const headers = new Headers({ 'Content-Type': 'application/json', 'X-Tienda': tienda })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const text = await res.text()
    let cuerpo: unknown
    try { cuerpo = JSON.parse(text) } catch { cuerpo = undefined }
    throw new Error(mensajeError(cuerpo, res.statusText || 'No se pudo descargar'))
  }
  const disposicion = res.headers.get('Content-Disposition') ?? ''
  const nombre = decodeURIComponent(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicion)?.[1] ?? 'reporte')
  return { nombre, tipo: res.headers.get('Content-Type') ?? 'application/octet-stream', blob: await res.blob() }
}
