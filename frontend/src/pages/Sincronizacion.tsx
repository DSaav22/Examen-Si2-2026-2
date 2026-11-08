import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { conCache, leerCache } from '../offline/cache'
import { useEstadoSync } from '../offline/sync'
import { ColaDispositivo } from '../shared/Offline'
import { OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'
import type { Turno } from '../types'

type Accion = { accion: string; titulo: string; motivo: string }
type Politica = { ventanaOfflineDias: number; disponibles: Accion[]; soloEnLinea: Accion[] }
type OperacionServidor = {
  id: string
  operationId: string
  tipo: string
  estado: string
  error: string
  dispositivoId: string
  hechaEn: string | null
  creadoEn: string
  resultado: { mensaje?: string; codigo?: string } | null
}

export function Sincronizacion() {
  const { user } = useAuth()
  const s = useEstadoSync()
  const [politica, setPolitica] = useState<Politica | null>(() => leerCache<Politica>('politica'))
  const [dias, setDias] = useState('')
  const [conflictos, setConflictos] = useState<OperacionServidor[]>([])
  const [msg, setMsg] = useState('')
  const esAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN'
  const revisa = esAdmin || user?.rol === 'ENCARGADO'
  const turno = user ? leerCache<Turno | null>(`turno:${user.id}`) : null

  useEffect(() => {
    void conCache('politica', () => api<Politica>('/sync/politica'))
      .then(r => {
        setPolitica(r.datos)
        setDias(String(r.datos.ventanaOfflineDias))
      })
      .catch(() => undefined)
  }, [])

  async function cargarConflictos() {
    if (!revisa) return
    try {
      setConflictos(await api<OperacionServidor[]>('/sync/operaciones?estado=conflicto'))
    } catch {
      /* sin red: se muestra la última lista */
    }
  }

  useEffect(() => {
    void cargarConflictos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revisa, s.ultimaSync])

  async function guardarVentana() {
    setMsg('')
    try {
      const p = await api<Politica>('/sync/politica', {
        method: 'PATCH',
        body: JSON.stringify({ ventanaOfflineDias: Number(dias) }),
      })
      setPolitica(p)
      setMsg(`Ventana offline: ${p.ventanaOfflineDias} días.`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se guardó la ventana.')
    }
  }

  async function descartar(id: string) {
    await api(`/sync/operaciones/${id}/descartar`, { method: 'POST' })
    await cargarConflictos()
  }

  return (
    <OpsPage
      eyebrow="Modo offline"
      title="Sincronización"
      description="Lo que se hizo sin conexión en este dispositivo, los conflictos de la tienda y qué funciona sin red."
    >
      <OpsPanel
        title="Este dispositivo"
        eyebrow={s.online ? (s.sincronizando ? 'Sincronizando…' : 'Conectado') : 'Sin conexión'}
      >
        <p className="muted">
          {s.ultimaSync ? `Última sincronización: ${new Date(s.ultimaSync).toLocaleString('es-BO')} · ` : ''}
          Cada operación lleva un UUID generado aquí: reenviarla nunca la duplica.
        </p>
        <ColaDispositivo turnoId={turno?.id} vacio="No hay operaciones pendientes en este dispositivo." />
      </OpsPanel>

      {revisa ? (
        <OpsPanel title="Conflictos de la tienda" eyebrow={`${conflictos.length} sin resolver`}>
          {conflictos.length ? (
            <ul className="cola-lista">
              {conflictos.map(c => (
                <li key={c.id} className="cola-item is-conflicto">
                  <div className="cola-item-main">
                    <strong>
                      {c.tipo} · {c.resultado?.codigo ?? c.error}
                    </strong>
                    <small className="muted">
                      Hecha {new Date(c.hechaEn ?? c.creadoEn).toLocaleString('es-BO')} · dispositivo{' '}
                      {c.dispositivoId.slice(0, 8)}
                    </small>
                    {c.resultado?.mensaje ? <small className="error">{c.resultado.mensaje}</small> : null}
                  </div>
                  <OpsStatus state="warn">Conflicto</OpsStatus>
                  <div className="cola-item-actions">
                    <button type="button" className="ghost" onClick={() => void descartar(c.id)}>
                      Marcar resuelto
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <OpsEmpty title="Sin conflictos">Las ventas hechas sin red se aplicaron sin choques de stock.</OpsEmpty>
          )}
        </OpsPanel>
      ) : null}

      {politica ? (
        <OpsPanel title="Qué funciona sin conexión" eyebrow={`Ventana de ${politica.ventanaOfflineDias} días`}>
          <div className="politica-offline">
            <div>
              <h3>Sin red</h3>
              <ul>
                {politica.disponibles.map(a => (
                  <li key={a.accion}>
                    <strong>{a.titulo}</strong>
                    <p className="muted">{a.motivo}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Solo en línea</h3>
              <ul>
                {politica.soloEnLinea.map(a => (
                  <li key={a.accion}>
                    <strong>{a.titulo}</strong>
                    <p className="muted">{a.motivo}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {esAdmin ? (
            <form
              className="ops-inline-form"
              onSubmit={e => {
                e.preventDefault()
                void guardarVentana()
              }}
            >
              <OpsField label="Días que una operación puede esperar sin sincronizar (1–30)" className="ops-inline-form__grow">
                <input type="number" min={1} max={30} value={dias} onChange={e => setDias(e.target.value)} required />
              </OpsField>
              <OpsBtn type="submit" className="ops-inline-form__action" disabled={!s.online}>
                Guardar
              </OpsBtn>
            </form>
          ) : null}
          {msg ? <p className="ok">{msg}</p> : null}
        </OpsPanel>
      ) : null}
    </OpsPage>
  )
}
