import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { apiCuenta, type ApiError } from '../api'
import { usePlataforma, type SesionCuenta } from './comun'

type Verificacion = { modo: string; url?: string }
const PLAN_ELEGIDO = 'ensayar_plan_elegido'

function destinoTrasEntrar(tiendas: number) {
  const elegido = sessionStorage.getItem(PLAN_ELEGIDO)
  if (elegido) {
    sessionStorage.removeItem(PLAN_ELEGIDO)
    return `/plataforma/nueva?${elegido}`
  }
  return tiendas ? '/plataforma' : '/plataforma/nueva'
}

/** En modo demo (sin SMTP) el backend devuelve el enlace; se abre dentro de la app. */
function EnlaceDemo({ v }: { v: Verificacion | null }) {
  if (!v?.url) return null
  const url = new URL(v.url)
  return (
    <div className="pf-demo-box pf-verify-demo">
      <p>
        <b>Modo demostración:</b> el envío de correo está simulado.
      </p>
      <Link className="pf-btn pf-btn--ghost" to={`${url.pathname}${url.search}`}>Abrir enlace de verificación de prueba</Link>
    </div>
  )
}

export function Empezar() {
  const { sesion } = usePlataforma()
  const [params] = useSearchParams()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [error, setError] = useState('')
  const [enUso, setEnUso] = useState(false)
  const [enviado, setEnviado] = useState<{ email: string; verificacion: Verificacion } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mensajeReenvio, setMensajeReenvio] = useState('')
  const [reenviando, setReenviando] = useState(false)
  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const reglas = [
    { texto: 'Al menos 8 caracteres', cumple: password.length >= 8 },
    { texto: 'Una letra mayúscula', cumple: /[A-ZÁÉÍÓÚÑ]/.test(password) },
    { texto: 'Una letra minúscula', cumple: /[a-záéíóúñ]/.test(password) },
    { texto: 'Un número', cumple: /[0-9]/.test(password) },
  ]
  const claveValida = reglas.every(r => r.cumple)
  const coinciden = Boolean(confirmacion) && confirmacion === password

  useEffect(() => {
    const plan = params.get('plan')
    if (plan) sessionStorage.setItem(PLAN_ELEGIDO, `plan=${plan}&periodo=${params.get('periodo') ?? 'MENSUAL'}`)
  }, [params])

  if (sesion) return <Navigate to={`/plataforma/nueva?${params.toString()}`} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!correoValido || !claveValida || !coinciden) {
      setError('Revisá el correo y los requisitos de la contraseña.')
      return
    }
    setError('')
    setEnUso(false)
    setCargando(true)
    try {
      const r = await apiCuenta<{ email: string; verificacion: Verificacion }>('/plataforma/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim(), password }),
      })
      setEnviado(r)
    } catch (err) {
      const e2 = err as ApiError
      setEnUso(e2.codigo === 'EMAIL_EN_USO')
      setError(e2.message)
    } finally {
      setCargando(false)
    }
  }

  async function reenviarCorreo() {
    if (!enviado || reenviando) return
    setMensajeReenvio('')
    setReenviando(true)
    try {
      const r = await apiCuenta<{ verificacion?: Verificacion }>('/plataforma/reenviar-verificacion', {
        method: 'POST', body: JSON.stringify({ email: enviado.email }),
      })
      if (r.verificacion) setEnviado({ ...enviado, verificacion: r.verificacion })
      setMensajeReenvio('Si la cuenta sigue sin verificar, se volvió a generar el envío.')
    } catch (err) {
      setMensajeReenvio((err as Error).message || 'No se pudo reenviar el correo.')
    } finally { setReenviando(false) }
  }

  if (enviado) {
    return (
      <section className="pf-card pf-narrow pf-account-card pf-verify-card">
        <svg className="pf-mail-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><rect x="4" y="9" width="40" height="30" rx="3"/><path d="m5 11 19 15 19-15M5 37l13-12m25 12L30 25"/></svg>
        <h1>Revisá tu correo</h1>
        <p className="pf-muted">{enviado.verificacion?.modo === 'simulado' ? 'El enlace de verificación de prueba corresponde a:' : 'Enviamos un enlace de verificación a:'}<br /><b className="pf-email-value">{enviado.email}</b><br />Abrí el enlace para confirmar tu cuenta.</p>
        <Link className="pf-btn pf-btn--block" to="/plataforma/login">Ya confirmé mi correo</Link>
        <p className="pf-muted pf-verify-links">¿No llegó el mensaje? <button type="button" onClick={() => void reenviarCorreo()} disabled={reenviando}>{reenviando ? 'Reenviando…' : 'Reenviar correo'}</button></p>
        <p className="pf-muted pf-verify-links">¿Te equivocaste? <button type="button" onClick={() => { setEnviado(null); setMensajeReenvio('') }}>Cambiar correo</button></p>
        {mensajeReenvio && <p className="pf-muted" role="status">{mensajeReenvio}</p>}
        <EnlaceDemo v={enviado.verificacion} />
      </section>
    )
  }

  return (
    <section className="pf-card pf-narrow pf-account-card">
      <div className="pf-account-brand">EnsayAR</div>
      <h1>Creá tu cuenta</h1>
      <p className="pf-muted pf-account-subtitle">Una cuenta para administrar tus tiendas.</p>
      <form className="pf-form" onSubmit={enviar}>
        <label>
          Nombre completo
          <input value={nombre} onChange={e => setNombre(e.target.value)} required minLength={2} autoComplete="name" />
        </label>
        <label>
          Correo electrónico
          <input className={email ? correoValido ? 'is-valid' : 'is-invalid' : ''} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" aria-describedby="cuenta-correo-ayuda" />
          {email && <span id="cuenta-correo-ayuda" className={correoValido ? 'pf-validation-ok' : 'pf-validation-error'}>{correoValido ? '✓ Correo válido' : 'Ingresá un correo válido'}</span>}
        </label>
        <label>
          Contraseña
          <span className="pf-password-field"><input
            type={mostrarClave ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          /><button type="button" onClick={() => setMostrarClave(!mostrarClave)} aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}><Ojo /></button></span>
        </label>
        <ul className="pf-password-rules" aria-label="Requisitos de contraseña">{reglas.map(r => <li key={r.texto} className={r.cumple ? 'is-met' : ''}><span aria-hidden="true">{r.cumple ? '✓' : '○'}</span> {r.texto}</li>)}</ul>
        <label>Confirmar contraseña
          <span className="pf-password-field"><input type={mostrarConfirmacion ? 'text' : 'password'} value={confirmacion} onChange={e => setConfirmacion(e.target.value)} className={confirmacion ? coinciden ? 'is-valid' : 'is-invalid' : ''} required autoComplete="new-password" aria-describedby="confirmacion-ayuda" /><button type="button" onClick={() => setMostrarConfirmacion(!mostrarConfirmacion)} aria-label={mostrarConfirmacion ? 'Ocultar confirmación' : 'Mostrar confirmación'}><Ojo /></button></span>
          {confirmacion && !coinciden && <span id="confirmacion-ayuda" className="pf-validation-error">Las contraseñas no coinciden.</span>}
        </label>
        {error ? (
          <p className="pf-error" role="alert">
            {error} {enUso ? <Link to="/plataforma/login">Entrar con esa cuenta</Link> : null}
          </p>
        ) : null}
        <button className="pf-btn pf-btn--block" disabled={cargando}>
          {cargando ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="pf-muted">
        ¿Ya tenés cuenta? <Link to="/plataforma/login">Iniciar sesión</Link>
      </p>
    </section>
  )
}

function Ojo() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
}

export function Verificar() {
  const { guardar } = usePlataforma()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const usado = useRef(false)

  useEffect(() => {
    const token = params.get('token')
    if (!token || usado.current) return
    usado.current = true
    apiCuenta<SesionCuenta>('/plataforma/verificar', { method: 'POST', body: JSON.stringify({ token }) })
      .then(s => {
        guardar(s)
        navigate(destinoTrasEntrar(s.tiendas.length), { replace: true })
      })
      .catch(e => setError((e as Error).message))
  }, [params, guardar, navigate])

  return (
    <section className="pf-card pf-narrow">
      <h1>Confirmando tu correo…</h1>
      {error ? (
        <>
          <p className="pf-error">{error}</p>
          <Link className="pf-btn" to="/plataforma/login">Ir a entrar</Link>
        </>
      ) : (
        <p className="pf-muted">Un momento.</p>
      )}
    </section>
  )
}

export function PlataformaLogin() {
  const { sesion, guardar } = usePlataforma()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [error, setError] = useState('')
  const [sinVerificar, setSinVerificar] = useState(false)
  const [reenvio, setReenvio] = useState<Verificacion | null>(null)
  const [cargando, setCargando] = useState(false)

  if (sesion) return <Navigate to="/plataforma" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSinVerificar(false)
    setCargando(true)
    try {
      const s = await apiCuenta<SesionCuenta>('/plataforma/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      guardar(s)
      navigate(s.cuenta.plataforma && !s.tiendas.length ? '/plataforma/admin' : destinoTrasEntrar(s.tiendas.length))
    } catch (err) {
      const e2 = err as ApiError
      setSinVerificar(e2.codigo === 'EMAIL_NO_VERIFICADO')
      setError(e2.message)
    } finally {
      setCargando(false)
    }
  }

  async function reenviar() {
    try {
      const r = await apiCuenta<{ verificacion?: Verificacion }>('/plataforma/reenviar-verificacion', {
        method: 'POST', body: JSON.stringify({ email }),
      })
      setReenvio(r.verificacion ?? { modo: 'smtp' })
    } catch (err) { setError((err as Error).message || 'No se pudo reenviar el correo.') }
  }

  return (
    <section className="pf-card pf-narrow pf-account-card">
      <div className="pf-account-brand">EnsayAR</div>
      <h1>Iniciá sesión</h1>
      <p className="pf-muted pf-account-subtitle">Administrá tus tiendas desde una sola cuenta.</p>
      <form className="pf-form" onSubmit={enviar}>
        <label>
          Correo electrónico
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <span className="pf-password-field"><input
            type={mostrar ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          /><button type="button" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}><Ojo /></button></span>
        </label>
        {error ? <p className="pf-error" role="alert">{error}</p> : null}
        {sinVerificar ? (
          <button type="button" className="pf-btn pf-btn--ghost" onClick={() => void reenviar()}>
            Reenviar el enlace de verificación
          </button>
        ) : null}
        {reenvio && !reenvio.url ? <p className="pf-ok">Te reenviamos el enlace.</p> : null}
        <EnlaceDemo v={reenvio} />
        <button className="pf-btn pf-btn--block" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="pf-muted">
        ¿No tenés cuenta? <Link to="/empezar">Creá tu tienda</Link>
      </p>
    </section>
  )
}
