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
    <div className="pf-demo-box">
      <p>
        <b>Modo demo:</b> no hay servidor de correo configurado, así que el enlace se muestra acá en vez de enviarse.
      </p>
      <Link className="pf-btn" to={`${url.pathname}${url.search}`}>Abrir enlace de verificación</Link>
    </div>
  )
}

export function Empezar() {
  const { sesion } = usePlataforma()
  const [params] = useSearchParams()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enUso, setEnUso] = useState(false)
  const [enviado, setEnviado] = useState<{ email: string; verificacion: Verificacion } | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const plan = params.get('plan')
    if (plan) sessionStorage.setItem(PLAN_ELEGIDO, `plan=${plan}&periodo=${params.get('periodo') ?? 'MENSUAL'}`)
  }, [params])

  if (sesion) return <Navigate to={`/plataforma/nueva?${params.toString()}`} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError('')
    setEnUso(false)
    setCargando(true)
    try {
      const r = await apiCuenta<{ email: string; verificacion: Verificacion }>('/plataforma/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password }),
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

  if (enviado) {
    return (
      <section className="pf-card pf-narrow">
        <p className="pf-eyebrow">Paso 1 de 3</p>
        <h1>Revisá tu correo</h1>
        <p>
          Te enviamos un enlace a <b>{enviado.email}</b> para confirmar que es tuyo. Al abrirlo seguís con la elección
          del plan y el pago.
        </p>
        <EnlaceDemo v={enviado.verificacion} />
      </section>
    )
  }

  return (
    <section className="pf-card pf-narrow">
      <p className="pf-eyebrow">Paso 1 de 3</p>
      <h1>Creá tu cuenta</h1>
      <p className="pf-muted">Con esta cuenta administrás tus tiendas y entrás a todas con un solo login.</p>
      <form className="pf-form" onSubmit={enviar}>
        <label>
          Tu nombre
          <input value={nombre} onChange={e => setNombre(e.target.value)} required minLength={2} autoComplete="name" />
        </label>
        <label>
          Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Clave (mínimo 8 caracteres)
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
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
        ¿Ya tenés cuenta? <Link to="/plataforma/login">Entrar</Link>
      </p>
    </section>
  )
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
    const r = await apiCuenta<{ verificacion?: Verificacion }>('/plataforma/reenviar-verificacion', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
    setReenvio(r.verificacion ?? { modo: 'smtp' })
  }

  return (
    <section className="pf-card pf-narrow">
      <h1>Entrar a la plataforma</h1>
      <p className="pf-muted">Para dueñas de tiendas y para el equipo de EnsayAR.</p>
      <form className="pf-form" onSubmit={enviar}>
        <label>
          Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Clave
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
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
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="pf-muted">
        ¿No tenés cuenta? <Link to="/empezar">Creá tu tienda</Link>
      </p>
      <p className="pf-hint">
        Demo: dueña <code>duena@aurora.demo</code> · equipo EnsayAR <code>superadmin@ensayar.bo</code> · clave{' '}
        <code>diego</code>
      </p>
    </section>
  )
}
