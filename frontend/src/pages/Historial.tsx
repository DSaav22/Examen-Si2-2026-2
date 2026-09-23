import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

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
  lineas: LineaHistorial[]
}

const ERRORES_DEV: Record<string, string> = {
  VENTA_NO: 'No se encontró la venta.',
  YA_DEVUELTA: 'Esa venta ya fue devuelta.',
  CANTIDAD_INVALIDA: 'La cantidad a devolver no es válida.',
  NO_ES_TU_VENTA: 'No podés devolver una venta que no es tuya.',
}

function puedeDevolver(estado: string) {
  return estado === 'cobrada' || estado === 'devuelta_parcial'
}

export function Historial() {
  const { user } = useAuth()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [cantidades, setCantidades] = useState<Record<string, Record<string, number>>>({})

  async function cargar() {
    const data = await api<Venta[]>('/ventas/historial')
    setVentas(data)
    setCantidades((prev) => {
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

  if (user?.rol !== 'CLIENTA') return <Navigate to="/catalogo" replace />

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
    setCantidades((prev) => ({
      ...prev,
      [ventaId]: { ...(prev[ventaId] ?? {}), [lineaId]: n },
    }))
  }

  async function devolver(venta: Venta) {
    setErr('')
    setMsg('')
    const lineas = venta.lineas
      .map((l) => ({
        lineaId: l.id,
        cantidad: cantidades[venta.id]?.[l.id] ?? 0,
      }))
      .filter((l) => l.cantidad > 0)
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

  return (
    <section>
      <p className="eyebrow">Historial</p>
      <h2>Mis compras</h2>
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="error">{err}</p> : null}
      {ventas.map((v) => {
        const devolvible = puedeDevolver(v.estado)
        return (
          <article key={v.id} className="card">
            <p>
              {new Date(v.creadaEn).toLocaleString()} · {v.estado} · {v.medioPago} · Bs{' '}
              {Number(v.total).toFixed(2)}
            </p>
            {v.pedido ? (
              <p className="muted">
                Pedido {v.pedido.estado === 'enviado' ? 'enviado' : 'pendiente'}
                {v.pedido.estado === 'enviado' && v.pedido.seguimiento
                  ? ` · seguimiento ${v.pedido.seguimiento}`
                  : null}
                {v.pedido.direccion ? ` · ${v.pedido.direccion}` : null}
                {v.pedido.enviadoEn
                  ? ` · ${new Date(v.pedido.enviadoEn).toLocaleString()}`
                  : null}
              </p>
            ) : null}
            {v.pago?.estado === 'reembolsado' ? (
              <p className="ok">Pago reembolsado (modo prueba).</p>
            ) : null}
            <ul>
              {v.lineas.map((l) => {
                const max = Math.max(0, l.cantidad - (l.cantidadDevuelta ?? 0))
                return (
                  <li key={l.id}>
                    {l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} ×{' '}
                    {l.cantidad}
                    {l.cantidadDevuelta ? ` (devuelto ${l.cantidadDevuelta})` : null}
                    {devolvible && max > 0 ? (
                      <label>
                        {' '}
                        Devolver{' '}
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={cantidades[v.id]?.[l.id] ?? 0}
                          onChange={(e) =>
                            setCantidad(v.id, l.id, Number(e.target.value), max)
                          }
                        />
                        <span className="muted"> / {max}</span>
                      </label>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {devolvible &&
            v.lineas.some((l) => l.cantidad - (l.cantidadDevuelta ?? 0) > 0) ? (
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={() => void devolver(v)}
              >
                Devolver
              </button>
            ) : null}
            {v.pago?.estado === 'pendiente' ? (
              <button type="button" onClick={() => void aprobarPago(v.pago!.id)}>
                Simular pago QR aprobado
              </button>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
