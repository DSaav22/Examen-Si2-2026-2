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
    tx.onerror = () => reject(tx.error)
  })
}

const eventos = new EventTarget()

function avisar() {
  eventos.dispatchEvent(new Event('cambio'))
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
  await quitarOp(op.id)
  return encolar(op.tipo, { ...op.datos, ...cambios }, op.resumen, { creadaEn: op.creadaEn })
}

/** Pasa a la cola nueva las ventas guardadas por la versión anterior del POS. */
export async function migrarColaVieja() {
  const raw = localStorage.getItem(COLA_VIEJA)
  if (!raw) return
  try {
    const viejas = JSON.parse(raw) as {
      uuid: string
      almacenId: string
      cajaTurnoId: string
      clientaId?: string
      lineas: { varianteId: string; cantidad: number }[]
    }[]
    for (const v of viejas) {
      await encolar(
        'venta',
        {
          almacenId: v.almacenId,
          cajaTurnoId: v.cajaTurnoId,
          clientaId: v.clientaId,
          medioPago: 'efectivo',
          lineas: v.lineas,
        },
        `Venta · ${v.lineas.length} línea(s)`,
        { id: v.uuid },
      )
    }
  } finally {
    localStorage.removeItem(COLA_VIEJA)
  }
}
