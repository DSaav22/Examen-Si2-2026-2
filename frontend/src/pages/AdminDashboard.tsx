import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { OpsPage, OpsPanel } from '../shared/ops/OpsUi'

type Summary = {
  ventas: { total: number; operaciones: number; online: number; pos: number }
  catalogo: { productos: number; variantes: number }
  sucursales: number
  usuarios: number
  turnosAbiertos: number
  inventarioBajo: number
  alertas: number
}

export function AdminDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<Summary>('/admin/resumen').then(setData).catch(() => setError('No se pudo cargar el resumen administrativo.'))
  }, [])

  if (user?.rol !== 'ADMIN' && user?.rol !== 'SUPERADMIN') {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  const online = data?.ventas.online ?? 0
  const pos = data?.ventas.pos ?? 0
  const canalTotal = Math.max(online + pos, 1)

  return (
    <OpsPage
      eyebrow="Centro de operaciones"
      title="Resumen del día"
      description="Indicadores en vivo. Navegá módulos desde la barra lateral."
      actions={
        data?.inventarioBajo ? (
          <Link className="ops-alert-pill" to="/encargado">
            {data.inventarioBajo} con stock bajo →
          </Link>
        ) : null
      }
    >
      {error ? <p className="error">{error}</p> : null}

      <div className="admin-kpis admin-kpis--dense">
        {[
          ['Ventas del día', `Bs ${data?.ventas.total.toFixed(2) ?? '—'}`],
          ['Operaciones', data?.ventas.operaciones ?? '—'],
          ['Inventario bajo', data?.inventarioBajo ?? '—'],
          ['Turnos abiertos', data?.turnosAbiertos ?? '—'],
          ['Productos', data?.catalogo.productos ?? '—'],
          ['Variantes', data?.catalogo.variantes ?? '—'],
          ['Usuarios', data?.usuarios ?? '—'],
          ['Sucursales', data?.sucursales ?? '—'],
        ].map(([label, value]) => (
          <article className="admin-kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-panels admin-panels--dense">
        <OpsPanel title="Ventas por canal">
          <div className="ops-channel-bars" role="img" aria-label={`Online ${online}, POS ${pos}`}>
            <div className="ops-channel-row">
              <span>Online</span>
              <div className="ops-channel-track"><span style={{ width: `${(online / canalTotal) * 100}%` }} /></div>
              <strong>{online}</strong>
            </div>
            <div className="ops-channel-row">
              <span>POS</span>
              <div className="ops-channel-track"><span style={{ width: `${(pos / canalTotal) * 100}%` }} /></div>
              <strong>{pos}</strong>
            </div>
          </div>
        </OpsPanel>
        <OpsPanel title="Atención operativa">
          <ul className="ops-attention-list">
            <li>
              <span>Turnos de caja abiertos</span>
              <strong>{data?.turnosAbiertos ?? '—'}</strong>
              <Link to="/pos">Ir a POS</Link>
            </li>
            <li>
              <span>Inventario bajo</span>
              <strong>{data?.inventarioBajo ?? '—'}</strong>
              <Link to="/encargado">Ajustar</Link>
            </li>
            <li>
              <span>Alertas</span>
              <strong>{data?.alertas ?? '—'}</strong>
              <Link to="/admin/moderacion">Revisar opiniones</Link>
            </li>
          </ul>
        </OpsPanel>
      </div>
    </OpsPage>
  )
}
