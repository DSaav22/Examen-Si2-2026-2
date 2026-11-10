import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const colors = {
  ink: '#111111',
  paper: '#f5f2ec',
  surface: '#ffffff',
  wine: '#6c2535',
  wineDeep: '#4e141c',
  gold: '#c4a574',
  taupe: '#756d65',
  line: '#ddd7ce',
  ok: '#2f6b4f',
  error: '#a52f43',
  dark: '#101010',
  white: '#ffffff',
}

/**
 * IP LAN del packager Expo → Nest en :3000.
 * Emulador Android sin host LAN: 10.0.2.2 apunta al host.
 */
export function apiPorDefecto(): string {
  // En una APK instalada no existe `hostUri` de Expo. EXPO_PUBLIC_API_URL se
  // inyecta al compilar y debe apuntar al mismo NestJS/PostgreSQL que usa web.
  // No guardar credenciales aquí: el login obtiene su JWT desde ese backend.
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '')
  if (configured) return configured
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl ??
    (Constants as { linkingUri?: string }).linkingUri
  if (typeof hostUri === 'string' && hostUri.length) {
    const host = hostUri
      .replace(/^[a-z]+:\/\//i, '')
      .split('/')[0]
      ?.split(':')[0]
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`
    }
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000'
  }
  return 'http://localhost:3000'
}

/** @deprecated usar apiPorDefecto() — se mantiene por compatibilidad */
export const API_POR_DEFECTO = apiPorDefecto()
