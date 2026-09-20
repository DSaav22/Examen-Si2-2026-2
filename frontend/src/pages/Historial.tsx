import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'

type Venta = {
  id: string
  total: string | number
  medioPago: string
  estado: string
  creadaEn: string
  pago?: { id: string; estado: string } | null
  lineas: {
    cantidad: number
    precioUnitario: string | number
    variante: { talla: string; color: string; producto: { nombre: string } }
  }[]
}

export function Historial() {
  const { user } = useAuth()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<Venta[]>('/ventas/historial')
      .then(setVentas)
      .catch(() => setMsg('No se cargó el historial'))
  }, [])

  if (user?.rol !== 'CLIENTA') return <Navigate to="/catalogo" replace />

  async function aprobarPago(pagoId: string) {
    await api(`/pagos/${pagoId}/simular`, {
      method: 'POST',
      body: JSON.stringify({ resultado: 'aprobado' }),
    })
    setVentas(await api<Venta[]>('/ventas/historial'))
    setMsg('Pago QR aprobado (sandbox).')
  }

  return (
    <section>
      <p className="eyebrow">Historial</p>
      <h2>Mis compras</h2>
      {msg ? <p className="ok">{msg}</p> : null}
      {ventas.map((v) => (
        <article key={v.id} className="card">
          <p>
            {new Date(v.creadaEn).toLocaleString()} · {v.estado} · {v.medioPago} · Bs{' '}
            {Number(v.total).toFixed(2)}
          </p>
          <ul>
            {v.lineas.map((l, i) => (
              <li key={i}>
                {l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} ×{' '}
                {l.cantidad}
              </li>
            ))}
          </ul>
          {v.pago?.estado === 'pendiente' ? (
            <button type="button" onClick={() => void aprobarPago(v.pago!.id)}>
              Simular pago QR aprobado
            </button>
          ) : null}
        </article>
      ))}
    </section>
  )
}
