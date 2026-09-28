import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Producto, Sucursal, Variante } from '../types'
import { stockCapacidad } from '../types'
import { homePorRol } from '../roles'
import { catalogLabel } from '../text'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus, OpsTable } from '../shared/ops/OpsUi'

type Nom = { id: string; nombre: string }
type IngresoHistorico = {
  id: string
  cantidad: number
  nota: string
  creadoEn: string
  variante: { sku: string; talla: string; color: string; producto: { nombre: string } }
  almacen: { nombre: string; sucursal: { nombre: string; ciudad: string } }
  usuario: { nombre: string; email: string } | null
}
type HistorialIngresos = { items: IngresoHistorico[]; total: number; pagina: number; limite: number }

const CATEGORIAS = ['tops', 'blazer', 'abrigos', 'vestidos', 'pantalones', 'faldas', 'camisas', 'accesorios']
const OCASIONES = ['casual', 'trabajo', 'fiesta', 'formal', 'temporada']
const TALLAS = ['XS', 'S', 'M', 'L', 'XL']
const INGRESOS_POR_PAGINA = 8

function stockVariante(v: Variante) {
  return v.stocks.reduce((sum, s) => sum + stockCapacidad(s), 0)
}

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
  const [color, setColor] = useState('negro')
  const [temporadaId, setTemporadaId] = useState('')
  const [coleccionId, setColeccionId] = useState('')
  const [varianteId, setVarianteId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [cantidad, setCantidad] = useState('5')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ingresos, setIngresos] = useState<IngresoHistorico[]>([])
  const [paginaIngresos, setPaginaIngresos] = useState(1)
  const [totalIngresos, setTotalIngresos] = useState(0)
  const [loadingIngresos, setLoadingIngresos] = useState(true)

  async function cargarIngresos(pagina = 1) {
    setLoadingIngresos(true)
    try {
      const history = await api<HistorialIngresos>(
        `/proveedores/mis-ingresos?pagina=${pagina}&limite=${INGRESOS_POR_PAGINA}`,
      )
      setIngresos(history.items)
      setPaginaIngresos(history.pagina)
      setTotalIngresos(history.total)
    } finally {
      setLoadingIngresos(false)
    }
  }

  async function cargar() {
    setProductos(await api<Producto[]>('/proveedores/mis-productos'))
    setTemporadas(await api<Nom[]>('/temporadas'))
    setColecciones(await api<Nom[]>('/colecciones'))
    const s = await api<Sucursal[]>('/catalogo/sucursales')
    setSucursales(s)
    setAlmacenId(current => current || s[0]?.almacenes[0]?.id || '')
    await cargarIngresos(paginaIngresos)
  }

  useEffect(() => {
    setLoading(true)
    cargar()
      .catch(() => setError('No se pudo cargar el portal del proveedor.'))
      .finally(() => setLoading(false))
  }, [])

  const paginasIngresos = Math.max(1, Math.ceil(totalIngresos / INGRESOS_POR_PAGINA))

  const varianteSeleccionada = useMemo(() => {
    for (const p of productos) {
      const v = p.variantes.find(item => item.id === varianteId)
      if (v) return { producto: p, variante: v }
    }
    return null
  }, [productos, varianteId])

  const stats = useMemo(() => {
    let variantes = 0
    let unidades = 0
    for (const p of productos) {
      variantes += p.variantes.length
      for (const v of p.variantes) unidades += stockVariante(v)
    }
    return { productos: productos.length, variantes, unidades }
  }, [productos])

  if (!user || !['PROVEEDOR', 'ADMIN', 'SUPERADMIN'].includes(user.rol)) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    setBusy(true)
    try {
      const creado = await api<Producto>('/proveedores/mis-productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          categoria,
          ocasion,
          precioBase: Number(precio),
          talla,
          color: color.trim(),
          temporadaId: temporadaId || undefined,
          coleccionId: coleccionId || undefined,
        }),
      })
      const sku = creado.variantes[0]?.sku ?? ''
      setMsg(`Producto registrado${sku ? ` · SKU ${sku}` : ''}. Ya podés ingresar stock.`)
      setVarianteId(creado.variantes[0]?.id ?? '')
      setNombre('')
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el producto.')
    } finally {
      setBusy(false)
    }
  }

  async function ingreso(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMsg('')
    if (!varianteId || !almacenId) {
      setError('Elegí una variante y un almacén.')
      return
    }
    setBusy(true)
    try {
      await api('/inventario/ingreso', {
        method: 'POST',
        body: JSON.stringify({
          varianteId,
          almacenId,
          cantidad: Number(cantidad),
          nota: 'Ingreso proveedor',
        }),
      })
      setMsg(`Ingreso de ${cantidad} u. registrado.`)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar stock.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OpsPage
      eyebrow="Proveedor"
      title="Mis productos"
      description="Registrá prendas con su primera variante e informá ingresos de stock a los almacenes de la tienda."
      actions={
        <OpsActions>
          <Link className="ops-text-link" to="/cuenta">
            Cuenta y clave
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => void cargar()} disabled={loading || busy}>
            Actualizar
          </OpsBtn>
        </OpsActions>
      }
    >
      {msg ? (
        <p className="ok" role="status">
          {msg}
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="despacho-stats proveedor-stats">
        <article className="despacho-stat">
          <p className="eyebrow">Productos</p>
          <strong>{stats.productos}</strong>
          <span className="muted">en tu catálogo</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Variantes</p>
          <strong>{stats.variantes}</strong>
          <span className="muted">SKU activos</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Stock reportado</p>
          <strong>{stats.unidades}</strong>
          <span className="muted">unidades en almacén</span>
        </article>
      </div>

      <div className="proveedor-layout">
        <OpsPanel title="Registrar producto" eyebrow="Alta">
          <form className="proveedor-form" onSubmit={e => void crear(e)}>
            <OpsField label="Nombre">
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Blazer sastre"
                minLength={2}
                required
              />
            </OpsField>
            <div className="proveedor-form-grid">
              <OpsField label="Categoría">
                <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Ocasión">
                <select value={ocasion} onChange={e => setOcasion(e.target.value)}>
                  {OCASIONES.map(o => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Precio base (Bs)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  required
                />
              </OpsField>
              <OpsField label="Talla inicial">
                <select value={talla} onChange={e => setTalla(e.target.value)}>
                  {TALLAS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Color inicial">
                <input
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="Ej. negro"
                  required
                />
              </OpsField>
              <OpsField label="Temporada">
                <select value={temporadaId} onChange={e => setTemporadaId(e.target.value)}>
                  <option value="">Sin temporada</option>
                  {temporadas.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Colección">
                <select value={coleccionId} onChange={e => setColeccionId(e.target.value)}>
                  <option value="">Sin colección</option>
                  {colecciones.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </OpsField>
            </div>
            <OpsBtn type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Registrar producto'}
            </OpsBtn>
          </form>
        </OpsPanel>

        <OpsPanel title="Ingreso a almacén" eyebrow="Stock">
          <form className="proveedor-form" onSubmit={e => void ingreso(e)}>
            {varianteSeleccionada ? (
              <div className="proveedor-selected">
                <OpsStatus state="ok">Variante lista</OpsStatus>
                <p>
                  <strong>{varianteSeleccionada.producto.nombre}</strong>
                  <br />
                  <span className="muted">
                    {varianteSeleccionada.variante.sku} · {varianteSeleccionada.variante.talla}/
                    {varianteSeleccionada.variante.color}
                  </span>
                </p>
              </div>
            ) : (
              <p className="muted">
                Elegí <em>Usar para ingreso</em> en una variante de la lista, o registrá un producto
                nuevo.
              </p>
            )}
            <OpsField label="Almacén destino">
              <select value={almacenId} onChange={e => setAlmacenId(e.target.value)} required>
                {!sucursales.length ? <option value="">Sin almacenes</option> : null}
                {sucursales.flatMap(s =>
                  s.almacenes.map(a => (
                    <option key={a.id} value={a.id}>
                      {s.nombre} · {a.nombre}
                    </option>
                  )),
                )}
              </select>
            </OpsField>
            <OpsField label="Cantidad">
              <input
                type="number"
                min="1"
                value={cantidad}
                onChange={e => setCantidad(e.target.value)}
                required
              />
            </OpsField>
            <OpsBtn type="submit" disabled={busy || !varianteId || !almacenId}>
              {busy ? 'Ingresando…' : 'Ingresar stock'}
            </OpsBtn>
          </form>
        </OpsPanel>
      </div>

      <OpsPanel
        title="Catálogo del proveedor"
        eyebrow={loading ? 'Cargando…' : `${stats.productos} productos`}
        className="ops-panel--table"
      >
        {loading ? (
          <p className="muted">Cargando productos…</p>
        ) : !productos.length ? (
          <OpsEmpty title="Todavía no hay productos">
            Registrá el primero con el formulario de arriba.
          </OpsEmpty>
        ) : (
          <div className="proveedor-product-list">
            {productos.map(p => (
              <article className="proveedor-product-card" key={p.id}>
                <header className="proveedor-product-head">
                  <div>
                    <strong>{p.nombre}</strong>
                    <p className="muted">
                      {catalogLabel(p.categoria)} · {catalogLabel(p.ocasion)}
                      {p.temporada?.nombre ? ` · ${catalogLabel(p.temporada.nombre)}` : ''}
                      {p.coleccion?.nombre ? ` · ${catalogLabel(p.coleccion.nombre)}` : ''}
                    </p>
                  </div>
                  <b>Bs {Number(p.precioBase).toFixed(2)}</b>
                </header>
                <ul className="proveedor-variant-list">
                  {p.variantes.map(v => {
                    const unidades = stockVariante(v)
                    const selected = v.id === varianteId
                    return (
                      <li key={v.id} className={selected ? 'is-selected' : undefined}>
                        <div>
                          <code>{v.sku}</code>
                          <span>
                            {v.talla} / {v.color}
                          </span>
                          <small className="muted">
                            {unidades} u. en stock
                          </small>
                        </div>
                        <OpsBtn
                          type="button"
                          variant={selected ? 'primary' : 'secondary'}
                          onClick={() => {
                            setVarianteId(v.id)
                            setMsg(`Variante ${v.sku} lista para ingreso.`)
                          }}
                        >
                          {selected ? 'Seleccionada' : 'Usar para ingreso'}
                        </OpsBtn>
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </div>
        )}
      </OpsPanel>

      <OpsPanel
        title="Historial de ingresos a almacén"
        eyebrow={loadingIngresos ? 'Cargando…' : `${totalIngresos} ingresos registrados`}
        className="ops-panel--table"
      >
        {loadingIngresos ? (
          <p className="muted">Cargando historial de ingresos…</p>
        ) : !ingresos.length ? (
          <OpsEmpty title="Todavía no registraste ingresos">
            Cada ingreso de stock quedará registrado aquí con su almacén y responsable.
          </OpsEmpty>
        ) : (
          <>
            <OpsTable minWidth={780}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto y variante</th>
                  <th>Almacén</th>
                  <th className="num">Ingresado</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.map(ingreso => (
                  <tr key={ingreso.id}>
                    <td>{new Date(ingreso.creadoEn).toLocaleString('es-BO')}</td>
                    <td>
                      <strong>{ingreso.variante.producto.nombre}</strong>
                      <small>{ingreso.variante.sku} · {ingreso.variante.talla}/{ingreso.variante.color}</small>
                    </td>
                    <td>
                      {ingreso.almacen.sucursal.nombre}
                      <small>{ingreso.almacen.nombre} · {ingreso.almacen.sucursal.ciudad}</small>
                    </td>
                    <td className="num">+{ingreso.cantidad} u.</td>
                    <td>
                      {ingreso.usuario?.nombre ?? 'Usuario no disponible'}
                      {ingreso.usuario?.email ? <small>{ingreso.usuario.email}</small> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </OpsTable>
            <div className="ops-pagination" aria-label="Paginación del historial de ingresos">
              <span>Página {paginaIngresos} de {paginasIngresos}</span>
              <OpsBtn type="button" variant="secondary" disabled={paginaIngresos <= 1} onClick={() => void cargarIngresos(paginaIngresos - 1)}>
                Anterior
              </OpsBtn>
              <OpsBtn type="button" variant="secondary" disabled={paginaIngresos >= paginasIngresos} onClick={() => void cargarIngresos(paginaIngresos + 1)}>
                Siguiente
              </OpsBtn>
            </div>
          </>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
