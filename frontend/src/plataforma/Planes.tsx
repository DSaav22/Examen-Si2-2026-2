import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCuenta } from '../api'
import { MODULOS, PERIODOS, usd, usePlataforma, type Periodo, type PlanPublico } from './comun'

export function Planes() {
  const { sesion } = usePlataforma()
  const [planes, setPlanes] = useState<PlanPublico[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('ANUAL')
  const [error, setError] = useState('')

  useEffect(() => {
    apiCuenta<PlanPublico[]>('/plataforma/planes').then(setPlanes).catch(e => setError((e as Error).message))
  }, [])

  const meses = PERIODOS.find(p => p.id === periodo)!.meses
  const destino = (plan: PlanPublico) =>
    `${sesion ? '/plataforma/nueva' : '/empezar'}?plan=${plan.id}&periodo=${periodo}`

  return (
    <>
      <section className="pf-hero">
        <p className="pf-eyebrow">Software como servicio para tiendas de ropa</p>
        <h1>Tu tienda de moda en línea y en caja, lista en 2 minutos</h1>
        <p className="pf-lead">
          Catálogo, punto de venta que sigue funcionando sin internet, inventario por sucursal, probador virtual y
          reportes con IA. Elegís un plan, pagás y tu espacio de trabajo se crea solo, aislado de las demás tiendas.
        </p>
        <div className="pf-hero-cta">
          <Link className="pf-btn pf-btn--lg" to={sesion ? '/plataforma/nueva' : '/empezar'}>Crear mi tienda</Link>
          <Link className="pf-btn pf-btn--ghost pf-btn--lg" to="/t/vesta">Ver una tienda de ejemplo</Link>
        </div>
      </section>

      <section className="pf-section" aria-labelledby="pf-planes-titulo">
        <div className="pf-section-head">
          <h2 id="pf-planes-titulo">Planes</h2>
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
                    ? 'Facturado cada mes'
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

      <section className="pf-section pf-faq" aria-label="Preguntas frecuentes">
        <h2>Preguntas frecuentes</h2>
        <details>
          <summary>¿Otra tienda puede ver mis datos?</summary>
          <p>
            No. Cada registro de negocio lleva el identificador de su tienda y el servidor filtra todas las consultas por
            la tienda de tu sesión, incluidos los reportes. Un producto de otra tienda no existe para vos aunque conozcas
            su código.
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
