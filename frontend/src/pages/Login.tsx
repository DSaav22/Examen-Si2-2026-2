import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { homePorRol } from '../types'
import { Button } from '../shared/Button'
import { FormField } from '../shared/FormField'
import { ThemeToggle } from '../shared/ThemeToggle'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('clienta@ensayar.bo')
  const [password, setPassword] = useState('diego')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user) return <Navigate to={homePorRol(user.rol)} replace />
  async function onSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try { const u = await login(email, password); navigate(homePorRol(u.rol)) }
    catch { setError('Correo o clave incorrectos.') }
    finally { setLoading(false) }
  }
  return <div className="login-screen"><form className="card login-card" onSubmit={onSubmit}>
    <div className="login-toolbar"><span className="eyebrow">Plataforma omnicanal</span><ThemeToggle /></div>
    <h1>EnsayAR</h1><p className="muted">Clienta, cajero, encargado, admin o proveedor.</p>
    <FormField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <FormField label="Clave" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
    {error ? <p className="error" role="alert">{error}</p> : null}
    <Button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</Button>
    <p className="hint"><Link to="/registro">Crear cuenta clienta</Link></p>
    <p className="hint">admin · cajero · encargado · proveedor · clienta @ensayar.bo — clave <code>diego</code></p>
  </form></div>
}
