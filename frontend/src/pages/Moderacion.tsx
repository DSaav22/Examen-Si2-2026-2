import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { esSuperadmin } from '../roles'
import { OpsActions, OpsBtn, OpsEmpty, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type Opinion = {
  id: string
  puntuacion: number
  comentario: string
  verificada?: boolean
  creadaEn?: string
  producto?: { nombre: string }
  usuario?: { nombre: string; email: string }
}

type Resumen = {
  pendientes: number
  publicadas: number
  promedioPublicadas: number
}

export function Moderacion() {
  const { user } = useAuth()
  const veBitacora = esSuperadmin(user?.rol)
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const [pending, stats] = await Promise.all([
      api<Opinion[]>('/admin/opiniones/pendientes'),
      api<Resumen>('/admin/opiniones/resumen').catch(() => null),
    ])
    setOpinions(pending)
    if (stats) setResumen(stats)
  }

  useEffect(() => {
    setLoading(true)
    load()
      .catch(() => setError('No se pudo cargar la moderación.'))
      .finally(() => setLoading(false))
  }, [])

  async function decide(id: string, aprobar: boolean) {
    setError('')
    setBusyId(id)
    try {
      await api(`/admin/opiniones/${id}/moderacion`, {
        method: 'PATCH',
        body: JSON.stringify({ aprobar }),
      })
      setOpinions(current => current.filter(item => item.id !== id))
      setMessage(aprobar ? 'Opinión publicada en el catálogo.' : 'Opinión rechazada y eliminada.')
      const stats = await api<Resumen>('/admin/opiniones/resumen').catch(() => null)
      if (stats) setResumen(stats)
    } catch {
      setError('No se pudo moderar la opinión.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <OpsPage
      eyebrow="Catálogo · clientas"
      title="Moderación de opiniones"
      description="Las clientas dejan reseñas en la ficha del producto (idealmente tras compra). Acá aprobás o rechazás antes de que se vean en el catálogo público."
      actions={
        veBitacora ? (
          <Link className="ops-text-link" to="/admin/bitacora">Ver bitácora →</Link>
        ) : undefined
      }
    >
      {message ? <p className="ok" role="status">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <div className="admin-kpis admin-kpis--dense">
        <article className="admin-kpi">
          <span>Pendientes</span>
          <strong>{resumen?.pendientes ?? opinions.length}</strong>
        </article>
        <article className="admin-kpi">
          <span>Publicadas</span>
          <strong>{resumen?.publicadas ?? '—'}</strong>
        </article>
        <article className="admin-kpi">
          <span>Promedio publicado</span>
          <strong>{resumen ? `${resumen.promedioPublicadas.toFixed(1)} ★` : '—'}</strong>
        </article>
      </div>

      <OpsPanel title={`Cola de revisión (${opinions.length})`}>
        <p className="muted ops-moderation-help">
          Publicar deja la opinión visible en la ficha del producto. Rechazar la borra
          {veBitacora ? (
            <>
              {' '}y queda registrado en la <Link to="/admin/bitacora">bitácora</Link>
            </>
          ) : (
            ' y queda registrado en la bitácora del sistema (solo visible para el superusuario)'
          )}
          .
        </p>

        {loading ? (
          <OpsEmpty title="Cargando opiniones…" />
        ) : opinions.length ? (
          <ul className="ops-opinion-list">
            {opinions.map(item => (
              <li className="ops-opinion-card" key={item.id}>
                <header className="ops-opinion-head">
                  <div>
                    <strong>{item.producto?.nombre ?? 'Producto'}</strong>
                    <p className="muted">
                      {item.usuario?.nombre ?? 'Clienta'}
                      {item.usuario?.email ? ` · ${item.usuario.email}` : ''}
                    </p>
                  </div>
                  <div className="ops-opinion-meta">
                    <span className="ops-opinion-stars" aria-label={`${item.puntuacion} de 5`}>
                      {'★'.repeat(item.puntuacion)}{'☆'.repeat(Math.max(0, 5 - item.puntuacion))}
                    </span>
                    {item.verificada ? <OpsStatus state="ok">Compra verificada</OpsStatus> : <OpsStatus state="muted">Sin compra</OpsStatus>}
                  </div>
                </header>
                <p className="ops-opinion-body">{item.comentario || '(Sin comentario)'}</p>
                {item.creadaEn ? (
                  <small className="muted">Enviada {new Date(item.creadaEn).toLocaleString('es-BO')}</small>
                ) : null}
                <OpsActions>
                  <OpsBtn type="button" disabled={busyId === item.id} onClick={() => void decide(item.id, true)}>
                    {busyId === item.id ? '…' : 'Publicar'}
                  </OpsBtn>
                  <OpsBtn type="button" variant="secondary" disabled={busyId === item.id} onClick={() => void decide(item.id, false)}>
                    Rechazar
                  </OpsBtn>
                </OpsActions>
              </li>
            ))}
          </ul>
        ) : (
          <OpsEmpty title="Nada por moderar">
            Cuando una clienta envíe una reseña desde la ficha, aparecerá aquí
            {veBitacora ? (
              <>
                . Mientras tanto podés revisar la <Link to="/admin/bitacora">bitácora de eventos</Link>
              </>
            ) : null}
            .
          </OpsEmpty>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
