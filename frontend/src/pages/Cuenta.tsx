import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

type Address = { id: string; etiqueta: string; detalle: string; ciudad: string }
type Profile = { nombre: string; email: string; rol: string; direcciones: Address[]; lealtad?: { puntos: number; nivel: string } | null }
type Coupon = { id: string; codigo: string; porcentaje: string | number; usoMaximo?: number | null; usado?: number }

const emptyAddress = { etiqueta: 'Casa', detalle: '', ciudad: '' }

export function Cuenta() {
  const { user, rename } = useAuth()
  const clienta = user?.rol === 'CLIENTA'
  const [profile, setProfile] = useState<Profile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [nombre, setNombre] = useState('')
  const [address, setAddress] = useState(emptyAddress)
  const [editing, setEditing] = useState<Address | null>(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!clienta) return
    api<Profile>('/cliente/perfil').then(data => { setProfile(data); setNombre(data.nombre) }).catch(() => setError('No se pudo cargar tu perfil.'))
    api<Coupon[]>('/cliente/cupones').then(setCoupons).catch(() => undefined)
  }, [clienta])

  async function saveName(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const saved = await api<{ nombre: string }>('/cliente/perfil', { method: 'PATCH', body: JSON.stringify({ nombre }) })
      rename(saved.nombre)
      setProfile(current => current ? { ...current, nombre: saved.nombre } : current)
      setMessage('Nombre actualizado.')
    } catch {
      setError('No se guardó el nombre.')
    }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      if (editing) {
        const saved = await api<Address>(`/cliente/direcciones/${editing.id}`, { method: 'PATCH', body: JSON.stringify(address) })
        setProfile(current => current ? { ...current, direcciones: current.direcciones.map(item => item.id === saved.id ? saved : item) } : current)
        setEditing(null)
        setMessage('Dirección actualizada.')
      } else {
        const created = await api<Address>('/cliente/direcciones', { method: 'POST', body: JSON.stringify(address) })
        setProfile(current => current ? { ...current, direcciones: [created, ...current.direcciones] } : current)
        setMessage('Dirección guardada.')
      }
      setAddress(emptyAddress)
    } catch {
      setError('Revisa los datos de la dirección.')
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api('/auth/cambiar-clave', { method: 'POST', body: JSON.stringify({ actual, nueva }) })
      setActual('')
      setNueva('')
      setMessage('Clave actualizada. La anterior ya no sirve.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se cambió la clave.')
    }
  }

  if (!user) return null

  return (
    <section className="customer-account">
      <p className="eyebrow">Mi cuenta</p>
      <h1>{profile?.nombre ?? user.nombre}</h1>
      <p className="muted">{profile?.email ?? user.email} · {user.rol}</p>
      {message ? <p className="ok" role="status">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="customer-account-grid">
        {clienta ? (
          <article className="ui-card">
            <p className="eyebrow">Fidelización</p>
            <h2>{profile?.lealtad?.puntos ?? 0} puntos</h2>
            <p>Nivel {profile?.lealtad?.nivel ?? 'inicial'}</p>
            <form className="customer-address-form" onSubmit={saveName}>
              <label>Nombre<input value={nombre} onChange={event => setNombre(event.target.value)} minLength={2} required /></label>
              <button className="ui-button ui-button--secondary" type="submit">Guardar nombre</button>
            </form>
            {coupons.length ? (
              <>
                <p className="eyebrow">Cupones activos</p>
                {coupons.map(coupon => (
                  <p key={coupon.id}><strong>{coupon.codigo}</strong> · {coupon.porcentaje}%{coupon.usoMaximo != null ? ` · ${coupon.usado ?? 0}/${coupon.usoMaximo} usos` : ''}</p>
                ))}
              </>
            ) : <p className="muted">No tienes cupones activos.</p>}
          </article>
        ) : <article className="ui-card"><p className="eyebrow">Sesión</p><h2>{user.nombre}</h2><p>Desde aquí puedes cambiar la clave de esta cuenta.</p></article>}
        <article className="ui-card">
          <p className="eyebrow">Clave</p>
          <h2>Cambiar contraseña</h2>
          <form className="customer-address-form" onSubmit={changePassword}>
            <label>Clave actual<input type="password" value={actual} onChange={event => setActual(event.target.value)} required /></label>
            <label>Nueva clave<input type="password" value={nueva} onChange={event => setNueva(event.target.value)} minLength={8} required /></label>
            <button className="ui-button ui-button--primary" type="submit">Actualizar clave</button>
          </form>
        </article>
        {clienta ? (
          <article className="ui-card account-span">
            <p className="eyebrow">Direcciones</p>
            {profile?.direcciones.length ? profile.direcciones.map(item => (
              <div className="address-row" key={item.id}>
                <p><strong>{item.etiqueta}</strong><br />{item.detalle}, {item.ciudad}</p>
                <button type="button" className="ui-button ui-button--secondary" onClick={() => { setEditing(item); setAddress({ etiqueta: item.etiqueta, detalle: item.detalle, ciudad: item.ciudad }) }}>Editar</button>
              </div>
            )) : <p className="muted">Todavía no tienes direcciones.</p>}
            <form onSubmit={saveAddress} className="customer-address-form">
              <p className="eyebrow">{editing ? 'Editar dirección' : 'Nueva dirección'}</p>
              <input aria-label="Etiqueta" value={address.etiqueta} onChange={event => setAddress({ ...address, etiqueta: event.target.value })} placeholder="Casa" required />
              <input aria-label="Dirección" value={address.detalle} onChange={event => setAddress({ ...address, detalle: event.target.value })} placeholder="Dirección" required />
              <input aria-label="Ciudad" value={address.ciudad} onChange={event => setAddress({ ...address, ciudad: event.target.value })} placeholder="Ciudad" required />
              <div className="account-actions">
                <button className="ui-button ui-button--primary" type="submit">{editing ? 'Guardar cambios' : 'Agregar dirección'}</button>
                {editing ? <button type="button" className="ui-button ui-button--secondary" onClick={() => { setEditing(null); setAddress(emptyAddress) }}>Cancelar</button> : null}
              </div>
            </form>
          </article>
        ) : null}
      </div>
    </section>
  )
}
