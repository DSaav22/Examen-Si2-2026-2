import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { alCambiarCola, listarOps, quitarOp, reintentar, type OperacionOffline } from '../offline/cola'
import { activarPush, desactivarPush, estadoPush, instalada, useInstalar, type EstadoPush } from '../offline/pwa'
import { sincronizar, useEstadoSync } from '../offline/sync'
import { OpsBtn, OpsStatus } from './ops/OpsUi'

/** Indicador de la barra superior: red, pendientes y conflictos del dispositivo. */
export function EstadoConexion() {
  const s = useEstadoSync()
  const estado = !s.online ? 'is-offline' : s.conflictos ? 'is-warn' : 'is-online'
  const texto = !s.online
    ? 'Sin conexión'
    : s.sincronizando
      ? 'Sincronizando…'
      : s.conflictos
        ? `${s.conflictos} por revisar`
        : 'Conectado'
  return (
    <Link
      to="/sincronizacion"
      className={`connection-indicator sync-chip ${estado}`}
      role="status"
      title={s.ultimaSync ? `Última sincronización: ${new Date(s.ultimaSync).toLocaleTimeString('es-BO')}` : 'Estado de sincronización'}
    >
      {texto}
      {s.pendientes ? <span className="sync-chip-count">{s.pendientes} en cola</span> : null}
    </Link>
  )
}

/** Franja visible cuando no hay red o quedan operaciones del dispositivo sin confirmar. */
export function BannerOffline() {
  const s = useEstadoSync()
  if (s.online && !s.pendientes && !s.conflictos && !s.ultimoError) return null
  return (
    <div className={`offline-banner${s.online ? '' : ' is-offline'}`} role="status" aria-live="polite">
      {!s.online ? (
        <span>
          <strong>Sin conexión.</strong> Podés seguir vendiendo en efectivo y registrando clientes y productos: se
          guardan en este dispositivo y se sincronizan solos al volver la red.
        </span>
      ) : s.ultimoError ? (
        <span>{s.ultimoError}</span>
      ) : s.pendientes ? (
        <span>{s.sincronizando ? 'Sincronizando' : 'Pendientes de sincronizar'}: {s.pendientes} operación(es).</span>
      ) : (
        <span>{s.conflictos} operación(es) hechas sin conexión necesitan revisión.</span>
      )}
      {s.pendientes && s.online && !s.sincronizando ? (
        <button type="button" className="ghost" onClick={() => void sincronizar()}>
          Sincronizar ahora
        </button>
      ) : null}
      {s.conflictos ? <Link to="/sincronizacion">Revisar</Link> : null}
    </div>
  )
}

export function useColaLocal() {
  const [ops, setOps] = useState<OperacionOffline[]>([])
  useEffect(() => {
    const cargar = () => void listarOps().then(setOps).catch(() => setOps([]))
    cargar()
    return alCambiarCola(cargar)
  }, [])
  return ops
}

const ETIQUETA_ESTADO: Record<OperacionOffline['estado'], string> = {
  pendiente: 'Pendiente',
  conflicto: 'Conflicto',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
}

type Linea = { varianteId: string; cantidad: number }

/** Cambios para reintentar una operación según el motivo del rechazo; null si no hay reintento posible. */
function cambiosReintento(op: OperacionOffline, turnoId?: string): Record<string, unknown> | null {
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

function textoReintento(op: OperacionOffline) {
  const codigo = op.error?.codigo ?? ''
  if (codigo === 'STOCK_INSUFICIENTE') return 'Vender lo disponible'
  if (codigo.startsWith('TURNO')) return 'Pasar a mi turno'
  return 'Reintentar'
}

/** Operaciones guardadas en este dispositivo con su estado y acciones para resolverlas. */
export function ColaDispositivo({ turnoId, vacio }: { turnoId?: string; vacio?: string }) {
  const ops = useColaLocal()
  const s = useEstadoSync()
  const [errorAccion, setErrorAccion] = useState('')
  if (!ops.length) return vacio ? <p className="muted">{vacio}</p> : null
  return (
    <div className="cola-dispositivo">
      {errorAccion && <p className="error" role="alert">{errorAccion}</p>}
      <ul className="cola-lista">
        {ops.map(op => {
          const cambios = op.estado === 'pendiente' ? null : cambiosReintento(op, turnoId)
          return (
            <li key={op.id} className={`cola-item is-${op.estado}`}>
              <div className="cola-item-main">
                <strong>{op.resumen}</strong>
                <small className="muted">
                  {op.tipo} · {new Date(op.creadaEn).toLocaleString('es-BO')} · {op.id.slice(0, 8)}
                </small>
                {op.error?.mensaje || op.error?.codigo ? (
                  <small className={op.estado === 'pendiente' ? 'muted' : 'error'}>
                    {op.error.mensaje ?? op.error.codigo}
                  </small>
                ) : null}
              </div>
              <OpsStatus state={op.estado === 'pendiente' ? 'warn' : 'muted'}>{ETIQUETA_ESTADO[op.estado]}</OpsStatus>
              <div className="cola-item-actions">
                {cambios ? (
                  <button type="button" className="ghost" onClick={() => { setErrorAccion(''); void reintentar(op, cambios).then(() => sincronizar()).catch(() => setErrorAccion('No se pudo reintentar. Revisá el estado de la cola antes de volver a intentar.')) }}>
                    {textoReintento(op)}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (op.estado !== 'pendiente' || window.confirm('¿Descartar esta operación? No se enviará al servidor.')) {
                      void quitarOp(op.id).catch(() => setErrorAccion('No se pudo descartar la operación.'))
                    }
                  }}
                >
                  Descartar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {s.pendientes ? (
        <OpsBtn type="button" variant="secondary" disabled={!s.online || s.sincronizando} onClick={() => void sincronizar()}>
          {s.sincronizando ? 'Sincronizando…' : s.online ? `Sincronizar ${s.pendientes}` : 'Esperando conexión…'}
        </OpsBtn>
      ) : null}
    </div>
  )
}

/** Instalar la app y activar notificaciones push. */
export function AccionesPwa() {
  const { puede, instalar } = useInstalar()
  const [push, setPush] = useState<EstadoPush>('inactivo')
  const [msg, setMsg] = useState('')
  useEffect(() => {
    void estadoPush().then(setPush)
  }, [])
  if (push === 'no-soportado' && !puede) return null
  return (
    <div className="pwa-acciones">
      {puede && !instalada() ? (
        <button type="button" className="ops-tool-link" onClick={() => void instalar()}>
          Instalar app
        </button>
      ) : null}
      {push === 'inactivo' ? (
        <button
          type="button"
          className="ops-tool-link"
          onClick={() =>
            void activarPush()
              .then(() => {
                setPush('activo')
                setMsg('Notificaciones activadas.')
              })
              .catch((e: unknown) => setMsg(e instanceof Error ? e.message : 'No se activaron.'))
          }
        >
          Activar notificaciones
        </button>
      ) : null}
      {push === 'activo' ? (
        <button
          type="button"
          className="ops-tool-link"
          onClick={() => void desactivarPush().then(() => setPush('inactivo'))}
        >
          Silenciar notificaciones
        </button>
      ) : null}
      {push === 'denegado' ? <small className="muted">Notificaciones bloqueadas en el navegador.</small> : null}
      {msg ? <small className="muted">{msg}</small> : null}
    </div>
  )
}
