import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { agregarAlCarrito } from '../carrito'
import type { Producto } from '../types'
import { precioEfectivo } from '../types'

export function Catalogo() {
  const { user } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('tops')
  const [ocasion, setOcasion] = useState('casual')
  const [precio, setPrecio] = useState('99')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroOc, setFiltroOc] = useState('')
  const [filtroTalla, setFiltroTalla] = useState('')
  const [filtroColor, setFiltroColor] = useState('')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])

  async function cargar() {
    const q = new URLSearchParams()
    if (filtroCat) q.set('categoria', filtroCat)
    if (filtroOc) q.set('ocasion', filtroOc)
    if (filtroTalla) q.set('talla', filtroTalla)
    if (filtroColor) q.set('color', filtroColor)
    if (precioMin) q.set('precioMin', precioMin)
    if (precioMax) q.set('precioMax', precioMax)
    if (sucursalId) q.set('sucursalId', sucursalId)
    const qs = q.toString()
    setProductos(await api<Producto[]>(`/catalogo/productos${qs ? `?${qs}` : ''}`))
  }

  useEffect(() => {
    api<{ id: string; nombre: string }[]>('/catalogo/sucursales').then(setSucursales)
    cargar().catch(() => setError('No se pudo cargar el catálogo.'))
  }, [])

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await api('/catalogo/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre,
          categoria,
          ocasion,
          precioBase: Number(precio),
        }),
      })
      setNombre('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear')
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <p className="eyebrow">Inventario</p>
          <h2>Catálogo</h2>
        </div>
      </div>
      <form
        className="card row-form"
        onSubmit={(e) => {
          e.preventDefault()
          cargar().catch(() => setError('No se pudo filtrar.'))
        }}
      >
        <input
          placeholder="categoría"
          value={filtroCat}
          onChange={(e) => setFiltroCat(e.target.value)}
        />
        <input
          placeholder="ocasión"
          value={filtroOc}
          onChange={(e) => setFiltroOc(e.target.value)}
        />
        <input
          placeholder="talla"
          value={filtroTalla}
          onChange={(e) => setFiltroTalla(e.target.value)}
        />
        <input
          placeholder="color"
          value={filtroColor}
          onChange={(e) => setFiltroColor(e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="precio min"
          value={precioMin}
          onChange={(e) => setPrecioMin(e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="precio max"
          value={precioMax}
          onChange={(e) => setPrecioMax(e.target.value)}
        />
        <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
          <option value="">todas las sucursales</option>
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <button type="submit" className="ghost">
          Filtrar
        </button>
      </form>
      {user?.rol === 'ADMIN' ? (
        <form className="card row-form" onSubmit={crear}>
          <input
            placeholder="Nombre de la prenda"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <input value={ocasion} onChange={(e) => setOcasion(e.target.value)} />
          <input
            type="number"
            min="0"
            step="0.1"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <button type="submit">Agregar</button>
        </form>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {ok ? <p className="ok">{ok}</p> : null}
      <div className="grid">
        {productos.map((p) => (
          <article key={p.id} className="card product">
            {p.variantes[0]?.urlFoto ? (
              <img
                className="thumb"
                src={assetUrl(p.variantes[0].urlFoto)}
                alt={p.nombre}
              />
            ) : null}
            <h3>
              <Link to={`/ficha/${p.id}`}>{p.nombre}</Link>
            </h3>
            <p className="muted">
              {p.categoria} · {p.ocasion}
            </p>
            <p className="price">
              Bs {precioEfectivo(p).toFixed(2)}
              {Number(p.descuentoPct ?? 0) > 0 ? (
                <span className="muted"> (−{Number(p.descuentoPct)}%)</span>
              ) : null}
            </p>
            <ul>
              {p.variantes.map((v) => {
                const stock = v.stocks.reduce(
                  (acc, s) => acc + Math.max(0, s.cantidad - (s.reservado ?? 0)),
                  0,
                )
                return (
                  <li key={v.id}>
                    {v.talla} / {v.color} · disp. {stock}{' '}
                    {v.stocks
                      .map(
                        (s) =>
                          `${s.almacen?.sucursal?.nombre ?? s.almacenId.slice(0, 4)}:${Math.max(0, s.cantidad - (s.reservado ?? 0))}`,
                      )
                      .join(' · ')}{' '}
                    <Link to={`/probar/${v.id}`}>Probar</Link>
                    {user?.rol === 'CLIENTA' ? (
                      <>
                        {' '}
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            agregarAlCarrito({
                              productoId: p.id,
                              nombre: p.nombre,
                              precio: precioEfectivo(p),
                              varianteId: v.id,
                              talla: v.talla,
                              color: v.color,
                            })
                            setOk(`${p.nombre} ${v.talla}/${v.color} al carrito`)
                          }}
                        >
                          Al carrito
                        </button>
                      </>
                    ) : null}
                  </li>
                )
              })}
              {p.variantes.length === 0 ? (
                <li className="muted">
                  Sin variantes · <Link to={`/ficha/${p.id}`}>abrir ficha</Link>
                </li>
              ) : null}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
