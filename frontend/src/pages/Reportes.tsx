import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsTable } from '../shared/ops/OpsUi'

type Fila = Record<string, string | number | null>
type Barra = { label: string; valor: number; pct?: number }

type Resultado = {
  titulo: string
  columnas: string[]
  filas: Fila[]
  narracion?: string | null
  aviso?: string | null
  barras?: Barra[]
  tipo?: string
  periodo?: string
  fuente?: 'modelo' | 'reglas'
}

type Panel = {
  periodo: string
  insight: string
  kpis: { totalBs: number; operaciones: number; unidades: number }
  sucursales: Resultado
  productos: Resultado
  medios: Resultado
  stockBajo: Resultado
}

type Contexto = {
  modelo: { configurado: boolean }
  sucursales: { id: string; nombre: string; ciudad: string }[]
  filtros: {
    periodos: { id: string; label: string }[]
    reportes: { id: string; label: string; desc: string }[]
  }
}

const LABELS: Record<string, string> = {
  sucursal: 'Sucursal',
  producto: 'Producto',
  clienta: 'Clienta',
  cliente_nombre: 'Clienta',
  tickets: 'Tickets',
  compras: 'Compras',
  unidades: 'Unidades',
  total_bs: 'Total (Bs)',
  total_ventas: 'Total (Bs)',
  total: 'Total (Bs)',
  medio_pago: 'Medio de pago',
  disponible: 'Disponible',
  reservado: 'Reservado',
  talla: 'Talla',
  color: 'Color',
  sku: 'SKU',
  fecha_hora: 'Fecha',
  cantidad: 'Cant.',
}

function labelCol(col: string) {
  return LABELS[col] ?? col.replace(/_/g, ' ')
}

function formatCell(col: string, value: string | number | null) {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') {
    if (/total|bs|precio|subtotal|monto/i.test(col)) {
      return `Bs ${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })}`
    }
    return Number.isInteger(value) ? String(value) : value.toLocaleString('es-BO', { maximumFractionDigits: 2 })
  }
  if (col === 'fecha_hora') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-BO')
  }
  return String(value)
}

function Bars({ items }: { items: Barra[] }) {
  if (!items.length) return null
  const max = Math.max(...items.map(i => i.valor), 1)
  return (
    <ul className="ops-report-bars" aria-label="Comparativa">
      {items.map(item => {
        const pct = item.pct ?? Math.round((item.valor / max) * 100)
        return (
          <li key={item.label}>
            <div className="ops-report-bars-label">
              <strong>{item.label || '—'}</strong>
              <span>Bs {item.valor.toLocaleString('es-BO', { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="ops-report-bars-track">
              <span style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Reportes() {
  const { user } = useAuth()
  const [periodo, setPeriodo] = useState('todo')
  const [sucursal, setSucursal] = useState('')
  const [tipo, setTipo] = useState('sucursales')
  const [panel, setPanel] = useState<Panel | null>(null)
  const [ctx, setCtx] = useState<Contexto | null>(null)
  const [data, setData] = useState<Resultado | null>(null)
  const [pregunta, setPregunta] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPanel, setLoadingPanel] = useState(true)

  const query = useMemo(() => {
    const p = new URLSearchParams({ periodo })
    if (sucursal) p.set('sucursal', sucursal)
    return p.toString()
  }, [periodo, sucursal])

  async function cargarPanel() {
    setLoadingPanel(true)
    setError('')
    try {
      const [p, c] = await Promise.all([
        api<Panel>(`/reportes/panel?${query}`),
        api<Contexto>('/reportes/contexto'),
      ])
      setPanel(p)
      setCtx(c)
      setData({
        titulo: p.sucursales.titulo,
        columnas: p.sucursales.columnas,
        filas: p.sucursales.filas,
        narracion: p.insight,
        barras: p.sucursales.barras,
        tipo: 'sucursales',
      })
      setTipo('sucursales')
    } catch {
      setError('No se pudo cargar el panel de reportes.')
    } finally {
      setLoadingPanel(false)
    }
  }

  useEffect(() => {
    if (user?.rol !== 'ADMIN' && user?.rol !== 'SUPERADMIN') return
    void cargarPanel()
  }, [query, user?.rol])

  if (user?.rol !== 'ADMIN' && user?.rol !== 'SUPERADMIN') {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  async function abrirReporte(id: string) {
    setTipo(id)
    setLoading(true)
    setError('')
    try {
      const result = await api<Resultado>(`/reportes/negocio?tipo=${id}&${query}`)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se armó el reporte')
    } finally {
      setLoading(false)
    }
  }

  async function preguntaLibre(e: FormEvent) {
    e.preventDefault()
    if (pregunta.trim().length < 4) return
    setLoading(true)
    setError('')
    try {
      const result = await api<Resultado>('/reportes/generativo', {
        method: 'POST',
        body: JSON.stringify({ pregunta }),
      })
      setData(result)
      setTipo('libre')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se entendió la pregunta')
    } finally {
      setLoading(false)
    }
  }

  const reportes = ctx?.filtros.reportes ?? [
    { id: 'sucursales', label: 'Ranking sucursales', desc: 'Cuál vende más y cuál menos' },
    { id: 'productos', label: 'Top productos', desc: 'Prendas y montos' },
    { id: 'medios', label: 'Medios de pago', desc: 'Efectivo, QR, tarjeta…' },
    { id: 'clientes', label: 'Mejores clientas', desc: 'Quién compra más' },
    { id: 'detalle', label: 'Detalle de ventas', desc: 'Líneas cobradas del período' },
    { id: 'stock_bajo', label: 'Stock crítico', desc: 'Variantes con poca existencia' },
  ]

  return (
    <OpsPage
      eyebrow="Gestión"
      title="Reportes de negocio"
      description="Ventas por sucursal, productos, medios de pago e inventario. Filtrá el período y explorá sin ver código técnico."
    >
      <div className="ops-report-filters">
        <OpsField label="Período" className="ops-report-filter">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
            {(ctx?.filtros.periodos ?? [
              { id: 'hoy', label: 'Hoy' },
              { id: '7d', label: 'Últimos 7 días' },
              { id: 'todo', label: 'Todo el historial' },
            ]).map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </OpsField>
        <OpsField label="Sucursal" className="ops-report-filter">
          <select value={sucursal} onChange={e => setSucursal(e.target.value)}>
            <option value="">Todas</option>
            {(ctx?.sucursales ?? []).map(s => (
              <option key={s.id} value={s.nombre}>{s.nombre}</option>
            ))}
          </select>
        </OpsField>
      </div>

      <div className="admin-kpis admin-kpis--dense">
        <article className="admin-kpi">
          <span>Ventas del filtro</span>
          <strong>Bs {(panel?.kpis.totalBs ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}</strong>
        </article>
        <article className="admin-kpi">
          <span>Operaciones</span>
          <strong>{panel?.kpis.operaciones ?? (loadingPanel ? '…' : '0')}</strong>
        </article>
        <article className="admin-kpi">
          <span>Unidades</span>
          <strong>{panel?.kpis.unidades ?? (loadingPanel ? '…' : '0')}</strong>
        </article>
        <article className="admin-kpi">
          <span>Stock crítico</span>
          <strong>{panel?.stockBajo.filas.length ?? '—'}</strong>
        </article>
      </div>

      {panel?.insight ? <p className="ops-report-insight">{panel.insight}</p> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}

      <div className="ops-report-nav">
        {reportes.map(r => (
          <button
            key={r.id}
            type="button"
            className={`ops-report-nav-card${tipo === r.id ? ' is-active' : ''}`}
            disabled={loading || loadingPanel}
            onClick={() => void abrirReporte(r.id)}
          >
            <strong>{r.label}</strong>
            <span>{r.desc}</span>
          </button>
        ))}
      </div>

      <div className="ops-report-layout ops-report-layout--wide">
        <OpsPanel title={data?.titulo ?? 'Elegí un reporte'} eyebrow={loading || loadingPanel ? 'Cargando…' : 'Resultado'}>
          {loading || loadingPanel ? (
            <OpsEmpty title="Preparando cifras…" />
          ) : data ? (
            <>
              {data.narracion ? <p className="ops-report-narracion">{data.narracion}</p> : null}
              {data.aviso ? <p className="ops-report-aviso">{data.aviso}</p> : null}
              {data.barras?.length ? <Bars items={data.barras} /> : null}

              {data.filas.length ? (
                <OpsTable minWidth={480} className="ops-report-table">
                  <thead>
                    <tr>
                      {data.columnas.map(c => <th key={c}>{labelCol(c)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.filas.map((fila, i) => (
                      <tr key={i}>
                        {data.columnas.map(c => (
                          <td key={c}>{formatCell(c, fila[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </OpsTable>
              ) : (
                <OpsEmpty title="Sin datos en este filtro">
                  Cambiá a “Todo el historial”, sacá el filtro de sucursal, o registrá ventas cobradas en el POS.
                </OpsEmpty>
              )}
            </>
          ) : (
            <OpsEmpty title="Sin resultado">Elegí un reporte de arriba.</OpsEmpty>
          )}
        </OpsPanel>

        <OpsPanel title="Pregunta libre" eyebrow={ctx?.modelo.configurado ? 'Asistente IA' : 'Reglas locales'}>
          <p className="muted ops-moderation-help">
            Opcional: pedí algo en español. La respuesta se muestra como tabla de negocio (sin código).
          </p>
          <form onSubmit={event => void preguntaLibre(event)}>
            <OpsField label="Tu pregunta">
              <textarea
                rows={3}
                value={pregunta}
                onChange={e => setPregunta(e.target.value)}
                placeholder="Ej. ¿qué sucursal vende menos?"
              />
            </OpsField>
            <OpsActions>
              <OpsBtn type="submit" disabled={loading || pregunta.trim().length < 4}>
                {loading ? 'Consultando…' : 'Preguntar'}
              </OpsBtn>
            </OpsActions>
          </form>
        </OpsPanel>
      </div>
    </OpsPage>
  )
}
