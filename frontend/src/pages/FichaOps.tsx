import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import type { Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

function available(variant: Variante) {
  return variant.stocks.some(stockDisponible)
}

function stockUnidades(variant: Variante) {
  return variant.stocks.reduce((total, stock) => total + Math.max(0, stockCapacidad(stock)), 0)
}

function ProductThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className="ops-ficha-placeholder" role="img" aria-label={alt}>
        VESTA
      </div>
    )
  }
  return <img src={assetUrl(src)} alt={alt} onError={() => setFailed(true)} />
}

export function FichaOps() {
  const { id } = useParams()
  const { user } = useAuth()
  const canEdit = user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN'

  const [product, setProduct] = useState<Producto | null>(null)
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDiscount, setEditDiscount] = useState('0')
  const [editPrecioMayorista, setEditPrecioMayorista] = useState('')
  const [editMinimoMayorista, setEditMinimoMayorista] = useState('0')

  const [newSize, setNewSize] = useState('M')
  const [newColor, setNewColor] = useState('negro')
  const [newSku, setNewSku] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [newQuantity, setNewQuantity] = useState('8')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [stockQty, setStockQty] = useState('0')
  const [stockWarehouseId, setStockWarehouseId] = useState('')
  const [question, setQuestion] = useState('¿Qué tallas hay con stock?')

  async function load() {
    if (!id) return
    const current = await api<Producto>(`/catalogo/productos/${id}/interno`)
    setProduct(current)
    setEditName(current.nombre)
    setEditDescription(current.descripcion ?? '')
    setEditPrice(String(Number(current.precioBase)))
    setEditDiscount(String(Number(current.descuentoPct ?? 0)))
    setEditPrecioMayorista(current.precioMayorista != null ? String(Number(current.precioMayorista)) : '')
    setEditMinimoMayorista(String(Number(current.minimoMayorista ?? 0)))
    const first = current.variantes[0]
    setSelectedVariantId(first?.id ?? '')
  }

  useEffect(() => {
    load().catch(() => setError('No se encontró el producto.'))
    api<Sucursal[]>('/catalogo/sucursales')
      .then(items => {
        setBranches(items)
        const firstWh = items[0]?.almacenes[0]?.id ?? ''
        setWarehouseId(firstWh)
        setStockWarehouseId(firstWh)
      })
      .catch(() => undefined)
  }, [id])

  const selectedVariant = useMemo(
    () => product?.variantes.find(v => v.id === selectedVariantId) ?? product?.variantes[0],
    [product, selectedVariantId],
  )

  const totalStock = useMemo(() => {
    if (!product) return 0
    return product.variantes.reduce((acc, v) => acc + stockUnidades(v), 0)
  }, [product])

  async function uploadPhoto(file: File) {
    const body = new FormData()
    body.append('archivo', file)
    return api<{ url: string }>('/catalogo/imagenes', { method: 'POST', body })
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    try {
      const precioMayorista = editPrecioMayorista.trim() === '' ? null : Number(editPrecioMayorista)
      await api(`/catalogo/productos/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: editName,
          descripcion: editDescription,
          precioBase: Number(editPrice),
          descuentoPct: Number(editDiscount),
          precioMayorista,
          minimoMayorista: Number(editMinimoMayorista),
        }),
      })
      setMessage('Producto actualizado.')
      await load()
    } catch {
      setError('No se guardó el producto.')
    }
  }

  async function createVariant(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    try {
      const uploaded = photoFile ? await uploadPhoto(photoFile) : null
      const variant = await api<{ id: string }>(`/catalogo/productos/${product.id}/variantes`, {
        method: 'POST',
        body: JSON.stringify({
          talla: newSize,
          color: newColor,
          sku:
            newSku ||
            `${product.nombre.slice(0, 3).toUpperCase()}-${newColor.slice(0, 3).toUpperCase()}-${newSize}`,
          urlFoto: uploaded?.url || (product.categoria === 'faldas' ? '/foto-falda.svg' : '/foto-polera.svg'),
          urlOverlay: '/overlay-polera.png',
        }),
      })
      if (warehouseId) {
        await api('/catalogo/stock', {
          method: 'PUT',
          body: JSON.stringify({
            varianteId: variant.id,
            almacenId: warehouseId,
            cantidad: Number(newQuantity),
          }),
        })
      }
      setMessage(uploaded ? 'Variante creada con foto.' : 'Variante creada.')
      setPhotoFile(null)
      setNewSku('')
      await load()
    } catch {
      setError('No se creó la variante.')
    }
  }

  async function replacePhoto(event: FormEvent) {
    event.preventDefault()
    if (!selectedVariant || !photoFile) return
    try {
      const uploaded = await uploadPhoto(photoFile)
      await api(`/catalogo/variantes/${selectedVariant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ urlFoto: uploaded.url }),
      })
      setPhotoFile(null)
      setMessage('Foto actualizada.')
      await load()
    } catch {
      setError('No se pudo subir la imagen.')
    }
  }

  async function setStock(event: FormEvent) {
    event.preventDefault()
    if (!selectedVariant || !stockWarehouseId) return
    try {
      await api('/catalogo/stock', {
        method: 'PUT',
        body: JSON.stringify({
          varianteId: selectedVariant.id,
          almacenId: stockWarehouseId,
          cantidad: Number(stockQty),
        }),
      })
      setMessage('Stock actualizado.')
      await load()
    } catch {
      setError('No se pudo ajustar el stock.')
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    try {
      const result = await api<{ respuesta: string }>('/ia/ficha', {
        method: 'POST',
        body: JSON.stringify({ productoId: product.id, pregunta: question }),
      })
      setMessage(result.respuesta)
    } catch {
      setError('No se pudo consultar la ficha.')
    }
  }

  if (!product) {
    return (
      <OpsPage eyebrow="Catálogo" title="Ficha de producto" description={error || 'Cargando…'}>
        <OpsEmpty title={error || 'Cargando ficha'}>{error ? 'Volvé al catálogo e intentá de nuevo.' : null}</OpsEmpty>
        <Link className="ops-text-link" to="/catalogo">
          ← Volver al catálogo
        </Link>
      </OpsPage>
    )
  }

  const discount = Number(product.descuentoPct ?? 0)
  const opcionesAlmacen = branches.flatMap(s =>
    s.almacenes.map(a => (
      <option key={a.id} value={a.id}>
        {s.nombre} · {a.nombre}
      </option>
    )),
  )

  return (
    <OpsPage
      eyebrow="Catálogo operativo"
      title={product.nombre}
      description={`${product.categoria} · ${product.ocasion} · ${product.variantes.length} variantes · ${totalStock} uds. en stock`}
      actions={
        <OpsActions>
          <Link className="ops-text-link" to="/catalogo">
            ← Catálogo
          </Link>
          <Link className="ops-text-link" to="/encargado">
            Inventario
          </Link>
          <Link className="ops-text-link" to="/pos">
            POS
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => void load()}>
            Actualizar
          </OpsBtn>
        </OpsActions>
      }
    >
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="ok">{message}</p> : null}

      <div className="ops-ficha-layout">
        <OpsPanel title="Vista del producto" eyebrow="Ficha">
          <div className="ops-ficha-hero">
            <div className="ops-ficha-media">
              <ProductThumb src={selectedVariant?.urlFoto ?? ''} alt={product.nombre} />
            </div>
            <div className="ops-ficha-summary">
              <p className="eyebrow">
                {product.categoria} · {product.ocasion}
              </p>
              <h2>{product.nombre}</h2>
              <code>{selectedVariant?.sku ?? 'Sin SKU'}</code>
              <div className="ops-ficha-price">
                <strong>Bs {precioEfectivo(product).toFixed(2)}</strong>
                {discount > 0 ? <del>Bs {Number(product.precioBase).toFixed(2)}</del> : null}
                {discount > 0 ? <OpsStatus state="warn">-{discount}%</OpsStatus> : null}
              </div>
              {product.descripcion ? <p className="muted">{product.descripcion}</p> : null}
              <div className="ops-ficha-variant-pick">
                <span className="eyebrow">Variante activa</span>
                <select
                  value={selectedVariant?.id ?? ''}
                  onChange={e => setSelectedVariantId(e.target.value)}
                >
                  {product.variantes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.talla}/{v.color} · {v.sku} · {stockUnidades(v)} uds
                      {!available(v) ? ' · agotada' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </OpsPanel>

        <OpsPanel title="Stock por almacén" eyebrow={selectedVariant ? `${selectedVariant.talla}/${selectedVariant.color}` : '—'}>
          {!selectedVariant?.stocks.length ? (
            <OpsEmpty title="Sin registros de stock">Asigná cantidad desde el formulario de abajo o en Inventario.</OpsEmpty>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sucursal / almacén</th>
                    <th className="num">Cantidad</th>
                    <th className="num">Reservado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVariant.stocks.map(s => (
                    <tr key={s.almacenId}>
                      <td>{s.almacen?.sucursal?.nombre ?? s.almacenId} · {s.almacen?.nombre ?? '—'}</td>
                      <td className="num">{s.cantidad}</td>
                      <td className="num">{s.reservado ?? 0}</td>
                      <td>
                        <OpsStatus
                          state={
                            s.estado === 'ultimas_unidades'
                              ? 'warn'
                              : stockDisponible(s)
                                ? 'ok'
                                : 'muted'
                          }
                        >
                          {s.estado ?? (stockDisponible(s) ? 'disponible' : 'agotado')}
                        </OpsStatus>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canEdit ? (
            <form className="ops-ficha-inline-form" onSubmit={e => void setStock(e)}>
              <OpsField label="Almacén">
                <select value={stockWarehouseId} onChange={e => setStockWarehouseId(e.target.value)}>
                  {opcionesAlmacen}
                </select>
              </OpsField>
              <OpsField label="Cantidad">
                <input
                  type="number"
                  min={0}
                  value={stockQty}
                  onChange={e => setStockQty(e.target.value)}
                  required
                />
              </OpsField>
              <OpsBtn type="submit" variant="secondary">
                Guardar stock
              </OpsBtn>
            </form>
          ) : (
            <p className="muted">
              Para transferencias entre almacenes usá{' '}
              <Link className="ops-text-link" to="/encargado">
                Inventario
              </Link>
              .
            </p>
          )}
        </OpsPanel>
      </div>

      <OpsPanel title="Variantes" eyebrow={`${product.variantes.length} SKUs`}>
        {!product.variantes.length ? (
          <OpsEmpty title="Sin variantes">Creá la primera talla/color abajo.</OpsEmpty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Talla</th>
                  <th>Color</th>
                  <th className="num">Stock</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {product.variantes.map(v => (
                  <tr key={v.id} className={v.id === selectedVariant?.id ? 'is-selected-row' : ''}>
                    <td>
                      <code>{v.sku}</code>
                    </td>
                    <td>{v.talla}</td>
                    <td>{v.color}</td>
                    <td className="num">{stockUnidades(v)}</td>
                    <td>
                      <OpsStatus state={available(v) ? 'ok' : 'muted'}>
                        {available(v) ? 'disponible' : 'agotada'}
                      </OpsStatus>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ops-text-link"
                        onClick={() => setSelectedVariantId(v.id)}
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanel>

      {canEdit ? (
        <div className="ops-ficha-tools">
          <OpsPanel title="Editar producto">
            <form className="inv-form" onSubmit={e => void saveProduct(e)}>
              <OpsField label="Nombre">
                <input value={editName} onChange={e => setEditName(e.target.value)} required />
              </OpsField>
              <OpsField label="Descripción">
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                />
              </OpsField>
              <div className="ops-ficha-two">
                <OpsField label="Precio base (Bs)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                  />
                </OpsField>
                <OpsField label="Descuento %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={editDiscount}
                    onChange={e => setEditDiscount(e.target.value)}
                  />
                </OpsField>
              </div>
              <div className="ops-ficha-two">
                <OpsField label="Precio mayorista (opcional)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editPrecioMayorista}
                    onChange={e => setEditPrecioMayorista(e.target.value)}
                    placeholder="Vacío = sin mayorista"
                  />
                </OpsField>
                <OpsField label="Mínimo mayorista">
                  <input
                    type="number"
                    min={0}
                    value={editMinimoMayorista}
                    onChange={e => setEditMinimoMayorista(e.target.value)}
                  />
                </OpsField>
              </div>
              <OpsBtn type="submit">Guardar producto</OpsBtn>
            </form>
          </OpsPanel>

          <OpsPanel title="Nueva variante + stock">
            <form className="inv-form" onSubmit={e => void createVariant(e)}>
              <div className="ops-ficha-two">
                <OpsField label="Talla">
                  <input value={newSize} onChange={e => setNewSize(e.target.value)} required />
                </OpsField>
                <OpsField label="Color">
                  <input value={newColor} onChange={e => setNewColor(e.target.value)} required />
                </OpsField>
              </div>
              <OpsField label="SKU (opcional)">
                <input
                  value={newSku}
                  onChange={e => setNewSku(e.target.value)}
                  placeholder="Se genera si lo dejás vacío"
                />
              </OpsField>
              <OpsField label="Almacén inicial">
                <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  {opcionesAlmacen}
                </select>
              </OpsField>
              <OpsField label="Cantidad inicial">
                <input
                  type="number"
                  min={0}
                  value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                />
              </OpsField>
              <OpsField label="Foto">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </OpsField>
              <OpsBtn type="submit">Crear variante</OpsBtn>
            </form>
          </OpsPanel>

          <OpsPanel title="Foto de la variante activa">
            <form className="inv-form" onSubmit={e => void replacePhoto(e)}>
              <p className="muted">
                {selectedVariant
                  ? `${selectedVariant.talla} / ${selectedVariant.color} · ${selectedVariant.sku}`
                  : 'Elegí una variante.'}
              </p>
              <OpsField label="Imagen">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </OpsField>
              <OpsBtn type="submit" variant="secondary" disabled={!photoFile || !selectedVariant}>
                Subir foto
              </OpsBtn>
            </form>
          </OpsPanel>
        </div>
      ) : null}

      <OpsPanel title="Consulta rápida (IA)" eyebrow="Opcional">
        <form className="ops-ficha-ai" onSubmit={e => void ask(e)}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Preguntá por tallas, stock o descripción…"
          />
          <OpsBtn type="submit" variant="secondary">
            Consultar
          </OpsBtn>
        </form>
      </OpsPanel>
    </OpsPage>
  )
}
