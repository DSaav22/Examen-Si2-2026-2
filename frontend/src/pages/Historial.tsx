import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import { TicketPrint, type TicketDatos } from './Ticket'

type LineaHistorial = {
  id: string
  cantidad: number
  cantidadDevuelta: number
  precioUnitario: string | number
  variante: { talla: string; color: string; producto: { nombre: string } }
}

type Venta = {
  id: string
  total: string | number
  medioPago: string
  estado: string
  canal?: string
  creadaEn: string
  pago?: { id: string; estado: string } | null
  pedido?: {
    id: string
    estado: string
    seguimiento: string
    direccion: string
    enviadoEn: string | null
  } | null
  almacen?: {
    nombre: string
    sucursal?: { nombre: string; ciudad?: string } | null
  } | null
  lineas: LineaHistorial[]
}

const ERRORES_DEV: Record<string, string> = {
  VENTA_NO: 'No se encontró la venta.',
  YA_DEVUELTA: 'Esa venta ya fue devuelta.',
  CANTIDAD_INVALIDA: 'La cantidad a devolver no es válida.',
  NO_ES_TU_VENTA: 'No podés devolver una venta que no es tuya.',
}

const ESTADO_LABEL: Record<string, string> = {
  cobrada: 'Cobrada',
  pendiente_pago: 'Pago pendiente',
  cancelada: 'Cancelada',
  devuelta: 'Devuelta',
  devuelta_parcial: 'Devuelta parcial',
}

const MEDIO_LABEL: Record<string, string> = {
  contra_entrega: 'Contra entrega',
  qr: 'QR',
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo',
}

function puedeDevolver(estado: string) {
  return estado === 'cobrada' || estado === 'devuelta_parcial'
}

function etiquetaEstado(estado: string) {
  return ESTADO_LABEL[estado] ?? estado
}

function etiquetaMedio(medio: string) {
  return MEDIO_LABEL[medio] ?? medio
}

function ventaATicket(venta: Venta, user: { nombre: string; email: string }): TicketDatos {
  return {
    id: venta.id,
    medio: venta.medioPago,
    total: Number(venta.total),
    canal: venta.canal,
    fecha: new Date(venta.creadaEn).toLocaleString('es-BO'),
    clientaNombre: user.nombre,
    clientaEmail: user.email,
    sucursalNombre: venta.almacen?.sucursal?.nombre ?? venta.almacen?.nombre,
    lineas: venta.lineas.map(l => ({
      nombre: l.variante.producto.nombre,
      detalle: `${l.variante.talla}/${l.variante.color}`,
      cantidad: l.cantidad,
      precioUnitario: Number(l.precioUnitario),
      subtotal: Number(l.precioUnitario) * l.cantidad,
    })),
  }
}

export function Historial() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const ventaParam = params.get('venta')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, Record<string, number>>>({})
  const [abiertaId, setAbiertaId] = useState<string | null>(ventaParam)
  const [facturaId, setFacturaId] = useState<string | null>(ventaParam)
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  const [correoMsg, setCorreoMsg] = useState('')
  const facturaRef = useRef<HTMLDivElement>(null)

  async function cargar() {
    const data = await api<Venta[]>('/ventas/historial')
    setVentas(data)
    setCantidades(prev => {
      const next: Record<string, Record<string, number>> = {}
      for (const v of data) {
        next[v.id] = {}
        for (const l of v.lineas) {
          next[v.id][l.id] = prev[v.id]?.[l.id] ?? 0
        }
      }
      return next
    })
  }

  useEffect(() => {
    cargar().catch(() => setErr('No se cargó el historial'))
  }, [])

  useEffect(() => {
    if (!ventaParam) return
    setAbiertaId(ventaParam)
    setFacturaId(ventaParam)
  }, [ventaParam])

  useEffect(() => {
    if (!facturaId || !facturaRef.current) return
    facturaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [facturaId, ventas])

  const facturaVenta = useMemo(
    () => ventas.find(v => v.id === facturaId) ?? null,
    [ventas, facturaId],
  )

  if (user?.rol !== 'CLIENTA') return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />

  async function aprobarPago(pagoId: string) {
    setErr('')
    await api(`/pagos/${pagoId}/simular`, {
      method: 'POST',
      body: JSON.stringify({ resultado: 'aprobado' }),
    })
    await cargar()
    setMsg('Pago QR aprobado (sandbox).')
  }

  function setCantidad(ventaId: string, lineaId: string, value: number, max: number) {
    const n = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
    setCantidades(prev => ({
      ...prev,
      [ventaId]: { ...(prev[ventaId] ?? {}), [lineaId]: n },
    }))
  }

  async function devolver(venta: Venta) {
    setErr('')
    setMsg('')
    const lineas = venta.lineas
      .map(l => ({
        lineaId: l.id,
        cantidad: cantidades[venta.id]?.[l.id] ?? 0,
      }))
      .filter(l => l.cantidad > 0)
    if (!lineas.length) {
      setErr('Elegí al menos una cantidad a devolver.')
      return
    }
    try {
      const res = await api<{ estado: string; pagoEstado?: string }>('/devoluciones', {
        method: 'POST',
        body: JSON.stringify({ ventaId: venta.id, lineas }),
      })
      await cargar()
      if (res.pagoEstado === 'reembolsado') {
        setMsg('Devolución registrada. El pago quedó reembolsado (modo prueba).')
      } else {
        setMsg(`Devolución registrada. Estado: ${res.estado}.`)
      }
    } catch (e) {
      const codigo = e instanceof Error ? e.message : ''
      setErr(ERRORES_DEV[codigo] ?? (codigo || 'No se pudo devolver'))
    }
  }

  function abrirFactura(id: string) {
    setFacturaId(id)
    setAbiertaId(id)
    setParams({ venta: id }, { replace: true })
    setCorreoMsg('')
  }

  return (
    <section className="orders-page storefront-page">
      <header className="orders-head">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h1>Mis compras</h1>
          <p className="orders-sub">
            {ventas.length
              ? `${ventas.length} ${ventas.length === 1 ? 'pedido' : 'pedidos'} · qué compraste, cuándo y dónde`
              : 'Acá vas a ver tus pedidos, facturas y seguimientos'}
          </p>
        </div>
        <div className="orders-head-links">
          <Link to="/cuenta">Mi perfil</Link>
          <Link to="/catalogo">Seguir comprando →</Link>
        </div>
      </header>

      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="error">{err}</p> : null}

      {!ventas.length && !err ? (
        <div className="orders-empty">
          <span aria-hidden="true">◇</span>
          <strong>Todavía no hay compras</strong>
          <p>Cuando confirmes un pedido, vas a ver el detalle, la factura y el estado del envío aquí.</p>
          <Link className="ui-button ui-button--primary" to="/catalogo">
            Ir al catálogo
          </Link>
        </div>
      ) : null}

      <div className="orders-list">
        {ventas.map(v => {
          const devolvible = puedeDevolver(v.estado)
          const abierta = abiertaId === v.id
          const sucursal =
            v.almacen?.sucursal?.nombre ??
            v.almacen?.nombre ??
            (v.canal === 'online' ? 'Pedido online' : 'Tienda')
          const ciudad = v.almacen?.sucursal?.ciudad
          const piezas = v.lineas.reduce((sum, l) => sum + l.cantidad, 0)

          return (
            <article
              key={v.id}
              id={`orden-${v.id}`}
              className={`order-card${abierta ? ' is-open' : ''}${facturaId === v.id ? ' is-focus' : ''}`}
            >
              <button
                type="button"
                className="order-card-toggle"
                aria-expanded={abierta}
                onClick={() => setAbiertaId(abierta ? null : v.id)}
              >
                <div className="order-card-main">
                  <span className={`order-status order-status--${v.estado}`}>
                    {etiquetaEstado(v.estado)}
                  </span>
                  <strong>
                    {new Date(v.creadaEn).toLocaleDateString('es-BO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                  <span className="order-meta">
                    {sucursal}
                    {ciudad ? ` · ${ciudad}` : ''} · {etiquetaMedio(v.medioPago)} · {piezas}{' '}
                    {piezas === 1 ? 'prenda' : 'prendas'}
                  </span>
                </div>
                <div className="order-card-side">
                  <b>Bs {Number(v.total).toFixed(2)}</b>
                  <span aria-hidden="true">{abierta ? '−' : '+'}</span>
                </div>
              </button>

              {abierta ? (
                <div className="order-card-body">
                  <dl className="order-facts">
                    <div>
                      <dt>Cuándo</dt>
                      <dd>{new Date(v.creadaEn).toLocaleString('es-BO')}</dd>
                    </div>
                    <div>
                      <dt>Dónde</dt>
                      <dd>
                        {sucursal}
                        {ciudad ? `, ${ciudad}` : ''}
                        {v.canal ? ` · canal ${v.canal}` : ''}
                      </dd>
                    </div>
                    <div>
                      <dt>Cómo pagaste</dt>
                      <dd>
                        {etiquetaMedio(v.medioPago)}
                        {v.pago?.estado ? ` · pago ${v.pago.estado}` : ''}
                      </dd>
                    </div>
                    {v.pedido ? (
                      <div>
                        <dt>Envío</dt>
                        <dd>
                          {v.pedido.estado === 'enviado' ? 'Enviado' : 'Pendiente de despacho'}
                          {v.pedido.seguimiento ? ` · ${v.pedido.seguimiento}` : ''}
                          {v.pedido.direccion ? ` · ${v.pedido.direccion}` : ''}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <ul className="order-lines">
                    {v.lineas.map(l => {
                      const max = Math.max(0, l.cantidad - (l.cantidadDevuelta ?? 0))
                      return (
                        <li key={l.id}>
                          <div>
                            <strong>{l.variante.producto.nombre}</strong>
                            <span>
                              {l.variante.talla} · {l.variante.color} · ×{l.cantidad}
                              {l.cantidadDevuelta ? ` (devuelto ${l.cantidadDevuelta})` : ''}
                            </span>
                          </div>
                          <b>Bs {(Number(l.precioUnitario) * l.cantidad).toFixed(2)}</b>
                          {devolvible && max > 0 ? (
                            <label className="order-return">
                              Devolver
                              <input
                                type="number"
                                min={0}
                                max={max}
                                value={cantidades[v.id]?.[l.id] ?? 0}
                                onChange={e =>
                                  setCantidad(v.id, l.id, Number(e.target.value), max)
                                }
                              />
                              <span>/ {max}</span>
                            </label>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>

                  <div className="order-actions">
                    <button
                      type="button"
                      className="ui-button ui-button--primary"
                      onClick={() => abrirFactura(v.id)}
                    >
                      Ver factura
                    </button>
                    {devolvible &&
                    v.lineas.some(l => l.cantidad - (l.cantidadDevuelta ?? 0) > 0) ? (
                      <button
                        type="button"
                        className="ui-button ui-button--secondary"
                        onClick={() => void devolver(v)}
                      >
                        Solicitar devolución
                      </button>
                    ) : null}
                    {v.pago?.estado === 'pendiente' ? (
                      <button type="button" onClick={() => void aprobarPago(v.pago!.id)}>
                        Simular pago QR
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      {facturaVenta ? (
        <div className="orders-factura" ref={facturaRef}>
          <div className="orders-factura-head">
            <div>
              <p className="eyebrow">Factura</p>
              <h2>Comprobante de tu compra</h2>
            </div>
            <button type="button" className="ghost" onClick={() => setFacturaId(null)}>
              Cerrar
            </button>
          </div>
          <TicketPrint
            ticket={ventaATicket(facturaVenta, user)}
            enviandoCorreo={enviandoCorreo}
            correoMsg={correoMsg}
            onEnviarCorreo={email => {
              setEnviandoCorreo(true)
              setCorreoMsg('')
              void api<{ ok: boolean; modo: string; destino: string }>(
                `/ventas/${facturaVenta.id}/enviar-factura`,
                {
                  method: 'POST',
                  body: JSON.stringify({ email }),
                },
              )
                .then(r => {
                  setCorreoMsg(
                    r.modo === 'smtp'
                      ? `Factura reenviada a ${r.destino}.`
                      : `Factura lista. También te avisamos en la campana.`,
                  )
                })
                .catch(e => {
                  setCorreoMsg(e instanceof Error ? e.message : 'No se pudo enviar.')
                })
                .finally(() => setEnviandoCorreo(false))
            }}
          />
        </div>
      ) : null}
    </section>
  )
}
