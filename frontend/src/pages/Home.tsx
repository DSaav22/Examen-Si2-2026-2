import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import type { Producto, Sucursal, Variante } from '../types'
import { precioEfectivo, stockCapacidad, stockDisponible } from '../types'
import { storefrontHeroImage } from '../shared/vestaAssets'
import { useStorefront } from '../storefront'

const heroImage = storefrontHeroImage

function HomeCountdown() {
  const [seconds, setSeconds] = useState(19 * 60 + 38)
  useEffect(() => { const timer = window.setInterval(() => setSeconds(value => value > 0 ? value - 1 : 19 * 60 + 38), 1000); return () => window.clearInterval(timer) }, [])
  return <span className="home-countdown" aria-label="Tiempo restante de la oferta">{String(Math.floor(seconds / 3600)).padStart(2, '0')}:{String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
}


function ProductImage({ product, variant }: { product: Producto; variant?: Variante }) {
  const [failed, setFailed] = useState(false)
  const source = variant?.urlFoto || product.variantes[0]?.urlFoto
  return failed || !source ? <div className="home-product-placeholder" role="img" aria-label={product.nombre}>VESTA</div> : <img src={assetUrl(source)} alt={product.nombre} onError={() => setFailed(true)} />
}

function HomeProductCard({ product, badge, onAdd }: { product: Producto; badge?: string; onAdd: (product: Producto, variant: Variante) => void }) {
  const variant = product.variantes[0]
  const discount = Number(product.descuentoPct ?? 0)
  return <article className="home-product-card">
    <div className="home-product-media"><ProductImage product={product} variant={variant} /><div className="home-product-badges">{badge ? <span>{badge}</span> : null}{discount > 0 ? <span>-{discount}%</span> : null}</div><Link className="home-product-favorite" to={`/ficha/${product.id}`} aria-label={`Guardar ${product.nombre}`}>♡</Link><Link className="home-product-quick" to={`/ficha/${product.id}`}>Vista rápida</Link></div>
    <Link className="home-product-info" to={`/ficha/${product.id}`}><strong>{product.nombre}</strong><span>{product.ocasion}</span><div><b>Bs {precioEfectivo(product).toFixed(0)}</b>{discount > 0 ? <del>Bs {Number(product.precioBase).toFixed(0)}</del> : null}</div></Link>
    {variant ? <button type="button" className="home-add-button" onClick={() => onAdd(product, variant)}>Añadir a la bolsa</button> : null}
  </article>
}

function ProductRail({ title, eyebrow, products, onAdd }: { title: string; eyebrow: string; products: Producto[]; onAdd: (product: Producto, variant: Variante) => void }) {
  return <section className="home-section home-products-section"><div className="home-section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><Link to="/catalogo">Ver todo →</Link></div>{products.length ? <div className="home-product-grid">{products.map(product => <HomeProductCard key={product.id} product={product} onAdd={onAdd} />)}</div> : <p className="home-empty">No hay productos disponibles en esta sección.</p>}</section>
}

function stockAvailable(product: Producto) {
  return product.variantes.some(variant => variant.stocks.some(stock => {
    return stock.estado === 'ultimas_unidades' || (stockDisponible(stock) && stock.cantidad > 0 && stock.cantidad <= 2)
  }))
}

export function Home() {
  const { recent, addToCart } = useStorefront()
  const [products, setProducts] = useState<Producto[]>([])
  const [bestSellers, setBestSellers] = useState<Producto[]>([])
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([api<Producto[]>('/catalogo/productos'), api<Sucursal[]>('/catalogo/sucursales'), api<Producto[]>('/catalogo/productos?ordenar=popularidad'), api<Producto[]>('/catalogo/productos?ordenar=novedades')]).then(([items, locations, popular, newestItems]) => { setProducts(newestItems.length ? newestItems : items); setBranches(locations); setBestSellers(popular.slice(0, 4)) }).catch(() => setError('No pudimos cargar la selección.'))
  }, [])

  const newest = products.slice(0, 5)
  const lowStock = products.filter(stockAvailable).slice(-4)
  const recentProducts = useMemo(() => recent.map(id => products.find(product => product.id === id)).filter((product): product is Producto => Boolean(product)), [products, recent])
  const look = products.slice(0, 3).filter(product => product.variantes.some(variant => variant.stocks.some(stockDisponible)))
  const add = (product: Producto, variant: Variante) => { const maxStock = variant.stocks.reduce((total, stock) => total + stockCapacidad(stock), 0); setMessage(addToCart({ productoId: product.id, nombre: product.nombre, precio: precioEfectivo(product), varianteId: variant.id, talla: variant.talla, color: variant.color }, maxStock) ? `${product.nombre} se añadió a tu bolsa.` : 'No puedes superar el stock disponible.') }
  const branch = branches.find(item => item.id === localStorage.getItem('ensayar_sucursal')) ?? branches[0]

  return <div className="vesta-home"><div className="home-countdown-live"><span>Oferta activa</span> <HomeCountdown /></div>
    <section className="home-hero" aria-labelledby="home-hero-title"><img src={heroImage} alt="Campaña editorial de nueva temporada" /><div className="home-hero-overlay" /><div className="home-hero-copy"><p className="vesta-hero-eyebrow">Edición 01 · Otoño</p><h1 id="home-hero-title">La nueva<br />sofisticación</h1><p>Prendas contemporáneas, tonos serenos y cortes que permanecen.</p><Link className="hero-cta" to="/catalogo">Descubrir colección</Link></div></section>
    <div className="home-campaign">OFERTA DE TEMPORADA · HASTA 25% <span>Explora la selección actual</span></div>
    {error ? <p className="error home-error">{error}</p> : null}{message ? <p className="ok home-message" role="status">{message}</p> : null}
    <ProductRail eyebrow="Novedades" title="La nueva sofisticación" products={newest} onAdd={add} />
    <ProductRail eyebrow="Los más elegidos" title="Favoritos de la semana" products={bestSellers} onAdd={add} />
    <ProductRail eyebrow="Última oportunidad" title="Quedan pocas unidades" products={lowStock} onAdd={add} />
    <section className="home-section home-occasions"><div className="home-section-heading"><div><p className="eyebrow">Descubre por ocasión</p><h2>Vestir cada momento</h2></div></div><div className="occasion-grid">{['Trabajo', 'Fiesta', 'Casual', 'Temporada'].map((occasion, index) => <Link key={occasion} to={`/catalogo?ocasion=${occasion.toLowerCase()}`} className={`occasion-card occasion-card-${index + 1}`}><span>{occasion}</span><b>Explorar →</b></Link>)}</div></section>
    <section className="home-editorial"><div className="home-editorial-image"><img src={heroImage} alt="Selección editorial Vesta" /></div><div className="home-editorial-copy"><p className="eyebrow">Vesta Journal · 01</p><h2>Vestir menos.<br />Elegir mejor.</h2><p>Una historia editorial de tonos serenos, cortes amplios y prendas que permanecen.</p><Link className="hero-cta" to="/catalogo">Leer la historia</Link></div></section>
    <section className="home-look"><div className="home-look-image"><img src={heroImage} alt="Look de sastrería tonal" /></div><div className="home-look-copy"><p className="eyebrow">Compra el look</p><h2>Sastrería tonal</h2><p>Combina piezas de la selección y construye un uniforme contemporáneo.</p><div className="home-look-list">{look.map(product => <div key={product.id}><span>{product.nombre}</span><b>Bs {precioEfectivo(product).toFixed(0)}</b></div>)}</div><button className="ui-button ui-button--primary" type="button" disabled={look.length < 3} onClick={() => { if (look.length === 3) look.forEach(product => { if (product.variantes[0]) add(product, product.variantes[0]) }) }}>Añadir look completo</button></div></section>
    {recentProducts.length ? <ProductRail eyebrow="Vistos recientemente" title="Continúa donde lo dejaste" products={recentProducts} onAdd={add} /> : null}
    <section className="home-benefits" aria-label="Beneficios de compra"><div><span aria-hidden="true">↗</span><strong>Envío nacional</strong></div><div><span aria-hidden="true">⌂</span><strong>Retiro en tienda</strong></div><div><span aria-hidden="true">↻</span><strong>Cambios simples</strong></div><div><span aria-hidden="true">▣</span><strong>Compra segura</strong></div></section><section className="home-customer-care" aria-label="Atención al cliente"><p className="eyebrow">Estamos para ayudarte</p><h2>Atención Vesta</h2><p>Consulta disponibilidad, cambios y retiro en tienda con nuestro equipo.</p><a className="ui-button ui-button--secondary" href="mailto:hola@vesta.local">Contactar atención</a></section>
    {branch ? <p className="home-branch">Sucursal seleccionada: <strong>{branch.nombre}</strong> · {branch.ciudad}</p> : null}
  </div>
}
