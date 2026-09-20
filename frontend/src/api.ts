const API = import.meta.env.VITE_API_URL || '/api'

function token(): string | null {
  return localStorage.getItem('ensayar_token')
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
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.codigo ?? body.message ?? res.statusText)
    ;(err as Error & { status: number }).status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return null as T
  return JSON.parse(text) as T
}
