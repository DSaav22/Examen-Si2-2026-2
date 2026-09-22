import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { encolar, guardarCatalogoOffline, hidratarCola, leerCatalogoOffline, leerCola, sacarDeCola, type VentaCola } from '../cola-pos'
import { TicketPrint, type TicketDatos } from './Ticket'
import type { Arqueo, Producto, Sucursal, Turno, Variante } from '../types'
import { precioEfectivo } from '../types'

type Linea = { variante: Variante; producto: Producto; cantidad: number }

function esFalloRed(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (err instanceof TypeError) return true
  if (err instanceof Error) {
    const m = err.message.toLowerCase()
    return (
      m.includes('failed to fetch') ||
      m.includes('networkerror') ||
      m.includes('network request failed') ||
      m.includes('load failed') ||
      m.includes('fetch failed')
    )
  }
  return false
}

export function Pos() {
  const { user } = useAuth()
  const [turno, setTurno] = useState<Turno | null | undefined>(undefined)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [lineas, setLineas] = useState<Linea[]>([])
  const [sucursalId, setSucursalId] = useState('')
  const [fondo, setFondo] = useState('200')
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState('')
  const [comprobante, setComprobante] = useState<TicketDatos | null>(null)
  const [cola, setCola] = useState<VentaCola[]>(() => leerCola())
  const [medio, setMedio] = useState<'efectivo' | 'qr'>('efectivo')
  const [declarado, setDeclarado] = useState('')
  const [arqueo, setArqueo] = useState<Arqueo | null>(null)
  const [colaError, setColaError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [stockExacto, setStockExacto] = useState<Record<string, number>>({})
  const [cobrando, setCobrando] = useState(false)

  const almacenId = turno?.sucursal.almacenes[0]?.id

  useEffect(() => {
    if (!turno) return
    api<{ varianteId: string; disponible: number }[]>(`/catalogo/disponibilidad?sucursalId=${encodeURIComponent(turno.sucursal.id)}`)
      .then(items => setStockExacto(Object.fromEntries(items.map(item => [item.varianteId, Math.max(0, item.disponible)]))))
      .catch(() => setStockExacto({}))
  }, [turno])

  const total = useMemo(
    () =>
      lineas.reduce(
        (acc, l) => acc + precioEfectivo(l.producto) * l.cantidad,
        0,
      ),
    [lineas],
  )

  async function cargarTurno(opts?: { soft?: boolean }) {
    try {
      const t = await api<Turno | null>('/caja/turno-abierto')
      setTurno(t ?? null)
    } catch {
      // soft: no borrar turno local ante blip de red
      if (!opts?.soft) setTurno(null)
    }
  }

  useEffect(() => {
    if (!user || (user.rol !== 'CAJERO' && user.rol !== 'ADMIN')) return
    Promise.all([
      cargarTurno(),
      api<Sucursal[]>('/catalogo/sucursales').then((s) => {
        setSucursales(s)
        if (s[0]) setSucursalId(s[0].id)
      }),
      api<Producto[]>('/catalogo/productos').then(items => { setProductos(items); guardarCatalogoOffline(items) }).catch(() => setProductos(leerCatalogoOffline<Producto>())),
    ]).catch(() => {
      setMsg('No se pudo cargar la caja.')
      setTurno((prev) => (prev === undefined ? null : prev))
    })
  }, [user])

  async function abrir(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      const t = await api<Turno>('/caja/abrir', {
        method: 'POST',
        body: JSON.stringify({ sucursalId, fondoInicial: Number(fondo) }),
      })
      setTurno(t)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se abrió la caja')
    }
  }

  function agregar(producto: Producto, variante: Variante) {
    setTicket('')
    setLineas((prev) => {
      const i = prev.findIndex((l) => l.variante.id === variante.id)
      const actual = i >= 0 ? prev[i].cantidad : 0
      const limite = stockExacto[variante.id]
      if (limite !== undefined && actual >= limite) { setMsg('No se puede superar el stock de esta variante.'); return prev }
      if (i >= 0) {
        return prev.map((l, idx) =>
          idx === i ? { ...l, cantidad: l.cantidad + 1 } : l,
        )
      }
      return [...prev, { producto, variante, cantidad: 1 }]
    })
  }

  async function enviarVenta(payload: VentaCola) {
    const venta = await api<{ id: string; total: string }>('/ventas', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return venta
  }

  async function sincronizar() {
    const pendientes = leerCola()
    setColaError('')
    for (const item of pendientes) {
      try {
        await enviarVenta(item)
        sacarDeCola(item.uuid)
      } catch (err) {
        const codigo = err instanceof Error ? err.message : ''
        if (codigo === 'STOCK_INSUFICIENTE') {
          setColaError(
            `Cola: stock insuficiente para ${item.uuid.slice(0, 8)} — descartá o reintentá`,
          )
        } else if (esFalloRed(err)) {
          setColaError('Cola: sin red — se reintentará')
        } else {
          setColaError(`Cola: ${codigo || 'error de sync'} — se reintentará`)
        }
        break
      }
    }
    setCola(leerCola())
    await cargarTurno({ soft: true })
    try {
      setProductos(await api<Producto[]>('/catalogo/productos'))
    } catch {
      /* keep productos */
    }
  }

  function descartarDeCola(uuid: string) {
    sacarDeCola(uuid)
    setCola(leerCola())
    setColaError('')
  }

  useEffect(() => {
    void hidratarCola().then(items => { if (items.length) setCola(items) })
    const on = () => {
      void sincronizar()
    }
    window.addEventListener('online', on)
    if (navigator.onLine && leerCola().length) void sincronizar()
    return () => window.removeEventListener('online', on)
  }, [])

  if (user?.rol !== 'CAJERO' && user?.rol !== 'ADMIN') {
    return <Navigate to="/catalogo" replace />
  }

  async function cobrar() {
    if (cobrando || !turno || !almacenId || lineas.length === 0) return
    setCobrando(true)
    setMsg('')
    const payload: VentaCola = {
      uuid: crypto.randomUUID(),
      canal: 'pos',
      medioPago: medio,
      almacenId,
      cajaTurnoId: turno.id,
      lineas: lineas.map((l) => ({
        varianteId: l.variante.id,
        cantidad: l.cantidad,
      })),
    }
    try {
      const venta = await enviarVenta(payload)
      setTicket(
        `Venta ${venta.id.slice(0, 8)} · Bs ${Number(venta.total).toFixed(2)} · ${medio}`,
      )
      setComprobante({
        id: venta.id,
        medio,
        total: Number(venta.total),
        lineas: lineas.map((l) => ({
          nombre: l.producto.nombre,
          detalle: `${l.variante.talla}/${l.variante.color}`,
          cantidad: l.cantidad,
          subtotal: precioEfectivo(l.producto) * l.cantidad,
        })),
      })
      setLineas([])
      await cargarTurno({ soft: true })
      try {
        setProductos(await api<Producto[]>('/catalogo/productos'))
      } catch {
        /* keep */
      }
    } catch (err) {
      if (esFalloRed(err)) {
        encolar(payload)
        setCola(leerCola())
        setTicket(`Sin red/API: venta ${payload.uuid.slice(0, 8)} en cola local`)
        setLineas([])
        return
      }
      setMsg(err instanceof Error ? err.message : 'Cobro falló')
    } finally {
      setCobrando(false)
    }
  }

  const esperado =
    Number(turno?.fondoInicial ?? 0) + Number(turno?.totalSistema ?? 0)

  async function cerrarCaja() {
    setMsg('')
    try {
      const res = await api<Arqueo>('/caja/cerrar', {
        method: 'POST',
        body: JSON.stringify({
          totalDeclarado: Number(declarado || esperado),
        }),
      })
      setArqueo(res)
      setTurno(null)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se cerró la caja')
    }
  }

  if (turno === undefined) return <p className="muted">Cargando caja…</p>

  if (!turno) {
    return (
      <section>
        <p className="eyebrow">Punto de venta</p>
        <h2>Abrir caja</h2>
        {arqueo ? (
          <div className="card">
            <h3>Arqueo</h3>
            <p>Esperado (fondo + ventas) Bs {Number(arqueo.esperado).toFixed(2)}</p>
            <p>Declarado Bs {Number(arqueo.totalDeclarado).toFixed(2)}</p>
            <p className={Number(arqueo.diferencia) === 0 ? 'ok' : 'error'}>
              Diferencia Bs {Number(arqueo.diferencia).toFixed(2)}
            </p>
          </div>
        ) : null}
        <form className="card col-form" onSubmit={abrir}>
          <label>
            Sucursal
            <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fondo inicial
            <input
              type="number"
              min="0"
              value={fondo}
              onChange={(e) => setFondo(e.target.value)}
            />
          </label>
          {msg ? <p className="error">{msg}</p> : null}
          <button type="submit">Abrir turno</button>
        </form>
      </section>
    )
  }

  return (
    <section className="pos">
      <div>
        <p className="eyebrow">Punto de venta</p>
        <h2>{turno.sucursal.nombre}</h2>
        <p className="muted">
          Fondo Bs {Number(turno.fondoInicial).toFixed(2)} · sistema Bs{' '}
          {Number(turno.totalSistema).toFixed(2)}
        </p>
        <label className="pos-search">Buscar por nombre o SKU<input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar producto…" /></label>
        <div className="grid compact">
          {productos.filter(p => { const q = busqueda.trim().toLowerCase(); return !q || p.nombre.toLowerCase().includes(q) || p.variantes.some(v => v.sku.toLowerCase().includes(q)) }).map((p) =>
            p.variantes.map((v) => (
              <button
                key={v.id}
                type="button"
                className="card product pick"
                onClick={() => agregar(p, v)}
              >
                <strong>{p.nombre}</strong>
                <span>
                  {v.talla} / {v.color}
                </span>
                <span className="price">Bs {precioEfectivo(p).toFixed(2)}</span>
              </button>
            )),
          )}
        </div>
      </div>
      <aside className="card ticket">
        <h3>Ticket</h3>
        {lineas.length === 0 ? <p className="muted">Sin prendas</p> : null}
        <ul>
          {lineas.map((l) => (
            <li key={l.variante.id}>
              <div className="pos-line-actions"><button type="button" className="ghost" onClick={() => setLineas(items => items.map(item => item.variante.id === l.variante.id ? { ...item, cantidad: Math.max(1, item.cantidad - 1) } : item))}>−</button><button type="button" className="ghost" onClick={() => agregar(l.producto, l.variante)}>+</button><button type="button" className="ghost" onClick={() => setLineas(items => items.filter(item => item.variante.id !== l.variante.id))}>Eliminar</button></div>
              {l.producto.nombre} {l.variante.talla}/{l.variante.color} × {l.cantidad}
            </li>
          ))}
        </ul>
        <p className="price">Total Bs {total.toFixed(2)}</p>
        <label>
          Medio
          <select
            value={medio}
            onChange={(e) => setMedio(e.target.value as 'efectivo' | 'qr')}
          >
            <option value="efectivo">Efectivo</option>
            <option value="qr">QR simulado</option>
          </select>
        </label>
        {msg ? <p className="error">{msg}</p> : null}
        {ticket ? <p className="ok">{ticket}</p> : null}
        {comprobante ? <TicketPrint ticket={comprobante} /> : null}
        {cola.length ? (
          <div className="muted">
            <p>Cola offline: {cola.length}</p>
            <ul>
              {cola.map((c) => (
                <li key={c.uuid}>
                  {c.uuid.slice(0, 8)} · {c.lineas.length} línea(s){' '}
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => descartarDeCola(c.uuid)}
                  >
                    Descartar
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="ghost" onClick={() => void sincronizar()}>
              Sincronizar
            </button>
          </div>
        ) : null}
        {colaError ? <p className="error">{colaError}</p> : null}
        <button type="button" disabled={!lineas.length || cobrando} onClick={() => void cobrar()}>
          {cobrando ? 'Procesando…' : 'Cobrar'}
        </button>
        <label>
          Declarado al cerrar
          <input
            type="number"
            min="0"
            value={declarado}
            placeholder={String(esperado)}
            onChange={(e) => setDeclarado(e.target.value)}
          />
        </label>
        <button type="button" className="ghost" onClick={() => void cerrarCaja()}>
          Cerrar turno
        </button>
      </aside>
    </section>
  )
}
