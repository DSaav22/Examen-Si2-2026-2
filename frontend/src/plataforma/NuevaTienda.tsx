import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { apiCuenta, type ApiError } from '../api'
import type { SesionTienda } from '../auth'
import { PAISES, PERIODOS, usd, usePlataforma, type Periodo, type PlanPublico } from './comun'

export type Tarjeta = { titular: string; numero: string; vence: string; cvc: string }
export type MetodoPagoPais = { codigo: string; nombre: string; simulado: boolean }
export const TARJETA_SIMULADA: Tarjeta = { titular: 'Pago simulado', numero: '4242 4242 4242 4242', vence: '12/30', cvc: '123' }

export function SelectorPagoPais({ pais, metodo, onChange }: { pais: string; metodo: string; onChange: (valor: string) => void }) {
  const [metodos, setMetodos] = useState<MetodoPagoPais[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let vigente = true
    setMetodos([])
    setError('')
    apiCuenta<{ metodos: MetodoPagoPais[] }>(`/plataforma/paises/${encodeURIComponent(pais)}/metodos-pago`)
      .then(r => {
        if (!vigente) return
        setMetodos(r.metodos)
        onChange(r.metodos.some(m => m.codigo === metodo) ? metodo : r.metodos[0]?.codigo ?? '')
      })
      .catch(() => { if (vigente) { setError('No se pudieron cargar los métodos de pago.'); onChange('') } })
    return () => { vigente = false }
    // La selección se conserva al cambiar de país si el método está disponible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pais])
  return <div className="pf-form">
    <label>Método de pago simulado
      <select value={metodo} onChange={e => onChange(e.target.value)} required>
        <option value="" disabled>Seleccioná un método</option>
        {metodos.map(m => <option key={m.codigo} value={m.codigo}>{m.nombre} · Simulado</option>)}
      </select>
    </label>
    <p className="pf-muted">Es una demostración: no se realiza ningún cobro ni conexión con el proveedor.</p>
    {error ? <p className="pf-error" role="alert">{error}</p> : null}
  </div>
}

const TARJETAS_PRUEBA = [
  { numero: '4242 4242 4242 4242', efecto: 'aprobada' },
  { numero: '4000 0000 0000 0002', efecto: 'rechazada' },
  { numero: '4000 0000 0000 9995', efecto: 'fondos insuficientes' },
]

function slugDe(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function FormTarjeta({ tarjeta, onChange }: { tarjeta: Tarjeta; onChange: (t: Tarjeta) => void }) {
  const set = (k: keyof Tarjeta) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (k === 'numero') v = v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
    if (k === 'vence') v = v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')
    if (k === 'cvc') v = v.replace(/\D/g, '').slice(0, 4)
    onChange({ ...tarjeta, [k]: v })
  }
  return (
    <div className="pf-form">
      <label>
        Titular
        <input value={tarjeta.titular} onChange={set('titular')} required autoComplete="cc-name" />
      </label>
      <label>
        Número de tarjeta
        <input value={tarjeta.numero} onChange={set('numero')} required inputMode="numeric" autoComplete="cc-number" />
      </label>
      <div className="pf-row">
        <label>
          Vence (MM/AA)
          <input value={tarjeta.vence} onChange={set('vence')} required placeholder="12/30" autoComplete="cc-exp" />
        </label>
        <label>
          CVC
          <input value={tarjeta.cvc} onChange={set('cvc')} required inputMode="numeric" autoComplete="cc-csc" />
        </label>
      </div>
      <div className="pf-demo-box">
        <p><b>Pago en modo prueba.</b> No se cobra dinero real. Tarjetas de prueba:</p>
        <ul>
          {TARJETAS_PRUEBA.map(t => (
            <li key={t.numero}>
              <button type="button" className="pf-link" onClick={() => onChange({ ...tarjeta, numero: t.numero, vence: tarjeta.vence || '12/30', cvc: tarjeta.cvc || '123' })}>
                {t.numero}
              </button>{' '}
              → {t.efecto}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function NuevaTienda() {
  const { sesion, irATienda } = usePlataforma()
  const [params] = useSearchParams()
  const [planes, setPlanes] = useState<PlanPublico[]>([])
  const [paso, setPaso] = useState(1)
  const [planId, setPlanId] = useState(params.get('plan') ?? 'plan-crecimiento')
  const [periodo, setPeriodo] = useState<Periodo>((params.get('periodo') as Periodo) || 'MENSUAL')
  const [nombre, setNombre] = useState('')
  const [slugManual, setSlugManual] = useState<string | null>(null)
  const [consulta, setConsulta] = useState<{ slug: string; disponible: boolean } | null>(null)
  const [pais, setPais] = useState('BO')
  const [metodoPago, setMetodoPago] = useState('')
  const [tarjeta, setTarjeta] = useState<Tarjeta>({ titular: sesion?.cuenta.nombre ?? '', numero: '', vence: '', cvc: '' })
  // Misma clave para reintentos del mismo intento (doble clic); nueva clave tras un rechazo.
  const [clave, setClave] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    apiCuenta<PlanPublico[]>('/plataforma/planes').then(setPlanes).catch(() => undefined)
  }, [])

  const slug = slugManual ?? slugDe(nombre)
  const disponible = consulta?.slug === slug ? consulta.disponible : null

  useEffect(() => {
    if (slug.length < 3) return
    const t = window.setTimeout(() => {
      apiCuenta<{ disponible: boolean }>(`/plataforma/slug-disponible?slug=${encodeURIComponent(slug)}`)
        .then(r => setConsulta({ slug, disponible: r.disponible }))
        .catch(() => undefined)
    }, 300)
    return () => window.clearTimeout(t)
  }, [slug])

  const plan = useMemo(() => planes.find(p => p.id === planId), [planes, planId])
  const moneda = PAISES.find(p => p.codigo === pais)?.moneda ?? 'USD'

  if (!sesion) return <Navigate to={`/plataforma/login`} replace />

  async function pagar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setPagando(true)
    try {
      const s = await apiCuenta<SesionTienda>('/plataforma/suscribir', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          periodo,
          tienda: { nombre, slug, pais, moneda },
          pago: metodoPago === 'tarjeta' ? tarjeta : TARJETA_SIMULADA,
          metodoPago,
          idempotencyKey: clave,
        }),
      })
      irATienda(s)
    } catch (err) {
      const e2 = err as ApiError
      setError(e2.message)
      if (e2.status === 402 || e2.status === 409) setClave(crypto.randomUUID())
      if (e2.codigo === 'SLUG_EN_USO') setPaso(2)
    } finally {
      setPagando(false)
    }
  }

  return (
    <section className="pf-wizard">
      <ol className="pf-wizard-steps">
        <li className={paso >= 1 ? 'is-on' : ''}>Plan</li>
        <li className={paso >= 2 ? 'is-on' : ''}>Tu tienda</li>
        <li className={paso >= 3 ? 'is-on' : ''}>Pago</li>
      </ol>

      {paso === 1 ? (
        <div className="pf-card">
          <h1>Elegí tu plan</h1>
          <div className="pf-toggle" role="radiogroup" aria-label="Período">
            {PERIODOS.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id} className={periodo === p.id ? 'is-on' : ''} onClick={() => setPeriodo(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="pf-plan-pick">
            {planes.map(p => (
              <label key={p.id} className={`pf-plan-option${planId === p.id ? ' is-on' : ''}`}>
                <input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} />
                <span>
                  <b>{p.nombre}</b>
                  <small>
                    {p.limites.usuarios} usuarios · {p.limites.sucursales} suc. · {p.limites.productos ?? '∞'} productos
                  </small>
                </span>
                <strong>{usd(p.precios[periodo])}</strong>
              </label>
            ))}
          </div>
          <div className="pf-actions">
            <Link className="pf-btn pf-btn--ghost" to="/plataforma">Cancelar</Link>
            <button type="button" className="pf-btn" disabled={!plan} onClick={() => setPaso(2)}>Seguir</button>
          </div>
        </div>
      ) : null}

      {paso === 2 ? (
        <form
          className="pf-card"
          onSubmit={e => {
            e.preventDefault()
            if (disponible) setPaso(3)
          }}
        >
          <h1>Datos de tu tienda</h1>
          <div className="pf-form">
            <label>
              Nombre comercial
              <input value={nombre} onChange={e => setNombre(e.target.value)} required minLength={2} maxLength={60} />
            </label>
            <label>
              Dirección de tu tienda
              <span className="pf-slug">
                <span>ensayar.app/t/</span>
                <input
                  value={slug}
                  onChange={e => setSlugManual(slugDe(e.target.value))}
                  required
                  minLength={3}
                />
              </span>
              <small className={disponible === false ? 'pf-error' : disponible ? 'pf-ok' : 'pf-muted'}>
                {slug.length < 3 ? 'Al menos 3 caracteres.' : disponible === null ? 'Comprobando…' : disponible ? 'Disponible' : 'No disponible'}
              </small>
            </label>
            <label>
              País
              <select value={pais} onChange={e => setPais(e.target.value)}>
                {PAISES.map(p => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre} ({p.moneda})
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error ? <p className="pf-error">{error}</p> : null}
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setPaso(1)}>Atrás</button>
            <button className="pf-btn" disabled={!disponible}>Seguir</button>
          </div>
        </form>
      ) : null}

      {paso === 3 && plan ? (
        <form className="pf-card pf-checkout" onSubmit={pagar}>
          <div>
            <h1>Pago</h1>
            <SelectorPagoPais pais={pais} metodo={metodoPago} onChange={setMetodoPago} />
            {metodoPago === 'tarjeta' ? <FormTarjeta tarjeta={tarjeta} onChange={setTarjeta} /> : null}
          </div>
          <aside className="pf-summary">
            <h2>Resumen</h2>
            <dl>
              <div><dt>Tienda</dt><dd>{nombre}</dd></div>
              <div><dt>Dirección</dt><dd>/t/{slug}</dd></div>
              <div><dt>Plan</dt><dd>{plan.nombre}</dd></div>
              <div><dt>Período</dt><dd>{PERIODOS.find(p => p.id === periodo)?.label}</dd></div>
              <div className="pf-total"><dt>Total hoy</dt><dd>{usd(plan.precios[periodo])}</dd></div>
            </dl>
            <p className="pf-muted">Al pagar se crea tu tienda con una sucursal, un almacén y tu usuario administrador.</p>
            {error ? <p className="pf-error" role="alert">{error}</p> : null}
            <div className="pf-actions">
              <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setPaso(2)}>Atrás</button>
              <button className="pf-btn" disabled={pagando || !metodoPago}>{pagando ? 'Procesando…' : `Simular pago ${usd(plan.precios[periodo])}`}</button>
            </div>
          </aside>
        </form>
      ) : null}
    </section>
  )
}
