import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useStorefront } from '../storefront'
import type { Producto } from '../types'
import { precioEfectivo } from '../types'

export function Favoritos() {
  const { favorites, toggleFavorite } = useStorefront(); const [products, setProducts] = useState<Producto[]>([]); const [error, setError] = useState('')
  useEffect(() => { api<Producto[]>('/catalogo/productos').then(items => setProducts(items.filter(item => favorites.includes(item.id)))).catch(() => setError('No se pudieron cargar tus favoritos.')) }, [favorites])
  const items = products.filter(item => favorites.includes(item.id))
  return <section className="storefront-page"><p className="eyebrow">Tu selección</p><h1>Favoritos</h1>{error ? <p className="error">{error}</p> : null}{!items.length ? <div className="catalog-state"><strong>Aún no guardaste prendas.</strong><p>Selecciona el corazón de una prenda para verla aquí.</p><Link className="ui-button ui-button--primary" to="/catalogo">Explorar catálogo</Link></div> : <div className="favorites-grid">{items.map(item => <article className="favorite-card" key={item.id}><Link to={`/ficha/${item.id}`}><img src={item.variantes[0]?.urlFoto} alt={item.nombre} /><strong>{item.nombre}</strong><span>Bs {precioEfectivo(item).toFixed(2)}</span></Link><button type="button" onClick={() => toggleFavorite(item.id)}>Eliminar</button></article>)}</div>}</section>
}
