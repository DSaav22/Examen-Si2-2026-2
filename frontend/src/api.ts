import { tiendaActiva } from './tienda'

const API = import.meta.env.VITE_API_URL || '/api'

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
  SUSCRIPCION_VENCIDA: 'La suscripción de esta tienda venció. La dueña debe renovarla desde la plataforma.',
  TIENDA_SUSPENDIDA: 'Esta tienda está suspendida.',
  TIENDA_NO_EXISTE: 'Esa tienda no existe.',
  SIN_ACCESO_TIENDA: 'Tu cuenta no tiene acceso a esta tienda.',
  EMAIL_NO_VERIFICADO: 'Confirmá tu correo antes de entrar.',
  VERIFICACION_INVALIDA: 'El enlace de verificación no es válido o venció.',
  SLUG_EN_USO: 'Esa dirección ya está tomada. Probá otra.',
  PLAN_NO_EXISTE: 'Ese plan no existe.',
  PLAN_INSUFICIENTE: 'Tu tienda ya usa más de lo que permite ese plan.',
  SOLO_DUENO: 'Solo la dueña de la tienda puede hacer esto.',
  SOLO_PLATAFORMA: 'Solo el equipo de la plataforma puede ver esto.',
  REFERENCIA_NO_EXISTE: 'Uno de los datos elegidos no pertenece a esta tienda.',
}

const MOTIVOS_PAGO: Record<string, string> = {
  TARJETA_RECHAZADA: 'El banco rechazó la tarjeta.',
  FONDOS_INSUFICIENTES: 'Fondos insuficientes.',
  TARJETA_VENCIDA: 'La tarjeta está vencida.',
  TARJETA_INVALIDA: 'El número de tarjeta no es válido.',
  VENCIMIENTO_INVALIDO: 'La fecha de vencimiento no es válida.',
}

export type ApiError = Error & { status: number; codigo?: string; datos?: Record<string, unknown> }

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

async function pedir<T>(path: string, init: RequestInit, token: string | null): Promise<T> {
  const headers = new Headers(init.headers)
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!headers.has('X-Tienda')) headers.set('X-Tienda', tiendaActiva())
  const res = await fetch(`${API}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const codigo = extractCodigo(body)
    const motivo = typeof body.motivo === 'string' ? MOTIVOS_PAGO[body.motivo] : undefined
    const readable = extractReadable(body)
    const mapped = codigo ? CODIGOS[codigo] : undefined
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje : ''
    const err = new Error(motivo || readable || mensaje || mapped || codigo || res.statusText) as ApiError
    err.status = res.status
    err.datos = body
    if (codigo) err.codigo = codigo
    throw err
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}

/** Peticiones de la tienda (sesión de empleado o clienta). */
export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return pedir<T>(path, init, localStorage.getItem('ensayar_token'))
}

/** POST que devuelve un archivo (PDF, Excel) y lo descarga con el nombre que manda el servidor. */
export async function descargarArchivo(path: string, body: unknown): Promise<string> {
  const headers = new Headers({ 'Content-Type': 'application/json', 'X-Tienda': tiendaActiva() })
  const token = localStorage.getItem('ensayar_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) {
    const datos = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const codigo = extractCodigo(datos)
    const err = new Error(extractReadable(datos) || (typeof datos.mensaje === 'string' ? datos.mensaje : '') || (codigo && CODIGOS[codigo]) || res.statusText) as ApiError
    err.status = res.status
    throw err
  }
  const nombre = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'reporte'
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return nombre
}

/** Peticiones de la plataforma SaaS (sesión de cuenta: dueñas y equipo EnsayAR). */
export function apiCuenta<T>(path: string, init: RequestInit = {}): Promise<T> {
  return pedir<T>(path, init, localStorage.getItem('ensayar_cuenta_token'))
}
