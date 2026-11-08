import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import type { CatalogPage, Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'
import { editorialImage, lookImage, storefrontHeroImage } from '../shared/vestaAssets'
import { useStorefront } from '../storefront'
import { catalogLabel } from '../text'
import { useTiendaPublica } from '../shared/SelectorTienda'

function ProductImage({ product, variant }: { product: Producto; variant?: Variante }) {
  const [failed, setFailed] = useState(false)
  const source = variant?.urlFoto || product.variantes[0]?.urlFoto
  if (failed || !source) {
    return (
      <div className="home-product-placeholder" role="img" aria-label={product.nombre}>
        VESTA
      </div>
    )
  }
  return <img src={assetUrl(source)} alt={product.nombre} onError={() => setFailed(true)} />
}

function HomeProductCard({
  product,
  onAdd,
}: {
  product: Producto
  onAdd: (product: Producto, variant: Variante) => void
}) {
  const { favorites, toggleFavorite } = useStorefront()
  const variant = product.variantes[0]
  const discount = Number(product.descuentoPct ?? 0)
  const loved = favorites.includes(product.id)

  return (
    <article className="home-product-card">
      <div className="home-product-media">
        <ProductImage product={product} variant={variant} />
        <div className="home-product-badges">
          {discount > 0 ? <span>-{discount}%</span> : null}
        </div>
        <button
          type="button"
          className={`home-product-favorite${loved ? ' is-on' : ''}`}
          aria-label={loved ? `Quitar ${product.nombre} de favoritos` : `Guardar ${product.nombre}`}
          aria-pressed={loved}
          onClick={() => toggleFavorite(product.id)}
        >
          {loved ? '♥' : '♡'}
        </button>
        <Link className="home-product-quick" to={`/ficha/${product.id}`}>
          Ver prenda
        </Link>
      </div>
      <Link className="home-product-info" to={`/ficha/${product.id}`}>
        <strong>{product.nombre}</strong>
        <span>
          {catalogLabel(product.categoria)} · {catalogLabel(product.ocasion)}
        </span>
        <div>
          <b>Bs {precioEfectivo(product).toFixed(0)}</b>
          {discount > 0 ? <del>Bs {Number(product.precioBase).toFixed(0)}</del> : null}
        </div>
      </Link>
      {variant ? (
        <button type="button" className="home-add-button" onClick={() => onAdd(product, variant)}>
          Añadir a la bolsa
        </button>
      ) : null}
    </article>
  )
}

function ProductRail({
  title,
  eyebrow,
  products,
  loading,
  href = '/catalogo',
  onAdd,
}: {
  title: string
  eyebrow: string
  products: Producto[]
  loading?: boolean
  href?: string
  onAdd: (product: Producto, variant: Variante) => void
}) {
  return (
    <section className="home-section home-products-section">
      <div className="home-section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <Link to={href}>Ver todo →</Link>
      </div>
      {loading ? (
        <p className="home-empty">Cargando selección…</p>
      ) : products.length ? (
        <div className="home-product-grid">
          {products.map(product => (
            <HomeProductCard key={product.id} product={product} onAdd={onAdd} />
          ))}
        </div>
      ) : (
        <p className="home-empty">No hay productos disponibles en esta sección.</p>
      )}
    </section>
  )
}

function isLowStock(product: Producto) {
  return product.variantes.some(variant =>
    variant.stocks.some(stock => {
      return (
        stock.estado === 'ultimas_unidades' ||
        (stockDisponible(stock) && stock.cantidad > 0 && stock.cantidad <= 2)
      )
    }),
  )
}

const OCASIONES = [
  { label: 'Trabajo', slug: 'trabajo' },
  { label: 'Fiesta', slug: 'fiesta' },
  { label: 'Casual', slug: 'casual' },
  { label: 'Temporada', slug: 'temporada' },
] as const

export function Home() {
  const { recent, addToCart } = useStorefront()
  const marca = useTiendaPublica()?.nombre ?? 'Vesta'
  const [products, setProducts] = useState<Producto[]>([])
  const [bestSellers, setBestSellers] = useState<Producto[]>([])
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState(
    () => localStorage.getItem('ensayar_sucursal') ?? '',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api<CatalogPage | Producto[]>('/catalogo/productos?ordenar=novedades&limite=8'),
      api<CatalogPage | Producto[]>('/catalogo/productos?ordenar=popularidad&limite=8'),
      api<Sucursal[]>('/catalogo/sucursales'),
    ])
      .then(([newestItems, popular, locations]) => {
        const asList = (data: CatalogPage | Producto[]) =>
          Array.isArray(data) ? data : (data.items ?? [])
        setProducts(asList(newestItems))
        setBestSellers(asList(popular).slice(0, 4))
        setBranches(locations)
        if (!localStorage.getItem('ensayar_sucursal') && locations[0]) {
          localStorage.setItem('ensayar_sucursal', locations[0].id)
          setSucursalId(locations[0].id)
        }
      })
      .catch(() => setError('No pudimos cargar la selección.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const sync = () => setSucursalId(localStorage.getItem('ensayar_sucursal') ?? '')
    window.addEventListener('ensayar_sucursal_actualizada', sync)
    return () => window.removeEventListener('ensayar_sucursal_actualizada', sync)
  }, [])

  const newest = products.slice(0, 4)
  const lowStock = products.filter(isLowStock).slice(0, 4)
  const recentProducts = useMemo(
    () =>
      recent
        .map(id => products.find(product => product.id === id) ?? bestSellers.find(p => p.id === id))
        .filter((product): product is Producto => Boolean(product))
        .slice(0, 4),
    [products, bestSellers, recent],
  )
  const look = useMemo(
    () =>
      products
        .filter(product => product.variantes.some(variant => variant.stocks.some(stockDisponible)))
        .slice(0, 3),
    [products],
  )

  const branch = branches.find(item => item.id === sucursalId) ?? branches[0]

  function add(product: Producto, variant: Variante) {
    const maxStock = variant.stocks.reduce((total, stock) => total + stockCapacidad(stock), 0)
    setMessage(
      addToCart(
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
        ? `${product.nombre} se añadió a tu bolsa.`
        : 'No puedes superar el stock disponible.',
    )
  }

  return (
    <div className="vesta-home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img src={storefrontHeroImage} alt="" />
        <div className="home-hero-overlay" />
        <div className="home-hero-copy">
          <p className="vesta-hero-brand">{marca.toUpperCase()}</p>
          <p className="vesta-hero-eyebrow">Edición 01 · Otoño</p>
          <h1 id="home-hero-title">
            La nueva
            <br />
            sofisticación
          </h1>
          <p>Prendas contemporáneas, tonos serenos y cortes que permanecen.</p>
          <div className="home-hero-actions">
            <Link className="hero-cta" to="/catalogo">
              Descubrir colección
            </Link>
            <Link className="hero-cta hero-cta--ghost" to="/catalogo?coleccion=ofertas">
              Ver ofertas
            </Link>
          </div>
        </div>
      </section>

      <Link className="home-campaign" to="/catalogo?coleccion=ofertas">
        <span>Oferta de temporada · hasta 25%</span>
        <span>Explorar selección →</span>
      </Link>

      {error ? <p className="error home-error">{error}</p> : null}
      {message && !message.toLocaleLowerCase().includes('bolsa') ? (
        <p className="ok home-message" role="status">
          {message}
        </p>
      ) : null}

      <ProductRail
        eyebrow="Novedades"
        title="Acaban de llegar"
        products={newest}
        loading={loading}
        href="/catalogo?ordenar=novedades"
        onAdd={add}
      />

      <section className="home-section home-occasions">
        <div className="home-section-heading">
          <div>
            <p className="eyebrow">Por ocasión</p>
            <h2>Vestir cada momento</h2>
          </div>
        </div>
        <div className="occasion-grid">
          {OCASIONES.map((occasion, index) => (
            <Link
              key={occasion.slug}
              to={`/catalogo?ocasion=${occasion.slug}`}
              className={`occasion-card occasion-card-${index + 1}`}
            >
              <span>{occasion.label}</span>
              <b>Explorar →</b>
            </Link>
          ))}
        </div>
      </section>

      <ProductRail
        eyebrow="Los más elegidos"
        title="Favoritos de la semana"
        products={bestSellers}
        loading={loading}
        href="/catalogo?ordenar=popularidad"
        onAdd={add}
      />

      {lowStock.length ? (
        <ProductRail
          eyebrow="Última oportunidad"
          title="Quedan pocas unidades"
          products={lowStock}
          href="/catalogo"
          onAdd={add}
        />
      ) : null}

      <section className="home-editorial">
        <div className="home-editorial-image">
          <img src={editorialImage} alt={`Selección editorial ${marca}`} />
        </div>
        <div className="home-editorial-copy">
          <p className="eyebrow">{marca} Journal · 01</p>
          <h2>
            Vestir menos.
            <br />
            Elegir mejor.
          </h2>
          <p>Tonos serenos, cortes amplios y prendas que permanecen más allá de una temporada.</p>
          <Link className="hero-cta" to="/catalogo?coleccion=temporada">
            Ver temporada
          </Link>
        </div>
      </section>

      <section className="home-look">
        <div className="home-look-image">
          <img src={lookImage} alt="Look de sastrería tonal" />
        </div>
        <div className="home-look-copy">
          <p className="eyebrow">Compra el look</p>
          <h2>Sastrería tonal</h2>
          <p>Tres piezas de la selección para un uniforme contemporáneo.</p>
          <div className="home-look-list">
            {look.map(product => (
              <Link key={product.id} to={`/ficha/${product.id}`}>
                <span>{product.nombre}</span>
                <b>Bs {precioEfectivo(product).toFixed(0)}</b>
              </Link>
            ))}
          </div>
          <button
            className="ui-button ui-button--primary"
            type="button"
            disabled={look.length < 3}
            onClick={() => {
              look.forEach(product => {
                if (product.variantes[0]) add(product, product.variantes[0])
              })
            }}
          >
            Añadir look completo
          </button>
        </div>
      </section>

      {recentProducts.length ? (
        <ProductRail
          eyebrow="Vistos recientemente"
          title="Continúa donde lo dejaste"
          products={recentProducts}
          onAdd={add}
        />
      ) : null}

      <section className="home-benefits" aria-label="Beneficios de compra">
        <div>
          <span aria-hidden="true">↗</span>
          <strong>Envío nacional</strong>
        </div>
        <div>
          <span aria-hidden="true">⌂</span>
          <strong>Retiro en tienda</strong>
        </div>
        <div>
          <span aria-hidden="true">↻</span>
          <strong>Cambios simples</strong>
        </div>
        <div>
          <span aria-hidden="true">▣</span>
          <strong>Compra segura</strong>
        </div>
      </section>

      <section className="home-customer-care" aria-label="Atención al cliente">
        <p className="eyebrow">Estamos para ayudarte</p>
        <h2>Atención {marca}</h2>
        <p>Disponibilidad, cambios y retiro en tienda con nuestro equipo.</p>
        <div className="home-care-actions">
          <a className="ui-button ui-button--secondary" href="mailto:hola@vesta.local">
            Contactar
          </a>
          <Link className="ui-button ui-button--text" to="/catalogo">
            Ir al catálogo →
          </Link>
        </div>
        {branch ? (
          <p className="home-branch">
            Tienda preferida: <strong>{branch.nombre}</strong>
            {branch.ciudad ? ` · ${branch.ciudad}` : ''}
          </p>
        ) : null}
      </section>
    </div>
  )
}
