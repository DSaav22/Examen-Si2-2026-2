import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { leerCarrito, vaciarCarrito } from '../carrito'
import type { LineaCarrito, Sucursal } from '../types'

type Reserva = {
  id: string
  estado: string
  horario: string
  sucursal: Sucursal
  lineas: {
    cantidad: number
    variante: { talla: string; color: string; producto: { nombre: string } }
  }[]
}

export function Reservas() {
  const { user } = useAuth()
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState('')
  const [horario, setHorario] = useState('')
  const [lista, setLista] = useState<Reserva[]>([])
  const [msg, setMsg] = useState('')
  const [carrito, setCarrito] = useState<LineaCarrito[]>(() => leerCarrito())

  async function cargar() {
    setLista(await api<Reserva[]>('/reservas/mias'))
  }

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then((s) => {
      setSucursales(s)
      setSucursalId(s[0]?.id ?? '')
    })
    cargar().catch(() => setMsg('No se cargaron reservas'))
    const d = new Date()
    d.setHours(d.getHours() + 2)
    setHorario(d.toISOString().slice(0, 16))
  }, [])

  if (user?.rol !== 'CLIENTA') return <Navigate to="/catalogo" replace />

  async function crear(e: FormEvent) {
    e.preventDefault()
    if (!carrito.length) {
      setMsg('Agregá prendas al carrito para reservarlas.')
      return
    }
    setMsg('')
    try {
      await api('/reservas', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId,
          horario: new Date(horario).toISOString(),
          lineas: carrito.map((l) => ({
            varianteId: l.varianteId,
            cantidad: l.cantidad,
          })),
        }),
      })
      setMsg('Reserva creada. La sucursal ya la ve en su bandeja.')
      vaciarCarrito()
      setCarrito([])
      await cargar()
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se reservó')
    }
  }

  async function cancelar(id: string) {
    await api(`/reservas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: 'cancelada' }),
    })
    await cargar()
  }

  return (
    <section>
      <p className="eyebrow">RF09–RF12</p>
      <h2>Mis reservas</h2>
      <form className="card col-form" onSubmit={crear}>
        <p className="muted">
          Se reservan las líneas actuales del carrito ({carrito.length} ítems).
        </p>
        <label>
          Sucursal
          <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} · {s.ciudad}
              </option>
            ))}
          </select>
        </label>
        <label>
          Horario aproximado
          <input
            type="datetime-local"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            required
          />
        </label>
        <button type="submit">Reservar para probar en tienda</button>
      </form>
      {msg ? <p className="ok">{msg}</p> : null}
      <ul>
        {lista.map((r) => (
          <li key={r.id} className="card">
            <strong>
              {r.sucursal.nombre} · {r.estado}
            </strong>
            <p className="muted">{new Date(r.horario).toLocaleString()}</p>
            <ul>
              {r.lineas.map((l, i) => (
                <li key={i}>
                  {l.variante.producto.nombre} {l.variante.talla}/{l.variante.color} ×{' '}
                  {l.cantidad}
                </li>
              ))}
            </ul>
            {r.estado === 'pendiente' || r.estado === 'preparada' ? (
              <button type="button" className="ghost" onClick={() => void cancelar(r.id)}>
                Cancelar
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
