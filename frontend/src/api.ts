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
}

function token(): string | null {
  return localStorage.getItem('ensayar_token')
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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (
    !headers.has('Content-Type') &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json')
  }
  const t = token()
  if (t) headers.set('Authorization', `Bearer ${t}`)
  const res = await fetch(`${API}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const codigo = extractCodigo(body)
    const readable = extractReadable(body)
    const mapped = codigo ? CODIGOS[codigo] : undefined
    const err = new Error(readable || mapped || codigo || res.statusText)
    ;(err as Error & { status: number; codigo?: string }).status = res.status
    if (codigo) (err as Error & { codigo?: string }).codigo = codigo
    throw err
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}
