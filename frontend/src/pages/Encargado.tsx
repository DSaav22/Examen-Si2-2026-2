import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import type { Producto, Sucursal } from '../types'

type Reserva = {
  id: string
  estado: string
  horario: string
  clienta: { nombre: string; email: string }
  sucursal?: Sucursal
  lineas: {
    cantidad: number
    variante: { id: string; talla: string; color: string; producto: { nombre: string } }
  }[]
}

type Mov = {
  id: string
  tipo: string
  cantidad: number
  nota: string
  creadoEn: string
  variante: { sku: string; producto: { nombre: string } }
}

type VentaSuc = {
  id: string
  total: string | number
  estado: string
  canal: string
  creadaEn: string
  clienta?: { nombre: string; email: string } | null
  almacen: { sucursal: { nombre: string } }
  lineas: { cantidad: number; variante: { producto: { nombre: string } } }[]
}

type OpcionVariante = {
  id: string
  label: string
}

export function Encargado() {
  const { user } = useAuth()
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [ventas, setVentas] = useState<VentaSuc[]>([])
  const [movs, setMovs] = useState<Mov[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [variantes, setVariantes] = useState<OpcionVariante[]>([])
  const [varianteId, setVarianteId] = useState('')
  const [almacenId, setAlmacenId] = useState('')
  const [cantidad, setCantidad] = useState('10')
  const [msg, setMsg] = useState('')
  const [xferVarianteId, setXferVarianteId] = useState('')
  const [origenId, setOrigenId] = useState('')
  const [destinoId, setDestinoId] = useState('')
  const [xferCantidad, setXferCantidad] = useState('1')
  const [xferError, setXferError] = useState('')
  const [xferOk, setXferOk] = useState('')

  async function cargar() {
    setReservas(await api<Reserva[]>('/reservas/sucursal'))
    setVentas(await api<VentaSuc[]>('/ventas/sucursal'))
    setMovs(await api<Mov[]>('/inventario/movimientos'))
  }

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then((s) => {
      setSucursales(s)
      const primer = s[0]?.almacenes[0]?.id ?? ''
      setAlmacenId(primer)
      setOrigenId(primer)
      setDestinoId(s[0]?.almacenes[1]?.id ?? s[1]?.almacenes[0]?.id ?? primer)
    })
    api<Producto[]>('/catalogo/productos').then((productos) => {
      const opts = productos.flatMap((p) =>
        p.variantes.map((v) => ({
          id: v.id,
          label: `${p.nombre} · ${v.talla}/${v.color} (${v.sku})`,
        })),
      )
      setVariantes(opts)
      setXferVarianteId(opts[0]?.id ?? '')
    })
    cargar().catch(() => setMsg('No se cargó la bandeja'))
  }, [])

  if (user?.rol !== 'ENCARGADO' && user?.rol !== 'ADMIN') {
    return <Navigate to="/catalogo" replace />
  }

  async function estado(id: string, estado: string) {
    await api(`/reservas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    })
    setMsg(`Reserva → ${estado}`)
    await cargar()
  }

  async function ajustar(e: FormEvent) {
    e.preventDefault()
    await api('/inventario/ajuste', {
      method: 'POST',
      body: JSON.stringify({
        varianteId,
        almacenId,
        cantidad: Number(cantidad),
        nota: 'Ajuste encargado',
      }),
    })
    setMsg('Stock ajustado')
    await cargar()
  }

  async function transferir(e: FormEvent) {
    e.preventDefault()
    setXferError('')
    setXferOk('')
    try {
      await api('/inventario/transferencias', {
        method: 'POST',
        body: JSON.stringify({
          varianteId: xferVarianteId,
          origenId,
          destinoId,
          cantidad: Number(xferCantidad),
        }),
      })
      setXferOk('Transferencia realizada')
      await cargar()
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        MISMO_ALMACEN: 'El origen y el destino no pueden ser el mismo almacén.',
        STOCK_INSUFICIENTE: 'No hay stock suficiente en el almacén de origen.',
      }
      setXferError(textos[codigo] ?? (codigo || 'No se pudo transferir'))
    }
  }

  const opcionesAlmacen = sucursales.flatMap((s) =>
    s.almacenes.map((a) => (
      <option key={a.id} value={a.id}>
        {s.nombre} · {a.nombre}
      </option>
    )),
  )

  return (
    <section>
      <p className="eyebrow">Encargado de sucursal</p>
      <h2>Reservas, ventas y stock</h2>
      <p>
        <Link to="/despacho">Despachar pedidos →</Link>
      </p>
      {msg ? <p className="ok">{msg}</p> : null}
      <div className="grid">
        {reservas.map((r) => (
          <article key={r.id} className="card">
            <strong>
              {r.clienta.nombre} · {r.estado}
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
            <div className="row-form">
              <button type="button" className="ghost" onClick={() => void estado(r.id, 'preparada')}>
                Preparar
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => void estado(r.id, 'en_atencion')}
              >
                Cliente llegó
              </button>
              <button type="button" onClick={() => void estado(r.id, 'completada')}>
                Completar compra
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3>Ventas de la sucursal</h3>
      <ul>
        {ventas.map((v) => (
          <li key={v.id}>
            {new Date(v.creadaEn).toLocaleString()} · {v.canal} · {v.estado} · Bs{' '}
            {Number(v.total).toFixed(2)} · {v.clienta?.nombre ?? 'sin clienta'} ·{' '}
            {v.almacen.sucursal.nombre} ·{' '}
            {v.lineas.map((l) => `${l.variante.producto.nombre}×${l.cantidad}`).join(', ')}
          </li>
        ))}
        {ventas.length === 0 ? <li className="muted">Sin ventas recientes</li> : null}
      </ul>

      <form className="card col-form" onSubmit={transferir}>
        <h3>Transferir stock</h3>
        {xferOk ? <p className="ok">{xferOk}</p> : null}
        {xferError ? <p className="error">{xferError}</p> : null}
        <label>
          Variante
          <select
            value={xferVarianteId}
            onChange={(e) => setXferVarianteId(e.target.value)}
            required
          >
            {variantes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Almacén origen
          <select value={origenId} onChange={(e) => setOrigenId(e.target.value)} required>
            {opcionesAlmacen}
          </select>
        </label>
        <label>
          Almacén destino
          <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} required>
            {opcionesAlmacen}
          </select>
        </label>
        <label>
          Cantidad
          <input
            type="number"
            min="1"
            value={xferCantidad}
            onChange={(e) => setXferCantidad(e.target.value)}
            required
          />
        </label>
        <button type="submit">Confirmar</button>
      </form>

      <form className="card col-form" onSubmit={ajustar}>
        <h3>Ajuste de inventario</h3>
        <label>
          Variante ID
          <input value={varianteId} onChange={(e) => setVarianteId(e.target.value)} required />
        </label>
        <label>
          Almacén
          <select value={almacenId} onChange={(e) => setAlmacenId(e.target.value)}>
            {opcionesAlmacen}
          </select>
        </label>
        <label>
          Cantidad
          <input
            type="number"
            min="0"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <button type="submit">Guardar ajuste</button>
      </form>
      <h3>Últimos movimientos</h3>
      <ul>
        {movs.slice(0, 15).map((m) => (
          <li key={m.id}>
            {m.tipo} · {m.variante.producto.nombre} ({m.variante.sku}) · {m.cantidad} ·{' '}
            {new Date(m.creadoEn).toLocaleString()}
          </li>
        ))}
      </ul>
    </section>
  )
}
