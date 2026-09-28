import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { esClienta } from '../roles'
import type { CatalogPage, Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'
import { catalogBannerImage } from '../shared/vestaAssets'
import { useStorefront } from '../storefront'
import { catalogLabel } from '../text'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type Sort = 'relevancia' | 'precio-asc' | 'precio-desc' | 'novedades' | 'popularidad' | 'descuento'
type Filters = {
  search: string
  categoria: string
  ocasion: string
  talla: string
  color: string
  material: string
  estilo: string
  ajuste: string
  precioMin: string
  precioMax: string
  sucursalId: string
  coleccionId: string
  descuento: boolean
  ordenar: Sort
}

const initialFilters: Filters = {
  search: '',
  categoria: '',
  ocasion: '',
  talla: '',
  color: '',
  material: '',
  estilo: '',
  ajuste: '',
  precioMin: '',
  precioMax: '',
  sucursalId: '',
  coleccionId: '',
  descuento: false,
  ordenar: 'relevancia',
}

const searchVocabulary = ['blazer', 'vestido', 'abrigo', 'sastrería', 'camisa', 'blusa', 'pantalón', 'falda', 'jean', 'bolso', 'calzado', 'accesorios']
const POPULAR_SEARCHES = ['blazer', 'vestido', 'abrigo', 'sastrería'] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeSearchTerm(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function closestSearch(value: string) {
  const term = value.trim().toLocaleLowerCase()
  if (!term || term.length < 3) return ''
  return searchVocabulary.find(candidate => candidate.startsWith(term.slice(0, 3)) || candidate.includes(term.slice(0, 4))) ?? ''
}

function readFiltersFromSearch(search: string): Filters {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const coleccion = params.get('coleccion') ?? ''
  let descuento = params.get('descuento') === 'true'
  let ordenar = (params.get('ordenar') as Sort) || 'relevancia'
  let coleccionId = params.get('coleccionId') ?? ''
  let ocasion = params.get('ocasion') ?? ''
  if (coleccion) {
    if (UUID_RE.test(coleccion)) coleccionId = coleccion
    else if (coleccion === 'novedades') ordenar = 'novedades'
    else if (coleccion === 'ofertas') descuento = true
    else if (coleccion === 'ocasiones' && !ocasion) ocasion = 'fiesta'
  }
  return {
    ...initialFilters,
    search: params.get('q') ?? '',
    categoria: params.get('categoria') ?? '',
    ocasion,
    talla: params.get('talla') ?? '',
    color: params.get('color') ?? '',
    material: params.get('material') ?? '',
    estilo: params.get('estilo') ?? '',
    ajuste: params.get('ajuste') ?? '',
    precioMin: params.get('precioMin') ?? '',
    precioMax: params.get('precioMax') ?? '',
    sucursalId: params.get('sucursalId') ?? '',
    coleccionId,
    descuento,
    ordenar,
  }
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

function stockResumen(product: Producto) {
  let unidades = 0
  let disponibles = 0
  for (const variant of product.variantes) {
    for (const stock of variant.stocks) {
      unidades += Math.max(0, stockCapacidad(stock))
      if (stockDisponible(stock)) disponibles += 1
    }
  }
  return { unidades, disponibles, variantes: product.variantes.length }
}

function ProductCard({
  product,
  isClient,
  selected,
  compared,
  onCompare,
  onQuickView,
  onAdd,
  onFavorite: onFavoriteMessage,
}: {
  product: Producto
  isClient: boolean
  selected: boolean
  compared: boolean
  onCompare: () => void
  onQuickView: () => void
  onAdd: (variant: Variante) => void
  onFavorite: () => void
}) {
  const { toggleFavorite, rememberProduct } = useStorefront()
  const onFavorite = () => {
    toggleFavorite(product.id)
    onFavoriteMessage()
  }
  const variant = product.variantes[0]
  const discount = Number(product.descuentoPct ?? 0)
  const stock = stockState(product)
  return (
    <article onClick={() => rememberProduct(product.id)} className={`catalog-product-card${selected ? ' is-selected' : ''}`}>
      <div className="catalog-product-media">
        <ProductImage product={product} />
        <div className="catalog-badges">
          {discount > 0 ? <span>-{discount}%</span> : null}
          {stock.low ? <span>Últimas unidades</span> : null}
        </div>
        <div className="catalog-product-actions">
          <button type="button" aria-label={`Añadir ${product.nombre} a favoritos`} onClick={onFavorite}>♡</button>
          <button type="button" aria-label={`Comparar ${product.nombre}`} aria-pressed={compared} onClick={onCompare}>⇄</button>
        </div>
        <button type="button" className="catalog-quick-view" onClick={onQuickView}>Vista rápida</button>
      </div>
      <div className="catalog-product-info">
        <Link to={`/ficha/${product.id}`} className="catalog-product-name">{product.nombre}</Link>
        <span className="catalog-product-meta">{catalogLabel(product.categoria)} · {catalogLabel(product.ocasion)}</span>
        <span className="catalog-product-sku">SKU {variant?.sku ?? 'No disponible'}</span>
        <div className="catalog-price-row">
          <b>Bs {precioEfectivo(product).toFixed(2)}</b>
          {discount > 0 ? <del>Bs {Number(product.precioBase).toFixed(2)}</del> : null}
        </div>
        <span className={`catalog-stock ${stock.available ? '' : 'is-empty'}`}>
          {stock.low ? 'Últimas unidades' : stock.available ? 'Disponible' : 'Agotado'}
        </span>
        {isClient && variant && stock.available ? (
          <button type="button" className="catalog-add" onClick={() => onAdd(variant)}>Añadir a la bolsa</button>
        ) : null}
      </div>
    </article>
  )
}

const OCASIONES = ['casual', 'trabajo', 'fiesta', 'formal', 'temporada']
const TALLAS = ['XS', 'S', 'M', 'L', 'XL']
const COLORES = [
  { id: 'negro', label: 'Negro', hex: '#1a1a1a' },
  { id: 'blanco', label: 'Blanco', hex: '#f4f1ea' },
  { id: 'beige', label: 'Beige', hex: '#d4c4a8' },
  { id: 'camel', label: 'Camel', hex: '#c4a574' },
  { id: 'gris', label: 'Gris', hex: '#8a8680' },
  { id: 'vino', label: 'Vino', hex: '#6b2d3c' },
  { id: 'azul', label: 'Azul', hex: '#3d4f6f' },
]
const MATERIALES = ['algodón', 'lino', 'lana', 'seda', 'denim', 'cuero', 'sintético']
const ESTILOS = ['sastrería', 'casual', 'minimal', 'oversized', 'clásico']
const AJUSTES = ['ajustado', 'regular', 'relajado', 'oversized']
const CATEGORIAS_FALLBACK = [
  'tops',
  'blazer',
  'abrigos',
  'vestidos',
  'pantalones',
  'faldas',
  'camisas',
  'accesorios',
]

const FILTER_LABELS: Record<string, string> = {
  search: 'Buscar',
  categoria: 'Categoría',
  ocasion: 'Ocasión',
  talla: 'Talla',
  color: 'Color',
  material: 'Material',
  estilo: 'Estilo',
  ajuste: 'Ajuste',
  precioMin: 'Desde',
  precioMax: 'Hasta',
  sucursalId: 'Sucursal',
  coleccionId: 'Colección',
  descuento: 'Con descuento',
}

function CatalogEditorialFilters({
  filters,
  updateFilter,
}: {
  filters: Filters
  updateFilter: (key: keyof Filters, value: string | boolean) => void
}) {
  return (
    <>
      <label>
        Material
        <select
          value={filters.material}
          onChange={event => updateFilter('material', event.target.value)}
        >
          <option value="">Cualquiera</option>
          {MATERIALES.map(item => (
          <option key={item} value={item}>
              {catalogLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Estilo
        <select
          value={filters.estilo}
          onChange={event => updateFilter('estilo', event.target.value)}
        >
          <option value="">Cualquiera</option>
          {ESTILOS.map(item => (
          <option key={item} value={item}>
              {catalogLabel(item)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ajuste
        <select
          value={filters.ajuste}
          onChange={event => updateFilter('ajuste', event.target.value)}
        >
          <option value="">Cualquiera</option>
          {AJUSTES.map(item => (
          <option key={item} value={item}>
              {catalogLabel(item)}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}

function ComparePanel({ products, onClose }: { products: Producto[]; onClose: () => void }) {
  if (products.length < 2) return null
  return (
    <div className="catalog-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="catalog-compare-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-title"
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="catalog-modal-close" onClick={onClose} aria-label="Cerrar comparador">
          ×
        </button>
        <p className="eyebrow">Selección Vesta</p>
        <h2 id="compare-title">Comparar productos</h2>
        <div className="catalog-compare-table">
          <div className="catalog-compare-labels">
            <span>Imagen</span>
            <span>Producto</span>
            <span>Precio</span>
            <span>Categoría</span>
            <span>Ocasión</span>
            <span>Material</span>
            <span>Ajuste</span>
          </div>
          {products.map(product => (
            <div className="catalog-compare-column" key={product.id}>
              {product.variantes[0]?.urlFoto ? (
                <img
                  className="catalog-compare-image"
                  src={assetUrl(product.variantes[0].urlFoto)}
                  alt={product.nombre}
                />
              ) : (
                <div className="catalog-compare-image catalog-compare-image--empty" role="img" aria-label={`Sin foto de ${product.nombre}`}>
                  VESTA
                </div>
              )}
              <strong>{product.nombre}</strong>
              <span>Bs {precioEfectivo(product).toFixed(2)}</span>
              <span>{catalogLabel(product.categoria)}</span>
              <span>{catalogLabel(product.ocasion)}</span>
              <span>{catalogLabel(product.material) || 'No especificado'}</span>
              <span>{catalogLabel(product.ajuste) || 'No especificado'}</span>
              <Link className="ui-button ui-button--secondary" to={`/ficha/${product.id}`}>
                Ver detalle
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AdminCreate({
  onCreated,
  categorias,
}: {
  onCreated: () => void
  categorias: string[]
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categorias[0] ?? 'tops')
  const [occasion, setOccasion] = useState('casual')
  const [price, setPrice] = useState('99')
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (categorias.length && !categorias.includes(category)) {
      setCategory(categorias[0])
    }
  }, [categorias, category])

  async function create(event: FormEvent) {
    event.preventDefault()
    setOk('')
    setError('')
    try {
      const created = await api<{ id: string }>('/catalogo/productos', {
        method: 'POST',
        body: JSON.stringify({
          nombre: name,
          categoria: category,
          ocasion: occasion,
          precioBase: Number(price),
        }),
      })
      setName('')
      setOk('Producto creado. Abriendo ficha…')
      onCreated()
      if (created?.id) navigate(`/ficha/${created.id}`)
    } catch {
      setError('No se pudo crear el producto.')
    }
  }

  return (
    <OpsPanel title="Alta rápida" eyebrow="Nuevo producto">
      <form className="ops-catalog-create-form" onSubmit={e => void create(e)}>
        {ok ? <p className="ok">{ok}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="ops-catalog-create-grid">
          <OpsField label="Nombre">
            <input
              placeholder="Nombre del producto"
              value={name}
              onChange={event => setName(event.target.value)}
              required
            />
          </OpsField>
          <OpsField label="Categoría">
            <select value={category} onChange={event => setCategory(event.target.value)} required>
              {(categorias.length ? categorias : CATEGORIAS_FALLBACK).map(c => (
                <option key={c} value={c}>
                  {catalogLabel(c)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Ocasión">
            <select value={occasion} onChange={event => setOccasion(event.target.value)} required>
              {OCASIONES.map(o => (
                <option key={o} value={o}>
                  {catalogLabel(o)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Precio base (Bs)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={event => setPrice(event.target.value)}
              required
            />
          </OpsField>
        </div>
        <OpsBtn type="submit">Crear y abrir ficha</OpsBtn>
      </form>
    </OpsPanel>
  )
}

function OpsCatalog({
  products,
  page,
  filters,
  branches,
  loading,
  loadingMore,
  error,
  canCreate,
  updateFilter,
  onSubmit,
  onClear,
  onLoadMore,
  onCreated,
}: {
  products: Producto[]
  page: CatalogPage | null
  filters: Filters
  branches: Sucursal[]
  loading: boolean
  loadingMore: boolean
  error: string
  canCreate: boolean
  updateFilter: (key: keyof Filters, value: string | boolean) => void
  onSubmit: (event: FormEvent) => void
  onClear: () => void
  onLoadMore: () => void
  onCreated: () => void
}) {
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK)

  useEffect(() => {
    api<{ id: string; nombre: string }[]>('/catalogo/categorias')
      .then(list => {
        const names = list.map(c => c.nombre).filter(Boolean)
        if (names.length) setCategorias(names)
      })
      .catch(() => undefined)
  }, [])

  const stats = useMemo(() => {
    let conStock = 0
    let agotados = 0
    let conDesc = 0
    for (const p of products) {
      const s = stockState(p)
      if (s.available) conStock += 1
      else agotados += 1
      if (Number(p.descuentoPct ?? 0) > 0) conDesc += 1
    }
    return {
      total: page?.total ?? products.length,
      conStock,
      agotados,
      conDesc,
    }
  }, [products, page])

  return (
    <OpsPage
      eyebrow="Operaciones"
      title="Catálogo"
      description="SKU, precios, variantes y disponibilidad. Abrí la ficha para editar, cargar fotos o ajustar stock."
      actions={
        <OpsActions>
          <Link className="ops-text-link" to="/encargado">
            Inventario
          </Link>
          <Link className="ops-text-link" to="/pos">
            Punto de venta
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => onClear()}>
            Limpiar filtros
          </OpsBtn>
        </OpsActions>
      }
    >
      <div className="despacho-stats ops-catalog-stats">
        <article className="despacho-stat">
          <p className="eyebrow">Total</p>
          <strong>{loading ? '…' : stats.total}</strong>
          <span className="muted">productos</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">En vista</p>
          <strong>{stats.conStock}</strong>
          <span className="muted">con stock</span>
        </article>
        <article className="despacho-stat">
          <p className="eyebrow">Atención</p>
          <strong>{stats.agotados}</strong>
          <span className="muted">agotados · {stats.conDesc} en oferta</span>
        </article>
      </div>

      {canCreate ? <AdminCreate onCreated={onCreated} categorias={categorias} /> : null}

      <OpsPanel title="Buscar y filtrar" eyebrow="Filtros">
        <form className="ops-catalog-filter-form" onSubmit={onSubmit}>
          <OpsField label="Buscar" className="ops-catalog-search-field">
            <input
              value={filters.search}
              onChange={event => updateFilter('search', event.target.value)}
              placeholder="Nombre, categoría o SKU"
            />
          </OpsField>
          <OpsField label="Categoría">
            <select
              value={filters.categoria}
              onChange={event => updateFilter('categoria', event.target.value)}
            >
              <option value="">Todas</option>
              {categorias.map(c => (
              <option key={c} value={c}>
                  {catalogLabel(c)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Ocasión">
            <select
              value={filters.ocasion}
              onChange={event => updateFilter('ocasion', event.target.value)}
            >
              <option value="">Todas</option>
              {OCASIONES.map(o => (
              <option key={o} value={o}>
                  {catalogLabel(o)}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Sucursal">
            <select
              value={filters.sucursalId}
              onChange={event => updateFilter('sucursalId', event.target.value)}
            >
              <option value="">Todas</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre}
                </option>
              ))}
            </select>
          </OpsField>
          <OpsField label="Orden">
            <select
              value={filters.ordenar}
              onChange={event => updateFilter('ordenar', event.target.value as Sort)}
            >
              <option value="relevancia">Relevancia</option>
              <option value="precio-asc">Precio menor</option>
              <option value="precio-desc">Precio mayor</option>
              <option value="novedades">Más nuevos</option>
              <option value="descuento">Mayor descuento</option>
            </select>
          </OpsField>
          <label className="ops-catalog-check">
            <input
              type="checkbox"
              checked={filters.descuento}
              onChange={event => updateFilter('descuento', event.target.checked)}
            />
            Solo descuento
          </label>
          <div className="ops-catalog-toolbar-actions">
            <OpsBtn type="submit">Filtrar</OpsBtn>
            <OpsBtn type="button" variant="secondary" onClick={onClear}>
              Limpiar
            </OpsBtn>
          </div>
        </form>
      </OpsPanel>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <OpsPanel
        title="Productos"
        eyebrow={loading ? 'Cargando…' : `${page?.total ?? products.length} en catálogo`}
        className="ops-panel--table"
      >
        {loading ? (
          <p className="muted">Cargando catálogo…</p>
        ) : !products.length ? (
          <OpsEmpty title="Sin resultados">Probá limpiar los filtros o crear un producto nuevo.</OpsEmpty>
        ) : (
          <div className="table-wrap ops-catalog-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Ocasión</th>
                  <th className="num">Precio</th>
                  <th className="num">Desc.</th>
                  <th className="num">Var.</th>
                  <th className="num">Stock</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const resumen = stockResumen(product)
                  const stock = stockState(product)
                  const discount = Number(product.descuentoPct ?? 0)
                  const skus = product.variantes.map(v => v.sku).filter(Boolean)
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="ops-catalog-product">
                          <div className="ops-catalog-thumb" aria-hidden="true">
                            <ProductImage product={product} />
                          </div>
                          <div>
                            <strong>{product.nombre}</strong>
                            <p className="muted">
                              {product.variantes.length === 1
                                ? '1 variante'
                                : `${product.variantes.length} variantes`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{skus[0] ?? '—'}</code>
                        {skus.length > 1 ? <span className="muted"> +{skus.length - 1}</span> : null}
                      </td>
                      <td>{product.categoria}</td>
                      <td>{product.ocasion}</td>
                      <td className="num">Bs {precioEfectivo(product).toFixed(2)}</td>
                      <td className="num">{discount > 0 ? `${discount}%` : '—'}</td>
                      <td className="num">{resumen.variantes}</td>
                      <td className="num">{resumen.unidades}</td>
                      <td>
                        <OpsStatus
                          state={stock.low ? 'warn' : stock.available ? 'ok' : 'muted'}
                        >
                          {stock.low ? 'Últimas' : stock.available ? 'Disponible' : 'Agotado'}
                        </OpsStatus>
                      </td>
                      <td>
                        <div className="ops-catalog-row-actions">
                          <Link className="ops-text-link" to={`/ficha/${product.id}`}>
                            Editar ficha
                          </Link>
                          <Link className="ops-text-link" to="/encargado">
                            Stock
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {page?.hayMas ? (
          <div className="ops-catalog-more">
            <OpsBtn type="button" variant="secondary" disabled={loadingMore} onClick={onLoadMore}>
              {loadingMore
                ? 'Cargando…'
                : `Cargar más · ${Math.max(0, page.total - products.length)} restantes`}
            </OpsBtn>
          </div>
        ) : null}
      </OpsPanel>
    </OpsPage>
  )
}

export function Catalogo() {
  const { user } = useAuth()
  const { addToCart } = useStorefront()
  const isClient = !user || esClienta(user.rol)
  const canCreate = user?.rol === 'ADMIN' || user?.rol === 'SUPERADMIN'
  const location = useLocation()
  const [filters, setFilters] = useState<Filters>(() => readFiltersFromSearch(location.search))
  const [products, setProducts] = useState<Producto[]>([])
  const [page, setPage] = useState<CatalogPage | null>(null)
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [mobileFilters, setMobileFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [compare, setCompare] = useState<Producto[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [quickView, setQuickView] = useState<Producto | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ensayar_busquedas') ?? '[]') as string[]
    } catch {
      return []
    }
  })
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_FALLBACK)

  useEffect(() => {
    document.body.classList.toggle('has-catalog-compare', compare.length > 0)
    return () => document.body.classList.remove('has-catalog-compare')
  }, [compare.length])

  useEffect(() => {
    api<{ id: string; nombre: string }[]>('/catalogo/categorias')
      .then(list => {
        const names = list.map(c => c.nombre).filter(Boolean)
        if (names.length) setCategorias(names)
      })
      .catch(() => undefined)
  }, [])

  const load = async (currentFilters = filters, nextPage = 1, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')
    const limite = isClient ? '8' : '20'
    const query = new URLSearchParams({ pagina: String(nextPage), limite })
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
    if (currentFilters.coleccionId) query.set('coleccionId', currentFilters.coleccionId)
    if (currentFilters.descuento) query.set('descuento', 'true')
    if (currentFilters.ordenar !== 'relevancia') query.set('ordenar', currentFilters.ordenar)
    window.history.replaceState(null, '', `/catalogo?${query.toString()}`)
    try {
      const result = await api<CatalogPage>(`/catalogo/productos?${query.toString()}`)
      setPage(result)
      setProducts(current => (append ? [...current, ...result.items] : result.items))
      if (currentFilters.search) {
        const term = currentFilters.search.trim()
        const key = normalizeSearchTerm(term)
        if (key) {
          const next = [
            term,
            ...searchHistory.filter(item => normalizeSearchTerm(item) !== key),
          ].slice(0, 6)
          setSearchHistory(next)
          localStorage.setItem('ensayar_busquedas', JSON.stringify(next))
        }
      }
    } catch {
      setError('No se pudo cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then(setBranches).catch(() => undefined)
  }, [])

  useEffect(() => {
    const next = readFiltersFromSearch(location.search)
    setFilters(next)
    void load(next)
  }, [location.search, isClient])

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([key, value]) => value && key !== 'ordenar'),
    [filters],
  )
  const suggestion = useMemo(() => {
    if (!filters.search || products.length) return ''
    return filters.search.length > 3 ? 'Prueba buscar por nombre, categoría o SKU.' : ''
  }, [filters.search, products.length])
  const suggestedTerm = useMemo(
    () => (products.length ? '' : closestSearch(filters.search)),
    [filters.search, products.length],
  )
  const popularKeys = useMemo(
    () => new Set(POPULAR_SEARCHES.map(item => normalizeSearchTerm(item))),
    [],
  )
  const recentSearches = useMemo(() => {
    const seen = new Set<string>()
    return searchHistory.filter(item => {
      const key = normalizeSearchTerm(item)
      if (!key || popularKeys.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 3)
  }, [searchHistory, popularKeys])
  const updateFilter = (key: keyof Filters, value: string | boolean) =>
    setFilters(current => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setMobileFilters(false)
    void load()
  }
  const clearAll = () => {
    setFilters(initialFilters)
    setCompare([])
    void load(initialFilters)
  }
  const removeFilter = (key: string) => {
    const next = { ...filters, [key]: key === 'descuento' ? false : '' }
    setFilters(next)
    void load(next)
  }
  const toggleCompare = (product: Producto) =>
    setCompare(current =>
      current.some(item => item.id === product.id)
        ? current.filter(item => item.id !== product.id)
        : current.length >= 3
          ? current
          : [...current, product],
    )
  const add = (product: Producto, variant: Variante) => {
    const maxStock = variant.stocks.reduce((total, stock) => total + stockCapacidad(stock), 0)
    const ok = addToCart(
      {
        productoId: product.id,
        nombre: product.nombre,
        precio: precioEfectivo(product),
        varianteId: variant.id,
        talla: variant.talla,
        color: variant.color,
        urlFoto: variant.urlFoto || product.variantes[0]?.urlFoto,
      },
      maxStock,
    )
    setMessage(ok ? `${product.nombre} se añadió a tu bolsa.` : 'No puedes superar el stock disponible.')
  }

  if (!isClient) {
    return (
      <OpsCatalog
        products={products}
        page={page}
        filters={filters}
        branches={branches}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        canCreate={Boolean(canCreate)}
        updateFilter={updateFilter}
        onSubmit={submit}
        onClear={clearAll}
        onLoadMore={() => void load(filters, (page?.pagina ?? 1) + 1, true)}
        onCreated={() => void load()}
      />
    )
  }

  return (
    <section className="catalog-page">
      <section className="catalog-banner" aria-label="Colección">
        <img src={catalogBannerImage} alt="" />
        <div className="catalog-banner-copy">
          <p className="eyebrow">Edición 01 · otoño</p>
          <h1>Catálogo</h1>
          <p>
            {page?.total ?? products.length} piezas
            {filters.sucursalId
              ? ` · ${branches.find(branch => branch.id === filters.sucursalId)?.nombre ?? 'Sucursal'}`
              : ''}
          </p>
        </div>
      </section>

      <div className="catalog-heading">
        <div>
          <p className="eyebrow">Explorar</p>
          <h2>Prendas</h2>
        </div>
        <div className="catalog-heading-actions">
          <button
            type="button"
            className="catalog-filter-trigger"
            onClick={() => setMobileFilters(true)}
          >
            ☷ Filtrar
          </button>
          <button
            type="button"
            className="catalog-density"
            aria-label="Vista de cuadrícula"
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            ▦
          </button>
          <button
            type="button"
            className="catalog-density"
            aria-label="Vista en filas"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            ▤
          </button>
        </div>
      </div>

      <form className="catalog-search-bar" onSubmit={submit}>
        <input
          aria-label="Buscar productos"
          value={filters.search}
          onChange={event => updateFilter('search', event.target.value)}
          placeholder="Buscar prendas, colores o SKU"
        />
        <button type="submit">Buscar</button>
      </form>

      <div className="catalog-popular-searches" aria-label="Búsquedas populares">
        <span>Populares</span>
        {POPULAR_SEARCHES.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => {
              const next = { ...filters, search: item }
              updateFilter('search', item)
              void load(next)
            }}
          >
            {catalogLabel(item)}
          </button>
        ))}
        {recentSearches.map(item => (
          <button
            key={`hist-${normalizeSearchTerm(item)}`}
            type="button"
            className="is-history"
            onClick={() => {
              const next = { ...filters, search: item }
              updateFilter('search', item)
              void load(next)
            }}
          >
            {catalogLabel(item)}
          </button>
        ))}
      </div>

      {suggestedTerm && suggestedTerm !== filters.search.toLocaleLowerCase() ? (
        <p className="catalog-correction" role="status">
          ¿Quizás quisiste decir{' '}
          <button
            type="button"
            onClick={() => {
              const next = { ...filters, search: suggestedTerm }
              updateFilter('search', suggestedTerm)
              void load(next)
            }}
          >
            {suggestedTerm}
          </button>
          ?
        </p>
      ) : null}

      <div className="catalog-layout">
        <aside className={`catalog-filters${mobileFilters ? ' is-open' : ''}`}>
          <form onSubmit={submit}>
            <div className="catalog-filters-header">
              <div>
                <p className="eyebrow">Catálogo</p>
                <h2>Filtrar</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilters(false)}
                aria-label="Cerrar filtros"
              >
                ×
              </button>
            </div>
            {activeFilters.length ? (
              <p className="catalog-filters-count">
                {activeFilters.length} activo{activeFilters.length === 1 ? '' : 's'}
              </p>
            ) : null}

            <label>
              Categoría
              <select
                value={filters.categoria}
                onChange={event => updateFilter('categoria', event.target.value)}
              >
                <option value="">Todas</option>
                {categorias.map(item => (
                  <option key={item} value={item}>
                    {catalogLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ocasión
              <select
                value={filters.ocasion}
                onChange={event => updateFilter('ocasion', event.target.value)}
              >
                <option value="">Todas</option>
                {OCASIONES.map(item => (
                  <option key={item} value={item}>
                    {catalogLabel(item)}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="catalog-filter-group">
              <legend>Talla</legend>
              <div className="catalog-size-chips" role="group" aria-label="Talla">
                {TALLAS.map(size => {
                  const active = filters.talla.toLocaleUpperCase() === size
                  return (
                    <button
                      key={size}
                      type="button"
                      className={active ? 'is-active' : undefined}
                      aria-pressed={active}
                      onClick={() => updateFilter('talla', active ? '' : size)}
                    >
                      {size}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="catalog-filter-group">
              <legend>Color</legend>
              <div className="catalog-color-chips" role="group" aria-label="Color">
                {COLORES.map(swatch => {
                  const active =
                    normalizeSearchTerm(filters.color) === normalizeSearchTerm(swatch.id)
                  return (
                    <button
                      key={swatch.id}
                      type="button"
                      className={`catalog-color-chip${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      title={swatch.label}
                      aria-label={swatch.label}
                      onClick={() => updateFilter('color', active ? '' : swatch.id)}
                    >
                      <span style={{ background: swatch.hex }} />
                      <small>{swatch.label}</small>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <CatalogEditorialFilters filters={filters} updateFilter={updateFilter} />

            <div className="catalog-two-fields">
              <label>
                Precio mín.
                <input
                  type="number"
                  min="0"
                  value={filters.precioMin}
                  onChange={event => updateFilter('precioMin', event.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                Precio máx.
                <input
                  type="number"
                  min="0"
                  value={filters.precioMax}
                  onChange={event => updateFilter('precioMax', event.target.value)}
                  placeholder="—"
                />
              </label>
            </div>

            <label>
              Sucursal
              <select
                value={filters.sucursalId}
                onChange={event => updateFilter('sucursalId', event.target.value)}
              >
                <option value="">Todas</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="catalog-check">
              <input
                type="checkbox"
                checked={filters.descuento}
                onChange={event => updateFilter('descuento', event.target.checked)}
              />
              Solo con descuento
            </label>

            <div className="catalog-filter-actions">
              <button className="ui-button ui-button--primary" type="submit">
                Ver resultados
              </button>
              <button className="ui-button ui-button--text" type="button" onClick={clearAll}>
                Limpiar todos
              </button>
            </div>
          </form>
        </aside>
        <div className="catalog-results">
          <div className="catalog-results-toolbar">
            <span>{loading ? 'Cargando…' : `${page?.total ?? products.length} resultados`}</span>
            <label>
              Ordenar
              <select
                value={filters.ordenar}
                onChange={event => {
                  const next = { ...filters, ordenar: event.target.value as Sort }
                  updateFilter('ordenar', event.target.value as Sort)
                  void load(next)
                }}
              >
                <option value="relevancia">Relevancia</option>
                <option value="precio-asc">Precio menor</option>
                <option value="precio-desc">Precio mayor</option>
                <option value="novedades">Más nuevos</option>
                <option value="popularidad">Popularidad</option>
                <option value="descuento">Mayor descuento</option>
              </select>
            </label>
          </div>
          {activeFilters.length ? (
            <div className="catalog-chips">
              {activeFilters.map(([key, value]) => (
                <button type="button" key={key} onClick={() => removeFilter(key)}>
                  {key === 'descuento'
                    ? 'Con descuento'
                    : key === 'sucursalId'
                      ? `${FILTER_LABELS[key]}: ${branches.find(b => b.id === value)?.nombre ?? value}`
                      : `${FILTER_LABELS[key] ?? key}: ${value}`}{' '}
                  ×
                </button>
              ))}
              <button type="button" onClick={clearAll}>
                Limpiar todos
              </button>
            </div>
          ) : null}
          {error ? (
            <div className="catalog-state catalog-error" role="alert">
              {error}
            </div>
          ) : null}
          {!loading && !products.length ? (
            <div className="catalog-state">
              <strong>No encontramos prendas con estos criterios.</strong>
              <p>{suggestion}</p>
              <button type="button" onClick={clearAll}>
                Limpiar filtros
              </button>
            </div>
          ) : null}
          {loading ? (
            <div className="catalog-grid">
              <div className="catalog-skeleton" />
              <div className="catalog-skeleton" />
              <div className="catalog-skeleton" />
              <div className="catalog-skeleton" />
            </div>
          ) : (
            <div className={`catalog-grid${viewMode === 'list' ? ' is-list' : ''}`}>
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isClient
                  selected={compare.some(item => item.id === product.id)}
                  compared={compare.some(item => item.id === product.id)}
                  onCompare={() => toggleCompare(product)}
                  onQuickView={() => setQuickView(product)}
                  onFavorite={() =>
                    setMessage(`${product.nombre} actualizado en favoritos.`)
                  }
                  onAdd={variant => add(product, variant)}
                />
              ))}
            </div>
          )}
          {page?.hayMas ? (
            <button
              className="catalog-load-more"
              type="button"
              disabled={loadingMore}
              onClick={() => void load(filters, (page.pagina ?? 1) + 1, true)}
            >
              {loadingMore
                ? 'Cargando…'
                : `Mostrar más · ${Math.max(0, page.total - products.length)} restantes`}
            </button>
          ) : null}
        </div>
      </div>
      {compare.length ? (
        <aside className="catalog-compare" aria-label="Comparar productos">
          <strong>Comparar ({compare.length}/3)</strong>
          {compare.map(product => (
            <button key={product.id} type="button" onClick={() => toggleCompare(product)}>
              {product.nombre} ×
            </button>
          ))}
          <button
            type="button"
            disabled={compare.length < 2}
            onClick={() => setCompareOpen(true)}
          >
            Abrir comparador
          </button>
        </aside>
      ) : null}
      {quickView ? (
        <div
          className="catalog-modal-backdrop"
          role="presentation"
          onClick={() => setQuickView(null)}
        >
          <section
            className="catalog-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="catalog-modal-close"
              onClick={() => setQuickView(null)}
              aria-label="Cerrar vista rápida"
            >
              ×
            </button>
            <ProductImage product={quickView} />
            <div>
              <p className="eyebrow">Vista rápida</p>
              <h2 id="quick-title">{quickView.nombre}</h2>
              <p>{quickView.descripcion}</p>
              <strong>Bs {precioEfectivo(quickView).toFixed(2)}</strong>
              <Link className="ui-button ui-button--primary" to={`/ficha/${quickView.id}`}>
                Abrir detalle
              </Link>
            </div>
          </section>
        </div>
      ) : null}
      {message && !message.toLocaleLowerCase().includes('bolsa') ? (
        <p className="ok catalog-message" role="status">
          {message}
        </p>
      ) : null}
      {compare.length >= 2 ? (
        <button
          type="button"
          className="catalog-compare-open"
          onClick={() => setCompareOpen(true)}
        >
          Comparar selección ({compare.length})
        </button>
      ) : null}
      {compareOpen ? <ComparePanel products={compare} onClose={() => setCompareOpen(false)} /> : null}
    </section>
  )
}
