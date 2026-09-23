import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Opinion = {
  id: string
  puntuacion: number
  comentario: string
  producto?: { nombre: string }
  usuario?: { nombre: string; email: string }
}
type Audit = { id: string; accion: string; recurso: string; detalle?: string | null; creadoEn: string }

export function Moderacion() {
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [audit, setAudit] = useState<Audit[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [pending, events] = await Promise.all([
      api<Opinion[]>('/admin/opiniones/pendientes'),
      api<Audit[]>('/admin/auditoria'),
    ])
    setOpinions(pending)
    setAudit(events)
  }

  useEffect(() => { load().catch(() => setError('No se pudo cargar la moderación.')) }, [])

  async function decide(id: string, aprobar: boolean) {
    setError('')
    try {
      await api(`/admin/opiniones/${id}/moderacion`, { method: 'PATCH', body: JSON.stringify({ aprobar }) })
      setOpinions(current => current.filter(item => item.id !== id))
      setMessage(aprobar ? 'Opinión publicada.' : 'Opinión rechazada.')
      setAudit(await api<Audit[]>('/admin/auditoria'))
    } catch {
      setError('No se pudo moderar la opinión.')
    }
  }

  return (
    <section className="customer-account moderation">
      <div className="page-head">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Moderación y auditoría</h1>
          <p>Las opiniones quedan ocultas hasta que las apruebes. El registro muestra los eventos recientes.</p>
        </div>
        <Link className="ui-button ui-button--secondary" to="/admin">Volver al resumen</Link>
      </div>
      {message ? <p className="ok" role="status">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="customer-account-grid">
        <article className="ui-card">
          <p className="eyebrow">Opiniones</p>
          <h2>Pendientes</h2>
          {opinions.length ? opinions.map(item => (
            <div className="moderation-item" key={item.id}>
              <strong>{item.producto?.nombre ?? 'Producto'}</strong>
              <p>{'★'.repeat(item.puntuacion)} {item.comentario}</p>
              <small>{item.usuario?.nombre ?? 'Clienta'} · {item.usuario?.email}</small>
              <div className="account-actions">
                <button type="button" className="ui-button ui-button--primary" onClick={() => void decide(item.id, true)}>Publicar</button>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => void decide(item.id, false)}>Rechazar</button>
              </div>
            </div>
          )) : <p className="muted">No hay opiniones en espera.</p>}
        </article>
        <article className="ui-card">
          <p className="eyebrow">Bitácora</p>
          <h2>Últimos eventos</h2>
          <ul className="audit-list">
            {audit.map(item => (
              <li key={item.id}>
                <strong>{item.accion}</strong>
                <span>{item.detalle || item.recurso}</span>
                <small>{new Date(item.creadoEn).toLocaleString('es-BO')}</small>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
