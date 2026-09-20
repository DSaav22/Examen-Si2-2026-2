import { FormEvent, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Producto, Sucursal } from '../types'

type Nom = { id: string; nombre: string }

export function ProveedorPortal() {
  const { user } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [temporadas, setTemporadas] = useState<Nom[]>([])
  const [colecciones, setColecciones] = useState<Nom[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('tops')
  const [ocasion, setOcasion] = useState('casual')
  const [precio, setPrecio] = useState('99')
  const [talla, setTalla] = useState('M')
  const [color, setColor] = useState('unico')
  const [temporadaId, setTemporadaId] = useState('')
  const [coleccionId, setColeccionId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [cantidad, setCantidad] = useState('5')
  const [msg, setMsg] = useState('')

  async function cargar() {
    setProductos(await api<Producto[]>('/proveedores/mis-productos'))
    setTemporadas(await api<Nom[]>('/temporadas'))
    setColecciones(await api<Nom[]>('/colecciones'))
    const s = await api<Sucursal[]>('/catalogo/sucursales')
    setSucursales(s)
    setAlmacenId(s[0]?.almacenes[0]?.id ?? '')
  }

  useEffect(() => {
    cargar().catch(() => setMsg('No se cargó el portal'))
  }, [])

  if (user?.rol !== 'PROVEEDOR') return <Navigate to="/catalogo" replace />

  async function crear(e: FormEvent) {
    e.preventDefault()
    const creado = await api<Producto>('/proveedores/mis-productos', {
      method: 'POST',
      body: JSON.stringify({
        nombre,
        categoria,
        ocasion,
        precioBase: Number(precio),
        talla,
        color,
        temporadaId: temporadaId || undefined,
        coleccionId: coleccionId || undefined,
      }),
    })
    setMsg(`Producto con variante ${creado.variantes[0]?.sku ?? ''}`)
    setVarianteId(creado.variantes[0]?.id ?? '')
    setNombre('')
    await cargar()
  }

  async function ingreso(e: FormEvent) {
    e.preventDefault()
    await api('/inventario/ingreso', {
      method: 'POST',
      body: JSON.stringify({
        varianteId,
        almacenId,
        cantidad: Number(cantidad),
        nota: 'Ingreso proveedor',
      }),
    })
    setMsg('Stock ingresado')
    await cargar()
  }

  return (
    <section>
      <p className="eyebrow">RF06 · Proveedor</p>
      <h2>Mis productos</h2>
      {msg ? <p className="ok">{msg}</p> : null}
      <form className="card col-form" onSubmit={crear}>
        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <input value={ocasion} onChange={(e) => setOcasion(e.target.value)} />
        <input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          min="0"
        />
        <input
          placeholder="Talla"
          value={talla}
          onChange={(e) => setTalla(e.target.value)}
          required
        />
        <input
          placeholder="Color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          required
        />
        <select value={temporadaId} onChange={(e) => setTemporadaId(e.target.value)}>
          <option value="">Temporada</option>
          {temporadas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
        <select value={coleccionId} onChange={(e) => setColeccionId(e.target.value)}>
          <option value="">Colección</option>
          {colecciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button type="submit">Registrar producto</button>
      </form>
      <ul>
        {productos.map((p) => (
          <li key={p.id}>
            {p.nombre} · Bs {Number(p.precioBase).toFixed(2)} ·{' '}
            {p.temporada?.nombre ?? 'sin temporada'}
            <ul>
              {p.variantes.map((v) => (
                <li key={v.id}>
                  {v.sku} {v.talla}/{v.color}{' '}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setVarianteId(v.id)}
                  >
                    Usar para ingreso
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <form className="card col-form" onSubmit={ingreso}>
        <h3>Informar ingreso a almacén</h3>
        <input
          placeholder="varianteId"
          value={varianteId}
          onChange={(e) => setVarianteId(e.target.value)}
          required
        />
        <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
          {sucursales.flatMap((s) =>
            s.almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {s.nombre} · {a.nombre}
              </option>
            )),
          )}
        </select>
        <input
          type="number"
          min="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <button type="submit">Ingresar stock</button>
      </form>
    </section>
  )
}
