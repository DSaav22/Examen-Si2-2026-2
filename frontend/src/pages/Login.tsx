import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { Button } from '../shared/Button'
import { FormField } from '../shared/FormField'
import { useTiendaPublica } from '../shared/SelectorTienda'
import { ThemeToggle } from '../shared/ThemeToggle'

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.startsWith('/login') || raw.startsWith('/registro')) return null
  return raw
}

/** Clienta: cualquier next seguro. Admin: solo el probador (para probar IA). */
function puedeSeguirNext(rol: string, next: string | null) {
  if (!next) return false
  if (rol === 'CLIENTA') return true
  if ((rol === 'ADMIN' || rol === 'SUPERADMIN') && next.startsWith('/probar/')) return true
  return false
}

export function Login() {
  const { user, login } = useAuth()
  const marca = useTiendaPublica()?.nombre ?? 'Vesta'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = useMemo(() => safeNext(params.get('next')), [params])
  const [email, setEmail] = useState('clienta@ensayar.bo')
  const [password, setPassword] = useState('diego')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={next && puedeSeguirNext(user.rol, next) ? next : homePorRol(user.rol)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      navigate(next && puedeSeguirNext(u.rol, next) ? next : homePorRol(u.rol))
    } catch (err) {
      setError((err as Error).message || 'Correo o clave incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  const registroTo = next ? `/registro?next=${encodeURIComponent(next)}` : '/registro'

  return (
    <div className="login-screen auth-screen">
      <form className="card login-card auth-card" onSubmit={onSubmit}>
        <div className="login-toolbar">
          <Link className="auth-brand" to="/inicio">
            {marca.toUpperCase()}
          </Link>
          <ThemeToggle />
        </div>
        <p className="eyebrow">Tu cuenta</p>
        <h1>Entrar</h1>
        <p className="muted">
          {next === '/carrito'
            ? 'Entrá para confirmar tu pedido. Tu bolsa se mantiene.'
            : `Clienta o equipo de ${marca}.`}
        </p>
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
          required
        />
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="hint">
          ¿Primera vez? <Link to={registroTo}>Crear cuenta</Link>
        </p>
        <p className="hint auth-demo">
          Demo tienda: <code>clienta@ensayar.bo</code> / <code>diego</code>
        </p>
        <p className="hint">
          ¿Sos dueña de una tienda? <Link to="/plataforma/login">Entrá a la plataforma</Link>
        </p>
        <Link className="auth-back" to="/inicio">
          ← Seguir mirando la tienda
        </Link>
      </form>
    </div>
  )
}
