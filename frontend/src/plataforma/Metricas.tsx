import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiCuenta } from '../api'
import { fecha, usd, usePlataforma, type Periodo } from './comun'

type Metricas = {
  resumen: {
    tiendas: number
    tiendasVigentes: number
    mrr: number
    arr: number
    arpu: number
    bajas30: number
    churnMensual: number
  }
  porPlan: { plan: string; tiendas: number; mrr: number }[]
  porPeriodo: Record<Periodo, number>
  serie: { mes: string; ingresos: number; altas: number }[]
  renovaciones: { tiendaId: string; tienda: string; plan: string; venceEn: string; monto: number }[]
  proyeccion: { mes: string; mrr: number; ingresosEsperados: number; tiendas: number }[]
  supuestos: { altasPromedio: number; churnMensual: number; explicacion: string }
  tiendasDetalle: {
    id: string
    slug: string
    nombre: string
    creadaEn: string
    vigente: boolean
    plan: string | null
    periodo: Periodo | null
    venceEn: string | null
  }[]
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesCorto = (clave: string) => {
  const [a, m] = clave.split('-')
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`
}

function Barras({ datos, valor, etiqueta, formato, proyectado }: {
  datos: { mes: string }[]
  valor: (i: number) => number
  etiqueta: string
  formato: (n: number) => string
  proyectado?: boolean
}) {
  const max = Math.max(1, ...datos.map((_, i) => valor(i)))
  return (
    <div className="pf-chart" role="img" aria-label={etiqueta}>
      {datos.map((d, i) => (
        <div key={d.mes} className="pf-chart-col" title={`${mesCorto(d.mes)}: ${formato(valor(i))}`}>
          <span className="pf-chart-val">{valor(i) ? formato(valor(i)) : ''}</span>
          <span className={`pf-chart-bar${proyectado ? ' is-proj' : ''}`} style={{ height: `${(valor(i) / max) * 100}%` }} />
          <span className="pf-chart-label">
            {i === 0 || d.mes.endsWith('-01') ? mesCorto(d.mes) : MESES[Number(d.mes.split('-')[1]) - 1]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MetricasPlataforma() {
  const { sesion } = usePlataforma()
  const [m, setM] = useState<Metricas | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sesion?.cuenta.plataforma) return
    apiCuenta<Metricas>('/plataforma/admin/metricas').then(setM).catch(e => setError((e as Error).message))
  }, [sesion])

  if (!sesion) return <Navigate to="/plataforma/login" replace />
  if (!sesion.cuenta.plataforma) return <p className="pf-error">Solo el equipo de la plataforma puede ver las métricas.</p>
  if (!m) return <p className="pf-muted">{error || 'Cargando métricas…'}</p>

  const r = m.resumen
  const totalPeriodo = Object.values(m.porPeriodo).reduce((a, b) => a + b, 0) || 1

  return (
    <section className="pf-metrics">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Dueño de la plataforma</p>
          <h1>Suscripciones y proyección</h1>
        </div>
      </div>

      <div className="pf-kpis">
        <div className="pf-kpi"><span>MRR</span><b>{usd(r.mrr)}</b><small>ingreso recurrente mensual</small></div>
        <div className="pf-kpi"><span>ARR</span><b>{usd(r.arr)}</b><small>MRR × 12</small></div>
        <div className="pf-kpi"><span>Tiendas activas</span><b>{r.tiendasVigentes}</b><small>de {r.tiendas} registradas</small></div>
        <div className="pf-kpi"><span>ARPU</span><b>{usd(r.arpu)}</b><small>por tienda al mes</small></div>
        <div className="pf-kpi"><span>Churn mensual</span><b>{r.churnMensual}%</b><small>{r.bajas30} baja(s) en 30 días</small></div>
      </div>

      <div className="pf-grid-2">
        <div className="pf-card">
          <h2>Ingresos cobrados (12 meses)</h2>
          <Barras datos={m.serie} valor={i => m.serie[i].ingresos} etiqueta="Ingresos por mes" formato={n => `$${Math.round(n)}`} />
        </div>
        <div className="pf-card">
          <h2>Altas de tiendas por mes</h2>
          <Barras datos={m.serie} valor={i => m.serie[i].altas} etiqueta="Altas por mes" formato={n => String(n)} />
        </div>
      </div>

      <div className="pf-card">
        <h2>Proyección a 6 meses</h2>
        <div className="pf-grid-2">
          <Barras datos={m.proyeccion} valor={i => m.proyeccion[i].ingresosEsperados} etiqueta="Ingresos esperados" formato={n => `$${Math.round(n)}`} proyectado />
          <table className="pf-table">
            <thead><tr><th>Mes</th><th>MRR</th><th>Ingresos esperados</th><th>Tiendas</th></tr></thead>
            <tbody>
              {m.proyeccion.map(p => (
                <tr key={p.mes}><td>{mesCorto(p.mes)}</td><td>{usd(p.mrr)}</td><td>{usd(p.ingresosEsperados)}</td><td>{p.tiendas}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pf-muted pf-small">{m.supuestos.explicacion} Altas promedio: {m.supuestos.altasPromedio}/mes · churn {m.supuestos.churnMensual}%.</p>
      </div>

      <div className="pf-grid-2">
        <div className="pf-card">
          <h2>Por plan</h2>
          <table className="pf-table">
            <thead><tr><th>Plan</th><th>Tiendas</th><th>MRR</th></tr></thead>
            <tbody>
              {m.porPlan.map(p => <tr key={p.plan}><td>{p.plan}</td><td>{p.tiendas}</td><td>{usd(p.mrr)}</td></tr>)}
            </tbody>
          </table>
          <h3>Por período de pago</h3>
          {Object.entries(m.porPeriodo).map(([k, v]) => (
            <div key={k} className="pf-uso">
              <div className="pf-uso-head"><span>{k.toLowerCase()}</span><b>{v}</b></div>
              <div className="pf-bar"><span style={{ width: `${(v / totalPeriodo) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="pf-card">
          <h2>Renovaciones en los próximos 30 días</h2>
          {m.renovaciones.length ? (
            <table className="pf-table">
              <thead><tr><th>Tienda</th><th>Plan</th><th>Vence</th><th>Monto</th></tr></thead>
              <tbody>
                {m.renovaciones.map(x => (
                  <tr key={x.tiendaId}><td>{x.tienda}</td><td>{x.plan}</td><td>{fecha(x.venceEn)}</td><td>{usd(x.monto)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="pf-muted">Ninguna.</p>}
        </div>
      </div>

      <div className="pf-card">
        <h2>Tiendas</h2>
        <table className="pf-table">
          <thead><tr><th>Tienda</th><th>Alta</th><th>Plan</th><th>Período</th><th>Vence</th><th>Estado</th></tr></thead>
          <tbody>
            {m.tiendasDetalle.map(t => (
              <tr key={t.id}>
                <td><b>{t.nombre}</b> <span className="pf-muted">/t/{t.slug}</span></td>
                <td>{fecha(t.creadaEn)}</td>
                <td>{t.plan ?? '—'}</td>
                <td>{t.periodo?.toLowerCase() ?? '—'}</td>
                <td>{fecha(t.venceEn)}</td>
                <td><span className={`pf-badge${t.vigente ? ' is-ok' : ' is-bad'}`}>{t.vigente ? 'activa' : 'vencida'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
