import { tiendaActiva } from '../tienda'
import { uuid } from './red'

export type TipoOp = 'venta' | 'cliente' | 'producto'
export type EstadoOp = 'pendiente' | 'conflicto' | 'rechazada' | 'vencida'

export type ErrorOp = { codigo?: string; mensaje?: string; detalle?: Record<string, unknown> }

/** Operación hecha sin red, guardada en IndexedDB hasta que el servidor la confirme. */
export type OperacionOffline = {
  /** UUID del dispositivo: clave de idempotencia en el servidor. */
  id: string
  tipo: TipoOp
  creadaEn: string
  datos: Record<string, unknown>
  tienda: string
  resumen: string
  estado: EstadoOp
  error?: ErrorOp
}

const DB = 'ensayar-offline'
const STORE = 'operaciones'
const COLA_VIEJA = 'ensayar_cola_pos'

let conexion: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  conexion ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('tienda', 'tienda')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      conexion = null
      reject(req.error)
    }
  })
  return conexion
}

async function enStore<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, modo)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onabort = () => reject(tx.error ?? new Error('La transacción de la cola fue cancelada.'))
    tx.onerror = () => reject(tx.error ?? req.error)
  })
}

const eventos = new EventTarget()

function avisar() {
  eventos.dispatchEvent(new Event('cambio'))
}

if (typeof window !== 'undefined') {
  window.addEventListener('ensayar:tienda_cambiada', () => avisar())
}

export function alCambiarCola(fn: () => void) {
  eventos.addEventListener('cambio', fn)
  return () => eventos.removeEventListener('cambio', fn)
}

export async function listarOps(tienda = tiendaActiva()): Promise<OperacionOffline[]> {
  const ops = await enStore<OperacionOffline[]>('readonly', s => s.index('tienda').getAll(tienda))
  return ops.sort((a, b) => a.creadaEn.localeCompare(b.creadaEn))
}

export async function guardarOp(op: OperacionOffline) {
  await enStore('readwrite', s => s.put(op))
  avisar()
}

export async function quitarOp(id: string) {
  await enStore('readwrite', s => s.delete(id))
  avisar()
}

export async function encolar(
  tipo: TipoOp,
  datos: Record<string, unknown>,
  resumen: string,
  opts: { id?: string; creadaEn?: string } = {},
) {
  const op: OperacionOffline = {
    id: opts.id ?? uuid(),
    tipo,
    creadaEn: opts.creadaEn ?? new Date().toISOString(),
    datos,
    tienda: tiendaActiva(),
    resumen,
    estado: 'pendiente',
  }
  await guardarOp(op)
  return op
}

/**
 * Vuelve a intentar una operación en conflicto con un id nuevo (el viejo ya tiene una
 * respuesta definitiva en el servidor). Conserva la fecha original de la operación.
 */
export async function reintentar(op: OperacionOffline, cambios: Record<string, unknown> = {}) {
  const nuevo: OperacionOffline = { ...op, id: uuid(), datos: { ...op.datos, ...cambios }, estado: 'pendiente', error: undefined }
  const db = await abrir()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const actual = store.get(op.id)
    actual.onsuccess = () => {
      const guardada = actual.result as OperacionOffline | undefined
      if (!guardada || guardada.tienda !== op.tienda || guardada.estado === 'pendiente') { tx.abort(); return }
      store.add(nuevo)
      store.delete(op.id)
    }
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo reintentar la operación; se conservó la original.'))
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo reintentar la operación.'))
  })
  avisar()
  return nuevo
}

/** Confirma una operación y actualiza sus ventas dependientes en una sola transacción. */
export async function confirmarOp(op: OperacionOffline, clienteDefinitivo?: string) {
  const db = await abrir()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    if (op.tipo === 'cliente' && clienteDefinitivo && clienteDefinitivo !== op.datos.id) {
      const cursor = store.index('tienda').openCursor(IDBKeyRange.only(op.tienda))
      cursor.onsuccess = () => {
        const fila = cursor.result
        if (!fila) return
        const otra = fila.value as OperacionOffline
        if (otra.tipo === 'venta' && otra.estado === 'pendiente' && otra.datos.clientaId === op.datos.id) {
          fila.update({ ...otra, datos: { ...otra.datos, clientaId: clienteDefinitivo } })
        }
        fila.continue()
      }
    }
    try { store.delete(op.id) } catch (error) { tx.abort(); reject(error); return }
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo confirmar la operación.'))
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo confirmar la operación.'))
  })
  avisar()
}

/** Pasa a la cola nueva las ventas guardadas por la versión anterior del POS. */
export async function migrarColaVieja() {
  const raw = localStorage.getItem(COLA_VIEJA)
  if (!raw) return
  const viejas = JSON.parse(raw) as {
      uuid: string
      almacenId: string
      cajaTurnoId: string
      clientaId?: string
      lineas: { varianteId: string; cantidad: number }[]
    }[]
  if (!Array.isArray(viejas) || viejas.some(v => !v || typeof v.uuid !== 'string' || !v.uuid || !Array.isArray(v.lineas))) {
    throw new Error('La cola anterior tiene datos inválidos y se conservó para su recuperación.')
  }
  const tienda = tiendaActiva()
  const ops: OperacionOffline[] = viejas.map(v => ({
    id: v.uuid, tipo: 'venta', creadaEn: new Date().toISOString(), tienda, estado: 'pendiente',
    datos: {
          almacenId: v.almacenId,
          cajaTurnoId: v.cajaTurnoId,
          clientaId: v.clientaId,
          medioPago: 'efectivo',
          lineas: v.lineas,
    }, resumen: `Venta · ${v.lineas.length} línea(s)`,
  }))
  const db = await abrir()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const op of ops) {
      const req = store.get(op.id)
      req.onsuccess = () => {
        const existente = req.result as OperacionOffline | undefined
        if (!existente) store.add(op)
        else if (existente.tipo !== op.tipo || existente.tienda !== op.tienda || JSON.stringify(existente.datos) !== JSON.stringify(op.datos)) tx.abort()
      }
    }
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('La cola anterior se conservó: hay operaciones incompatibles.'))
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo migrar la cola anterior.'))
  })
  if (localStorage.getItem(COLA_VIEJA) === raw) localStorage.removeItem(COLA_VIEJA)
  avisar()
}
