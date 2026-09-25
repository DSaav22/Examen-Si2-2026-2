import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { Button } from '../shared/Button'
import { FormField } from '../shared/FormField'
import { ThemeToggle } from '../shared/ThemeToggle'

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/login') || raw.startsWith('/registro')) return null
  return raw
}

function passwordHints(value: string) {
  return {
    length: value.length >= 8,
    mixed: /[a-z]/.test(value) && /[A-Z]/.test(value),
    number: /\d/.test(value),
  }
}

export function Registro() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => safeNext(params.get('next')), [params])
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const hints = passwordHints(password)

  if (user) {
    return <Navigate to={next && user.rol === 'CLIENTA' ? next : homePorRol(user.rol)} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmacion) {
      setError('La clave y la confirmación no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La clave debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      const u = await register(nombre.trim(), email.trim(), password)
      navigate(next && u.rol === 'CLIENTA' ? next : homePorRol(u.rol))
    } catch (err) {
      const e = err as Error & { codigo?: string }
      const code = e?.codigo ?? e?.message ?? ''
      setError(
        code === 'EMAIL_EN_USO'
          ? 'Ese correo ya tiene cuenta. Probá entrar.'
          : e?.message || 'No se pudo crear la cuenta.',
      )
    } finally {
      setLoading(false)
    }
  }

  const loginTo = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <div className="login-screen auth-screen">
      <form className="card login-card auth-card" onSubmit={onSubmit}>
        <div className="login-toolbar">
          <Link className="auth-brand" to="/inicio">
            VESTA
          </Link>
          <ThemeToggle />
        </div>
        <p className="eyebrow">Nueva clienta</p>
        <h1>Crear cuenta</h1>
        <p className="muted">
          {next === '/carrito'
            ? 'Creá tu cuenta para pagar. Las prendas de tu bolsa se conservan.'
            : 'Así podés pedir, guardar favoritos y ver tu historial.'}
        </p>
        <FormField
          label="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          minLength={2}
          required
        />
        <FormField
          label="Correo"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <FormField
          label="Clave"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <FormField
          label="Confirmar clave"
          type="password"
          value={confirmacion}
          onChange={e => setConfirmacion(e.target.value)}
          minLength={8}
          required
        />
        <ul className="auth-password-hints" aria-label="Requisitos de la clave">
          <li className={hints.length ? 'is-ok' : undefined}>Al menos 8 caracteres</li>
          <li className={hints.mixed ? 'is-ok' : undefined}>Mayúsculas y minúsculas</li>
          <li className={hints.number ? 'is-ok' : undefined}>Un número</li>
        </ul>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando…' : 'Crear cuenta'}
        </Button>
        <p className="hint">
          ¿Ya tenés cuenta? <Link to={loginTo}>Entrar</Link>
        </p>
        <Link className="auth-back" to="/inicio">
          ← Seguir mirando la tienda
        </Link>
      </form>
    </div>
  )
}
