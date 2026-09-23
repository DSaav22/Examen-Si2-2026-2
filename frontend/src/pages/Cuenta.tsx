import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

type Profile = { nombre: string; email: string; rol: string; direcciones: { id: string; etiqueta: string; detalle: string; ciudad: string }[]; lealtad?: { puntos: number; nivel: string } | null }
type Coupon = { id: string; codigo: string; porcentaje: string | number; venceEn?: string | null }

export function Cuenta() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [address, setAddress] = useState({ etiqueta: 'Casa', detalle: '', ciudad: '' })
  const [message, setMessage] = useState('')
  useEffect(() => { api<Profile>('/cliente/perfil').then(setProfile).catch(() => setMessage('No se pudo cargar tu perfil.')); api<Coupon[]>('/cliente/cupones').then(setCoupons).catch(() => undefined) }, [])
  async function save(event: FormEvent) { event.preventDefault(); try { const created = await api<Profile['direcciones'][number]>('/cliente/direcciones', { method: 'POST', body: JSON.stringify(address) }); setProfile(current => current ? { ...current, direcciones: [created, ...current.direcciones] } : current); setAddress({ etiqueta: 'Casa', detalle: '', ciudad: '' }); setMessage('Dirección guardada.') } catch { setMessage('Revisa los datos de la dirección.') } }
  if (user?.rol !== 'CLIENTA') return <section className="shell-placeholder"><p className="eyebrow">VESTA</p><h1>Cuenta de cliente</h1><p>Esta sección está disponible para cuentas cliente.</p></section>
  return <section className="customer-account"><p className="eyebrow">Mi cuenta</p><h1>{profile?.nombre ?? user.nombre}</h1><p className="muted">{profile?.email ?? user.email}</p>{message ? <p className="ok" role="status">{message}</p> : null}<div className="customer-account-grid"><article className="ui-card"><p className="eyebrow">Fidelización</p><h2>{profile?.lealtad?.puntos ?? 0} puntos</h2><p>Nivel {profile?.lealtad?.nivel ?? 'inicial'}</p>{coupons.length ? <><p className="eyebrow">Cupones activos</p>{coupons.map(coupon => <p key={coupon.id}><strong>{coupon.codigo}</strong> · {coupon.porcentaje}%</p>)}</> : <p className="muted">No tienes cupones activos.</p>}</article><article className="ui-card"><p className="eyebrow">Direcciones</p>{profile?.direcciones.length ? profile.direcciones.map(item => <p key={item.id}><strong>{item.etiqueta}</strong><br />{item.detalle}, {item.ciudad}</p>) : <p className="muted">Todavía no tienes direcciones.</p>}<form onSubmit={save} className="customer-address-form"><input aria-label="Etiqueta" value={address.etiqueta} onChange={event => setAddress({ ...address, etiqueta: event.target.value })} placeholder="Casa" required /><input aria-label="Dirección" value={address.detalle} onChange={event => setAddress({ ...address, detalle: event.target.value })} placeholder="Dirección" required /><input aria-label="Ciudad" value={address.ciudad} onChange={event => setAddress({ ...address, ciudad: event.target.value })} placeholder="Ciudad" required /><button className="ui-button ui-button--primary" type="submit">Agregar dirección</button></form></article></div></section>
}
