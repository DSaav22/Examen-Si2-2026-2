import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { agregarAlCarrito } from '../carrito'
import { useAuth } from '../auth'
import type { Producto, Sucursal } from '../types'
import { precioEfectivo } from '../types'

export function Ficha() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [p, setP] = useState<Producto | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pregunta, setPregunta] = useState('¿qué talla hay?')
  const [talla, setTalla] = useState('M')
  const [color, setColor] = useState('negro')
  const [sku, setSku] = useState('')
  const [cantidad, setCantidad] = useState('8')
  const [almacenId, setAlmacenId] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editDescPct, setEditDescPct] = useState('0')

  async function cargar() {
    if (!id) return
    const prod = await api<Producto>(`/catalogo/productos/${id}`)
    setP(prod)
    setEditNombre(prod.nombre)
    setEditDesc(prod.descripcion ?? '')
    setEditPrecio(String(Number(prod.precioBase)))
    setEditDescPct(String(Number(prod.descuentoPct ?? 0)))
  }

  useEffect(() => {
    cargar().catch(() => setError('No se encontró la prenda.'))
    api<Sucursal[]>('/catalogo/sucursales').then((s) => {
      setSucursales(s)
      setAlmacenId(s[0]?.almacenes[0]?.id ?? '')
    })
  }, [id])

  async function preguntar(e: FormEvent) {
    e.preventDefault()
    if (!p) return
    const r = await api<{ respuesta: string }>('/ia/ficha', {
      method: 'POST',
      body: JSON.stringify({ productoId: p.id, pregunta }),
    })
    setOk(r.respuesta)
  }

  async function guardarProducto(e: FormEvent) {
    e.preventDefault()
    if (!p) return
    setError('')
    try {
      await api(`/catalogo/productos/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: editNombre,
          descripcion: editDesc,
          precioBase: Number(editPrecio),
          descuentoPct: Number(editDescPct),
        }),
      })
      setOk('Producto actualizado.')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se guardó el producto')
    }
  }

  async function crearVariante(e: FormEvent) {
    e.preventDefault()
    if (!p) return
    setError('')
    try {
      const v = await api<{ id: string }>('/catalogo/productos/' + p.id + '/variantes', {
        method: 'POST',
        body: JSON.stringify({
          talla,
          color,
          sku:
            sku ||
            `${p.nombre.slice(0, 3).toUpperCase()}-${color.slice(0, 3).toUpperCase()}-${talla}`,
          urlFoto: p.categoria === 'faldas' ? '/foto-falda.svg' : '/foto-polera.svg',
          urlOverlay: '/overlay-polera.png',
        }),
      })
      if (almacenId) {
        await api('/catalogo/stock', {
          method: 'PUT',
          body: JSON.stringify({
            varianteId: v.id,
            almacenId,
            cantidad: Number(cantidad),
          }),
        })
      }
      setOk('Variante y stock guardados.')
      setSku('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se creó la variante')
    }
  }

  if (!p) return <p className="muted">{error || 'Cargando ficha…'}</p>

  const precioFinal = precioEfectivo(p)

  return (
    <section>
      <p className="eyebrow">UC02 · Ficha</p>
      <h2>{p.nombre}</h2>
      <p className="muted">
        {p.categoria} · {p.ocasion}
      </p>
      <p className="price">
        Bs {precioFinal.toFixed(2)}
        {Number(p.descuentoPct ?? 0) > 0 ? (
          <span className="muted">
            {' '}
            (−{Number(p.descuentoPct)}% · lista {Number(p.precioBase).toFixed(2)})
          </span>
        ) : null}
      </p>
      {p.descripcion ? <p>{p.descripcion}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {ok ? <p className="ok">{ok}</p> : null}

      <form className="card row-form" onSubmit={preguntar}>
        <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
        <button type="submit" className="ghost">
          Preguntar a la ficha
        </button>
      </form>

      <ul>
        {p.variantes.map((v) => {
          const stock = v.stocks.reduce(
            (acc, s) => acc + Math.max(0, s.cantidad - (s.reservado ?? 0)),
            0,
          )
          return (
            <li key={v.id}>
              {v.urlFoto ? (
                <img className="thumb" src={assetUrl(v.urlFoto)} alt={v.color} />
              ) : null}
              {v.talla} / {v.color} · {v.sku} · stock {stock}{' '}
              <Link to={`/probar/${v.id}`}>Probar</Link>
              {user?.rol === 'ADMIN' ? (
                <label className="inline-file">
                  Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const fd = new FormData()
                      fd.append('archivo', file)
                      const { url } = await api<{ url: string }>('/catalogo/imagenes', {
                        method: 'POST',
                        body: fd,
                      })
                      await api(`/catalogo/variantes/${v.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ urlFoto: url }),
                      })
                      setOk('Foto de color guardada.')
                      await cargar()
                    }}
                  />
                </label>
              ) : null}
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
                        precio: precioFinal,
                        varianteId: v.id,
                        talla: v.talla,
                        color: v.color,
                      })
                      setOk(`${v.talla}/${v.color} en el carrito`)
                    }}
                  >
                    Al carrito
                  </button>
                </>
              ) : null}
            </li>
          )
        })}
        {p.variantes.length === 0 ? <li className="muted">Sin variantes</li> : null}
      </ul>

      {user?.rol === 'ADMIN' ? (
        <form className="card col-form" onSubmit={guardarProducto}>
          <h3>Editar producto</h3>
          <label>
            Nombre
            <input
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              required
            />
          </label>
          <label>
            Descripción
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={3}
            />
          </label>
          <label>
            Precio base
            <input
              type="number"
              min="0"
              step="0.01"
              value={editPrecio}
              onChange={(e) => setEditPrecio(e.target.value)}
              required
            />
          </label>
          <label>
            Descuento %
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={editDescPct}
              onChange={(e) => setEditDescPct(e.target.value)}
            />
          </label>
          <button type="submit">Guardar producto</button>
        </form>
      ) : null}

      {user?.rol === 'ADMIN' ? (
        <form className="card col-form" onSubmit={crearVariante}>
          <h3>Cargar variante y stock</h3>
          <label>
            Talla
            <input value={talla} onChange={(e) => setTalla(e.target.value)} required />
          </label>
          <label>
            Color
            <input value={color} onChange={(e) => setColor(e.target.value)} required />
          </label>
          <label>
            SKU
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="opcional"
            />
          </label>
          <label>
            Almacén
            <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
              {sucursales.flatMap((s) =>
                s.almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {s.nombre} · {a.nombre}
                  </option>
                )),
              )}
            </select>
          </label>
          <label>
            Cantidad
            <input
              type="number"
              min="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>
          <button type="submit">Guardar variante</button>
        </form>
      ) : null}

      <button type="button" className="ghost" onClick={() => navigate('/catalogo')}>
        Volver
      </button>
    </section>
  )
}
