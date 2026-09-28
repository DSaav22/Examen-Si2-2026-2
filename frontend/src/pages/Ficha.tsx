import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { catalogLabel } from '../text'
import { useAuth } from '../auth'
import { useStorefront } from '../storefront'
import type { Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'
import { FichaOps } from './FichaOps'

const internalRoles = ['ADMIN', 'SUPERADMIN', 'CAJERO', 'ENCARGADO']

function reservationInitialTime() {
  const date = new Date()
  date.setMinutes(0, 0, 0)
  date.setHours(date.getHours() + 2)
  return date.toISOString().slice(0, 16)
}

function ProductMetadata({ product }: { product: Producto }) {
  return (
    <>
      <section className="detail-metadata" aria-label="Información editorial del producto">
        <strong>{product.modelo || 'Modelo Vesta'}</strong>
        <span>Ajuste: {catalogLabel(product.ajuste || 'relajado')}</span>
        <span>Material: {catalogLabel(product.material || 'selección textil')}</span>
        <span>Composición: {product.composicion || 'consultar etiqueta'}</span>
        <span>Cuidados: {product.cuidados || 'seguir instrucciones de la prenda'}</span>
        <span>Origen: {product.origen || 'Bolivia'}</span>
      </section>
      <SizeGuide />
    </>
  )
}

function SizeGuide() {
  return (
    <details className="detail-size-guide">
      <summary>Guía de medidas</summary>
      <p>Usa una prenda similar y mide sobre una superficie plana.</p>
      <table>
        <thead>
          <tr>
            <th>Talla</th>
            <th>Busto</th>
            <th>Cintura</th>
            <th>Cadera</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>S</td>
            <td>84–88 cm</td>
            <td>66–70 cm</td>
            <td>92–96 cm</td>
          </tr>
          <tr>
            <td>M</td>
            <td>89–94 cm</td>
            <td>71–76 cm</td>
            <td>97–102 cm</td>
          </tr>
          <tr>
            <td>L</td>
            <td>95–101 cm</td>
            <td>77–84 cm</td>
            <td>103–109 cm</td>
          </tr>
        </tbody>
      </table>
    </details>
  )
}

function OpinionsPanel({
  productId,
  canReview,
  onMessage,
}: {
  productId: string
  canReview: boolean
  onMessage: (message: string) => void
}) {
  const [data, setData] = useState<{
    promedio: number
    cantidad: number
    items: {
      id: string
      puntuacion: number
      comentario: string
      verificada: boolean
      usuario?: { nombre: string }
    }[]
  }>({ promedio: 0, cantidad: 0, items: [] })
  const [comment, setComment] = useState('')
  useEffect(() => {
    api<typeof data>(`/catalogo/productos/${productId}/opiniones`).then(setData).catch(() => undefined)
  }, [productId])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!comment.trim()) return
    try {
      await api(`/catalogo/productos/${productId}/opiniones`, {
        method: 'POST',
        body: JSON.stringify({ puntuacion: 5, comentario: comment }),
      })
      setComment('')
      onMessage('Opinión enviada para moderación.')
    } catch {
      onMessage('Debes tener una compra verificada para opinar.')
    }
  }
  return (
    <article className="detail-opinions">
      <h2>Opiniones {data.cantidad ? `· ${data.promedio}/5` : ''}</h2>
      {data.items.length ? (
        data.items.map(item => (
          <div key={item.id}>
            <strong>{'★'.repeat(item.puntuacion)}</strong>
            <p>{item.comentario}</p>
            <small>
              {item.usuario?.nombre ?? 'Clienta'}
              {item.verificada ? ' · Compra verificada' : ''}
            </small>
          </div>
        ))
      ) : (
        <p className="muted">Todavía no hay opiniones moderadas.</p>
      )}
      {canReview ? (
        <form onSubmit={submit}>
          <textarea
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder="Comparte tu experiencia"
            required
          />
          <button className="ui-button ui-button--secondary" type="submit">
            Enviar opinión
          </button>
        </form>
      ) : null}
    </article>
  )
}

function AlertButtons({ productId, onMessage }: { productId: string; onMessage: (message: string) => void }) {
  async function save(tipo: 'reposicion' | 'precio') {
    try {
      await api(`/catalogo/productos/${productId}/alertas`, {
        method: 'POST',
        body: JSON.stringify({ tipo }),
      })
      onMessage('Alerta guardada en tu cuenta.')
    } catch {
      onMessage('Inicia sesión como clienta para guardar alertas.')
    }
  }
  return (
    <div className="detail-alert-actions">
      <button type="button" onClick={() => void save('reposicion')}>
        Avisarme si se agota mi talla
      </button>
      <button type="button" onClick={() => void save('precio')}>
        Avisarme si baja de precio
      </button>
    </div>
  )
}

function available(variant: Variante) {
  return variant.stocks.some(stockDisponible)
}

function lowStock(variant: Variante) {
  return variant.stocks.some(stock => stock.estado === 'ultimas_unidades')
}

function ProductImage({
  src,
  alt,
  zoom,
  onError,
}: {
  src: string
  alt: string
  zoom: boolean
  onError: () => void
}) {
  if (!src) return <div className="detail-image-placeholder" role="img" aria-label={alt}>VESTA</div>
  return (
    <img
      className={zoom ? 'detail-image is-zoomed' : 'detail-image'}
      src={assetUrl(src)}
      alt={alt}
      onError={onError}
    />
  )
}

export function Ficha() {
  const { user } = useAuth()
  const internal = Boolean(user && internalRoles.includes(user.rol))
  if (internal) return <FichaOps />
  return <FichaClient />
}

function FichaClient() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToCart, favorites, toggleFavorite, rememberProduct } = useStorefront()
  const [product, setProduct] = useState<Producto | null>(null)
  const [related, setRelated] = useState<Producto[]>([])
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedImage, setSelectedImage] = useState('')
  const [zoom, setZoom] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reserveOpen, setReserveOpen] = useState(false)
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [reservationBranchId, setReservationBranchId] = useState('')
  const [reservationTime, setReservationTime] = useState(reservationInitialTime)
  const [reservationQuantity, setReservationQuantity] = useState(1)
  const [reservationBusy, setReservationBusy] = useState(false)
  const [reservationError, setReservationError] = useState('')

  async function load() {
    if (!id) return
    const current = await api<Producto>(`/catalogo/productos/${id}`)
    setProduct(current)
    const first = current.variantes[0]
    setSelectedVariantId(first?.id ?? '')
    setSelectedImage(first?.urlFoto ?? '')
    const candidates = await api<Producto[]>(
      `/catalogo/productos?categoria=${encodeURIComponent(current.categoria)}`,
    )
    setRelated(candidates.filter(item => item.id !== current.id).slice(0, 4))
    api<Producto[]>(`/catalogo/productos/${current.id}/complementarios`)
      .then(items => setRelated(currentItems => [...currentItems, ...items].slice(0, 6)))
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
      .then(() => {
        if (id) rememberProduct(id)
      })
      .catch(() => setError('No se encontró la prenda.'))
  }, [id])

  const selectedVariant = useMemo(
    () => product?.variantes.find(variant => variant.id === selectedVariantId) ?? product?.variantes[0],
    [product, selectedVariantId],
  )
  const colors = useMemo(
    () => Array.from(new Set(product?.variantes.map(variant => variant.color) ?? [])),
    [product],
  )
  const sizes = useMemo(
    () => Array.from(new Set(product?.variantes.map(variant => variant.talla) ?? [])),
    [product],
  )
  const gallery = useMemo(
    () => Array.from(new Set(product?.variantes.map(variant => variant.urlFoto).filter(Boolean) ?? [])),
    [product],
  )
  const productAvailability = selectedVariant ? available(selectedVariant) : false
  const pickupAvailable = selectedVariant?.stocks.some(stockDisponible) ?? false

  function selectColor(color: string) {
    const next =
      product?.variantes.find(
        variant => variant.color === color && (variant.talla === selectedVariant?.talla || available(variant)),
      ) ?? product?.variantes.find(variant => variant.color === color)
    if (next) {
      setSelectedVariantId(next.id)
      setSelectedImage(next.urlFoto)
    }
  }
  function selectSize(size: string) {
    const next = product?.variantes.find(
      variant => variant.talla === size && variant.color === selectedVariant?.color,
    )
    if (next) {
      setSelectedVariantId(next.id)
      setSelectedImage(next.urlFoto)
    }
  }
  function addSelected() {
    if (!product || !selectedVariant || !productAvailability) return
    const maxStock = selectedVariant.stocks.reduce((total, stock) => total + stockCapacidad(stock), 0)
    setMessage(
      addToCart(
        {
          productoId: product.id,
          nombre: product.nombre,
          precio: precioEfectivo(product),
          varianteId: selectedVariant.id,
          talla: selectedVariant.talla,
          color: selectedVariant.color,
          urlFoto: selectedVariant.urlFoto || selectedImage || product.variantes[0]?.urlFoto,
        },
        maxStock,
      )
        ? 'La prenda se añadió a tu bolsa.'
        : 'No puedes superar el stock disponible.',
    )
  }

  async function openReservation() {
    if (!selectedVariant || !productAvailability) return
    setReservationError('')
    setReservationTime(reservationInitialTime())
    setReservationQuantity(1)
    setReserveOpen(true)
    try {
      const list = await api<Sucursal[]>('/catalogo/sucursales')
      const availableBranches = list.filter(branch =>
        selectedVariant.stocks.some(stock =>
          stock.almacen?.sucursal?.id === branch.id && stockCapacidad(stock) > 0,
        ),
      )
      setBranches(availableBranches)
      setReservationBranchId(current =>
        availableBranches.some(branch => branch.id === current) ? current : availableBranches[0]?.id || '',
      )
      if (!availableBranches.length) setReservationError('No hay sucursales con esta variante disponible para reservar.')
    } catch {
      setReservationError('No se pudieron cargar las sucursales. Intentá nuevamente.')
    }
  }

  async function createReservation(event: FormEvent) {
    event.preventDefault()
    if (!selectedVariant || !reservationBranchId) return
    setReservationBusy(true)
    setReservationError('')
    try {
      await api('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId: reservationBranchId,
          horario: new Date(reservationTime).toISOString(),
          lineas: [{ varianteId: selectedVariant.id, cantidad: reservationQuantity }],
        }),
      })
      setReserveOpen(false)
      setMessage('Reserva creada. La sucursal preparará tu prenda para que la pruebes en tienda.')
    } catch (reservationFailure) {
      const detail = reservationFailure as Error & { codigo?: string }
      setReservationError(
        detail.codigo === 'STOCK_INSUFICIENTE'
          ? 'No hay stock suficiente de esta variante en la sucursal elegida.'
          : detail.message || 'No se pudo crear la reserva.',
      )
    } finally {
      setReservationBusy(false)
    }
  }
  async function share() {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Enlace copiado al portapapeles.')
    } catch {
      setMessage(url)
    }
  }

  if (!product) return <p className="muted">{error || 'Cargando ficha…'}</p>
  const price = precioEfectivo(product)
  return (
    <section className="product-detail-page">
      <ProductMetadata product={product} />
      <AlertButtons productId={product.id} onMessage={setMessage} />
      <div className="product-detail-top">
        <Link to="/catalogo">← Volver al catálogo</Link>
        <button type="button" onClick={() => void share()}>
          Compartir ↗
        </button>
      </div>
      <div className="product-detail-layout">
        <section className="product-gallery" aria-label={`Galería de ${product.nombre}`}>
          <div
            className={`product-gallery-main${zoom ? ' is-zoomed' : ''}`}
            onClick={() => setZoom(value => !value)}
          >
            {selectedImage ? (
              <ProductImage
                src={selectedImage}
                alt={`${product.nombre}, ${selectedVariant?.color ?? ''}`}
                zoom={zoom}
                onError={() => {
                  setSelectedImage('')
                  setMessage('La imagen no está disponible.')
                }}
              />
            ) : (
              <div className="detail-image-placeholder">VESTA</div>
            )}
            <button type="button" className="product-zoom-button" aria-label={zoom ? 'Alejar imagen' : 'Ampliar imagen'}>
              {zoom ? '−' : '+'}
            </button>
          </div>
          <div className="product-thumbnails">
            {gallery.map(image => (
              <button
                type="button"
                key={image}
                className={selectedImage === image ? 'is-active' : ''}
                onClick={() => {
                  setSelectedImage(image)
                  setZoom(false)
                }}
              >
                <img src={assetUrl(image)} alt="Vista alternativa" />
              </button>
            ))}
          </div>
        </section>
        <section className="product-detail-info">
          <p className="eyebrow">
            {catalogLabel(product.categoria)} · {catalogLabel(product.ocasion)}
          </p>
          <div className="product-detail-title-row">
            <h1>{product.nombre}</h1>
            <button
              type="button"
              aria-pressed={favorites.includes(product.id)}
              onClick={() => toggleFavorite(product.id)}
            >
              {favorites.includes(product.id) ? '♥' : '♡'}
            </button>
          </div>
          <code className="vesta-monospace">SKU: {selectedVariant?.sku ?? 'Sin variante'}</code>
          <div className="product-detail-price">
            <strong>Bs {price.toFixed(2)}</strong>
            {Number(product.descuentoPct ?? 0) > 0 ? <del>Bs {Number(product.precioBase).toFixed(2)}</del> : null}
          </div>
          {user?.rol === 'CLIENTA' &&
          user.mayorista &&
          product.precioMayorista != null &&
          Number(product.minimoMayorista ?? 0) > 0 ? (
            <p className="muted">
              Mayorista Bs {Number(product.precioMayorista).toFixed(2)} desde {Number(product.minimoMayorista)}{' '}
              unidades
            </p>
          ) : null}
          {product.descripcion ? <p className="vesta-body">{product.descripcion}</p> : null}
          <div className="detail-option">
            <strong>Color: {selectedVariant?.color ?? 'No disponible'}</strong>
            <div className="detail-color-options">
              {colors.map(color => (
                <button
                  type="button"
                  key={color}
                  className={selectedVariant?.color === color ? 'is-active' : ''}
                  onClick={() => selectColor(color)}
                  aria-label={`Color ${color}`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
          <div className="detail-option">
            <strong>Talla</strong>
            <div className="detail-size-options">
              {sizes.map(size => {
                const variant = product.variantes.find(
                  item => item.talla === size && item.color === selectedVariant?.color,
                )
                const enabled = Boolean(variant && available(variant))
                return (
                  <button
                    type="button"
                    key={size}
                    disabled={!enabled}
                    className={selectedVariant?.talla === size ? 'is-active' : ''}
                    onClick={() => selectSize(size)}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              className="detail-text-action"
              onClick={() =>
                setMessage('Guía de medidas: consulta busto, cintura y cadera según tu talla habitual.')
              }
            >
              Guía de medidas
            </button>
          </div>
          <div className={`detail-availability ${productAvailability ? '' : 'is-empty'}`}>
            {productAvailability
              ? lowStock(selectedVariant!)
                ? 'Últimas unidades disponibles'
                : 'Disponible'
              : 'No disponible'}
            {pickupAvailable ? <span> · Disponible para retiro en tienda</span> : null}
          </div>
          <button
            type="button"
            className="ui-button ui-button--primary detail-add"
            disabled={!selectedVariant || !productAvailability}
            onClick={addSelected}
          >
            {productAvailability ? 'Añadir a la bolsa' : 'Producto agotado'}
          </button>
          {user?.rol === 'CLIENTA' ? (
            <button
              type="button"
              className="ui-button ui-button--secondary detail-reserve-button"
              disabled={!selectedVariant || !productAvailability}
              aria-expanded={reserveOpen}
              onClick={() => void openReservation()}
            >
              Reservar para probar en tienda
            </button>
          ) : (
            <Link
              className="ui-button ui-button--secondary detail-reserve-button"
              to={`/login?next=${encodeURIComponent(`/ficha/${product.id}`)}`}
            >
              Ingresá para reservar en tienda
            </Link>
          )}
          {reserveOpen ? (
            <form className="detail-reserve-panel" onSubmit={createReservation}>
              <div className="detail-reserve-panel-head">
                <div>
                  <p className="eyebrow">Reserva en tienda</p>
                  <strong>{product.nombre}</strong>
                  <small>{selectedVariant?.talla} · {selectedVariant?.color}</small>
                </div>
                <button type="button" className="detail-reserve-close" onClick={() => setReserveOpen(false)} aria-label="Cerrar reserva">×</button>
              </div>
              <label>
                Sucursal para probar
                <select value={reservationBranchId} onChange={event => setReservationBranchId(event.target.value)} required>
                  <option value="">Elegí una sucursal</option>
                  {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre} · {branch.ciudad}</option>)}
                </select>
              </label>
              <label>
                Horario aproximado
                <input type="datetime-local" value={reservationTime} min={reservationInitialTime()} onChange={event => setReservationTime(event.target.value)} required />
              </label>
              <label>
                Cantidad
                <input type="number" min="1" max="5" value={reservationQuantity} onChange={event => setReservationQuantity(Math.max(1, Math.min(5, Number(event.target.value) || 1)))} required />
              </label>
              <p>La reserva aparta unidades para vos; el stock físico no se descuenta hasta la compra.</p>
              {reservationError ? <p className="error" role="alert">{reservationError}</p> : null}
              <div className="detail-reserve-actions">
                <button type="submit" className="ui-button ui-button--primary" disabled={reservationBusy || !reservationBranchId}>
                  {reservationBusy ? 'Creando reserva…' : 'Confirmar reserva'}
                </button>
                <Link to="/reservas" onClick={() => setReserveOpen(false)}>Ver mis reservas</Link>
              </div>
            </form>
          ) : null}
          {selectedVariant ? (
            <Link
              className="ui-button"
              to={
                user?.rol === 'CLIENTA' ||
                user?.rol === 'ADMIN' ||
                user?.rol === 'SUPERADMIN'
                  ? `/probar/${selectedVariant.id}`
                  : `/login?next=${encodeURIComponent(`/probar/${selectedVariant.id}`)}`
              }
            >
              Probar prenda
            </Link>
          ) : null}
          <div className="detail-alert-actions">
            <button
              type="button"
              onClick={() => setMessage('Te avisaremos cuando vuelva a estar disponible.')}
            >
              Avisarme si se agota mi talla
            </button>
            <button type="button" onClick={() => setMessage('Te avisaremos si cambia el precio.')}>
              Avisarme si baja de precio
            </button>
          </div>
        </section>
      </div>
      {error ? <p className="error detail-message">{error}</p> : null}
      {message && !message.toLocaleLowerCase().includes('bolsa') ? (
        <p className="ok detail-message" role="status">
          {message}
        </p>
      ) : null}
      <section className="detail-information-grid">
        <article>
          <h2>Detalles y ajuste</h2>
          <p>Información de ajuste no disponible todavía en el modelo actual.</p>
        </article>
        <article>
          <h2>Composición y cuidados</h2>
          <p>Composición, cuidados y país de origen pendientes de incorporar al catálogo.</p>
        </article>
        <article>
          <h2>Información de compra</h2>
          <p>No hay opiniones todavía. Las opiniones verificadas se habilitarán en una fase posterior.</p>
        </article>
      </section>
      <section className="detail-related">
        <div className="page-head">
          <div>
            <p className="eyebrow">También te puede gustar</p>
            <h2>Productos relacionados</h2>
          </div>
        </div>
        <div className="detail-related-grid">
          {related.map(item => (
            <Link key={item.id} to={`/ficha/${item.id}`}>
              <span>{item.nombre}</span>
              <b>Bs {precioEfectivo(item).toFixed(2)}</b>
            </Link>
          ))}
        </div>
      </section>
      <section className="detail-look">
        <p className="eyebrow">Completa el look</p>
        <h2>Compra la selección completa</h2>
        <p>Combina esta prenda con piezas disponibles del catálogo.</p>
        <Link className="ui-button ui-button--secondary" to="/catalogo">
          Ver complementarios
        </Link>
      </section>
      <section className="detail-opinions-section" aria-label="Opiniones del producto">
        <OpinionsPanel productId={product.id} canReview={user?.rol === 'CLIENTA'} onMessage={setMessage} />
      </section>
    </section>
  )
}
