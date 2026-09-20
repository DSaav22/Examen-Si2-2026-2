import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { homePorRol } from '../types'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('clienta@ensayar.bo')
  const [password, setPassword] = useState('diego')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={homePorRol(user.rol)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login(email, password)
      navigate(homePorRol(u.rol))
    } catch {
      setError('Correo o clave incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Plataforma omnicanal</p>
        <h1>EnsayAR</h1>
        <p className="muted">Clienta, cajero, encargado, admin o proveedor.</p>
        <label>
          Correo
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Clave
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="hint">
          <Link to="/registro">Crear cuenta clienta</Link>
        </p>
        <p className="hint">
          admin · cajero · encargado · proveedor · clienta @ensayar.bo — clave{' '}
          <code>diego</code>
        </p>
      </form>
    </div>
  )
}
