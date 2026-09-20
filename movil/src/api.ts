import Constants from 'expo-constants';

function resolverApi(): string {
  if (process.env.EXPO_PUBLIC_API) return process.env.EXPO_PUBLIC_API;
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:3000`;
  }
  return 'http://localhost:3000';
}

export const API = resolverApi();

export function assetUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}

function mensajeError(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback;
  const b = body as Record<string, unknown>;
  if (typeof b.codigo === 'string') return b.codigo;
  if (b.message && typeof b.message === 'object') {
    const m = b.message as Record<string, unknown>;
    if (typeof m.codigo === 'string') return m.codigo;
  }
  if (typeof b.message === 'string') return b.message;
  if (Array.isArray(b.message)) return b.message.map(String).join(', ');
  return fallback;
}

export async function api<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers });
  } catch {
    throw new Error(`API_NO_ALCANZABLE:${API}`);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(mensajeError(body, res.statusText));
  }
  return res.json() as Promise<T>;
}
