import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { apiCuenta, type ApiError } from '../api'
import type { SesionTienda } from '../auth'
import { MODULOS, PAISES, PERIODOS, usd, usePlataforma, type Periodo, type PlanPublico } from './comun'

export type Tarjeta = { titular: string; numero: string; vence: string; cvc: string }
export type MetodoPagoPais = { codigo: string; nombre: string; simulado: boolean }
export const TARJETA_SIMULADA: Tarjeta = { titular: 'Pago simulado', numero: '4242 4242 4242 4242', vence: '12/30', cvc: '123' }

function IconoPago({ codigo }: { codigo: string }) {
  const tarjeta = codigo === 'tarjeta'
  const qr = codigo === 'qr_bolivia' || codigo === 'pix'
  return <svg className="pf-payment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tarjeta ? <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 9h20M5 15h4" /></>
      : qr ? <><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM20 15v3M15 21h3M21 21h.01" /></>
        : <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M15 14h3" /></>}
  </svg>
}

export function SelectorPagoPais({ pais, metodo, onChange }: { pais: string; metodo: string; onChange: (valor: string) => void }) {
  const [metodos, setMetodos] = useState<MetodoPagoPais[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let vigente = true
    setMetodos([])
    onChange('')
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
    <fieldset className="pf-payment-methods">
      <legend>Método de pago simulado</legend>
      <div className="pf-payment-grid">
        {metodos.map(m => <label className={`pf-payment-option${metodo === m.codigo ? ' is-selected' : ''}`} key={m.codigo}>
          <input type="radio" name="metodo-pago-pais" value={m.codigo} checked={metodo === m.codigo} onChange={() => onChange(m.codigo)} required />
          <IconoPago codigo={m.codigo} />
          <span>{m.nombre}<small>Simulado</small></span>
        </label>)}
      </div>
    </fieldset>
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
  const [errorPlanes, setErrorPlanes] = useState('')
  const [paso, setPaso] = useState(1)
  const [planId, setPlanId] = useState(params.get('plan') ?? 'plan-crecimiento')
  const [periodo, setPeriodo] = useState<Periodo>(() => PERIODOS.some(p => p.id === params.get('periodo')) ? params.get('periodo') as Periodo : 'MENSUAL')
  const [nombre, setNombre] = useState('')
  const [logo, setLogo] = useState('')
  const [errorLogo, setErrorLogo] = useState('')
  const [cargandoLogo, setCargandoLogo] = useState(false)

  async function elegirLogo(archivo?: File) {
    if (!archivo) return
    setErrorLogo('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setErrorLogo('Elegí una imagen PNG, JPG o WebP de hasta 5 MB.')
      return
    }
    setCargandoLogo(true)
    try {
      const imagen = await createImageBitmap(archivo)
      try {
        const escala = Math.min(1, 512 / Math.max(imagen.width, imagen.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(imagen.width * escala))
        canvas.height = Math.max(1, Math.round(imagen.height * escala))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error()
        ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height)
        const resultado = canvas.toDataURL('image/webp', 0.85)
        if (resultado.length > 390000) throw new Error()
        setLogo(resultado)
      } finally { imagen.close() }
    } catch { setErrorLogo('No se pudo procesar la imagen. Probá con otra más pequeña.') }
    finally { setCargandoLogo(false) }
  }
  const [slugManual, setSlugManual] = useState<string | null>(null)
  const [consulta, setConsulta] = useState<{ slug: string; disponible: boolean } | null>(null)
  const [pais, setPais] = useState('BO')
  const [metodoPago, setMetodoPago] = useState('')
  const [resultadoSimulado, setResultadoSimulado] = useState<'aprobado' | 'rechazado'>('aprobado')
  const [tarjeta, setTarjeta] = useState<Tarjeta>({ titular: sesion?.cuenta.nombre ?? '', numero: '', vence: '', cvc: '' })
  // Misma clave para reintentos del mismo intento (doble clic); nueva clave tras un rechazo.
  const [clave, setClave] = useState(() => crypto.randomUUID())
  const [error, setError] = useState('')
  const [pagando, setPagando] = useState(false)
  const [tiendaCreada, setTiendaCreada] = useState<SesionTienda | null>(null)

  useEffect(() => {
    apiCuenta<PlanPublico[]>('/plataforma/planes').then(setPlanes).catch(() => setErrorPlanes('No se pudieron cargar los planes. Volvé a intentarlo.'))
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
  const periodoInfo = PERIODOS.find(p => p.id === periodo) ?? PERIODOS[0]

  if (!sesion) return <Navigate to={`/plataforma/login`} replace />

  async function pagar(e: FormEvent) {
    e.preventDefault()
    if (pagando || !metodoPago) return
    setError('')
    setPagando(true)
    try {
      const s = await apiCuenta<SesionTienda>('/plataforma/suscribir', {
        method: 'POST',
        body: JSON.stringify({
          planId,
          periodo,
          tienda: { nombre, slug, pais, moneda, ...(logo ? { logo } : {}) },
          pago: metodoPago === 'tarjeta' ? tarjeta : { ...TARJETA_SIMULADA, numero: resultadoSimulado === 'aprobado' ? TARJETA_SIMULADA.numero : '4000000000000002' },
          metodoPago,
          idempotencyKey: clave,
        }),
      })
      setTiendaCreada(s)
      setPaso(4)
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
        <li className={paso >= 1 ? 'is-on' : ''} aria-current={paso === 1 ? 'step' : undefined}>Plan</li>
        <li className={paso >= 2 ? 'is-on' : ''} aria-current={paso === 2 ? 'step' : undefined}>Tienda</li>
        <li className={paso >= 3 ? 'is-on' : ''} aria-current={paso === 3 ? 'step' : undefined}>Pago</li>
        <li className={paso >= 4 ? 'is-on' : ''} aria-current={paso === 4 ? 'step' : undefined}>Confirmación</li>
      </ol>
      <p className="pf-wizard-count">Paso {paso} de 4</p>

      {paso === 1 ? (
        <div className="pf-plan-layout">
          <div className="pf-plan-main">
          <h1>Elegí el plan para tu negocio</h1>
          <p className="pf-muted">Podés cambiar de plan más adelante.</p>
          <div className="pf-toggle" role="radiogroup" aria-label="Período">
            {PERIODOS.map(p => (
              <button key={p.id} type="button" role="radio" aria-checked={periodo === p.id} className={periodo === p.id ? 'is-on' : ''} onClick={() => setPeriodo(p.id)}>
                {p.label}{p.id === 'TRIMESTRAL' ? <small>−10 %</small> : p.id === 'ANUAL' ? <small>−20 %</small> : null}
              </button>
            ))}
          </div>
          {errorPlanes && <p className="pf-error" role="alert">{errorPlanes}</p>}
          <div className="pf-plan-pick">
            {planes.map(p => (
              <label key={p.id} className={`pf-plan-option${planId === p.id ? ' is-on' : ''}`}>
                {p.destacado && <span className="pf-pick-badge">Más elegido</span>}
                <span className="pf-pick-title"><input type="radio" name="plan" checked={planId === p.id} onChange={() => setPlanId(p.id)} /><b>{p.nombre}</b></span>
                <span className="pf-pick-price"><strong>{usd(p.precios[periodo] / periodoInfo.meses)}</strong> / mes</span>
                <span className="pf-pick-limits">{p.limites.usuarios} usuarios<br />{p.limites.sucursales} {p.limites.sucursales === 1 ? 'sucursal' : 'sucursales'}<br />{p.limites.productos == null ? 'Sin límite de productos' : `${p.limites.productos.toLocaleString('es-BO')} productos`}</span>
                <ul className="pf-pick-features">{p.modulos.map(m => <li key={m}>{MODULOS[m] ?? m}</li>)}</ul>
              </label>
            ))}
          </div>
          <Link className="pf-compare-link" to="/planes#planes">Comparar funcionalidades ↗</Link>
          </div>
          <aside className="pf-selection"><p className="pf-selection-label">Tu selección</p>{plan ? <><h2>Plan {plan.nombre}</h2><p>Facturación {periodoInfo.label.toLowerCase()}</p><div className="pf-selection-total"><b>Total</b><span>{usd(plan.precios[periodo])}</span></div></> : <p>Seleccioná un plan para continuar.</p>}<button type="button" className="pf-btn pf-btn--block" disabled={!plan} onClick={() => setPaso(2)}>Continuar →</button></aside>
        </div>
      ) : null}

      {paso === 2 ? (
        <form
          className="pf-card pf-store-form"
          onSubmit={e => {
            e.preventDefault()
            if (disponible) setPaso(3)
          }}
        >
          <h1>Contanos sobre tu tienda</h1>
          <div className="pf-form">
            <label>Logo de tu empresa (opcional)
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={cargandoLogo} onChange={e => { void elegirLogo(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            <p className="pf-muted">PNG, JPG o WebP, hasta 5 MB. Si no añadís logo, se mostrará el nombre de tu tienda.</p>
            {cargandoLogo ? <p role="status">Preparando imagen…</p> : null}
            {errorLogo ? <p className="pf-error" role="alert">{errorLogo}</p> : null}
            <div aria-label="Vista previa de la marca" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, border: '1px solid currentColor', borderRadius: 12 }}>
              {logo ? <img src={logo} alt={`Logo de ${nombre || 'tu tienda'}`} style={{ maxWidth: 180, height: 64, objectFit: 'contain' }} /> : <strong>{nombre || 'Nombre de tu tienda'}</strong>}
              {logo ? <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setLogo('')}>Quitar logo</button> : null}
            </div>
          </div>
          <div className="pf-form">
            <label>
              Nombre comercial
              <input value={nombre} onChange={e => setNombre(e.target.value)} required minLength={2} maxLength={60} />
            </label>
            <label>
              Dirección de tu tienda
              <span className="pf-slug">
                <span>{window.location.host}/t/</span>
                <input
                  value={slug}
                  onChange={e => setSlugManual(slugDe(e.target.value))}
                  required
                  minLength={3}
                />
              </span>
              <small className={disponible === false ? 'pf-error' : disponible ? 'pf-ok' : 'pf-muted'}>
                {slug.length < 3 ? 'Al menos 3 caracteres.' : disponible === null ? 'Comprobando…' : disponible ? '✓ Esta dirección está disponible' : 'Esta dirección no está disponible'}
              </small>
            </label>
            <label>
              País de operación
              <select value={pais} onChange={e => { setPais(e.target.value); setMetodoPago('') }}>
                {PAISES.map(p => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nombre} ({p.moneda})
                  </option>
                ))}
              </select>
            </label>
            <label>Moneda de la tienda<input value={moneda} readOnly aria-readonly="true" /></label>
            <p className="pf-muted pf-country-note">Tu tienda venderá dentro del país seleccionado. Los métodos de pago se mostrarán según ese país.</p>
          </div>
          {error ? <p className="pf-error">{error}</p> : null}
          <div className="pf-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setPaso(1)}>← Volver</button>
            <button className="pf-btn" disabled={!disponible || cargandoLogo}>Continuar →</button>
          </div>
        </form>
      ) : null}

      {paso === 3 && plan ? (
        <form className="pf-card pf-checkout pf-subscription-payment" onSubmit={pagar}>
          <h1>Pagar suscripción</h1>
          <div className="pf-subscription-columns">
          <div className="pf-subscription-methods">
            <SelectorPagoPais pais={pais} metodo={metodoPago} onChange={setMetodoPago} />
            {metodoPago === 'tarjeta' ? <FormTarjeta tarjeta={tarjeta} onChange={setTarjeta} /> : null}
          {metodoPago && metodoPago !== 'tarjeta' ? <label>Resultado de la simulacion<select value={resultadoSimulado} onChange={e => setResultadoSimulado(e.target.value as 'aprobado' | 'rechazado')}><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option></select></label> : null}
            {metodoPago && metodoPago !== 'tarjeta' ? <div className="pf-payment-simulated-detail"><IconoPago codigo={metodoPago} /><p>Al continuar se simulará el pago con el método seleccionado.</p><small>No se generará una transacción ni un código de pago real.</small></div> : null}
          </div>
          <aside className="pf-summary">
            <h2>Resumen</h2>
            <dl>
              <div><dt>Tienda</dt><dd>{nombre}</dd></div>
              <div><dt>País</dt><dd>{PAISES.find(p => p.codigo === pais)?.nombre ?? pais}</dd></div>
              <div><dt>Plan</dt><dd>{plan.nombre}</dd></div>
              <div><dt>Período</dt><dd>{PERIODOS.find(p => p.id === periodo)?.label}</dd></div>
              <div className="pf-total"><dt>Total simulado</dt><dd>{usd(plan.precios[periodo])}</dd></div>
            </dl>
          </aside>
          </div>
          <p className="pf-payment-disclaimer">Modo demostración: este pago es ficticio y no se realiza ningún cobro.</p>
          {error ? <div className="pf-checkout-error" role="alert"><b>No se pudo completar el pago simulado</b><p>{error}</p><small>Revisá los datos o volvé a intentarlo. Si se interrumpió la conexión, comprobá tus tiendas antes de crear otra.</small></div> : null}
          <div className="pf-actions pf-payment-actions">
            <button type="button" className="pf-btn pf-btn--ghost" onClick={() => setPaso(2)}>← Volver</button>
            <button className="pf-btn" disabled={pagando || !metodoPago}>{pagando ? 'Procesando…' : 'Simular pago y crear tienda →'}</button>
          </div>
        </form>
      ) : null}
      {paso === 4 && tiendaCreada ? (
        <section className="pf-card pf-success-card" aria-labelledby="tienda-creada-titulo">
          <div className="pf-success-icon" aria-hidden="true">✓</div>
          <p className="pf-eyebrow">Pago simulado aprobado</p>
          <h1 id="tienda-creada-titulo">¡Tu tienda está lista!</h1>
          <p className="pf-muted">Ya podés entrar y empezar a configurar tu espacio.</p>
          <dl className="pf-success-details">
            <div><dt>Tienda</dt><dd>{tiendaCreada.tienda.nombre}</dd></div>
            <div><dt>Dirección</dt><dd><Link to={`/t/${tiendaCreada.tienda.slug}`}>{window.location.host}/t/{tiendaCreada.tienda.slug}</Link></dd></div>
            <div><dt>Plan</dt><dd>{plan?.nombre ?? tiendaCreada.tienda.plan ?? 'Seleccionado'}</dd></div>
            <div><dt>Período</dt><dd>{periodoInfo.label}</dd></div>
          </dl>
          <button type="button" className="pf-btn pf-btn--block" onClick={() => irATienda(tiendaCreada)}>Entrar a mi tienda →</button>
          <Link className="pf-success-back" to="/plataforma">Volver a mis tiendas</Link>
        </section>
      ) : null}
    </section>
  )
}
