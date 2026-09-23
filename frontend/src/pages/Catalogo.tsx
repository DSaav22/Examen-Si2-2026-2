import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { agregarAlCarrito } from '../carrito'
import type { CatalogPage, Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockDisponible } from '../types'
import { storefrontHeroImage } from '../shared/vestaAssets'
import { useStorefront } from '../storefront'

type Sort = 'relevancia' | 'precio-asc' | 'precio-desc' | 'novedades' | 'popularidad' | 'descuento'
type Filters = { search: string; categoria: string; ocasion: string; talla: string; color: string; material: string; estilo: string; ajuste: string; precioMin: string; precioMax: string; sucursalId: string; descuento: boolean; ordenar: Sort }
const initialFilters: Filters = { search: '', categoria: '', ocasion: '', talla: '', color: '', material: '', estilo: '', ajuste: '', precioMin: '', precioMax: '', sucursalId: '', descuento: false, ordenar: 'relevancia' }
const searchVocabulary = ['blazer', 'vestido', 'abrigo', 'sastrería', 'camisa', 'blusa', 'pantalón', 'falda', 'jean', 'bolso', 'calzado', 'accesorios']

function closestSearch(value: string) {
  const term = value.trim().toLocaleLowerCase()
  if (!term || term.length < 3) return ''
  return searchVocabulary.find(candidate => candidate.startsWith(term.slice(0, 3)) || candidate.includes(term.slice(0, 4))) ?? ''
}

function readInitialFilters(): Filters {
  const params = new URLSearchParams(window.location.search)
  return { ...initialFilters, search: params.get('q') ?? '', categoria: params.get('categoria') ?? '', ocasion: params.get('ocasion') ?? '', talla: params.get('talla') ?? '', color: params.get('color') ?? '', material: params.get('material') ?? '', estilo: params.get('estilo') ?? '', ajuste: params.get('ajuste') ?? '', precioMin: params.get('precioMin') ?? '', precioMax: params.get('precioMax') ?? '', sucursalId: params.get('sucursalId') ?? '', descuento: params.get('descuento') === 'true', ordenar: (params.get('ordenar') as Sort) || 'relevancia' }
}

function ProductImage({ product }: { product: Producto }) {
  const [failed, setFailed] = useState(false)
  const src = product.variantes[0]?.urlFoto
  if (failed || !src) return <div className="catalog-image-placeholder" role="img" aria-label={product.nombre}>VESTA</div>
  return <img className="catalog-product-image" src={assetUrl(src)} alt={product.nombre} onError={() => setFailed(true)} />
}

function stockState(product: Producto) {
  const available = product.variantes.some(variant => variant.stocks.some(stockDisponible))
  const low = product.variantes.some(variant => variant.stocks.some(stock => stock.estado === 'ultimas_unidades'))
  return { available, low }
}

function ProductCard({ product, isClient, selected, compared, onCompare, onQuickView, onAdd, onFavorite: onFavoriteMessage }: { product: Producto; isClient: boolean; selected: boolean; compared: boolean; onCompare: () => void; onQuickView: () => void; onAdd: (variant: Variante) => void; onFavorite: () => void }) {
  const { toggleFavorite, rememberProduct } = useStorefront()
  const onFavorite = () => { toggleFavorite(product.id); onFavoriteMessage() }
  const variant = product.variantes[0]
  const discount = Number(product.descuentoPct ?? 0)
  const stock = stockState(product)
  return <article onClick={() => rememberProduct(product.id)} className={`catalog-product-card${selected ? ' is-selected' : ''}`}>
    <div className="catalog-product-media"><ProductImage product={product} /><div className="catalog-badges">{discount > 0 ? <span>-{discount}%</span> : null}{stock.low ? <span>Últimas unidades</span> : null}</div><div className="catalog-product-actions"><button type="button" aria-label={`Añadir ${product.nombre} a favoritos`} onClick={onFavorite}>♡</button><button type="button" aria-label={`Comparar ${product.nombre}`} aria-pressed={compared} onClick={onCompare}>⇄</button></div><button type="button" className="catalog-quick-view" onClick={onQuickView}>Vista rápida</button></div>
    <div className="catalog-product-info"><Link to={`/ficha/${product.id}`} className="catalog-product-name">{product.nombre}</Link><span className="catalog-product-meta">{product.categoria} · {product.ocasion}</span><span className="catalog-product-sku">SKU {variant?.sku ?? 'No disponible'}</span><div className="catalog-price-row"><b>Bs {precioEfectivo(product).toFixed(2)}</b>{discount > 0 ? <del>Bs {Number(product.precioBase).toFixed(2)}</del> : null}</div><span className={`catalog-stock ${stock.available ? '' : 'is-empty'}`}>{stock.low ? 'Últimas unidades' : stock.available ? 'Disponible' : 'Agotado'}</span>{isClient && variant && stock.available ? <button type="button" className="catalog-add" onClick={() => onAdd(variant)}>Añadir a la bolsa</button> : null}</div>
  </article>
}

function CatalogEditorialFilters({ filters, updateFilter }: { filters: Filters; updateFilter: (key: keyof Filters, value: string | boolean) => void }) {
  return <div className="catalog-editorial-filters" aria-label="Filtros editoriales">
    <label>Material<input value={filters.material} onChange={event => updateFilter('material', event.target.value)} placeholder="Ej. algodón" /></label>
    <label>Estilo<input value={filters.estilo} onChange={event => updateFilter('estilo', event.target.value)} placeholder="Ej. sastrería" /></label>
    <label>Ajuste<input value={filters.ajuste} onChange={event => updateFilter('ajuste', event.target.value)} placeholder="Ej. relajado" /></label>
  </div>
}

function ComparePanel({ products, onClose }: { products: Producto[]; onClose: () => void }) {
  if (products.length < 2) return null
  return <div className="catalog-modal-backdrop" role="presentation" onClick={onClose}><section className="catalog-compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title" onClick={event => event.stopPropagation()}><button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Cerrar comparador">×</button><p className="eyebrow">Selección Vesta</p><h2 id="compare-title">Comparar productos</h2><div className="catalog-compare-table"><div className="catalog-compare-labels"><span>Producto</span><span>Precio</span><span>Categoría</span><span>Ocasión</span><span>Material</span><span>Ajuste</span></div>{products.map(product => <div className="catalog-compare-column" key={product.id}><strong>{product.nombre}</strong><span>Bs {precioEfectivo(product).toFixed(2)}</span><span>{product.categoria}</span><span>{product.ocasion}</span><span>{product.material || 'No especificado'}</span><span>{product.ajuste || 'No especificado'}</span><Link className="ui-button ui-button--secondary" to={`/ficha/${product.id}`}>Ver detalle</Link></div>)}</div></section></div>
}

export function Catalogo() {
  const { user } = useAuth(); const isClient = user?.rol === 'CLIENTA'
  const [filters, setFilters] = useState<Filters>(readInitialFilters); const [products, setProducts] = useState<Producto[]>([]); const [page, setPage] = useState<CatalogPage | null>(null); const [branches, setBranches] = useState<Sucursal[]>([]); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [mobileFilters, setMobileFilters] = useState(false); const [density, setDensity] = useState<'regular' | 'compact'>('regular'); const [compare, setCompare] = useState<Producto[]>([]); const [compareOpen, setCompareOpen] = useState(false); const [quickView, setQuickView] = useState<Producto | null>(null); const [searchHistory, setSearchHistory] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('ensayar_busquedas') ?? '[]') as string[] } catch { return [] } })

  const load = async (currentFilters = filters, nextPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true)
    setError('')
    const query = new URLSearchParams({ pagina: String(nextPage), limite: '8' })
    if (currentFilters.search) query.set('q', currentFilters.search)
    if (currentFilters.categoria) query.set('categoria', currentFilters.categoria)
    if (currentFilters.ocasion) query.set('ocasion', currentFilters.ocasion)
    if (currentFilters.talla) query.set('talla', currentFilters.talla)
    if (currentFilters.color) query.set('color', currentFilters.color)
    if (currentFilters.material) query.set('material', currentFilters.material)
    if (currentFilters.estilo) query.set('estilo', currentFilters.estilo)
    if (currentFilters.ajuste) query.set('ajuste', currentFilters.ajuste)
    if (currentFilters.precioMin) query.set('precioMin', currentFilters.precioMin)
    if (currentFilters.precioMax) query.set('precioMax', currentFilters.precioMax)
    if (currentFilters.sucursalId) query.set('sucursalId', currentFilters.sucursalId)
    if (currentFilters.descuento) query.set('descuento', 'true')
    if (currentFilters.ordenar !== 'relevancia') query.set('ordenar', currentFilters.ordenar)
    window.history.replaceState(null, '', `/catalogo?${query.toString()}`)
    try { const result = await api<CatalogPage>(`/catalogo/productos?${query.toString()}`); setPage(result); setProducts(current => append ? [...current, ...result.items] : result.items); if (filters.search && !searchHistory.includes(filters.search)) { const next = [filters.search, ...searchHistory].slice(0, 6); setSearchHistory(next); localStorage.setItem('ensayar_busquedas', JSON.stringify(next)) } } catch { setError('No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.') } finally { setLoading(false); setLoadingMore(false) }
  }

  useEffect(() => { api<Sucursal[]>('/catalogo/sucursales').then(setBranches).catch(() => undefined); void load() }, [])
  const activeFilters = useMemo(() => Object.entries(filters).filter(([key, value]) => value && key !== 'ordenar'), [filters])
  const suggestion = useMemo(() => { if (!filters.search || products.length) return ''; return filters.search.length > 3 ? `Prueba buscar por nombre, categoría o SKU.` : '' }, [filters.search, products.length])
  const suggestedTerm = useMemo(() => products.length ? '' : closestSearch(filters.search), [filters.search, products.length])
  const updateFilter = (key: keyof Filters, value: string | boolean) => setFilters(current => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); setMobileFilters(false); void load() }
  const clearAll = () => { setFilters(initialFilters); setCompare([]); void load(initialFilters); }
  const removeFilter = (key: string) => { const next = { ...filters, [key]: key === 'descuento' ? false : '' }; setFilters(next); void load(next) }
  const toggleCompare = (product: Producto) => setCompare(current => current.some(item => item.id === product.id) ? current.filter(item => item.id !== product.id) : current.length >= 3 ? current : [...current, product])
  const add = (product: Producto, variant: Variante) => { agregarAlCarrito({ productoId: product.id, nombre: product.nombre, precio: precioEfectivo(product), varianteId: variant.id, talla: variant.talla, color: variant.color }); setMessage(`${product.nombre} se añadió a tu bolsa.`) }

  return <section className="catalog-page"><CatalogEditorialFilters filters={filters} updateFilter={updateFilter} /><div className="catalog-popular-searches" aria-label="Búsquedas populares">Populares: {['blazer', 'vestido', 'abrigo', 'sastrería'].map(item => <button key={item} type="button" onClick={() => { const next = { ...filters, search: item }; updateFilter('search', item); void load(next) }}>{item}</button>)}</div>{suggestedTerm && suggestedTerm !== filters.search.toLocaleLowerCase() ? <p className="catalog-correction" role="status">¿Quizás quisiste decir <button type="button" onClick={() => { const next = { ...filters, search: suggestedTerm }; updateFilter('search', suggestedTerm); void load(next) }}>{suggestedTerm}</button>?</p> : null}
    {isClient ? <><section className="storefront-hero" style={{ backgroundImage: `url(${storefrontHeroImage})` }} aria-label="Nueva temporada"><div className="hero-copy"><p className="eyebrow">Edición 01 · otoño</p><h1>La nueva<br />sofisticación</h1><Link className="hero-cta" to="/inicio">Volver a inicio</Link></div></section><div className="season-strip">OFERTA DE TEMPORADA · HASTA 25%</div></> : null}
    <div className="catalog-heading"><div><p className="eyebrow">Colección</p><h1>Catálogo</h1><p>{page?.total ?? products.length} piezas{filters.sucursalId ? ` · ${branches.find(branch => branch.id === filters.sucursalId)?.nombre ?? 'Sucursal'}` : ''}</p></div><div className="catalog-heading-actions"><button type="button" className="catalog-filter-trigger" onClick={() => setMobileFilters(true)}>☷ Filtrar</button><button type="button" className="catalog-density" aria-label="Vista regular" aria-pressed={density === 'regular'} onClick={() => setDensity('regular')}>▦</button><button type="button" className="catalog-density" aria-label="Vista compacta" aria-pressed={density === 'compact'} onClick={() => setDensity('compact')}>▤</button></div></div>
    <form className="catalog-search-bar" onSubmit={submit}><input aria-label="Buscar productos" value={filters.search} onChange={event => updateFilter('search', event.target.value)} placeholder="Buscar prendas, colores o SKU" /><button type="submit">Buscar</button>{searchHistory.length ? <span className="catalog-history">Búsquedas recientes: {searchHistory.slice(0, 3).map(item => <button key={item} type="button" onClick={() => { const next = { ...filters, search: item }; updateFilter('search', item); void load(next) }}>{item}</button>)}</span> : null}</form>
    <div className="catalog-layout"><aside className={`catalog-filters${mobileFilters ? ' is-open' : ''}`}><div className="catalog-filters-header"><h2>Filtrar</h2><button type="button" onClick={() => setMobileFilters(false)} aria-label="Cerrar filtros">×</button></div><label>Categoría<input value={filters.categoria} onChange={event => updateFilter('categoria', event.target.value)} placeholder="Ej. blazer" /></label><label>Ocasión<input value={filters.ocasion} onChange={event => updateFilter('ocasion', event.target.value)} placeholder="Ej. casual" /></label><label>Talla<input value={filters.talla} onChange={event => updateFilter('talla', event.target.value)} placeholder="Ej. M" /></label><label>Color<input value={filters.color} onChange={event => updateFilter('color', event.target.value)} placeholder="Ej. negro" /></label><div className="catalog-two-fields"><label>Precio mínimo<input type="number" min="0" value={filters.precioMin} onChange={event => updateFilter('precioMin', event.target.value)} /></label><label>Precio máximo<input type="number" min="0" value={filters.precioMax} onChange={event => updateFilter('precioMax', event.target.value)} /></label></div><label>Sucursal<select value={filters.sucursalId} onChange={event => updateFilter('sucursalId', event.target.value)}><option value="">Todas</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select></label><label className="catalog-check"><input type="checkbox" checked={filters.descuento} onChange={event => updateFilter('descuento', event.target.checked)} /> Solo con descuento</label><div className="catalog-unsupported"><span>Material, estilo y ajuste</span><small>Disponibles cuando el modelo de datos los incorpore.</small></div><div className="catalog-filter-actions"><button className="ui-button ui-button--primary" type="submit">Ver resultados</button><button className="ui-button ui-button--text" type="button" onClick={clearAll}>Limpiar todos</button></div></aside><div className="catalog-results"><div className="catalog-results-toolbar"><span>{loading ? 'Cargando…' : `${page?.total ?? products.length} resultados`}</span><label>Ordenar<select value={filters.ordenar} onChange={event => { const next = { ...filters, ordenar: event.target.value as Sort }; updateFilter('ordenar', event.target.value as Sort); void load(next) }}><option value="relevancia">Relevancia</option><option value="precio-asc">Precio menor</option><option value="precio-desc">Precio mayor</option><option value="novedades">Más nuevos</option><option value="popularidad">Popularidad</option><option value="descuento">Mayor descuento</option></select></label></div>{activeFilters.length ? <div className="catalog-chips">{activeFilters.map(([key, value]) => <button type="button" key={key} onClick={() => removeFilter(key)}>{key === 'descuento' ? 'Con descuento' : `${key}: ${value}`} ×</button>)}<button type="button" onClick={clearAll}>Limpiar todos</button></div> : null}{error ? <div className="catalog-state catalog-error" role="alert">{error}</div> : null}{!loading && !products.length ? <div className="catalog-state"><strong>No encontramos prendas con estos criterios.</strong><p>{suggestion}</p><button type="button" onClick={clearAll}>Limpiar filtros</button></div> : null}{loading ? <div className="catalog-grid"><div className="catalog-skeleton" /><div className="catalog-skeleton" /><div className="catalog-skeleton" /><div className="catalog-skeleton" /></div> : <div className={`catalog-grid${density === 'compact' ? ' is-compact' : ''}`}>{products.map(product => <ProductCard key={product.id} product={product} isClient={Boolean(isClient)} selected={compare.some(item => item.id === product.id)} compared={compare.some(item => item.id === product.id)} onCompare={() => toggleCompare(product)} onQuickView={() => setQuickView(product)} onFavorite={() => setMessage(`${product.nombre} se guardará en favoritos cuando la cuenta esté habilitada.`)} onAdd={variant => add(product, variant)} />)}</div>}{page?.hayMas ? <button className="catalog-load-more" type="button" disabled={loadingMore} onClick={() => void load(filters, (page.pagina ?? 1) + 1, true)}>{loadingMore ? 'Cargando…' : `Mostrar más · ${Math.max(0, page.total - products.length)} restantes`}</button> : null}</div></div>
    {compare.length ? <aside className="catalog-compare" aria-label="Comparar productos"><strong>Comparar ({compare.length}/3)</strong>{compare.map(product => <button key={product.id} type="button" onClick={() => toggleCompare(product)}>{product.nombre} ×</button>)}<button type="button" disabled={compare.length < 2} onClick={() => setMessage('Comparador preparado para la siguiente fase visual.')}>Abrir comparador</button></aside> : null}
    {quickView ? <div className="catalog-modal-backdrop" role="presentation" onClick={() => setQuickView(null)}><section className="catalog-quick-modal" role="dialog" aria-modal="true" aria-labelledby="quick-title" onClick={event => event.stopPropagation()}><button type="button" className="catalog-modal-close" onClick={() => setQuickView(null)} aria-label="Cerrar vista rápida">×</button><ProductImage product={quickView} /><div><p className="eyebrow">Vista rápida</p><h2 id="quick-title">{quickView.nombre}</h2><p>{quickView.descripcion}</p><strong>Bs {precioEfectivo(quickView).toFixed(2)}</strong><Link className="ui-button ui-button--primary" to={`/ficha/${quickView.id}`}>Abrir detalle</Link></div></section></div> : null}
    {message ? <p className="ok catalog-message" role="status">{message}</p> : null}
    {compare.length >= 2 ? <button type="button" className="catalog-compare-open" onClick={() => setCompareOpen(true)}>Comparar selección ({compare.length})</button> : null}
    {compareOpen ? <ComparePanel products={compare} onClose={() => setCompareOpen(false)} /> : null}
    {user?.rol === 'ADMIN' ? <AdminCreate onCreated={() => void load()} /> : null}
  </section>
}

function AdminCreate({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState(''); const [category, setCategory] = useState('tops'); const [occasion, setOccasion] = useState('casual'); const [price, setPrice] = useState('99')
  async function create(event: FormEvent) { event.preventDefault(); await api('/catalogo/productos', { method: 'POST', body: JSON.stringify({ nombre: name, categoria: category, ocasion: occasion, precioBase: Number(price) }) }); setName(''); onCreated() }
  return <form className="card row-form catalog-admin-create" onSubmit={create}><strong>Agregar producto</strong><input placeholder="Nombre" value={name} onChange={event => setName(event.target.value)} required /><input value={category} onChange={event => setCategory(event.target.value)} /><input value={occasion} onChange={event => setOccasion(event.target.value)} /><input type="number" min="0" value={price} onChange={event => setPrice(event.target.value)} /><button type="submit">Agregar</button></form>
}
