import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Rol, Sucursal } from '../types'

type Usuario = {
  id: string
  email: string
  nombre: string
  rol: Rol
  sucursalId?: string | null
}

type Nom = { id: string; nombre: string }

export function Admin() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [temporadas, setTemporadas] = useState<Nom[]>([])
  const [colecciones, setColecciones] = useState<Nom[]>([])
  const [proveedores, setProveedores] = useState<Nom[]>([])
  const [msg, setMsg] = useState('')
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<Rol>('CAJERO')
  const [sucursalId, setSucursalId] = useState('')
  const [ciudad, setCiudad] = useState('Cochabamba')
  const [sucNombre, setSucNombre] = useState('')
  const [tempNombre, setTempNombre] = useState('')
  const [colNombre, setColNombre] = useState('')
  const [provNombre, setProvNombre] = useState('')

  async function cargar() {
    setUsuarios(await api<Usuario[]>('/usuarios'))
    setSucursales(await api<Sucursal[]>('/catalogo/sucursales'))
    setTemporadas(await api<Nom[]>('/temporadas'))
    setColecciones(await api<Nom[]>('/colecciones'))
    setProveedores(await api<Nom[]>('/proveedores'))
  }

  useEffect(() => {
    cargar().catch(() => setMsg('No se cargó admin'))
  }, [])

  if (user?.rol !== 'ADMIN') return <Navigate to="/catalogo" replace />

  async function crearUsuario(e: FormEvent) {
    e.preventDefault()
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
    await cargar()
  }

  async function crearSucursal(e: FormEvent) {
    e.preventDefault()
    await api('/sucursales', {
      method: 'POST',
      body: JSON.stringify({ nombre: sucNombre, ciudad }),
    })
    setMsg('Sucursal creada')
    await cargar()
  }

  async function crearTemp(e: FormEvent) {
    e.preventDefault()
    await api('/temporadas', {
      method: 'POST',
      body: JSON.stringify({ nombre: tempNombre }),
    })
    setTempNombre('')
    await cargar()
  }

  async function crearCol(e: FormEvent) {
    e.preventDefault()
    await api('/colecciones', {
      method: 'POST',
      body: JSON.stringify({ nombre: colNombre }),
    })
    setColNombre('')
    await cargar()
  }

  async function crearProv(e: FormEvent) {
    e.preventDefault()
    await api('/proveedores', {
      method: 'POST',
      body: JSON.stringify({ nombre: provNombre, contacto: '' }),
    })
    setProvNombre('')
    await cargar()
  }

  return (
    <section>
      <p className="eyebrow">RF02–RF06 · RF23</p>
      <h2>Administración</h2>
      {msg ? <p className="ok">{msg}</p> : null}

      <form className="card col-form" onSubmit={crearUsuario}>
        <h3>Usuarios y roles</h3>
        <input placeholder="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <input
          placeholder="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          <option value="CAJERO">CAJERO</option>
          <option value="ENCARGADO">ENCARGADO</option>
          <option value="ADMIN">ADMIN</option>
          <option value="PROVEEDOR">PROVEEDOR</option>
          <option value="CLIENTA">CLIENTA</option>
        </select>
        <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
          <option value="">Sin sucursal</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <button type="submit">Crear (clave diego)</button>
      </form>
      <ul>
        {usuarios.map((u) => (
          <li key={u.id}>
            {u.nombre} · {u.email} · {u.rol}
          </li>
        ))}
      </ul>

      <form className="card row-form" onSubmit={crearSucursal}>
        <h3>Sucursales</h3>
        <input
          placeholder="nombre"
          value={sucNombre}
          onChange={(e) => setSucNombre(e.target.value)}
          required
        />
        <input value={ciudad} onChange={(e) => setCiudad(e.target.value)} required />
        <button type="submit">Agregar ciudad/sucursal</button>
      </form>
      <ul>
        {sucursales.map((s) => (
          <li key={s.id}>
            {s.nombre} · {s.ciudad} · {s.almacenes.length} almacén(es)
          </li>
        ))}
      </ul>

      <div className="grid">
        <form className="card row-form" onSubmit={crearTemp}>
          <h3>Temporadas</h3>
          <input value={tempNombre} onChange={(e) => setTempNombre(e.target.value)} required />
          <button type="submit">Alta</button>
          <ul>
            {temporadas.map((t) => (
              <li key={t.id}>{t.nombre}</li>
            ))}
          </ul>
        </form>
        <form className="card row-form" onSubmit={crearCol}>
          <h3>Colecciones</h3>
          <input value={colNombre} onChange={(e) => setColNombre(e.target.value)} required />
          <button type="submit">Alta</button>
          <ul>
            {colecciones.map((c) => (
              <li key={c.id}>{c.nombre}</li>
            ))}
          </ul>
        </form>
        <form className="card row-form" onSubmit={crearProv}>
          <h3>Proveedores</h3>
          <input value={provNombre} onChange={(e) => setProvNombre(e.target.value)} required />
          <button type="submit">Alta</button>
          <ul>
            {proveedores.map((p) => (
              <li key={p.id}>{p.nombre}</li>
            ))}
          </ul>
        </form>
      </div>
    </section>
  )
}
