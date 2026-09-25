import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Rol, Sucursal } from '../types'
import { esAdminNivel, esSuperadmin, homePorRol } from '../roles'
import { OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsTable } from '../shared/ops/OpsUi'

type Usuario = {
  id: string
  email: string
  nombre: string
  rol: Rol
  activo: boolean
  sucursalId?: string | null
  mayorista?: boolean
}

type Nom = { id: string; nombre: string }

const ROLES_BASE: Rol[] = ['CAJERO', 'ENCARGADO', 'ADMIN', 'PROVEEDOR', 'CLIENTA']

async function safeList<T>(path: string, fallback: T[] = []): Promise<T[]> {
  try {
    const data = await api<T[]>(path)
    return Array.isArray(data) ? data : fallback
  } catch {
    return fallback
  }
}

export function Admin() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [temporadas, setTemporadas] = useState<Nom[]>([])
  const [colecciones, setColecciones] = useState<Nom[]>([])
  const [proveedores, setProveedores] = useState<Nom[]>([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('CAJERO')
  const [sucursalId, setSucursalId] = useState('')
  const [ciudad, setCiudad] = useState('Cochabamba')
  const [sucNombre, setSucNombre] = useState('')
  const [tempNombre, setTempNombre] = useState('')
  const [colNombre, setColNombre] = useState('')
  const [provNombre, setProvNombre] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const rolesAsignables: Rol[] = esSuperadmin(user?.rol)
    ? [...ROLES_BASE, 'SUPERADMIN']
    : ROLES_BASE

  async function cargar() {
    const [users, branches, temps, cols, provs] = await Promise.all([
      safeList<Usuario>('/usuarios'),
      safeList<Sucursal>('/catalogo/sucursales'),
      safeList<Nom>('/temporadas'),
      safeList<Nom>('/colecciones'),
      safeList<Nom>('/proveedores'),
    ])
    setUsuarios(users)
    setSucursales(branches)
    setTemporadas(temps)
    setColecciones(cols)
    setProveedores(provs)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [users, branches, temps, cols, provs] = await Promise.all([
          safeList<Usuario>('/usuarios'),
          safeList<Sucursal>('/catalogo/sucursales'),
          safeList<Nom>('/temporadas'),
          safeList<Nom>('/colecciones'),
          safeList<Nom>('/proveedores'),
        ])
        if (cancelled) return
        setUsuarios(users)
        setSucursales(branches)
        setTemporadas(temps)
        setColecciones(cols)
        setProveedores(provs)
        if (!users.length && !branches.length) {
          setMsg('No se pudo cargar la configuración')
        }
      } catch {
        if (!cancelled) setMsg('No se cargó admin')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!esAdminNivel(user?.rol)) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  async function crearUsuario(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/usuarios', {
        method: 'POST',
        body: JSON.stringify({
          email,
          nombre,
          password: 'diego',
          rol,
          sucursalId: sucursalId || undefined,
        }),
      })
      setMsg('Usuario creado')
      setEmail('')
      setNombre('')
      await cargar()
    } catch {
      setMsg('No se creó el usuario')
    }
  }

  async function guardarUsuario(u: Usuario) {
    if (u.rol === 'SUPERADMIN' && !esSuperadmin(user?.rol)) {
      setMsg('Solo el superusuario puede modificar cuentas SUPERADMIN')
      return
    }
    setSavingId(u.id)
    try {
      await api(`/usuarios/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: u.nombre,
          rol: u.rol,
          activo: u.activo,
          mayorista: Boolean(u.mayorista),
        }),
      })
      setMsg(`${u.nombre} actualizado`)
    } catch {
      setMsg('No se guardó el usuario')
    } finally {
      setSavingId(null)
    }
  }

  function opcionesRol(actual: Rol): Rol[] {
    return rolesAsignables.includes(actual) ? rolesAsignables : [...rolesAsignables, actual]
  }

  async function crearSucursal(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/sucursales', { method: 'POST', body: JSON.stringify({ nombre: sucNombre, ciudad }) })
      setMsg('Sucursal creada')
      setSucNombre('')
      await cargar()
    } catch {
      setMsg('No se creó la sucursal')
    }
  }

  async function crearTemp(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/temporadas', { method: 'POST', body: JSON.stringify({ nombre: tempNombre }) })
      setTempNombre('')
      await cargar()
    } catch {
      setMsg('No se creó la temporada')
    }
  }

  async function crearCol(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/colecciones', { method: 'POST', body: JSON.stringify({ nombre: colNombre }) })
      setColNombre('')
      await cargar()
    } catch {
      setMsg('No se creó la colección')
    }
  }

  async function crearProv(e: FormEvent) {
    e.preventDefault()
    try {
      await api('/proveedores', { method: 'POST', body: JSON.stringify({ nombre: provNombre, contacto: '' }) })
      setProvNombre('')
      await cargar()
    } catch {
      setMsg('No se creó el proveedor')
    }
  }

  function patchUser(id: string, patch: Partial<Usuario>) {
    setUsuarios(items => items.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }

  return (
    <OpsPage
      eyebrow="RF02–RF06 · RF23"
      title="Usuarios y catálogos"
      description="Alta y mantenimiento en tablas compactas para escritorio."
    >
      {msg ? <p className="ok" role="status">{msg}</p> : null}

      <OpsPanel title="Nuevo usuario">
        <form className="ops-inline-form" onSubmit={crearUsuario}>
          <OpsField label="Nombre" className="ops-inline-form__grow">
            <input value={nombre} onChange={e => setNombre(e.target.value)} required />
          </OpsField>
          <OpsField label="Correo" className="ops-inline-form__grow">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </OpsField>
          <OpsField label="Rol" className="ops-inline-form__sm">
            <select value={rol} onChange={e => setRol(e.target.value as Rol)}>
              {rolesAsignables.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Sucursal" className="ops-inline-form__grow">
            <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}>
              <option value="">Sin sucursal</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </OpsField>
          <OpsBtn type="submit" className="ops-inline-form__action">Crear</OpsBtn>
        </form>
        <p className="ops-form-hint muted">
          Clave inicial: diego
          {esSuperadmin(user?.rol)
            ? ' · Solo el superusuario puede crear otro SUPERADMIN.'
            : ' · El administrador no asigna SUPERADMIN ni ve la bitácora.'}
        </p>
      </OpsPanel>

      <OpsPanel title={loading ? 'Usuarios' : `Usuarios (${usuarios.length})`} className="ops-panel--table">
        {loading ? (
          <OpsEmpty title="Cargando usuarios…" />
        ) : usuarios.length === 0 ? (
          <OpsEmpty title="Sin usuarios">Recarga o revisá la conexión con el API.</OpsEmpty>
        ) : (
          <OpsTable minWidth={0} className="ops-users-table-wrap">
            <colgroup>
              <col className="ops-col-nombre" />
              <col className="ops-col-correo" />
              <col className="ops-col-rol" />
              <col className="ops-col-estado" />
              <col className="ops-col-mayorista" />
              <col className="ops-col-accion" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Mayorista</th>
                <th scope="col"><span className="sr-only">Guardar</span></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const bloqueado = u.rol === 'SUPERADMIN' && !esSuperadmin(user?.rol)
                return (
                <tr key={u.id} className={u.activo ? undefined : 'is-inactive'}>
                  <td>
                    <input
                      aria-label={`Nombre de ${u.email}`}
                      value={u.nombre}
                      disabled={bloqueado}
                      onChange={e => patchUser(u.id, { nombre: e.target.value })}
                    />
                  </td>
                  <td className="ops-users-email">{u.email}</td>
                  <td>
                    <select
                      aria-label={`Rol de ${u.nombre}`}
                      value={u.rol}
                      disabled={bloqueado}
                      onChange={e => patchUser(u.id, { rol: e.target.value as Rol })}
                    >
                      {opcionesRol(u.rol).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ops-chip${u.activo ? ' is-on' : ''}`}
                      disabled={bloqueado}
                      onClick={() => patchUser(u.id, { activo: !u.activo })}
                    >
                      {u.activo ? 'Activa' : 'Off'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`ops-chip${u.mayorista ? ' is-on' : ''}`}
                      aria-pressed={Boolean(u.mayorista)}
                      disabled={bloqueado}
                      onClick={() => patchUser(u.id, { mayorista: !u.mayorista })}
                    >
                      {u.mayorista ? 'Sí' : 'No'}
                    </button>
                  </td>
                  <td className="ops-users-action">
                    <OpsBtn
                      type="button"
                      variant="secondary"
                      className="ops-table-save"
                      disabled={bloqueado || savingId === u.id}
                      onClick={() => void guardarUsuario(u)}
                    >
                      {savingId === u.id ? '…' : 'Guardar'}
                    </OpsBtn>
                  </td>
                </tr>
              )})}
            </tbody>
          </OpsTable>
        )}
      </OpsPanel>

      <OpsPanel title="Sucursales" className="ops-panel--table">
        <form className="ops-inline-form ops-inline-form--padded" onSubmit={crearSucursal}>
          <OpsField label="Nombre" className="ops-inline-form__grow">
            <input value={sucNombre} onChange={e => setSucNombre(e.target.value)} required />
          </OpsField>
          <OpsField label="Ciudad" className="ops-inline-form__grow">
            <input value={ciudad} onChange={e => setCiudad(e.target.value)} required />
          </OpsField>
          <OpsBtn type="submit" className="ops-inline-form__action">Agregar</OpsBtn>
        </form>
        {sucursales.length === 0 ? (
          <OpsEmpty title="Sin sucursales">Agregá la primera sucursal arriba.</OpsEmpty>
        ) : (
          <OpsTable minWidth={0}>
            <thead>
              <tr>
                <th scope="col">Sucursal</th>
                <th scope="col">Ciudad</th>
                <th scope="col">Almacenes</th>
              </tr>
            </thead>
            <tbody>
              {sucursales.map(s => (
                <tr key={s.id}>
                  <td>{s.nombre}</td>
                  <td>{s.ciudad}</td>
                  <td>{s.almacenes?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </OpsTable>
        )}
      </OpsPanel>

      <div className="ops-catalog-meta-grid">
        <form className="ops-meta-card" onSubmit={crearTemp}>
          <h2>Temporadas</h2>
          <div className="ops-meta-row">
            <input value={tempNombre} onChange={e => setTempNombre(e.target.value)} placeholder="Nombre" required />
            <OpsBtn type="submit" className="ops-meta-alta">Alta</OpsBtn>
          </div>
          <ul>{temporadas.map(t => <li key={t.id}>{t.nombre}</li>)}</ul>
        </form>
        <form className="ops-meta-card" onSubmit={crearCol}>
          <h2>Colecciones</h2>
          <div className="ops-meta-row">
            <input value={colNombre} onChange={e => setColNombre(e.target.value)} placeholder="Nombre" required />
            <OpsBtn type="submit" className="ops-meta-alta">Alta</OpsBtn>
          </div>
          <ul>{colecciones.map(c => <li key={c.id}>{c.nombre}</li>)}</ul>
        </form>
        <form className="ops-meta-card" onSubmit={crearProv}>
          <h2>Proveedores</h2>
          <div className="ops-meta-row">
            <input value={provNombre} onChange={e => setProvNombre(e.target.value)} placeholder="Nombre" required />
            <OpsBtn type="submit" className="ops-meta-alta">Alta</OpsBtn>
          </div>
          <ul>{proveedores.map(p => <li key={p.id}>{p.nombre}</li>)}</ul>
        </form>
      </div>
    </OpsPage>
  )
}
