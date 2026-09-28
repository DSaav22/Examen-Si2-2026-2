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
    length: value.length >= 8 && value.length <= 25,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /\d/.test(value),
    noSpaces: !/\s/.test(value),
  }
}

function isAdult(dateValue: string) {
  if (!dateValue) return false
  const birth = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(birth.getTime()) || birth > new Date()) return false
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDifference = today.getMonth() - birth.getMonth()
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age -= 1
  return age >= 18
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
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const hints = passwordHints(password)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const passwordValid = Object.values(hints).every(Boolean)
  const confirmationValid = Boolean(confirmacion) && password === confirmacion
  const birthValid = isAdult(fechaNacimiento)

  if (user) return <Navigate to={next && user.rol === 'CLIENTA' ? next : homePorRol(user.rol)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!emailValid) return setError('Ingresá un correo válido.')
    if (!passwordValid) return setError('La clave no cumple los requisitos de seguridad.')
    if (!birthValid) return setError('Debés tener 18 años o más para crear una cuenta.')
    if (!confirmationValid) return setError('La clave y la confirmación no coinciden.')
    setLoading(true)
    try {
      const u = await register(nombre.trim(), email.trim(), password)
      navigate(next && u.rol === 'CLIENTA' ? next : homePorRol(u.rol))
    } catch (err) {
      const apiError = err as Error & { codigo?: string }
      const code = apiError?.codigo ?? apiError?.message ?? ''
      setError(code === 'EMAIL_EN_USO' ? 'Ese correo ya tiene cuenta. Probá entrar.' : apiError?.message || 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  const loginTo = next ? `/login?next=${encodeURIComponent(next)}` : '/login'
  const fieldClass = (hasValue: boolean, valid: boolean) => hasValue ? (valid ? 'auth-input--valid' : 'auth-input--invalid') : undefined

  return (
    <div className="login-screen auth-screen">
      <form className="card login-card auth-card" onSubmit={onSubmit} noValidate>
        <div className="login-toolbar"><Link className="auth-brand" to="/inicio">VESTA</Link><ThemeToggle /></div>
        <p className="eyebrow">Nueva clienta</p>
        <h1>Crear cuenta</h1>
        <p className="muted">Creá tu cuenta para pedir, guardar favoritos y ver tu historial.</p>
        <FormField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} minLength={2} required />
        <FormField label="Correo" type="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldClass(Boolean(email), emailValid)} aria-invalid={Boolean(email) && !emailValid} required />
        {email ? <p className={emailValid ? 'auth-validation is-valid' : 'auth-validation is-invalid'}>{emailValid ? '✓ Correo válido.' : '✕ Revisá el formato del correo.'}</p> : null}
        <FormField label="Clave" type="password" value={password} onChange={e => setPassword(e.target.value)} maxLength={25} className={fieldClass(Boolean(password), passwordValid)} aria-invalid={Boolean(password) && !passwordValid} required />
        <ul className="auth-password-hints" aria-label="Requisitos de la clave">
          <li className={hints.length ? 'is-ok' : undefined}>{hints.length ? '✓' : '○'} 8 a 25 caracteres</li>
          <li className={hints.number ? 'is-ok' : undefined}>{hints.number ? '✓' : '○'} Un número</li>
          <li className={hints.uppercase ? 'is-ok' : undefined}>{hints.uppercase ? '✓' : '○'} Una mayúscula</li>
          <li className={hints.lowercase ? 'is-ok' : undefined}>{hints.lowercase ? '✓' : '○'} Una minúscula</li>
          <li className={hints.noSpaces ? 'is-ok' : undefined}>{hints.noSpaces ? '✓' : '○'} Sin espacios</li>
        </ul>
        <FormField label="Confirmar clave" type="password" value={confirmacion} onChange={e => setConfirmacion(e.target.value)} maxLength={25} className={fieldClass(Boolean(confirmacion), confirmationValid)} aria-invalid={Boolean(confirmacion) && !confirmationValid} required />
        <FormField label="Fecha de nacimiento" type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} max={new Date().toISOString().slice(0, 10)} className={fieldClass(Boolean(fechaNacimiento), birthValid)} aria-invalid={Boolean(fechaNacimiento) && !birthValid} required />
        <p className={fechaNacimiento ? (birthValid ? 'auth-validation is-valid' : 'auth-validation is-invalid') : 'auth-validation'}>{fechaNacimiento ? (birthValid ? '✓ Edad verificada: podés crear tu cuenta.' : '✕ Debés tener 18 años o más.') : 'Debés tener 18 años o más.'}</p>
        {error ? <p className="error" role="alert">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? 'Creando…' : 'Crear cuenta'}</Button>
        <p className="hint">¿Ya tenés cuenta? <Link to={loginTo}>Entrar</Link></p>
        <Link className="auth-back" to="/inicio">← Seguir mirando la tienda</Link>
      </form>
    </div>
  )
}
