import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCuenta } from '../api'
import { MODULOS, PERIODOS, usd, usePlataforma, type Periodo, type PlanPublico } from './comun'

export function Planes() {
  const { sesion } = usePlataforma()
  const [planes, setPlanes] = useState<PlanPublico[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('MENSUAL')
  const [error, setError] = useState('')

  useEffect(() => {
    apiCuenta<PlanPublico[]>('/plataforma/planes').then(setPlanes).catch(e => setError((e as Error).message))
  }, [])

  const meses = PERIODOS.find(p => p.id === periodo)!.meses
  const destino = (plan: PlanPublico) =>
    `${sesion ? '/plataforma/nueva' : '/empezar'}?plan=${plan.id}&periodo=${periodo}`

  return (
    <>
      <section className="pf-hero" id="funcionalidades">
        <div className="pf-hero-copy">
        <h1>Tu tienda, tus ventas y tu inventario en un solo lugar.</h1>
        <p className="pf-lead">
          Administrá tu catálogo, vendé en línea o en caja y controlá el inventario de tu negocio desde una misma plataforma.
        </p>
        <div className="pf-hero-cta">
          <Link className="pf-btn pf-btn--lg" to={sesion ? '/plataforma/nueva' : '/empezar'}>Crear mi tienda</Link>
          <a className="pf-btn pf-btn--ghost pf-btn--lg" href="#planes">Saber más</a>
        </div>
        </div>
        <div className="pf-devices" aria-hidden="true">
          <div className="pf-device-laptop"><div className="pf-device-screen"><div className="pf-device-bar">VESTA <span>CATÁLOGO　 NUEVA COLECCIÓN</span></div><div className="pf-device-photo"><span>Nueva<br />colección</span></div></div><div className="pf-device-base" /></div>
          <div className="pf-device-dashboard"><div className="pf-device-sidebar">EnsayAR<br /><br />Resumen<br />Catálogo<br />Inventario</div><div className="pf-device-chart"><b>Resumen</b><small>Ventas de la tienda</small><svg viewBox="0 0 180 65" preserveAspectRatio="none"><path d="M0 53 L23 47 L46 51 L68 32 L89 38 L112 20 L135 28 L157 10 L180 19 L180 65 L0 65 Z" fill="#d5a6b4"/><path d="M0 53 L23 47 L46 51 L68 32 L89 38 L112 20 L135 28 L157 10 L180 19" fill="none" stroke="#782a42" strokeWidth="2"/></svg></div></div>
          <div className="pf-device-phone"><div className="pf-phone-head">VESTA</div><img src="/catalogo/ropa/producto-001.jpg" alt="" /><div className="pf-phone-label">Nueva colección</div><div className="pf-phone-products"><img src="/catalogo/ropa/producto-002.jpg" alt=""/><img src="/catalogo/ropa/producto-003.jpg" alt=""/></div></div>
        </div>
      </section>

      <section className="pf-section pf-pricing" id="planes" aria-labelledby="pf-planes-titulo">
        <div className="pf-section-head">
          <h2 id="pf-planes-titulo">Nuestros planes</h2>
          <div className="pf-toggle" role="radiogroup" aria-label="Período de facturación">
            {PERIODOS.map(p => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={periodo === p.id}
                className={periodo === p.id ? 'is-on' : ''}
                onClick={() => setPeriodo(p.id)}
              >
                {p.label}
                {p.id === 'TRIMESTRAL' ? <small>−10%</small> : p.id === 'ANUAL' ? <small>−20%</small> : null}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="pf-error">{error}</p> : null}
        <div className="pf-plans">
          {planes.map(plan => {
            const total = plan.precios[periodo]
            const porMes = total / meses
            return (
              <article key={plan.id} className={`pf-plan${plan.destacado ? ' pf-plan--star' : ''}`}>
                {plan.destacado ? <span className="pf-plan-badge">Más elegido</span> : null}
                <h3>{plan.nombre}</h3>
                <p className="pf-muted">{plan.descripcion}</p>
                <p className="pf-price">
                  <strong>{usd(porMes)}</strong>
                  <span>/ mes</span>
                </p>
                <p className="pf-price-note">
                  {periodo === 'MENSUAL'
                    ? 'Facturado mensualmente'
                    : `${usd(total)} cada ${meses} meses · ahorrás ${usd(plan.precios.MENSUAL * meses - total)}`}
                </p>
                <ul className="pf-limits">
                  <li><b>{plan.limites.usuarios}</b> usuarios de equipo</li>
                  <li><b>{plan.limites.sucursales}</b> {plan.limites.sucursales === 1 ? 'sucursal' : 'sucursales'}</li>
                  <li><b>{plan.limites.productos ?? 'Ilimitados'}</b> productos</li>
                </ul>
                <ul className="pf-features">
                  {plan.modulos.map(m => (
                    <li key={m}>{MODULOS[m] ?? m}</li>
                  ))}
                </ul>
                <Link className={`pf-btn pf-btn--block${plan.destacado ? '' : ' pf-btn--ghost'}`} to={destino(plan)}>
                  Elegir {plan.nombre}
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="pf-section pf-steps" aria-label="Cómo funciona">
        <div>
          <span className="pf-step">1</span>
          <h3>Creá tu cuenta</h3>
          <p>Con tu correo. Te mandamos un enlace para confirmarlo.</p>
        </div>
        <div>
          <span className="pf-step">2</span>
          <h3>Elegí plan y pagá</h3>
          <p>Mensual, trimestral o anual. Podés subir de plan cuando crezcas.</p>
        </div>
        <div>
          <span className="pf-step">3</span>
          <h3>Tu tienda queda lista</h3>
          <p>Se crea con su sucursal, almacén y tu usuario administrador. Invitás a tu equipo y empezás a vender.</p>
        </div>
      </section>

      <section className="pf-section pf-faq" id="ayuda" aria-label="Preguntas frecuentes">
        <h2>Preguntas frecuentes</h2>
        <details>
          <summary>¿Otra tienda puede ver mis datos?</summary>
          <p>
            La plataforma está diseñada para separar la información de cada tienda. La migración y las pruebas de aislamiento siguen en curso.
          </p>
        </details>
        <details>
          <summary>¿Puedo tener varias tiendas o trabajar en varias?</summary>
          <p>
            Sí. Con una sola cuenta entrás a todas las tiendas donde te dieron acceso y cambiás de una a otra sin volver a
            iniciar sesión.
          </p>
        </details>
        <details>
          <summary>¿Qué pasa si no renuevo?</summary>
          <p>
            Al vencer la suscripción la tienda queda en pausa: tus datos se conservan y vuelve a funcionar en cuanto
            renovás.
          </p>
        </details>
        <details>
          <summary>¿En qué países funciona?</summary>
          <p>En Bolivia y el resto de países hispanohablantes. Configurás la moneda local de tu tienda al crearla.</p>
        </details>
      </section>
    </>
  )
}
