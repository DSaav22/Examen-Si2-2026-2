import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { esSuperadmin, homePorRol } from '../roles'
import { OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus, OpsTable } from '../shared/ops/OpsUi'

type AuditUser = { id: string; nombre: string; email: string; rol: string } | null
type Audit = {
  id: string
  accion: string
  recurso: string
  detalle?: string | null
  creadoEn: string
  usuarioId?: string | null
  usuario?: AuditUser
}

const ACCION_LABEL: Record<string, { label: string; state: 'ok' | 'warn' | 'muted' }> = {
  login: { label: 'Inicio de sesión', state: 'ok' },
  logout: { label: 'Cierre de sesión', state: 'muted' },
  cambio_clave: { label: 'Cambio de clave', state: 'warn' },
  venta_creada: { label: 'Venta registrada', state: 'ok' },
  opinion_publicada: { label: 'Opinión publicada', state: 'ok' },
  opinion_rechazada: { label: 'Opinión rechazada', state: 'warn' },
}

function etiquetaAccion(accion: string) {
  return ACCION_LABEL[accion] ?? { label: accion.replace(/_/g, ' '), state: 'muted' as const }
}

function detalleLegible(item: Audit) {
  if (item.usuario?.nombre) return `${item.usuario.nombre} · ${item.usuario.rol}`
  if (item.accion === 'login' || item.accion === 'logout') {
    return item.detalle && item.detalle !== 'auth' ? `Usuario ${item.detalle.slice(0, 8)}…` : 'Sesión'
  }
  if (item.accion.startsWith('opinion_')) return 'Moderación de catálogo'
  if (item.accion === 'venta_creada') return item.detalle ? `Canal ${item.detalle}` : 'Venta'
  if (item.detalle && item.detalle !== item.recurso) return item.detalle
  if (item.recurso && item.recurso !== 'auth') return `Ref. ${item.recurso.slice(0, 8)}…`
  return '—'
}

export function Bitacora() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Audit[]>([])
  const [filtro, setFiltro] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!esSuperadmin(user?.rol)) return
    setLoading(true)
    api<Audit[]>('/admin/auditoria')
      .then(setEvents)
      .catch(() => setError('No se pudo cargar la bitácora.'))
      .finally(() => setLoading(false))
  }, [user?.rol])

  const filtered = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    if (!q) return events
    return events.filter(item => {
      const label = etiquetaAccion(item.accion).label.toLowerCase()
      const who = item.usuario?.nombre?.toLowerCase() ?? ''
      const mail = item.usuario?.email?.toLowerCase() ?? ''
      return (
        label.includes(q) ||
        item.accion.toLowerCase().includes(q) ||
        who.includes(q) ||
        mail.includes(q) ||
        (item.detalle ?? '').toLowerCase().includes(q)
      )
    })
  }, [events, filtro])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of events) {
      map.set(item.accion, (map.get(item.accion) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [events])

  if (!esSuperadmin(user?.rol)) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  return (
    <OpsPage
      eyebrow="Superusuario · auditoría"
      title="Bitácora"
      description="Registro de accesos, ventas y moderación. Solo el superusuario puede consultarla; el administrador gestiona el sistema sin ver esta pista."
      actions={<Link className="ops-text-link" to="/admin/moderacion">Ir a moderación →</Link>}
    >
      {error ? <p className="error">{error}</p> : null}

      <div className="admin-kpis admin-kpis--dense">
        <article className="admin-kpi">
          <span>Eventos</span>
          <strong>{events.length}</strong>
        </article>
        {counts.map(([accion, n]) => (
          <article className="admin-kpi" key={accion}>
            <span>{etiquetaAccion(accion).label}</span>
            <strong>{n}</strong>
          </article>
        ))}
      </div>

      <OpsPanel title="Eventos recientes" className="ops-panel--table">
        <div className="ops-inline-form ops-inline-form--padded">
          <OpsField label="Filtrar" className="ops-inline-form__grow">
            <input
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              placeholder="login, venta, Ana…"
            />
          </OpsField>
        </div>

        {loading ? (
          <OpsEmpty title="Cargando bitácora…" />
        ) : filtered.length === 0 ? (
          <OpsEmpty title="Sin eventos">No hay coincidencias con el filtro.</OpsEmpty>
        ) : (
          <OpsTable minWidth={720}>
            <thead>
              <tr>
                <th scope="col">Acción</th>
                <th scope="col">Quién / detalle</th>
                <th scope="col">Recurso</th>
                <th scope="col">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const meta = etiquetaAccion(item.accion)
                return (
                  <tr key={item.id}>
                    <td><OpsStatus state={meta.state}>{meta.label}</OpsStatus></td>
                    <td>
                      <div className="ops-audit-who">
                        <strong>{detalleLegible(item)}</strong>
                        {item.usuario?.email ? <span className="muted">{item.usuario.email}</span> : null}
                      </div>
                    </td>
                    <td className="ops-users-email">{item.recurso || '—'}</td>
                    <td>{new Date(item.creadoEn).toLocaleString('es-BO')}</td>
                  </tr>
                )
              })}
            </tbody>
          </OpsTable>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
