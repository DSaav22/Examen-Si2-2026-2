import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import * as Crypto from 'expo-crypto'
import { useEffect, useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import { api, esFalloRed, tiendaActiva, type ApiError } from '../api'
import { guardarOp, listarOps, motor, quitarOp } from './almacen'
import type { OperacionLocal, ResultadoServidor, TipoOp } from './tipos'

export { motor }

const TAMANO_LOTE = 50
const INTERVALO_MS = 30_000

export const uuid = () => Crypto.randomUUID()

let idDispositivo: string | null = null

async function dispositivoId() {
  if (idDispositivo) return idDispositivo
  idDispositivo = (await AsyncStorage.getItem('ensayar_device_id')) ?? uuid()
  await AsyncStorage.setItem('ensayar_device_id', idDispositivo)
  return idDispositivo
}

type EstadoSync = {
  online: boolean
  sincronizando: boolean
  ops: OperacionLocal[]
  ultimaSync: string | null
  ultimoError: string
}

let estado: EstadoSync = { online: true, sincronizando: false, ops: [], ultimaSync: null, ultimoError: '' }
const subs = new Set<() => void>()
const oyentes = new Set<(r: ResultadoServidor[]) => void>()

function fijar(parcial: Partial<EstadoSync>) {
  estado = { ...estado, ...parcial }
  subs.forEach(fn => fn())
}

export function useSync() {
  return useSyncExternalStore(
    fn => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => estado,
  )
}

/** Avisa con los resultados de cada sincronización que aplicó algo. */
export function alSincronizar(fn: (r: ResultadoServidor[]) => void) {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

let cuentaActiva: string | undefined

export function fijarCuentaActiva(cuentaId?: string) {
  cuentaActiva = cuentaId
}

export async function refrescar(cuentaId = cuentaActiva) {
  fijar({ ops: await listarOps(tiendaActiva(), cuentaId) })
}

export async function encolar(
  tipo: TipoOp,
  datos: Record<string, unknown>,
  resumen: string,
  opts: { id?: string; creadaEn?: string; cuentaId?: string } = {},
) {
  const cuentaId = opts.cuentaId ?? cuentaActiva
  const op: OperacionLocal = {
    id: opts.id ?? uuid(),
    tienda: tiendaActiva(),
    cuentaId,
    tipo,
    creadaEn: opts.creadaEn ?? new Date().toISOString(),
    datos,
    resumen,
    estado: 'pendiente',
  }
  await guardarOp(op)
  await refrescar(cuentaId)
  return op
}

export async function descartar(id: string) {
  await quitarOp(id)
  await refrescar()
}

/** Reenvía con otro UUID (el anterior ya quedó registrado como rechazado) y conserva la fecha original. */
export async function reintentar(op: OperacionLocal, cambios: Record<string, unknown>) {
  await quitarOp(op.id)
  return encolar(op.tipo, { ...op.datos, ...cambios }, op.resumen, { creadaEn: op.creadaEn, cuentaId: op.cuentaId })
}

type Linea = { varianteId: string; cantidad: number }

/** Cambios para reintentar según el motivo del rechazo; null si no tiene sentido reintentar. */
export function cambiosReintento(op: OperacionLocal, turnoId?: string): Record<string, unknown> | null {
  const codigo = op.error?.codigo ?? ''
  if (op.tipo === 'venta' && codigo === 'STOCK_INSUFICIENTE') {
    const varianteId = op.error?.detalle?.varianteId
    const disponible = Number(op.error?.detalle?.disponible ?? 0)
    const lineas = (op.datos.lineas as Linea[])
      .map(l => (l.varianteId === varianteId ? { ...l, cantidad: Math.min(l.cantidad, disponible) } : l))
      .filter(l => l.cantidad > 0)
    return lineas.length ? { lineas } : null
  }
  if (op.tipo === 'venta' && (codigo.startsWith('TURNO') || codigo === 'ALMACEN_FUERA_TURNO')) {
    return turnoId ? { cajaTurnoId: turnoId } : null
  }
  if (codigo === 'PAGO_REQUIERE_RED' || codigo === 'PERMISO_DENEGADO' || codigo === 'DATOS_INVALIDOS') return null
  return {}
}

export function textoReintento(op: OperacionLocal) {
  const codigo = op.error?.codigo ?? ''
  if (codigo === 'STOCK_INSUFICIENTE') return 'VENDER LO DISPONIBLE'
  if (codigo.startsWith('TURNO')) return 'PASAR A MI TURNO'
  return 'REINTENTAR'
}

async function aplicar(op: OperacionLocal, r: ResultadoServidor, cola: OperacionLocal[]) {
  if (r.estado === 'aplicada' || r.estado === 'repetida' || r.estado === 'fusionada') {
    await quitarOp(op.id)
    if (op.tipo === 'cliente' && r.recursoId && r.recursoId !== op.datos.id) {
      for (const otra of cola) {
        if (otra.tipo === 'venta' && otra.datos.clientaId === op.datos.id) {
          otra.datos = { ...otra.datos, clientaId: r.recursoId }
          await guardarOp(otra)
        }
      }
    }
    return
  }
  if (r.estado === 'conflicto' || r.estado === 'rechazada' || r.estado === 'vencida') {
    await guardarOp({ ...op, estado: r.estado, error: { codigo: r.codigo, mensaje: r.mensaje, detalle: r.detalle } })
  }
}

async function correr(token: string | null, cuentaId = cuentaActiva): Promise<ResultadoServidor[]> {
  if (!token) return []
  const cola = await listarOps(tiendaActiva(), cuentaId)
  const pendientes = cola.filter(o => o.estado === 'pendiente')
  if (!pendientes.length) {
    fijar({ ops: cola })
    return []
  }
  fijar({ sincronizando: true, ultimoError: '' })
  const todos: ResultadoServidor[] = []
  try {
    const dispositivo = await dispositivoId()
    for (let i = 0; i < pendientes.length; i += TAMANO_LOTE) {
      const tramo = pendientes.slice(i, i + TAMANO_LOTE)
      const r = await api<{ resultados: ResultadoServidor[] }>('/sync/lote', token, {
        method: 'POST',
        body: JSON.stringify({
          dispositivoId: dispositivo,
          nombreDispositivo: `App ${Platform.OS} · ${motor}`,
          operaciones: tramo.map(({ id, tipo, creadaEn, datos }) => ({ id, tipo, creadaEn, datos })),
        }),
      })
      for (const res of r.resultados) {
        const op = tramo.find(o => o.id === res.id)
        if (op) await aplicar(op, res, cola)
      }
      todos.push(...r.resultados)
    }
    fijar({ online: true, ultimaSync: new Date().toISOString() })
  } catch (err) {
    if ((err as ApiError).codigo === 'SYNC_ESQUEMAS_NO_DISPONIBLE') {
      fijar({ ultimoError: 'Sincronización en esquemas no disponible temporalmente. Tus operaciones siguen seguras en la base local.' })
    } else if (esFalloRed(err)) {
      fijar({ online: false })
    } else if ((err as ApiError).status === 401) {
      fijar({ ultimoError: 'Tu sesión venció: volvé a entrar para sincronizar.' })
    } else {
      fijar({ ultimoError: err instanceof Error ? err.message : 'No se pudo sincronizar' })
    }
  } finally {
    fijar({ sincronizando: false })
    await refrescar(cuentaId)
  }
  if (todos.length) oyentes.forEach(fn => fn(todos))
  return todos
}

let enVuelo: Promise<ResultadoServidor[]> | null = null

/** Envía la cola a /sync/lote. Llamadas simultáneas comparten el mismo envío. */
export function sincronizar(token: string | null, cuentaId = cuentaActiva) {
  enVuelo ??= correr(token, cuentaId).finally(() => {
    enVuelo = null
  })
  return enVuelo
}

/** Sigue la red con NetInfo: sincroniza al montar, al reconectar y cada 30 s mientras haya pendientes. */
export function useAutoSync(token: string | null, cuentaId?: string) {
  useEffect(() => {
    if (cuentaId) fijarCuentaActiva(cuentaId)
    void refrescar(cuentaId).then(() => sincronizar(token, cuentaId))
    const quitar = NetInfo.addEventListener(red => {
      const online = red.isConnected !== false && red.isInternetReachable !== false
      const antes = estado.online
      fijar({ online })
      if (online && !antes) void sincronizar(token, cuentaId)
    })
    const intervalo = setInterval(() => {
      if (estado.online && estado.ops.some(o => o.estado === 'pendiente')) void sincronizar(token, cuentaId)
    }, INTERVALO_MS)
    return () => {
      quitar()
      clearInterval(intervalo)
    }
  }, [token, cuentaId])
}
