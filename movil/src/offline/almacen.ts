import AsyncStorage from '@react-native-async-storage/async-storage'
import type { OperacionLocal } from './tipos'

// Expo web no tiene SQLite nativo: Android e iOS cargan almacen.native.ts.
const CLAVE_OPS = 'ensayar_ops_offline'

export const motor = 'AsyncStorage'

async function todas(): Promise<OperacionLocal[]> {
  const raw = await AsyncStorage.getItem(CLAVE_OPS)
  return raw ? (JSON.parse(raw) as OperacionLocal[]) : []
}

export async function listarOps(tienda: string) {
  return (await todas())
    .filter(o => o.tienda === tienda)
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn))
}

export async function guardarOp(op: OperacionLocal) {
  const ops = (await todas()).filter(o => o.id !== op.id)
  await AsyncStorage.setItem(CLAVE_OPS, JSON.stringify([...ops, op]))
}

export async function quitarOp(id: string) {
  await AsyncStorage.setItem(CLAVE_OPS, JSON.stringify((await todas()).filter(o => o.id !== id)))
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(`ensayar_cache:${clave}`)
  return raw ? (JSON.parse(raw) as T) : null
}

export async function guardarCache(clave: string, valor: unknown) {
  await AsyncStorage.setItem(`ensayar_cache:${clave}`, JSON.stringify(valor))
}

export async function borrarCache(clave: string) {
  await AsyncStorage.removeItem(`ensayar_cache:${clave}`)
}
