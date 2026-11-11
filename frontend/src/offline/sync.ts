import { useSyncExternalStore } from 'react'
import { api, type ApiError } from '../api'
import { alCambiarCola, confirmarOp, guardarOp, listarOps, migrarColaVieja, type OperacionOffline } from './cola'
import { dispositivoId, esFalloRed } from './red'

export type ResultadoServidor = {
  id: string
  tipo: string
  estado: 'aplicada' | 'repetida' | 'fusionada' | 'conflicto' | 'rechazada' | 'vencida' | 'en_curso' | 'error'
  codigo?: string
  mensaje?: string
  recursoId?: string
  detalle?: Record<string, unknown>
}

export type EstadoSync = {
  online: boolean
  sincronizando: boolean
  pendientes: number
  conflictos: number
  ultimaSync: string | null
  ultimoError: string
}

const TAMANO_LOTE = 50
const INTERVALO_MS = 30_000

let estado: EstadoSync = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  sincronizando: false,
  pendientes: 0,
  conflictos: 0,
  ultimaSync: null,
  ultimoError: '',
}
const subs = new Set<() => void>()

function fijar(parcial: Partial<EstadoSync>) {
  estado = { ...estado, ...parcial }
  subs.forEach(fn => fn())
}

export function useEstadoSync() {
  return useSyncExternalStore(
    fn => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => estado,
  )
}

export async function refrescarConteo() {
  try {
    const ops = await listarOps()
    fijar({
      pendientes: ops.filter(o => o.estado === 'pendiente').length,
      conflictos: ops.filter(o => o.estado !== 'pendiente').length,
    })
  } catch {
    fijar({ ultimoError: 'No se puede leer la cola local. Revisá el almacenamiento del navegador.' })
  }
}

async function aplicar(op: OperacionOffline, r: ResultadoServidor, cola: OperacionOffline[]) {
  if (r.estado === 'aplicada' || r.estado === 'repetida' || r.estado === 'fusionada') {
    await confirmarOp(op, r.recursoId)
    // Cliente fusionado con uno existente: las ventas pendientes pasan a apuntar al id del servidor.
    if (op.tipo === 'cliente' && r.recursoId && r.recursoId !== op.datos.id) {
      for (const otra of cola) {
        if (otra.tipo === 'venta' && otra.estado === 'pendiente' && otra.datos.clientaId === op.datos.id) {
          otra.datos = { ...otra.datos, clientaId: r.recursoId }
        }
      }
    }
    return
  }
  if (r.estado === 'conflicto' || r.estado === 'rechazada' || r.estado === 'vencida') {
    await guardarOp({ ...op, estado: r.estado, error: { codigo: r.codigo, mensaje: r.mensaje, detalle: r.detalle } })
  }
  // en_curso / error: queda pendiente y se reintenta en la próxima pasada.
}

async function correr(): Promise<ResultadoServidor[]> {
  if (!localStorage.getItem('ensayar_token')) return []
  const cola = await listarOps()
  const pendientes = cola.filter(o => o.estado === 'pendiente')
  if (!pendientes.length) {
    await refrescarConteo()
    return []
  }
  fijar({ sincronizando: true, ultimoError: '' })
  const todos: ResultadoServidor[] = []
  try {
    for (let i = 0; i < pendientes.length; i += TAMANO_LOTE) {
      const tramo = pendientes.slice(i, i + TAMANO_LOTE)
      const r = await api<{ resultados: ResultadoServidor[] }>('/sync/lote', {
        method: 'POST',
        body: JSON.stringify({
          dispositivoId: dispositivoId(),
          nombreDispositivo: navigator.userAgent.slice(0, 80),
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
    if ((err as ApiError).codigo === 'SYNC_ESQUEMAS_NO_DISPONIBLE') fijar({ ultimoError: 'La sincronización por esquemas todavía no está disponible. Tus operaciones siguen guardadas en este dispositivo.' })
    else if (esFalloRed(err)) fijar({ online: false })
    else if ((err as ApiError).status === 401) fijar({ ultimoError: 'Tu sesión venció: volvé a entrar para sincronizar.' })
    else fijar({ ultimoError: err instanceof Error ? err.message : 'No se pudo sincronizar' })
  } finally {
    fijar({ sincronizando: false })
    await refrescarConteo()
  }
  if (todos.length) window.dispatchEvent(new CustomEvent('ensayar:sincronizado', { detail: todos }))
  return todos
}

let enVuelo: Promise<ResultadoServidor[]> | null = null

/** Envía la cola al servidor. Llamadas simultáneas comparten el mismo envío. */
export function sincronizar() {
  enVuelo ??= correr().finally(() => {
    enVuelo = null
  })
  return enVuelo
}

let iniciado = false

/** Sincroniza al recuperar la red, al abrir la app y cada 30 s mientras haya pendientes. */
export function iniciarAutoSync() {
  if (iniciado) return
  iniciado = true
  alCambiarCola(() => void refrescarConteo())
  window.addEventListener('online', () => {
    fijar({ online: true })
    void sincronizar()
  })
  window.addEventListener('offline', () => fijar({ online: false }))
  window.setInterval(() => {
    if (navigator.onLine && estado.pendientes > 0) void sincronizar()
  }, INTERVALO_MS)
  void migrarColaVieja()
    .then(() => sincronizar())
    .catch(() => fijar({ ultimoError: 'No se pudo recuperar o leer la cola; revisá el almacenamiento del dispositivo.' }))
}
