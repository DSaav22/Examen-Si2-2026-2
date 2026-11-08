import type { ApiError } from '../api'

/** ¿El error es por falta de red (o servidor inalcanzable) y no una respuesta del backend? */
export function esFalloRed(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (err instanceof TypeError) return true
  const e = err as Partial<ApiError> | undefined
  if (e && typeof e.status === 'number') {
    if ([502, 503, 504].includes(e.status)) return true
    // El proxy de desarrollo responde 500 sin cuerpo de Nest cuando el backend está caído.
    if (e.status >= 500 && !(e.datos && 'statusCode' in e.datos)) return true
    return false
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    return ['failed to fetch', 'networkerror', 'network request failed', 'load failed', 'fetch failed'].some(t =>
      m.includes(t),
    )
  }
  return false
}

/** UUID v4 también fuera de contexto seguro (PWA abierta por IP de la red local). */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function' && window.isSecureContext) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const DISPOSITIVO = 'ensayar_device_id'

export function dispositivoId() {
  let id = localStorage.getItem(DISPOSITIVO)
  if (!id) {
    id = uuid()
    localStorage.setItem(DISPOSITIVO, id)
  }
  return id
}
