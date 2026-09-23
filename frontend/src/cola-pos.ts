export type VentaCola = {
  uuid: string
  canal: 'pos'
  medioPago: 'efectivo' | 'qr' | 'tarjeta' | 'transferencia' | 'mixto'
  almacenId: string
  cajaTurnoId: string
  lineas: { varianteId: string; cantidad: number }[]
  deviceId?: string
  estado?: 'draft' | 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict' | 'cancelled'
  ultimoError?: string
}

const CLAVE = 'ensayar_cola_pos'
const DEVICE_KEY = 'ensayar_device_id'
const DB_NAME = 'ensayar-pos-offline'
const STORE = 'operaciones'
const CATALOGO_KEY = 'ensayar_catalogo_offline'
const INVENTARIO_KEY = 'ensayar_inventario_offline'

export function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
  return id
}

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'uuid' }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}

async function saveLocal(item: VentaCola) { try { const database = await db(); const tx = database.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(item); } catch { /* localStorage remains fallback */ } }

export async function hidratarCola() { try { const database = await db(); return await new Promise<VentaCola[]>((resolve, reject) => { const request = database.transaction(STORE).objectStore(STORE).getAll(); request.onsuccess = () => resolve(request.result as VentaCola[]); request.onerror = () => reject(request.error) }) } catch { return leerCola() } }

export function leerCola(): VentaCola[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as VentaCola[]
  } catch {
    return []
  }
}

export function encolar(venta: VentaCola) {
  const cola = leerCola()
  const item = { ...venta, deviceId: venta.deviceId ?? deviceId(), estado: 'pending' as const }
  if (!cola.some(existing => existing.uuid === item.uuid)) cola.push(item)
  localStorage.setItem(CLAVE, JSON.stringify(cola))
  void saveLocal(item)
}

export function sacarDeCola(uuid: string) {
  localStorage.setItem(
    CLAVE,
    JSON.stringify(leerCola().filter((v) => v.uuid !== uuid)),
  )
  void db().then(database => { const tx = database.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(uuid) }).catch(() => undefined)
}

export function marcarFallo(uuid: string, error: string) {
  const cola = leerCola().map(item => item.uuid === uuid ? { ...item, estado: 'failed' as const, ultimoError: error } : item)
  localStorage.setItem(CLAVE, JSON.stringify(cola)); const item = cola.find(value => value.uuid === uuid); if (item) void saveLocal(item)
}

export function marcarEstado(uuid: string, estado: NonNullable<VentaCola['estado']>, error = '') {
  const cola = leerCola().map(item => item.uuid === uuid ? { ...item, estado, ultimoError: error } : item)
  localStorage.setItem(CLAVE, JSON.stringify(cola)); const item = cola.find(value => value.uuid === uuid); if (item) void saveLocal(item)
}

export function guardarCatalogoOffline<T>(items: T[]) { localStorage.setItem(CATALOGO_KEY, JSON.stringify(items)) }
export function leerCatalogoOffline<T>(): T[] { try { return JSON.parse(localStorage.getItem(CATALOGO_KEY) ?? '[]') as T[] } catch { return [] } }
export function guardarInventarioOffline(items: Record<string, number>) { localStorage.setItem(INVENTARIO_KEY, JSON.stringify(items)) }
export function leerInventarioOffline(): Record<string, number> { try { return JSON.parse(localStorage.getItem(INVENTARIO_KEY) ?? '{}') as Record<string, number> } catch { return {} } }
