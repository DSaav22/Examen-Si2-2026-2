import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { apiCuenta } from '../api'
import type { TiendaDeCuenta } from '../tienda'
import { fecha, PERIODOS, usd, usePlataforma, type Periodo, type PlanPublico } from './comun'
import { FormTarjeta, SelectorPagoPais, TARJETA_SIMULADA, type Tarjeta } from './NuevaTienda'

type Detalle = {
  id: string
  slug: string
  nombre: string
  pais: string
  vigente: boolean
  venceEn: string | null
  plan: { id: string; codigo: string; nombre: string; maxUsuarios: number; maxSucursales: number; maxProductos: number | null } | null
  uso: { usuarios: number; sucursales: number; productos: number }
  historial: {
    id: string
    plan: string
    periodo: Periodo
    estado: string
    inicio: string
    venceEn: string
    monto: number
    pagos: { referencia: string; monto: number; estado: string; pasarela: string; ultimos4: string; fecha: string }[]
  }[]
}

function Uso({ label, usado, max }: { label: string; usado: number; max: number | null | undefined }) {
  const pct = max ? Math.min(100, Math.round((usado / max) * 100)) : 0
  return (
    <div className="pf-uso">
      <div className="pf-uso-head">
        <span>{label}</span>
        <b>{usado} / {max ?? '∞'}</b>
      </div>
      <div className="pf-bar"><span style={{ width: `${max ? pct : 4}%` }} className={pct >= 100 ? 'is-full' : ''} /></div>
    </div>
  )
}

function Suscripcion({ tienda, onCambio }: { tienda: TiendaDeCuenta; onCambio: () => void }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [planes, setPlanes] = useState<PlanPublico[]>([])
  const [abierto, setAbierto] = useState(false)
  const [planId, setPlanId] = useState('')
  const [periodo, setPeriodo] = useState<Periodo>('MENSUAL')
  const [tarjeta, setTarjeta] = useState<Tarjeta>({ titular: '', numero: '', vence: '', cvc: '' })
  const [metodoPago, setMetodoPago] = useState('')
  const [pagando, setPagando] = useState(false)
  const [resultadoSimulado, setResultadoSimulado] = useState<'aprobado' | 'rechazado'>('aprobado')
  const [clave, setClave] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    apiCuenta<Detalle>(`/plataforma/tiendas/${tienda.tiendaId}`).then(d => {
      setDetalle(d)
      setPlanId(d.plan?.id ?? 'plan-inicial')
    }).catch(e => setError((e as Error).message))
    apiCuenta<PlanPublico[]>('/plataforma/planes').then(setPlanes).catch(() => undefined)
  }, [tienda.tiendaId])

  async function renovar(e: FormEvent) {
    e.preventDefault()
    if (pagando || !metodoPago) return
    setPagando(true)
    setError('')
    setOk('')
    try {
      const d = await apiCuenta<Detalle>(`/plataforma/tiendas/${tienda.tiendaId}/renovar`, {
        method: 'POST',
        body: JSON.stringify({ planId, periodo, metodoPago, pago: metodoPago === 'tarjeta' ? tarjeta : { ...TARJETA_SIMULADA, numero: resultadoSimulado === 'aprobado' ? TARJETA_SIMULADA.numero : '4000000000000002' }, idempotencyKey: clave }),
      })
      setDetalle(d)
      setAbierto(false)
      setOk(`Listo: plan ${d.plan?.nombre}, vence el ${fecha(d.venceEn)}.`)
      setClave(crypto.randomUUID())
      onCambio()
    } catch (err) {
      setError((err as Error).message)
      if ((err as { status?: number }).status === 402 || (err as { status?: number }).status === 409) setClave(crypto.randomUUID())
    } finally { setPagando(false) }
  }

  if (!detalle) return <p className="pf-muted">{error || 'Cargando suscripción…'}</p>
  const elegido = planes.find(p => p.id === planId)
  const pagos = detalle.historial.flatMap(s => s.pagos.map(p => ({ ...p, plan: s.plan, periodo: s.periodo })))

  return (
    <div className="pf-sub">
      <div className="pf-sub-grid">
        <div>
          <p className="pf-muted">Plan actual</p>
          <p className="pf-big">{detalle.plan?.nombre ?? 'Sin plan vigente'}</p>
          <p className={detalle.vigente ? 'pf-ok' : 'pf-error'}>
            {detalle.vigente ? `Vigente hasta el ${fecha(detalle.venceEn)}` : 'Suscripción vencida: la tienda está en pausa'}
          </p>
        </div>
        <div>
          <Uso label="Usuarios de equipo" usado={detalle.uso.usuarios} max={detalle.plan?.maxUsuarios} />
          <Uso label="Sucursales" usado={detalle.uso.sucursales} max={detalle.plan?.maxSucursales} />
          <Uso label="Productos" usado={detalle.uso.productos} max={detalle.plan?.maxProductos} />
        </div>
      </div>
      {ok ? <p className="pf-ok">{ok}</p> : null}
      {!abierto ? (
        <button type="button" className="pf-btn" onClick={() => setAbierto(true)}>
          {detalle.vigente ? 'Renovar o cambiar de plan' : 'Renovar ahora'}
        </button>
      ) : (
        <form className="pf-renew" onSubmit={renovar}>
          <div className="pf-row">
            <label>
              Plan
              <select value={planId} onChange={e => setPlanId(e.target.value)}>
                {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label>
              Período
              <select value={periodo} onChange={e => setPeriodo(e.target.value as Periodo)}>
                {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <p className="pf-muted">
            {elegido?.id === detalle.plan?.id
              ? 'Mismo plan: el nuevo período se suma al vencimiento actual.'
              : 'Cambio de plan: empieza hoy y los nuevos límites se aplican al instante.'}
          </p>
          <SelectorPagoPais pais={detalle.pais} metodo={metodoPago} onChange={setMetodoPago} />
          {metodoPago === 'tarjeta' ? <FormTarjeta tarjeta={tarjeta} onChange={setTarjeta} /> : null}
          {metodoPago && metodoPago !== 'tarjeta' ? <label>Resultado de la simulacion<select value={resultadoSimulado} onChange={e => setResultadoSimulado(e.target.value as 'aprobado' | 'rechazado')}><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option></select></label> : null}
          {error ? <p className="pf-error" role="alert">{error}</p> : null}
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setAbierto(false)}>Cancelar</button>
            <button className="pf-btn" disabled={pagando || !metodoPago}>Simular pago {elegido ? usd(elegido.precios[periodo]) : ''}</button>
          </div>
        </form>
      )}
      {pagos.length ? (
        <details className="pf-history">
          <summary>Historial de pagos ({pagos.length})</summary>
          <table className="pf-table">
            <thead><tr><th>Fecha</th><th>Plan</th><th>Período</th><th>Monto</th><th>Método simulado</th><th>Referencia</th></tr></thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.referencia}>
                  <td>{fecha(p.fecha)}</td><td>{p.plan}</td><td>{p.periodo.toLowerCase()}</td>
                  <td>{usd(p.monto)}</td><td>{p.pasarela?.split(':')[1] ?? 'tarjeta'}{(p.pasarela?.endsWith(':tarjeta') || p.pasarela === 'simulada') ? ` · •••• ${p.ultimos4}` : ''}</td><td><code>{p.referencia}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  )
}

export function MisTiendas() {
  const { sesion, refrescar, entrar } = usePlataforma()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  if (!sesion) return <Navigate to="/plataforma/login" replace />

  async function ir(t: TiendaDeCuenta) {
    setError('')
    try {
      await entrar(t.tiendaId)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="pf-my-stores">
      <div className="pf-section-head pf-my-stores-head">
        <div>
          <p className="pf-eyebrow">Hola, {sesion.cuenta.nombre || sesion.cuenta.email}</p>
          <h1>Mis tiendas</h1>
          <p className="pf-muted">Una sola cuenta para todas las tiendas donde tenés acceso.</p>
        </div>
        <Link className="pf-btn" to="/plataforma/nueva">+ Crear otra tienda</Link>
      </div>
      {error ? <p className="pf-error" role="alert">{error}</p> : null}
      {sesion.tiendas.length === 0 ? (
        <div className="pf-card pf-empty">
          <h2>Todavía no tenés tiendas</h2>
          <p>Elegí un plan y comenzá a crear tu tienda.</p>
          <Link className="pf-btn" to="/plataforma/nueva">Crear mi primera tienda</Link>
        </div>
      ) : (
        <div className="pf-stores">
          {sesion.tiendas.map(t => (
            <article key={t.tiendaId} className="pf-store">
              <div className="pf-store-head">
                <span className="pf-avatar" aria-hidden="true">{t.nombre.slice(0, 1)}</span>
                <div>
                  <h2>{t.nombre}</h2>
                  <p className="pf-muted">/t/{t.slug} · {t.rol.toLowerCase()}{t.esDueno ? ' · dueña' : ''}</p>
                </div>
                <span className={`pf-badge${t.vigente ? ' is-ok' : ' is-bad'}`}>
                  {t.vigente ? t.plan ?? 'Activa' : 'Vencida'}
                </span>
              </div>
              <div className="pf-actions">
                <button type="button" className="pf-btn" disabled={!t.vigente} onClick={() => void ir(t)}>
                  Entrar al panel
                </button>
                <Link className="pf-btn pf-btn--ghost" to={`/t/${t.slug}`}>Ver vitrina</Link>
                {t.esDueno ? (
                  <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setAbierta(abierta === t.tiendaId ? null : t.tiendaId)}>
                    {abierta === t.tiendaId ? 'Ocultar suscripción' : 'Suscripción'}
                  </button>
                ) : null}
              </div>
              {abierta === t.tiendaId ? <Suscripcion tienda={t} onCambio={() => void refrescar()} /> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
