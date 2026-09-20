import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { User } from '../types'
import { homePorRol } from '../types'

export function Registro() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('diego')
  const [error, setError] = useState('')

  if (user) return <Navigate to={homePorRol(user.rol)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const data = await api<{ accessToken: string; user: User }>('/auth/registro', {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password }),
      })
      localStorage.setItem('ensayar_token', data.accessToken)
      localStorage.setItem('ensayar_user', JSON.stringify(data.user))
      navigate('/catalogo')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar')
    }
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={onSubmit}>
        <p className="eyebrow">RF01</p>
        <h1>Registro clienta</h1>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Clave
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Crear cuenta</button>
        <p className="hint">
          <Link to="/login">Ya tengo cuenta</Link>
        </p>
      </form>
    </div>
  )
}
