import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { useStorefront } from '../storefront'
import { TicketPrint, type TicketDatos } from './Ticket'
import type { Sucursal } from '../types'

export function Carrito() {
  const { user } = useAuth()
  const { cart: lineas, clearCart, setCartQuantity, removeFromCart } = useStorefront()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [almacenId, setAlmacenId] = useState('')
  const [medio, setMedio] = useState<'contra_entrega' | 'qr'>('contra_entrega')
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState('')
  const [comprobante, setComprobante] = useState<TicketDatos | null>(null)
  const [pagoId, setPagoId] = useState('')

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then((s) => {
      setSucursales(s)
      setAlmacenId(s[0]?.almacenes[0]?.id ?? '')
    })
  }, [])

  if (user?.rol !== 'CLIENTA') return <Navigate to="/catalogo" replace />

  async function pedir() {
    if (!almacenId || lineas.length === 0) return
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
          lineas: lineas.map((l) => ({
            varianteId: l.varianteId,
            cantidad: l.cantidad,
          })),
        }),
      })
      const snapshot = lineas
      clearCart()
      setTicket(
        `Pedido ${venta.id.slice(0, 8)} · Bs ${Number(venta.total).toFixed(2)} · ${
          medio === 'qr' ? 'QR pendiente' : 'contra entrega'
        }`,
      )
      setComprobante({
        id: venta.id,
        medio: medio === 'qr' ? 'QR simulado' : 'contra entrega',
        total: Number(venta.total),
        lineas: snapshot.map((l) => ({
          nombre: l.nombre,
          detalle: `${l.talla}/${l.color}`,
          cantidad: l.cantidad,
          subtotal: l.precio * l.cantidad,
        })),
      })
      if (venta.pago?.id) setPagoId(venta.pago.id)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo pedir')
    }
  }

  async function aprobarQr() {
    if (!pagoId) return
    await api(`/pagos/${pagoId}/simular`, {
      method: 'POST',
      body: JSON.stringify({ resultado: 'aprobado' }),
    })
    setMsg('Pago QR aprobado (sandbox RF19).')
    setPagoId('')
  }

  const total = lineas.reduce((sum, line) => sum + line.precio * line.cantidad, 0)

  return (
    <section>
      <p className="eyebrow">UC05 · Checkout</p>
      <h2>Carrito</h2>
      {lineas.length === 0 && !ticket ? <p className="muted">Vacío.</p> : null}
      <ul>
        {lineas.map((l) => (
          <li key={l.varianteId}>
            {l.nombre} {l.talla}/{l.color} × {l.cantidad} · Bs{' '}
            {(l.precio * l.cantidad).toFixed(2)}{' '}
            <button type="button" onClick={() => setCartQuantity(l.varianteId, l.cantidad - 1)} aria-label={`Reducir ${l.nombre}`}>−</button>{' '}
            <button type="button" onClick={() => setCartQuantity(l.varianteId, l.cantidad + 1)} aria-label={`Aumentar ${l.nombre}`}>+</button>{' '}
            <button type="button" onClick={() => removeFromCart(l.varianteId)}>Eliminar</button>
          </li>
        ))}
      </ul>
      {lineas.length ? <p className="price">Total Bs {total.toFixed(2)}</p> : null}
      <label>
        Despacho desde
        <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
          {sucursales.flatMap((s) =>
            s.almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {s.nombre} · {a.nombre}
              </option>
            )),
          )}
        </select>
      </label>
      <label>
        Pago
        <select
          value={medio}
          onChange={(e) => setMedio(e.target.value as 'contra_entrega' | 'qr')}
        >
          <option value="contra_entrega">Contra entrega</option>
          <option value="qr">QR simulado (pasarela sandbox)</option>
        </select>
      </label>
      {msg ? <p className="ok">{msg}</p> : null}
      {ticket ? <p className="ok">{ticket}</p> : null}
      {pagoId ? (
        <button type="button" onClick={() => void aprobarQr()}>
          Aprobar pago QR
        </button>
      ) : null}
      {comprobante ? <TicketPrint ticket={comprobante} /> : null}
      <button type="button" disabled={!lineas.length} onClick={() => void pedir()}>
        Confirmar pedido
      </button>
    </section>
  )
}
