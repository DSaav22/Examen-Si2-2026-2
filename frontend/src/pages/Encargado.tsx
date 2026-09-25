import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { homePorRol } from '../roles'
import type { Producto, Sucursal } from '../types'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

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

function estadoReserva(state: string): 'ok' | 'warn' | 'muted' {
  if (state === 'completada') return 'ok'
  if (state === 'preparada' || state === 'en_atencion') return 'warn'
  return 'muted'
}

function estadoVenta(state: string): 'ok' | 'warn' | 'muted' {
  if (state === 'cobrada') return 'ok'
  if (state === 'pendiente_pago') return 'warn'
  return 'muted'
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
    api<Sucursal[]>('/catalogo/sucursales').then(s => {
      setSucursales(s)
      const primer = s[0]?.almacenes[0]?.id ?? ''
      setAlmacenId(primer)
      setOrigenId(primer)
      setDestinoId(s[0]?.almacenes[1]?.id ?? s[1]?.almacenes[0]?.id ?? primer)
    })
    api<Producto[]>('/catalogo/productos').then(productos => {
      const opts = productos.flatMap(p =>
        p.variantes.map(v => ({
          id: v.id,
          label: `${p.nombre} · ${v.talla}/${v.color} (${v.sku})`,
        })),
      )
      setVariantes(opts)
      setVarianteId(opts[0]?.id ?? '')
      setXferVarianteId(opts[0]?.id ?? '')
    })
    cargar().catch(() => setMsg('No se cargó la bandeja'))
  }, [])

  const ventasRecientes = useMemo(() => ventas.slice(0, 12), [ventas])
  const movsRecientes = useMemo(() => movs.slice(0, 12), [movs])

  if (!user || (user.rol !== 'ENCARGADO' && user.rol !== 'ADMIN' && user.rol !== 'SUPERADMIN')) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  const esAdmin = user.rol === 'ADMIN' || user.rol === 'SUPERADMIN'

  async function estado(id: string, next: string) {
    await api(`/reservas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: next }),
    })
    setMsg(`Reserva → ${next}`)
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
        CANTIDAD_INVALIDA: 'La cantidad de transferencia no es válida.',
        ALMACEN_OTRA_SUCURSAL: 'Solo podés mover stock de almacenes de tu sucursal.',
        ENCARGADO_SIN_SUCURSAL: 'Tu usuario no tiene sucursal asignada.',
      }
      setXferError(textos[codigo] ?? (codigo || 'No se pudo transferir'))
    }
  }

  const opcionesAlmacen = sucursales.flatMap(s =>
    s.almacenes.map(a => (
      <option key={a.id} value={a.id}>
        {s.nombre} · {a.nombre}
      </option>
    )),
  )

  return (
    <OpsPage
      eyebrow={esAdmin ? 'Operaciones' : 'Sucursal'}
      title="Inventario"
      description="Reservas del día, ventas recientes, transferencias entre almacenes y ajustes de stock."
      actions={
        <OpsActions>
          {esAdmin ? (
            <Link className="ops-text-link" to="/admin">
              Resumen
            </Link>
          ) : null}
          <Link className="ops-text-link" to="/despacho">
            Despacho
          </Link>
          <OpsBtn type="button" variant="secondary" onClick={() => void cargar()}>
            Actualizar
          </OpsBtn>
        </OpsActions>
      }
    >
      {msg ? <p className="ok">{msg}</p> : null}

      <div className="inv-layout">
        <OpsPanel title="Reservas" eyebrow={`${reservas.length} activas`}>
          {!reservas.length ? (
            <OpsEmpty title="Sin reservas">Cuando aparten prendas, aparecen acá.</OpsEmpty>
          ) : (
            <ul className="inv-reserve-list">
              {reservas.map(r => (
                <li key={r.id} className="inv-reserve-card">
                  <header className="inv-reserve-head">
                    <div>
                      <strong>{r.clienta.nombre}</strong>
                      <p className="muted">{new Date(r.horario).toLocaleString('es-BO')}</p>
                    </div>
                    <OpsStatus state={estadoReserva(r.estado)}>{r.estado}</OpsStatus>
                  </header>
                  <ul className="inv-mini-lines">
                    {r.lineas.map((l, i) => (
                      <li key={i}>
                        {l.variante.producto.nombre} · {l.variante.talla}/{l.variante.color} × {l.cantidad}
                      </li>
                    ))}
                  </ul>
                  <OpsActions>
                    <OpsBtn type="button" variant="secondary" onClick={() => void estado(r.id, 'preparada')}>
                      Preparar
                    </OpsBtn>
                    <OpsBtn type="button" variant="secondary" onClick={() => void estado(r.id, 'en_atencion')}>
                      Llegó
                    </OpsBtn>
                    <OpsBtn type="button" onClick={() => void estado(r.id, 'completada')}>
                      Completar
                    </OpsBtn>
                  </OpsActions>
                </li>
              ))}
            </ul>
          )}
        </OpsPanel>

        <div className="inv-side-stack">
          <OpsPanel title="Transferir stock">
            <form className="inv-form" onSubmit={e => void transferir(e)}>
              {xferOk ? <p className="ok">{xferOk}</p> : null}
              {xferError ? <p className="error">{xferError}</p> : null}
              <OpsField label="Variante">
                <select value={xferVarianteId} onChange={e => setXferVarianteId(e.target.value)} required>
                  {variantes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Almacén origen">
                <select value={origenId} onChange={e => setOrigenId(e.target.value)} required>
                  {opcionesAlmacen}
                </select>
              </OpsField>
              <OpsField label="Almacén destino">
                <select value={destinoId} onChange={e => setDestinoId(e.target.value)} required>
                  {opcionesAlmacen}
                </select>
              </OpsField>
              <OpsField label="Cantidad">
                <input
                  type="number"
                  min={1}
                  value={xferCantidad}
                  onChange={e => setXferCantidad(e.target.value)}
                  required
                />
              </OpsField>
              <OpsBtn type="submit">Confirmar transferencia</OpsBtn>
            </form>
          </OpsPanel>

          <OpsPanel title="Ajuste de inventario">
            <form className="inv-form" onSubmit={e => void ajustar(e)}>
              <OpsField label="Variante">
                <select value={varianteId} onChange={e => setVarianteId(e.target.value)} required>
                  {variantes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Almacén">
                <select value={almacenId} onChange={e => setAlmacenId(e.target.value)}>
                  {opcionesAlmacen}
                </select>
              </OpsField>
              <OpsField label="Cantidad (stock absoluto)">
                <input type="number" min={0} value={cantidad} onChange={e => setCantidad(e.target.value)} />
              </OpsField>
              <OpsBtn type="submit" variant="secondary">
                Guardar ajuste
              </OpsBtn>
            </form>
          </OpsPanel>
        </div>
      </div>

      <OpsPanel title="Ventas de la sucursal" eyebrow={`${ventasRecientes.length} recientes`}>
        {!ventasRecientes.length ? (
          <OpsEmpty title="Sin ventas">Las ventas cobradas de la sucursal aparecen acá.</OpsEmpty>
        ) : (
          <div className="table-wrap inv-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Canal</th>
                  <th>Estado</th>
                  <th>Clienta</th>
                  <th>Ítems</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasRecientes.map(v => (
                  <tr key={v.id}>
                    <td>{new Date(v.creadaEn).toLocaleString('es-BO')}</td>
                    <td>{v.canal.toUpperCase()}</td>
                    <td>
                      <OpsStatus state={estadoVenta(v.estado)}>{v.estado}</OpsStatus>
                    </td>
                    <td>{v.clienta?.nombre ?? 'Consumidor final'}</td>
                    <td className="inv-items-cell">
                      {v.lineas.map(l => `${l.variante.producto.nombre}×${l.cantidad}`).join(', ')}
                    </td>
                    <td className="num">Bs {Number(v.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanel>

      <OpsPanel title="Últimos movimientos" eyebrow="Kardex">
        {!movsRecientes.length ? (
          <OpsEmpty title="Sin movimientos">Ajustes y transferencias se listan acá.</OpsEmpty>
        ) : (
          <div className="table-wrap inv-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th className="num">Cant.</th>
                </tr>
              </thead>
              <tbody>
                {movsRecientes.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.creadoEn).toLocaleString('es-BO')}</td>
                    <td>{m.tipo}</td>
                    <td>{m.variante.producto.nombre}</td>
                    <td>{m.variante.sku}</td>
                    <td className="num">{m.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanel>
    </OpsPage>
  )
}
