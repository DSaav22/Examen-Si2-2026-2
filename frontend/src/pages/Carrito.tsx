import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { useStorefront } from '../storefront'
import { TicketPrint, type TicketDatos } from './Ticket'
import type { Sucursal } from '../types'
import { homePorRol } from '../roles'

type Direccion = { id: string; etiqueta: string; detalle: string; ciudad: string }

function BagThumb({ nombre, src }: { nombre: string; src?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src?.trim() || failed) {
    return (
      <div className="bag-thumb bag-thumb--empty" role="img" aria-label={nombre}>
        VESTA
      </div>
    )
  }
  return (
    <img
      className="bag-thumb"
      src={assetUrl(src)}
      alt={nombre}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function Carrito() {
  const { user } = useAuth()
  const { cart: lineas, clearCart, setCartQuantity, removeFromCart } = useStorefront()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [direcciones, setDirecciones] = useState<Direccion[]>([])
  const [direccionId, setDireccionId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [medio, setMedio] = useState<'contra_entrega' | 'qr'>('contra_entrega')
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState('')
  const [comprobante, setComprobante] = useState<TicketDatos | null>(null)
  const [pagoId, setPagoId] = useState('')
  const [cuponCodigo, setCuponCodigo] = useState('')
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  const [correoMsg, setCorreoMsg] = useState('')

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then(s => {
      setSucursales(s)
      const preferida = localStorage.getItem('ensayar_sucursal')
      const preferidaSucursal = s.find(item => item.id === preferida) ?? s[0]
      setAlmacenId(preferidaSucursal?.almacenes[0]?.id ?? s[0]?.almacenes[0]?.id ?? '')
    })
    if (user?.rol !== 'CLIENTA') {
      setDirecciones([])
      setDireccionId('')
      return
    }
    api<Direccion[]>('/cliente/direcciones')
      .then(d => {
        setDirecciones(d)
        setDireccionId(d[0]?.id ?? '')
      })
      .catch(() => setDirecciones([]))
  }, [user?.rol])

  if (user?.rol && user.rol !== 'CLIENTA') {
    return <Navigate to={homePorRol(user.rol)} replace />
  }

  const guest = !user
  const nextAuth = `/registro?next=${encodeURIComponent('/carrito')}`
  const loginAuth = `/login?next=${encodeURIComponent('/carrito')}`

  async function pedir() {
    if (!user) {
      setMsg('Para pagar necesitás una cuenta. Tu bolsa se guarda.')
      return
    }
    if (!almacenId || lineas.length === 0) return
    if (!direccionId) {
      setMsg('Agregá una dirección de envío en Mi cuenta antes de pedir.')
      return
    }
    setMsg('')
    try {
      const venta = await api<{
        id: string
        total: string
        pago?: { id: string; estado: string } | null
      }>('/ventas', {
        method: 'POST',
        body: JSON.stringify({
          uuid: crypto.randomUUID(),
          canal: 'online',
          medioPago: medio,
          almacenId,
          lineas: lineas.map(l => ({
            varianteId: l.varianteId,
            cantidad: l.cantidad,
          })),
          ...(cuponCodigo.trim() ? { cuponCodigo: cuponCodigo.trim() } : {}),
          direccionId,
        }),
      })
      const snapshot = lineas
      clearCart()
      setTicket(`Pedido ${venta.id.slice(0, 8).toUpperCase()} · Bs ${Number(venta.total).toFixed(2)}`)
      setCuponCodigo('')
      setComprobante({
        id: venta.id,
        medio: medio === 'qr' ? 'qr' : 'contra_entrega',
        total: Number(venta.total),
        canal: 'online',
        fecha: new Date().toLocaleString('es-BO'),
        clientaNombre: user.nombre,
        clientaEmail: user.email,
        lineas: snapshot.map(l => ({
          nombre: l.nombre,
          detalle: `${l.talla}/${l.color}`,
          cantidad: l.cantidad,
          precioUnitario: l.precio,
          subtotal: l.precio * l.cantidad,
        })),
      })
      if (venta.pago?.id) {
        setPagoId(venta.pago.id)
        setMsg('Pedido creado. Confirmá el pago QR para recibir tu factura.')
      } else {
        setMsg(`Pedido confirmado. Te avisamos en la campana y enviamos la factura a ${user.email}.`)
      }
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        CUPON_INVALIDO: 'Ese cupón no existe o ya venció.',
        CUPON_AGOTADO: 'Ese cupón llegó a su tope de usos.',
        STOCK_INSUFICIENTE: 'No hay stock suficiente en ese almacén.',
        PAGO_YA_RESUELTO: 'Ese pago ya fue resuelto.',
        PAGO_NO: 'No se encontró el pago.',
        NO_ES_TU_PAGO: 'Ese pago no es tuyo.',
      }
      setMsg(textos[codigo] ?? (codigo || 'No se pudo confirmar el pedido'))
    }
  }

  async function resolverQr(resultado: 'aprobado' | 'rechazado') {
    if (!pagoId) return
    try {
      await api(`/pagos/${pagoId}/simular`, {
        method: 'POST',
        body: JSON.stringify({ resultado }),
      })
      setMsg(
        resultado === 'aprobado'
          ? `Pago aprobado. Tu factura está en avisos y en ${user.email}.`
          : 'Pago rechazado. El stock volvió al almacén.',
      )
      setPagoId('')
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        PAGO_YA_RESUELTO: 'Ese pago ya fue resuelto.',
        PAGO_NO: 'No se encontró el pago.',
        NO_ES_TU_PAGO: 'Ese pago no es tuyo.',
        STOCK_INSUFICIENTE: 'No hay stock suficiente para confirmar el pago.',
      }
      setMsg(textos[codigo] ?? (codigo || 'No se pudo simular el pago'))
    }
  }

  const total = lineas.reduce((sum, line) => sum + line.precio * line.cantidad, 0)
  const piezas = lineas.reduce((sum, line) => sum + line.cantidad, 0)
  const sinDireccion = direcciones.length === 0
  const esError =
    /^(Ese cupón|No se|Agregá|No tienes|No hay)/.test(msg) ||
    msg.startsWith('Pago rechazado')
  const checkoutListo = lineas.length > 0 && !sinDireccion && Boolean(almacenId)

  return (
    <section className="bag-page storefront-page">
      <header className="bag-head">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Tu bolsa</h1>
          <p className="bag-sub">
            {lineas.length
              ? `${piezas} ${piezas === 1 ? 'prenda' : 'prendas'} listas para pedir`
              : ticket
                ? 'Pedido registrado'
                : 'Todavía no agregaste prendas'}
          </p>
        </div>
        <Link className="bag-continue" to="/catalogo">
          Seguir comprando →
        </Link>
      </header>

      {!lineas.length && !ticket && !comprobante ? (
        <div className="bag-empty">
          <span aria-hidden="true">◇</span>
          <strong>Tu bolsa está vacía</strong>
          <p>Explorá la colección y guardá lo que te enamore.</p>
          <Link className="ui-button ui-button--primary" to="/catalogo">
            Ir al catálogo
          </Link>
        </div>
      ) : null}

      {lineas.length ? (
        <div className="bag-layout">
          <div className="bag-lines" aria-label="Prendas en la bolsa">
            {lineas.map(l => (
              <article className="bag-line" key={l.varianteId}>
                <Link className="bag-line-media" to={`/ficha/${l.productoId}`}>
                  <BagThumb nombre={l.nombre} src={l.urlFoto} />
                </Link>
                <div className="bag-line-body">
                  <div className="bag-line-copy">
                    <Link to={`/ficha/${l.productoId}`}>
                      <strong>{l.nombre}</strong>
                    </Link>
                    <span>
                      {l.talla} · {l.color}
                    </span>
                    <b>Bs {l.precio.toFixed(2)}</b>
                  </div>
                  <div className="bag-line-tools">
                    <div className="bag-qty" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                      <button
                        type="button"
                        aria-label={`Reducir ${l.nombre}`}
                        disabled={l.cantidad <= 1}
                        onClick={() => setCartQuantity(l.varianteId, l.cantidad - 1)}
                      >
                        −
                      </button>
                      <span>{l.cantidad}</span>
                      <button
                        type="button"
                        aria-label={`Aumentar ${l.nombre}`}
                        onClick={() => setCartQuantity(l.varianteId, l.cantidad + 1)}
                      >
                        +
                      </button>
                    </div>
                    <p className="bag-line-total">Bs {(l.precio * l.cantidad).toFixed(2)}</p>
                    <button
                      type="button"
                      className="bag-remove"
                      onClick={() => removeFromCart(l.varianteId)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="bag-aside">
            <div className="bag-summary">
              <p className="bag-summary-label">Resumen</p>
              <div className="bag-summary-row">
                <span>Subtotal</span>
                <strong>Bs {total.toFixed(2)}</strong>
              </div>
              <div className="bag-summary-row bag-summary-row--muted">
                <span>Envío</span>
                <span>Se confirma al despachar</span>
              </div>
              <div className="bag-summary-total">
                <span>Total</span>
                <strong>Bs {total.toFixed(2)}</strong>
              </div>
            </div>

            {guest ? (
              <div className="bag-auth-gate">
                <p className="bag-summary-label">Para pagar</p>
                <strong>Creá tu cuenta para confirmar</strong>
                <p>
                  Tu bolsa ({piezas} {piezas === 1 ? 'prenda' : 'prendas'}) se mantiene. Con la
                  cuenta te enviamos la factura y seguís el pedido.
                </p>
                <Link className="ui-button ui-button--primary" to={nextAuth}>
                  Crear cuenta
                </Link>
                <Link className="ui-button ui-button--secondary" to={loginAuth}>
                  Ya tengo cuenta
                </Link>
                {msg ? <p className={esError ? 'error' : 'ok'}>{msg}</p> : null}
              </div>
            ) : (
            <form
              className="bag-form"
              onSubmit={event => {
                event.preventDefault()
                void pedir()
              }}
            >
              <label>
                Dirección de envío
                {sinDireccion ? (
                  <p className="bag-form-hint error">
                    No tenés direcciones.{' '}
                    <Link to="/cuenta">Agregar en Mi cuenta</Link>
                  </p>
                ) : (
                  <select
                    value={direccionId}
                    onChange={e => setDireccionId(e.target.value)}
                    required
                  >
                    {direcciones.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.etiqueta}: {d.detalle}, {d.ciudad}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              <label>
                Retiro / despacho desde
                <select value={almacenId} onChange={e => setAlmacenId(e.target.value)}>
                  {sucursales.flatMap(s =>
                    s.almacenes.map(a => (
                      <option key={a.id} value={a.id}>
                        {s.nombre} · {a.nombre}
                      </option>
                    )),
                  )}
                </select>
              </label>

              <label>
                Cupón
                <input
                  value={cuponCodigo}
                  onChange={e => setCuponCodigo(e.target.value)}
                  placeholder="Código, si tenés uno"
                  autoComplete="off"
                />
              </label>

              <label>
                Forma de pago
                <select
                  value={medio}
                  onChange={e => setMedio(e.target.value as 'contra_entrega' | 'qr')}
                >
                  <option value="contra_entrega">Contra entrega</option>
                  <option value="qr">QR (demo)</option>
                </select>
              </label>

              {msg ? <p className={esError ? 'error' : 'ok'}>{msg}</p> : null}

              <button
                className="ui-button ui-button--primary bag-submit"
                type="submit"
                disabled={!checkoutListo}
              >
                Confirmar pedido
              </button>
              <p className="bag-aside-note">
                Al confirmar, reservamos stock y te avisamos por la campana.
              </p>
            </form>
            )}
          </aside>
        </div>
      ) : null}

      {ticket ? <p className="ok bag-ticket">{ticket}</p> : null}

      {pagoId ? (
        <div className="bag-pay-test">
          <p>Pasarela de prueba · no se cobra dinero real</p>
          <div>
            <button
              type="button"
              className="ui-button ui-button--primary"
              onClick={() => void resolverQr('aprobado')}
            >
              Aprobar QR
            </button>
            <button
              type="button"
              className="ui-button ui-button--secondary"
              onClick={() => void resolverQr('rechazado')}
            >
              Rechazar QR
            </button>
          </div>
        </div>
      ) : null}

      {comprobante ? (
        <div className="bag-ticket-wrap">
          <TicketPrint
            ticket={comprobante}
            enviandoCorreo={enviandoCorreo}
            correoMsg={correoMsg}
            onEnviarCorreo={email => {
              setEnviandoCorreo(true)
              setCorreoMsg('')
              void api<{ ok: boolean; modo: string; destino: string }>(
                `/ventas/${comprobante.id}/enviar-factura`,
                {
                  method: 'POST',
                  body: JSON.stringify({ email }),
                },
              )
                .then(r => {
                  setCorreoMsg(
                    r.modo === 'smtp'
                      ? `Factura reenviada a ${r.destino}.`
                      : `Factura lista. Te avisamos también en la campana.`,
                  )
                })
                .catch(err => {
                  setCorreoMsg(err instanceof Error ? err.message : 'No se pudo enviar.')
                })
                .finally(() => setEnviandoCorreo(false))
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
