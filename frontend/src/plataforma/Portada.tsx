import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCuenta } from '../api'
import { PAISES } from './comun'
import './portada.css'

type Empresa = { slug: string; nombre: string; logo: string | null; pais: string }

function Identidad({ empresa }: { empresa: Empresa }) {
  const [error, setError] = useState(false)
  return empresa.logo && !error
    ? <img src={empresa.logo} alt={`Logo de ${empresa.nombre}`} onError={() => setError(true)} loading="lazy" />
    : <span aria-hidden="true">{empresa.nombre.trim().slice(0, 2).toUpperCase()}</span>
}

export function Portada() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    setCargando(true); setError('')
    apiCuenta<Empresa[]>('/plataforma/directorio')
      .then(r => { if (vigente) setEmpresas(r) })
      .catch(() => { if (vigente) setError('No pudimos cargar las tiendas en este momento.') })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [intento])
  const visibles = empresas.filter(e => `${e.nombre} ${PAISES.find(p => p.codigo === e.pais)?.nombre ?? e.pais}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(busqueda.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()))
  return <div className="saas-home">
    <section className="saas-intro" aria-labelledby="saas-titulo">
      <div>
        <p className="saas-eyebrow">EnsayAR · Software para negocios de moda</p>
        <h1 id="saas-titulo">Tu negocio tiene su estilo.<br /><em>Tu plataforma también.</em></h1>
        <p className="saas-lead">Tu tienda en línea, tus ventas en caja y tu inventario, conectados. EnsayAR es el software por suscripción que acompaña a tu negocio desde su primera colección hasta su próxima sucursal.</p>
        <div className="saas-actions"><Link className="pf-btn pf-btn--lg" to="/planes">Conocer los planes <span aria-hidden="true">↗</span></Link><a className="pf-btn pf-btn--ghost pf-btn--lg" href="#empresas">Encontrar una tienda</a></div>
        <p className="saas-caption">Una plataforma compartida. Una identidad propia para cada negocio.</p>
      </div>
      <div className="saas-visual" aria-label="Vista ilustrativa de una tienda y sus herramientas">
        <img className="saas-editorial" src="/images/catalog-banner-otono.png" alt="Colección de prendas de moda" />
        <div className="saas-visual-heading"><span>Tu marca, al frente.</span><strong>Todo tu negocio,<br />detrás de cada venta.</strong></div>
        <div className="saas-tool-card"><span className="saas-online"><i />Tu espacio de trabajo</span><strong>De la vitrina al inventario.</strong><div><span>01 <b>Tienda en línea</b></span><span>02 <b>Punto de venta</b></span><span>03 <b>Control de stock</b></span></div></div>
      </div>
    </section>

    <section className="saas-explainer" id="funcionalidades" aria-labelledby="saas-como">
      <div className="saas-section-heading"><p className="saas-eyebrow">El negocio es tuyo. La tecnología te acompaña.</p><h2 id="saas-como">¿Qué hace EnsayAR por tu tienda?</h2><p>En lugar de desarrollar un sistema desde cero, elegís una suscripción y accedés a tu propio espacio, con tu equipo, catálogo y marca.</p></div>
      <div className="saas-benefits">
        <article><span>01 / VENDÉ</span><h3>Una tienda con tu nombre.</h3><p>Publicá prendas, tallas y colores en una vitrina con tu logo. Tus clientas pueden descubrir tu catálogo y hacer sus pedidos.</p></article>
        <article><span>02 / ORGANIZÁ</span><h3>Tu operación, conectada.</h3><p>Administrá ventas, caja e inventario por sucursal. El punto de venta permite registrar ventas en efectivo sin conexión y sincronizarlas después.</p></article>
        <article><span>03 / CRECÉ</span><h3>Herramientas para cada etapa.</h3><p>Elegí el plan que se ajuste a tu equipo. Según el plan, sumá probador virtual, reportes con IA y analítica para explorar tus datos.</p></article>
      </div>
    </section>

    <section className="saas-directory" id="empresas" aria-labelledby="saas-empresas">
      <div className="saas-directory-heading"><div><p className="saas-eyebrow">Cada marca, su propio espacio</p><h2 id="saas-empresas">Conocé las tiendas de EnsayAR.</h2><p>Explorá sus colecciones o ingresá a administrar tu negocio con tu cuenta de equipo.</p></div><label>Buscar tienda o país<input type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre de la tienda…" /></label></div>
      {cargando ? <p role="status">Cargando tiendas…</p> : error ? <div role="alert"><p>{error}</p><button className="pf-btn pf-btn--ghost" onClick={() => setIntento(i => i + 1)}>Reintentar</button></div> : !empresas.length ? <p>Próximamente encontrarás aquí las tiendas de nuestra plataforma.</p> : !visibles.length ? <p role="status">No encontramos tiendas con esa búsqueda.</p> : <div className="saas-company-grid">{visibles.map(e => <article className="saas-company" key={e.slug}>
        <div className="saas-company-top"><div className="saas-company-logo"><Identidad empresa={e} /></div><span>{PAISES.find(p => p.codigo === e.pais)?.nombre ?? e.pais}</span></div>
        <h3>{e.nombre}</h3><p>Moda con identidad propia.</p>
        <div className="saas-company-links"><Link to={`/t/${encodeURIComponent(e.slug)}`} aria-label={`Visitar tienda ${e.nombre}`}>Visitar tienda <span aria-hidden="true">↗</span></Link><Link to={`/t/${encodeURIComponent(e.slug)}/admin`} aria-label={`Administrar ${e.nombre}`}>Administrar</Link></div>
      </article>)}</div>}
      <p className="saas-directory-note">El acceso a administración requiere iniciar sesión y tener permisos en esa tienda.</p>
    </section>

    <section className="saas-closing"><div><p className="saas-eyebrow">El próximo espacio puede ser el tuyo</p><h2>Dejá que tu marca<br />dé el siguiente paso.</h2><p>Conocé los módulos, compará los planes y elegí cómo empezar.</p></div><Link className="pf-btn pf-btn--lg" to="/planes">Ver planes y funcionalidades ↗</Link></section>
  </div>
}
