import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { esClienta, etiquetaRol, homePorRol, navPorRol } from '../roles'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type Address = { id: string; etiqueta: string; detalle: string; ciudad: string }
type Profile = {
  nombre: string
  email: string
  rol: string
  avatarUrl?: string
  direcciones: Address[]
  lealtad?: { puntos: number; nivel: string } | null
}
type Coupon = {
  id: string
  codigo: string
  porcentaje: string | number
  usoMaximo?: number | null
  usado?: number
}

const emptyAddress = { etiqueta: 'Casa', detalle: '', ciudad: '' }

function passwordHints(value: string) {
  return {
    length: value.length >= 8,
    mixed: /[a-z]/.test(value) && /[A-Z]/.test(value),
    number: /\d/.test(value),
  }
}

export function Cuenta() {
  const { user, rename, setAvatar, logout } = useAuth()
  const clienta = esClienta(user?.rol)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [nombre, setNombre] = useState('')
  const [address, setAddress] = useState(emptyAddress)
  const [editing, setEditing] = useState<Address | null>(null)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!clienta) return
    api<Profile>('/cliente/perfil')
      .then(data => {
        setProfile(data)
        setNombre(data.nombre)
        if (data.avatarUrl) setAvatar(data.avatarUrl)
      })
      .catch(() => setError('No se pudo cargar tu perfil.'))
    api<Coupon[]>('/cliente/cupones').then(setCoupons).catch(() => undefined)
    // setAvatar es estable en intención; no re-sincronizar en cada render del auth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienta])

  const hints = useMemo(() => passwordHints(nueva), [nueva])
  const atajos = useMemo(() => {
    if (!user || clienta) return []
    return navPorRol(user.rol)
      .filter(item => item.to !== '/cuenta')
      .slice(0, 6)
  }, [user, clienta])

  async function saveName(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const saved = await api<{ nombre: string }>('/cliente/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ nombre }),
      })
      rename(saved.nombre)
      setProfile(current => (current ? { ...current, nombre: saved.nombre } : current))
      setMessage('Nombre actualizado.')
    } catch {
      setError('No se guardó el nombre.')
    }
  }

  async function uploadAvatar(file: File) {
    setError('')
    setMessage('')
    setAvatarBusy(true)
    try {
      const body = new FormData()
      body.append('archivo', file)
      const saved = await api<{ avatarUrl: string }>('/cliente/perfil/avatar', {
        method: 'POST',
        body,
      })
      setAvatar(saved.avatarUrl)
      setProfile(current => (current ? { ...current, avatarUrl: saved.avatarUrl } : current))
      setMessage('Foto de perfil actualizada.')
    } catch {
      setError('No se pudo subir la foto. Usá JPG o PNG de hasta 2 MB.')
    } finally {
      setAvatarBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      if (editing) {
        const saved = await api<Address>(`/cliente/direcciones/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(address),
        })
        setProfile(current =>
          current
            ? {
                ...current,
                direcciones: current.direcciones.map(item => (item.id === saved.id ? saved : item)),
              }
            : current,
        )
        setEditing(null)
        setMessage('Dirección actualizada.')
      } else {
        const created = await api<Address>('/cliente/direcciones', {
          method: 'POST',
          body: JSON.stringify(address),
        })
        setProfile(current =>
          current ? { ...current, direcciones: [created, ...current.direcciones] } : current,
        )
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
    setMessage('')
    if (nueva !== confirmacion) {
      setError('La nueva clave y la confirmación no coinciden.')
      return
    }
    if (nueva.length < 8) {
      setError('La nueva clave debe tener al menos 8 caracteres.')
      return
    }
    setBusy(true)
    try {
      await api('/auth/cambiar-clave', {
        method: 'POST',
        body: JSON.stringify({ actual, nueva }),
      })
      setActual('')
      setNueva('')
      setConfirmacion('')
      setMessage('Clave actualizada. La anterior ya no sirve.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se cambió la clave.')
    } finally {
      setBusy(false)
    }
  }

  if (!user) return null

  const hub = homePorRol(user.rol)
  const displayName = profile?.nombre ?? user.nombre
  const displayEmail = profile?.email ?? user.email
  const avatarSrc = assetUrl(profile?.avatarUrl || user.avatarUrl || '')
  const inicial = (displayName.trim()[0] || 'V').toUpperCase()

  if (!clienta) {
    return (
      <OpsPage
        eyebrow="Sistema"
        title="Cuenta y clave"
        description="Datos de tu sesión operativa y cambio de contraseña. El correo no se edita desde aquí."
        actions={
          <OpsActions>
            <Link className="ops-text-link" to={hub}>
              ← {etiquetaRol(user.rol)}
            </Link>
            <OpsBtn type="button" variant="secondary" onClick={logout}>
              Cerrar sesión
            </OpsBtn>
          </OpsActions>
        }
      >
        {message ? (
          <p className="ok" role="status">
            {message}
          </p>
        ) : null}
        {error ? <p className="error">{error}</p> : null}

        <div className="cuenta-ops-layout">
          <OpsPanel title="Tu sesión" eyebrow="Perfil">
            <dl className="cuenta-profile-facts">
              <div>
                <dt>Nombre</dt>
                <dd>{displayName}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd>{displayEmail}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>
                  <OpsStatus state="ok">{etiquetaRol(user.rol)}</OpsStatus>
                </dd>
              </div>
              <div>
                <dt>Sucursal</dt>
                <dd>
                  {user.sucursalId
                    ? 'Asignada a tu usuario (define POS e inventario)'
                    : 'Sin sucursal fija · en cada módulo elegís sucursal (POS, reportes…)'}
                </dd>
              </div>
            </dl>
            <p className="muted cuenta-note">
              Para gestionar usuarios del sistema usá Configuración. Acá solo actualizás tu clave.
            </p>
            {user.rol === 'ADMIN' || user.rol === 'SUPERADMIN' ? (
              <Link className="ops-text-link" to="/admin/configuracion">
                Ir a Usuarios →
              </Link>
            ) : null}
          </OpsPanel>

          <OpsPanel title="Cambiar contraseña" eyebrow="Seguridad">
            <form className="inv-form" onSubmit={e => void changePassword(e)}>
              <OpsField label="Clave actual">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={actual}
                  onChange={e => setActual(e.target.value)}
                  required
                />
              </OpsField>
              <OpsField label="Nueva clave">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={nueva}
                  onChange={e => setNueva(e.target.value)}
                  minLength={8}
                  required
                />
              </OpsField>
              <OpsField label="Confirmar nueva clave">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={e => setConfirmacion(e.target.value)}
                  minLength={8}
                  required
                />
              </OpsField>
              <ul className="cuenta-hints" aria-label="Requisitos de clave">
                <li className={hints.length ? 'is-ok' : ''}>Mínimo 8 caracteres</li>
                <li className={hints.mixed ? 'is-ok' : ''}>Mayúsculas y minúsculas (recomendado)</li>
                <li className={hints.number ? 'is-ok' : ''}>Al menos un número (recomendado)</li>
              </ul>
              <OpsBtn type="submit" disabled={busy}>
                {busy ? 'Guardando…' : 'Actualizar clave'}
              </OpsBtn>
            </form>
          </OpsPanel>
        </div>

        <OpsPanel title="Accesos rápidos" eyebrow="Operaciones">
          {!atajos.length ? (
            <OpsEmpty title="Sin atajos">Volvé al hub de tu rol.</OpsEmpty>
          ) : (
            <div className="cuenta-shortcuts">
              {atajos.map(item => (
                <Link key={`${item.to}-${item.label}`} className="cuenta-shortcut" to={item.to}>
                  <strong>{item.label}</strong>
                  <span className="muted">{item.to}</span>
                </Link>
              ))}
            </div>
          )}
        </OpsPanel>
      </OpsPage>
    )
  }

  return (
    <section className="customer-account">
      <p className="eyebrow">Mi cuenta</p>
      <div className="cuenta-hero">
        <button
          type="button"
          className={`cuenta-avatar${avatarSrc ? ' has-photo' : ''}`}
          aria-label="Cambiar foto de perfil"
          disabled={avatarBusy}
          onClick={() => fileRef.current?.click()}
        >
          {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{inicial}</span>}
          <span className="cuenta-avatar-hint">{avatarBusy ? 'Subiendo…' : 'Cambiar foto'}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={event => {
            const file = event.target.files?.[0]
            if (file) void uploadAvatar(file)
          }}
        />
        <div>
          <h1>{displayName}</h1>
          <p className="muted">
            {displayEmail} · {etiquetaRol(user.rol)}
          </p>
          <p className="cuenta-avatar-note muted">
            La foto aparece en el icono de cuenta del menú superior.
          </p>
        </div>
      </div>
      <Link className="cuenta-orders-banner" to="/historial">
        <span>
          <strong>Mis compras</strong>
          <small>Pedidos, facturas, cuándo y dónde compraste</small>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      {message ? (
        <p className="ok" role="status">
          {message}
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="customer-account-grid">
        <article className="ui-card">
          <p className="eyebrow">Fidelización</p>
          <h2>{profile?.lealtad?.puntos ?? 0} puntos</h2>
          <p>Nivel {profile?.lealtad?.nivel ?? 'inicial'}</p>
          <form className="customer-address-form" onSubmit={e => void saveName(e)}>
            <label>
              Nombre
              <input value={nombre} onChange={e => setNombre(e.target.value)} minLength={2} required />
            </label>
            <button className="ui-button ui-button--secondary" type="submit">
              Guardar nombre
            </button>
          </form>
          {coupons.length ? (
            <>
              <p className="eyebrow">Cupones activos</p>
              {coupons.map(coupon => (
                <p key={coupon.id}>
                  <strong>{coupon.codigo}</strong> · {coupon.porcentaje}%
                  {coupon.usoMaximo != null ? ` · ${coupon.usado ?? 0}/${coupon.usoMaximo} usos` : ''}
                </p>
              ))}
            </>
          ) : (
            <p className="muted">No tenés cupones activos.</p>
          )}
        </article>
        <article className="ui-card">
          <p className="eyebrow">Clave</p>
          <h2>Cambiar contraseña</h2>
          <form className="customer-address-form" onSubmit={e => void changePassword(e)}>
            <label>
              Clave actual
              <input
                type="password"
                value={actual}
                onChange={e => setActual(e.target.value)}
                required
              />
            </label>
            <label>
              Nueva clave
              <input
                type="password"
                value={nueva}
                onChange={e => setNueva(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <label>
              Confirmar nueva clave
              <input
                type="password"
                value={confirmacion}
                onChange={e => setConfirmacion(e.target.value)}
                minLength={8}
                required
              />
            </label>
            <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Actualizar clave'}
            </button>
          </form>
        </article>
        <article className="ui-card account-span">
          <p className="eyebrow">Direcciones</p>
          {profile?.direcciones.length ? (
            profile.direcciones.map(item => (
              <div className="address-row" key={item.id}>
                <p>
                  <strong>{item.etiqueta}</strong>
                  <br />
                  {item.detalle}, {item.ciudad}
                </p>
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => {
                    setEditing(item)
                    setAddress({
                      etiqueta: item.etiqueta,
                      detalle: item.detalle,
                      ciudad: item.ciudad,
                    })
                  }}
                >
                  Editar
                </button>
              </div>
            ))
          ) : (
            <p className="muted">Todavía no tenés direcciones.</p>
          )}
          <form onSubmit={e => void saveAddress(e)} className="customer-address-form">
            <p className="eyebrow">{editing ? 'Editar dirección' : 'Nueva dirección'}</p>
            <input
              aria-label="Etiqueta"
              value={address.etiqueta}
              onChange={e => setAddress({ ...address, etiqueta: e.target.value })}
              placeholder="Casa"
              required
            />
            <input
              aria-label="Dirección"
              value={address.detalle}
              onChange={e => setAddress({ ...address, detalle: e.target.value })}
              placeholder="Dirección"
              required
            />
            <input
              aria-label="Ciudad"
              value={address.ciudad}
              onChange={e => setAddress({ ...address, ciudad: e.target.value })}
              placeholder="Ciudad"
              required
            />
            <div className="account-actions">
              <button className="ui-button ui-button--primary" type="submit">
                {editing ? 'Guardar cambios' : 'Agregar dirección'}
              </button>
              {editing ? (
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => {
                    setEditing(null)
                    setAddress(emptyAddress)
                  }}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </div>
    </section>
  )
}
