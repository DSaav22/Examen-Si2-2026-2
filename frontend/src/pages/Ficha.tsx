import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { useStorefront } from '../storefront'
import type { Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'

const internalRoles = ['ADMIN', 'CAJERO', 'ENCARGADO']

function ProductMetadata({ product }: { product: Producto }) {
  return <><section className="detail-metadata" aria-label="Información editorial del producto"><strong>{product.modelo || 'Modelo Vesta'}</strong><span>Ajuste: {product.ajuste || 'relajado'}</span><span>Material: {product.material || 'selección textil'}</span><span>Composición: {product.composicion || 'consultar etiqueta'}</span><span>Cuidados: {product.cuidados || 'seguir instrucciones de la prenda'}</span><span>Origen: {product.origen || 'Bolivia'}</span></section><SizeGuide /></>
}

function SizeGuide() {
  return <details className="detail-size-guide"><summary>Guía de medidas</summary><p>Usa una prenda similar y mide sobre una superficie plana.</p><table><thead><tr><th>Talla</th><th>Busto</th><th>Cintura</th><th>Cadera</th></tr></thead><tbody><tr><td>S</td><td>84–88 cm</td><td>66–70 cm</td><td>92–96 cm</td></tr><tr><td>M</td><td>89–94 cm</td><td>71–76 cm</td><td>97–102 cm</td></tr><tr><td>L</td><td>95–101 cm</td><td>77–84 cm</td><td>103–109 cm</td></tr></tbody></table></details>
}

function OpinionsPanel({ productId, canReview, onMessage }: { productId: string; canReview: boolean; onMessage: (message: string) => void }) {
  const [data, setData] = useState<{ promedio: number; cantidad: number; items: { id: string; puntuacion: number; comentario: string; verificada: boolean; usuario?: { nombre: string } }[] }>({ promedio: 0, cantidad: 0, items: [] })
  const [comment, setComment] = useState('')
  useEffect(() => { api<typeof data>(`/catalogo/productos/${productId}/opiniones`).then(setData).catch(() => undefined) }, [productId])
  async function submit(event: FormEvent) { event.preventDefault(); if (!comment.trim()) return; try { await api(`/catalogo/productos/${productId}/opiniones`, { method: 'POST', body: JSON.stringify({ puntuacion: 5, comentario: comment }) }); setComment(''); onMessage('Opinión enviada para moderación.'); } catch { onMessage('Debes tener una compra verificada para opinar.') } }
  return <article className="detail-opinions"><h2>Opiniones {data.cantidad ? `· ${data.promedio}/5` : ''}</h2>{data.items.length ? data.items.map(item => <div key={item.id}><strong>{'★'.repeat(item.puntuacion)}</strong><p>{item.comentario}</p><small>{item.usuario?.nombre ?? 'Clienta'}{item.verificada ? ' · Compra verificada' : ''}</small></div>) : <p className="muted">Todavía no hay opiniones moderadas.</p>}{canReview ? <form onSubmit={submit}><textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Comparte tu experiencia" required /><button className="ui-button ui-button--secondary" type="submit">Enviar opinión</button></form> : null}</article>
}

function AlertButtons({ productId, onMessage }: { productId: string; onMessage: (message: string) => void }) {
  async function save(tipo: 'reposicion' | 'precio') { try { await api(`/catalogo/productos/${productId}/alertas`, { method: 'POST', body: JSON.stringify({ tipo }) }); onMessage('Alerta guardada en tu cuenta.'); } catch { onMessage('Inicia sesión como clienta para guardar alertas.') } }
  return <div className="detail-alert-actions"><button type="button" onClick={() => void save('reposicion')}>Avisarme si se agota mi talla</button><button type="button" onClick={() => void save('precio')}>Avisarme si baja de precio</button></div>
}

function available(variant: Variante) {
  return variant.stocks.some(stockDisponible)
}

function lowStock(variant: Variante) {
  return variant.stocks.some(stock => stock.estado === 'ultimas_unidades')
}

function ProductImage({ src, alt, zoom, onError }: { src: string; alt: string; zoom: boolean; onError: () => void }) {
  if (!src) return <div className="detail-image-placeholder" role="img" aria-label={alt}>VESTA</div>
  return <img className={zoom ? 'detail-image is-zoomed' : 'detail-image'} src={assetUrl(src)} alt={alt} onError={onError} />
}

export function Ficha() {
  const { id } = useParams(); const { user } = useAuth(); const { addToCart, favorites, toggleFavorite, rememberProduct } = useStorefront(); const internal = Boolean(user && internalRoles.includes(user.rol))
  const [product, setProduct] = useState<Producto | null>(null); const [related, setRelated] = useState<Producto[]>([]); const [branches, setBranches] = useState<Sucursal[]>([]); const [selectedVariantId, setSelectedVariantId] = useState(''); const [selectedImage, setSelectedImage] = useState(''); const [zoom, setZoom] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [question, setQuestion] = useState('¿Qué talla hay?'); const [editName, setEditName] = useState(''); const [editDescription, setEditDescription] = useState(''); const [editPrice, setEditPrice] = useState(''); const [editDiscount, setEditDiscount] = useState('0'); const [newSize, setNewSize] = useState('M'); const [newColor, setNewColor] = useState('negro'); const [newSku, setNewSku] = useState(''); const [warehouseId, setWarehouseId] = useState(''); const [newQuantity, setNewQuantity] = useState('8');

  async function load() {
    if (!id) return
    const current = await api<Producto>(`/catalogo/productos/${id}${internal ? '/interno' : ''}`)
    setProduct(current); setEditName(current.nombre); setEditDescription(current.descripcion ?? ''); setEditPrice(String(Number(current.precioBase))); setEditDiscount(String(Number(current.descuentoPct ?? 0)))
    const first = current.variantes[0]; setSelectedVariantId(first?.id ?? ''); setSelectedImage(first?.urlFoto ?? '')
    const candidates = await api<Producto[]>(`/catalogo/productos?categoria=${encodeURIComponent(current.categoria)}`)
    setRelated(candidates.filter(item => item.id !== current.id).slice(0, 4))
    api<Producto[]>(`/catalogo/productos/${current.id}/complementarios`).then(items => setRelated(currentItems => [...currentItems, ...items].slice(0, 6))).catch(() => undefined)
  }

  useEffect(() => { load().then(() => { if (id) rememberProduct(id) }).catch(() => setError('No se encontró la prenda.')); api<Sucursal[]>('/catalogo/sucursales').then(items => { setBranches(items); setWarehouseId(items[0]?.almacenes[0]?.id ?? '') }).catch(() => undefined) }, [id, internal])

  const selectedVariant = useMemo(() => product?.variantes.find(variant => variant.id === selectedVariantId) ?? product?.variantes[0], [product, selectedVariantId])
  const colors = useMemo(() => Array.from(new Set(product?.variantes.map(variant => variant.color) ?? [])), [product])
  const sizes = useMemo(() => Array.from(new Set(product?.variantes.map(variant => variant.talla) ?? [])), [product])
  const gallery = useMemo(() => Array.from(new Set(product?.variantes.map(variant => variant.urlFoto).filter(Boolean) ?? [])), [product])
  const productAvailability = selectedVariant ? available(selectedVariant) : false
  const pickupAvailable = selectedVariant?.stocks.some(stockDisponible) ?? false

  function selectColor(color: string) { const next = product?.variantes.find(variant => variant.color === color && (variant.talla === selectedVariant?.talla || available(variant))) ?? product?.variantes.find(variant => variant.color === color); if (next) { setSelectedVariantId(next.id); setSelectedImage(next.urlFoto) } }
  function selectSize(size: string) { const next = product?.variantes.find(variant => variant.talla === size && variant.color === selectedVariant?.color); if (next) { setSelectedVariantId(next.id); setSelectedImage(next.urlFoto) } }
  function addSelected() { if (!product || !selectedVariant || !productAvailability) return; const maxStock = selectedVariant.stocks.reduce((total, stock) => total + stockCapacidad(stock), 0); setMessage(addToCart({ productoId: product.id, nombre: product.nombre, precio: precioEfectivo(product), varianteId: selectedVariant.id, talla: selectedVariant.talla, color: selectedVariant.color }, maxStock) ? 'La prenda se añadió a tu bolsa.' : 'No puedes superar el stock disponible.') }
  async function share() { const url = window.location.href; try { await navigator.clipboard.writeText(url); setMessage('Enlace copiado al portapapeles.') } catch { setMessage(url) } }
  async function ask(event: FormEvent) { event.preventDefault(); if (!product) return; try { const result = await api<{ respuesta: string }>('/ia/ficha', { method: 'POST', body: JSON.stringify({ productoId: product.id, pregunta: question }) }); setMessage(result.respuesta) } catch { setError('No se pudo consultar la ficha.') } }
  async function saveProduct(event: FormEvent) { event.preventDefault(); if (!product) return; try { await api(`/catalogo/productos/${product.id}`, { method: 'PATCH', body: JSON.stringify({ nombre: editName, descripcion: editDescription, precioBase: Number(editPrice), descuentoPct: Number(editDiscount) }) }); setMessage('Producto actualizado.'); await load() } catch { setError('No se guardó el producto.') } }
  async function createVariant(event: FormEvent) { event.preventDefault(); if (!product) return; try { const variant = await api<{ id: string }>(`/catalogo/productos/${product.id}/variantes`, { method: 'POST', body: JSON.stringify({ talla: newSize, color: newColor, sku: newSku || `${product.nombre.slice(0, 3).toUpperCase()}-${newColor.slice(0, 3).toUpperCase()}-${newSize}`, urlFoto: product.categoria === 'faldas' ? '/foto-falda.svg' : '/foto-polera.svg', urlOverlay: '/overlay-polera.png' }) }); if (warehouseId) await api('/catalogo/stock', { method: 'PUT', body: JSON.stringify({ varianteId: variant.id, almacenId: warehouseId, cantidad: Number(newQuantity) }) }); setMessage('Variante y stock guardados.'); setNewSku(''); await load() } catch { setError('No se creó la variante.') } }

  if (!product) return <p className="muted">{error || 'Cargando ficha…'}</p>
  const price = precioEfectivo(product)
  return <section className="product-detail-page"><ProductMetadata product={product} /><OpinionsPanel productId={product.id} canReview={user?.rol === 'CLIENTA'} onMessage={setMessage} /><AlertButtons productId={product.id} onMessage={setMessage} />
    <div className="product-detail-top"><Link to="/catalogo">← Volver al catálogo</Link><button type="button" onClick={share}>Compartir ↗</button></div>
    <div className="product-detail-layout"><section className="product-gallery" aria-label={`Galería de ${product.nombre}`}><div className={`product-gallery-main${zoom ? ' is-zoomed' : ''}`} onClick={() => setZoom(value => !value)}>{selectedImage ? <ProductImage src={selectedImage} alt={`${product.nombre}, ${selectedVariant?.color ?? ''}`} zoom={zoom} onError={() => { setSelectedImage(''); setMessage('La imagen no está disponible.') }} /> : <div className="detail-image-placeholder">VESTA</div>}<button type="button" className="product-zoom-button" aria-label={zoom ? 'Alejar imagen' : 'Ampliar imagen'}>{zoom ? '−' : '+'}</button></div><div className="product-thumbnails">{gallery.map(image => <button type="button" key={image} className={selectedImage === image ? 'is-active' : ''} onClick={() => { setSelectedImage(image); setZoom(false) }}><img src={assetUrl(image)} alt="Vista alternativa" /></button>)}</div></section>
      <section className="product-detail-info"><p className="eyebrow">{product.categoria} · {product.ocasion}</p><div className="product-detail-title-row"><h1>{product.nombre}</h1><button type="button" aria-pressed={favorites.includes(product.id)} onClick={() => toggleFavorite(product.id)}>{favorites.includes(product.id) ? '♥' : '♡'}</button></div><code className="vesta-monospace">SKU: {selectedVariant?.sku ?? 'Sin variante'}</code><div className="product-detail-price"><strong>Bs {price.toFixed(2)}</strong>{Number(product.descuentoPct ?? 0) > 0 ? <del>Bs {Number(product.precioBase).toFixed(2)}</del> : null}</div>{product.descripcion ? <p className="vesta-body">{product.descripcion}</p> : null}
        <div className="detail-option"><strong>Color: {selectedVariant?.color ?? 'No disponible'}</strong><div className="detail-color-options">{colors.map(color => <button type="button" key={color} className={selectedVariant?.color === color ? 'is-active' : ''} onClick={() => selectColor(color)} aria-label={`Color ${color}`}>{color}</button>)}</div></div>
        <div className="detail-option"><strong>Talla</strong><div className="detail-size-options">{sizes.map(size => { const variant = product.variantes.find(item => item.talla === size && item.color === selectedVariant?.color); const enabled = Boolean(variant && available(variant)); return <button type="button" key={size} disabled={!enabled} className={selectedVariant?.talla === size ? 'is-active' : ''} onClick={() => selectSize(size)}>{size}</button> })}</div><button type="button" className="detail-text-action" onClick={() => setMessage('Guía de medidas: consulta busto, cintura y cadera según tu talla habitual.')}>Guía de medidas</button></div>
        <div className={`detail-availability ${productAvailability ? '' : 'is-empty'}`}>{productAvailability ? lowStock(selectedVariant!) ? 'Últimas unidades disponibles' : 'Disponible' : 'No disponible'}{pickupAvailable ? <span> · Disponible para retiro en tienda</span> : null}</div>{internal ? <div className="detail-internal-stock"><strong>Stock interno por sucursal</strong>{selectedVariant?.stocks.map(stock => <div key={stock.almacenId}><span>{stock.almacen?.sucursal?.nombre ?? stock.almacenId}</span><b>{stock.cantidad} unidades</b><small>Reservado: {stock.reservado ?? 0}</small></div>)}</div> : null}
        <button type="button" className="ui-button ui-button--primary detail-add" disabled={!selectedVariant || !productAvailability} onClick={addSelected}>{productAvailability ? 'Añadir a la bolsa' : 'Producto agotado'}</button><div className="detail-alert-actions"><button type="button" onClick={() => setMessage('Te avisaremos cuando vuelva a estar disponible.')}>Avisarme si se agota mi talla</button><button type="button" onClick={() => setMessage('Te avisaremos si cambia el precio.')}>Avisarme si baja de precio</button></div>
      </section></div>
    {error ? <p className="error detail-message">{error}</p> : null}{message ? <p className="ok detail-message" role="status">{message}</p> : null}
    <section className="detail-information-grid"><article><h2>Detalles y ajuste</h2><p>Información de ajuste no disponible todavía en el modelo actual.</p></article><article><h2>Composición y cuidados</h2><p>Composición, cuidados y país de origen pendientes de incorporar al catálogo.</p></article><article><h2>Opiniones</h2><p>No hay opiniones todavía. Las opiniones verificadas se habilitarán en una fase posterior.</p></article></section>
    <section className="detail-related"><div className="page-head"><div><p className="eyebrow">También te puede gustar</p><h2>Productos relacionados</h2></div></div><div className="detail-related-grid">{related.map(item => <Link key={item.id} to={`/ficha/${item.id}`}><span>{item.nombre}</span><b>Bs {precioEfectivo(item).toFixed(2)}</b></Link>)}</div></section>
    <section className="detail-look"><p className="eyebrow">Completa el look</p><h2>Compra la selección completa</h2><p>Combina esta prenda con piezas disponibles del catálogo.</p><Link className="ui-button ui-button--secondary" to="/catalogo">Ver complementarios</Link></section>
    {internal && user?.rol === 'ADMIN' ? <section className="detail-admin-tools"><form className="card col-form" onSubmit={saveProduct}><h3>Editar producto</h3><label>Nombre<input value={editName} onChange={event => setEditName(event.target.value)} required /></label><label>Descripción<textarea value={editDescription} onChange={event => setEditDescription(event.target.value)} rows={3} /></label><label>Precio base<input type="number" min="0" step="0.01" value={editPrice} onChange={event => setEditPrice(event.target.value)} required /></label><label>Descuento %<input type="number" min="0" max="100" value={editDiscount} onChange={event => setEditDiscount(event.target.value)} /></label><button type="submit">Guardar producto</button></form><form className="card col-form" onSubmit={createVariant}><h3>Cargar variante y stock</h3><label>Talla<input value={newSize} onChange={event => setNewSize(event.target.value)} required /></label><label>Color<input value={newColor} onChange={event => setNewColor(event.target.value)} required /></label><label>SKU<input value={newSku} onChange={event => setNewSku(event.target.value)} placeholder="Opcional" /></label><label>Almacén<select value={warehouseId} onChange={event => setWarehouseId(event.target.value)}>{branches.flatMap(branch => branch.almacenes.map(warehouse => <option key={warehouse.id} value={warehouse.id}>{branch.nombre} · {warehouse.nombre}</option>))}</select></label><label>Cantidad<input type="number" min="0" value={newQuantity} onChange={event => setNewQuantity(event.target.value)} /></label><button type="submit">Guardar variante</button></form></section> : null}
    {internal ? <form className="card row-form detail-ai" onSubmit={ask}><input value={question} onChange={event => setQuestion(event.target.value)} /><button type="submit" className="ghost">Consultar ficha</button></form> : null}
  </section>
}
