import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api'
import { assetUrl } from '../asset'
import { useAuth } from '../auth'
import { borrarCache, conCache, guardarCache } from '../offline/cache'
import { encolar } from '../offline/cola'
import { esFalloRed, uuid } from '../offline/red'
import { sincronizar, useEstadoSync, type ResultadoServidor } from '../offline/sync'
import { ColaDispositivo } from '../shared/Offline'
import { TicketPrint, type TicketDatos } from './Ticket'
import type { Arqueo, Producto, Sucursal, Turno, Variante } from '../types'
import { precioEfectivo } from '../types'
import { homePorRol } from '../roles'
import { OpsActions, OpsBtn, OpsEmpty, OpsField, OpsPage, OpsPanel, OpsStatus } from '../shared/ops/OpsUi'

type Linea = { variante: Variante; producto: Producto; cantidad: number }

type VentaSucursal = {
  id: string
  total: string | number
  estado: string
  canal: string
  creadaEn: string
  lineas: {
    id: string
    cantidad: number
    cantidadDevuelta?: number
    variante: { producto: { nombre: string }; talla?: string; color?: string }
  }[]
}

type Tab = 'vender' | 'devoluciones' | 'cierre'

type MedioPago = 'efectivo' | 'qr' | 'tarjeta' | 'transferencia' | 'mixto' | 'credito'

type VentaPos = {
  uuid: string
  canal: 'pos'
  medioPago: MedioPago
  almacenId: string
  cajaTurnoId: string
  lineas: { varianteId: string; cantidad: number }[]
  clientaId?: string
  cuponCodigo?: string
}

type Clienta = { id: string; nombre: string; email: string }

const ERRORES_DEV: Record<string, string> = {
  VENTA_NO: 'No se encontró la venta.',
  YA_DEVUELTA: 'Esa venta ya fue devuelta.',
  CANTIDAD_INVALIDA: 'La cantidad a devolver no es válida.',
  NO_ES_TU_VENTA: 'No podés devolver una venta que no es tuya.',
}

function DevolucionesPanel({
  ventas,
  cant,
  msg,
  err,
  onRefresh,
  onCantidad,
  onDevolver,
}: {
  ventas: VentaSucursal[]
  cant: Record<string, Record<string, number>>
  msg: string
  err: string
  onRefresh: () => void
  onCantidad: (ventaId: string, lineaId: string, value: number, max: number) => void
  onDevolver: (venta: VentaSucursal) => void
}) {
  return (
    <OpsPanel
      title="Devoluciones"
      eyebrow={`${ventas.length} ventas cobradas`}
      actions={
        <OpsBtn type="button" variant="secondary" onClick={onRefresh}>
          Actualizar
        </OpsBtn>
      }
    >
      {msg ? <p className="ok" role="status">{msg}</p> : null}
      {err ? <p className="error">{err}</p> : null}

      {!ventas.length && !err ? (
        <OpsEmpty title="Sin ventas para devolver">Cuando cobres en el POS, aparecerán aquí.</OpsEmpty>
      ) : (
        <ul className="pos-dev-list">
          {ventas.map(v => {
            const puede = v.lineas.some(l => l.cantidad - (l.cantidadDevuelta ?? 0) > 0)
            return (
              <li className="pos-dev-card" key={v.id}>
                <header className="pos-dev-head">
                  <div>
                    <strong>Bs {Number(v.total).toFixed(2)}</strong>
                    <p className="muted">
                      {new Date(v.creadaEn).toLocaleString('es-BO')} · {v.canal.toUpperCase()} · {v.id.slice(0, 8)}
                    </p>
                  </div>
                  <OpsStatus state={puede ? 'ok' : 'muted'}>{puede ? 'Parcial OK' : 'Ya devuelta'}</OpsStatus>
                </header>
                <ul className="pos-dev-lines">
                  {v.lineas.map(l => {
                    const max = Math.max(0, l.cantidad - (l.cantidadDevuelta ?? 0))
                    const nombre = `${l.variante.producto.nombre}${l.variante.talla ? ` · ${l.variante.talla}` : ''}${l.variante.color ? `/${l.variante.color}` : ''}`
                    return (
                      <li key={l.id}>
                        <span>
                          {nombre}
                          <small className="muted"> · compró {l.cantidad}{l.cantidadDevuelta ? ` · ya devolvió ${l.cantidadDevuelta}` : ''}</small>
                        </span>
                        {max > 0 ? (
                          <label className="pos-dev-qty">
                            <span className="sr-only">Cantidad a devolver</span>
                            <input
                              type="number"
                              min={0}
                              max={max}
                              value={cant[v.id]?.[l.id] ?? 0}
                              onChange={e => onCantidad(v.id, l.id, Number(e.target.value), max)}
                            />
                            <span className="muted">/ {max}</span>
                          </label>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {puede ? (
                  <OpsActions>
                    <OpsBtn type="button" variant="secondary" onClick={() => onDevolver(v)}>
                      Registrar devolución
                    </OpsBtn>
                  </OpsActions>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </OpsPanel>
  )
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
  const ventaEnCola = useRef<string | null>(null)
  const [comprobante, setComprobante] = useState<TicketDatos | null>(null)
  const [medio, setMedio] = useState<MedioPago>('efectivo')
  const [declarado, setDeclarado] = useState('')
  const [arqueo, setArqueo] = useState<Arqueo | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [clientaId, setClientaId] = useState('88888888-8888-8888-8888-888888888888')
  const [cuponCodigo, setCuponCodigo] = useState('')
  const [stockExacto, setStockExacto] = useState<Record<string, number>>({})
  const [cobrando, setCobrando] = useState(false)
  const [pagoId, setPagoId] = useState('')
  const [tarjeta, setTarjeta] = useState('')
  const [ventasDev, setVentasDev] = useState<VentaSucursal[]>([])
  const [devCant, setDevCant] = useState<Record<string, Record<string, number>>>({})
  const [devMsg, setDevMsg] = useState('')
  const [devErr, setDevErr] = useState('')
  const [tab, setTab] = useState<Tab>('vender')
  const [enviandoCorreo, setEnviandoCorreo] = useState(false)
  const [correoMsg, setCorreoMsg] = useState('')
  const [deCache, setDeCache] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const [altaClienta, setAltaClienta] = useState<{ nombre: string; email: string } | null>(null)
  const sync = useEstadoSync()

  const [clientas, setClientas] = useState<Clienta[]>([
    { id: '88888888-8888-8888-8888-888888888888', nombre: 'Ana Cliente', email: 'clienta@ensayar.bo' },
  ])

  const almacenId = turno?.sucursal.almacenes[0]?.id
  const claveInventario = turno ? `inventario:${turno.sucursal.id}` : ''

  async function cargarVentasDevolucion() {
    setDevErr('')
    try {
      const data = await api<VentaSucursal[]>('/ventas/sucursal')
      const cobradas = data.filter(v => v.estado === 'cobrada')
      setVentasDev(cobradas)
      setDevCant(prev => {
        const next: Record<string, Record<string, number>> = {}
        for (const v of cobradas) {
          next[v.id] = {}
          for (const l of v.lineas) next[v.id][l.id] = prev[v.id]?.[l.id] ?? 0
        }
        return next
      })
    } catch (err) {
      setVentasDev([])
      const status = (err as Error & { status?: number }).status
      const codigo = err instanceof Error ? err.message : ''
      if (status === 403) {
        setDevErr('No tenés permiso para listar ventas de sucursal.')
      } else {
        setDevErr(codigo || 'No se cargaron las ventas para devolver.')
      }
    }
  }

  useEffect(() => {
    if (!user || !['CAJERO', 'ADMIN', 'ENCARGADO', 'SUPERADMIN'].includes(user.rol)) return
    void cargarVentasDevolucion()
  }, [user])

  useEffect(() => {
    if (!turno) return
    void conCache(`inventario:${turno.sucursal.id}`, async () => {
      const items = await api<{ varianteId: string; disponible: number }[]>(
        `/catalogo/disponibilidad?sucursalId=${encodeURIComponent(turno.sucursal.id)}`,
      )
      return Object.fromEntries(items.map(item => [item.varianteId, Math.max(0, item.disponible)]))
    })
      .then(r => setStockExacto(r.datos))
      .catch(() => undefined)
  }, [turno?.sucursal.id, recarga])

  const total = useMemo(
    () => lineas.reduce((acc, l) => acc + precioEfectivo(l.producto) * l.cantidad, 0),
    [lineas],
  )

  const catalogoPlano = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const rows: { producto: Producto; variante: Variante; stock: number }[] = []
    for (const p of productos) {
      for (const v of p.variantes) {
        if (q && !p.nombre.toLowerCase().includes(q) && !v.sku.toLowerCase().includes(q)) continue
        rows.push({ producto: p, variante: v, stock: stockExacto[v.id] ?? 0 })
      }
    }
    return rows.slice(0, 36)
  }, [productos, busqueda, stockExacto])

  async function cargarTurno(opts?: { soft?: boolean }) {
    try {
      const r = await conCache(`turno:${user?.id}`, () => api<Turno | null>('/caja/turno-abierto'))
      setTurno(r.datos ?? null)
      setDeCache(r.deCache)
    } catch {
      if (!opts?.soft) setTurno(null)
    }
  }

  async function cargarCatalogo() {
    try {
      const r = await conCache('catalogo-pos', () => api<Producto[]>('/catalogo/productos'))
      setProductos(r.datos)
    } catch {
      /* se mantiene lo cargado */
    }
  }

  useEffect(() => {
    if (!user || !['CAJERO', 'ADMIN', 'ENCARGADO', 'SUPERADMIN'].includes(user.rol)) return
    Promise.all([
      cargarTurno(),
      conCache('sucursales-catalogo', () => api<Sucursal[]>('/catalogo/sucursales')).then(({ datos: s }) => {
        setSucursales(s)
        const preferida = user.sucursalId && s.find(x => x.id === user.sucursalId)
        if (preferida) setSucursalId(preferida.id)
        else if (s[0]) setSucursalId(s[0].id)
      }),
      cargarCatalogo(),
      conCache('clientas', async () => {
        const users = await api<{ id: string; nombre: string; email: string; rol: string }[]>('/usuarios')
        return users.filter(u => u.rol === 'CLIENTA').map(u => ({ id: u.id, nombre: u.nombre, email: u.email }))
      })
        .then(({ datos: list }) => {
          if (list.length) {
            setClientas(list)
            setClientaId(prev => prev || list.find(u => u.email === 'clienta@ensayar.bo')?.id || list[0].id)
          }
        })
        .catch(() => undefined),
    ]).catch(() => {
      setMsg('No se pudo cargar la caja.')
      setTurno(prev => (prev === undefined ? null : prev))
    })
  }, [user])

  useEffect(() => {
    // Tras sincronizar, el stock y el total del turno vienen del servidor.
    const alSincronizar = (e: Event) => {
      void cargarTurno({ soft: true })
      void cargarCatalogo()
      setRecarga(n => n + 1)
      const id = ventaEnCola.current
      const r = (e as CustomEvent<ResultadoServidor[]>).detail?.find(x => x.id === id)
      if (!id || !r) return
      ventaEnCola.current = null
      setTicket(
        r.estado === 'aplicada' || r.estado === 'repetida'
          ? `Venta ${id.slice(0, 8)} sincronizada con el servidor.`
          : `Venta ${id.slice(0, 8)} no se pudo aplicar: revisala en la lista de abajo.`,
      )
    }
    window.addEventListener('ensayar:sincronizado', alSincronizar)
    return () => window.removeEventListener('ensayar:sincronizado', alSincronizar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrir(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    try {
      const t = await api<Turno>('/caja/abrir', {
        method: 'POST',
        body: JSON.stringify({ sucursalId, fondoInicial: Number(fondo) }),
      })
      setTurno(t)
      guardarCache(`turno:${user?.id}`, t)
      setTab('vender')
      setArqueo(null)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se abrió la caja')
    }
  }

  function agregar(producto: Producto, variante: Variante) {
    setComprobante(null)
    setTicket('')
    setLineas(prev => {
      const i = prev.findIndex(l => l.variante.id === variante.id)
      const actual = i >= 0 ? prev[i].cantidad : 0
      const limite = stockExacto[variante.id]
      if (limite !== undefined && actual >= limite) {
        setMsg('No se puede superar el stock de esta variante.')
        return prev
      }
      if (i >= 0) return prev.map((l, idx) => (idx === i ? { ...l, cantidad: l.cantidad + 1 } : l))
      return [...prev, { producto, variante, cantidad: 1 }]
    })
  }

  async function enviarVenta(payload: VentaPos) {
    return api<{ id: string; total: string; pago?: { id: string; estado: string } | null }>('/ventas', {
      method: 'POST',
      // El mismo uuid como clave: un doble clic o un reintento devuelve la misma venta.
      headers: { 'Idempotency-Key': payload.uuid },
      body: JSON.stringify(payload),
    })
  }

  /** Guarda la venta en el dispositivo y descuenta el stock local para no vender lo que ya no hay. */
  async function venderSinRed(payload: VentaPos) {
    await encolar(
      'venta',
      {
        almacenId: payload.almacenId,
        cajaTurnoId: payload.cajaTurnoId,
        clientaId: payload.clientaId,
        medioPago: 'efectivo',
        lineas: payload.lineas,
      },
      `Venta Bs ${total.toFixed(2)} · ${lineas.reduce((n, l) => n + l.cantidad, 0)} prenda(s)`,
      { id: payload.uuid },
    )
    const stock = { ...stockExacto }
    for (const l of payload.lineas) stock[l.varianteId] = Math.max(0, (stock[l.varianteId] ?? 0) - l.cantidad)
    setStockExacto(stock)
    if (claveInventario) guardarCache(claveInventario, stock)
    ventaEnCola.current = payload.uuid
    setTicket(
      navigator.onLine
        ? `Venta ${payload.uuid.slice(0, 8)} guardada; se está sincronizando.`
        : `Sin red: venta ${payload.uuid.slice(0, 8)} guardada en el dispositivo. Se sincroniza al volver la conexión.`,
    )
    setComprobante(null)
    setLineas([])
    setCuponCodigo('')
    void sincronizar()
  }

  async function registrarClienta(e: FormEvent) {
    e.preventDefault()
    if (!altaClienta) return
    const nueva: Clienta = { id: uuid(), nombre: altaClienta.nombre.trim(), email: altaClienta.email.trim().toLowerCase() }
    await encolar('cliente', { ...nueva }, `Clienta ${nueva.nombre} · ${nueva.email}`)
    const lista = [...clientas, nueva]
    setClientas(lista)
    guardarCache('clientas', lista)
    setClientaId(nueva.id)
    setAltaClienta(null)
    setMsg('')
    setTicket(
      navigator.onLine
        ? `Clienta ${nueva.nombre} registrada.`
        : `Clienta ${nueva.nombre} guardada en el dispositivo; se registra al volver la red.`,
    )
    void sincronizar()
  }

  function decisionTarjeta(numero: string) {
    const digits = numero.replace(/\s+/g, '')
    if (digits === '4242424242424242') return 'aprobado' as const
    if (digits === '4000000000000002') return 'rechazado' as const
    return null
  }

  async function resolverPago(resultado: 'aprobado' | 'rechazado') {
    if (!pagoId) return
    await api(`/pagos/${pagoId}/simular`, { method: 'POST', body: JSON.stringify({ resultado }) })
    setPagoId('')
    setTarjeta('')
    setLineas([])
    setTicket(
      resultado === 'aprobado'
        ? 'Pago de prueba aprobado. La venta quedó cobrada.'
        : 'Pago de prueba rechazado. El stock reservado volvió al almacén.',
    )
    await cargarTurno({ soft: true })
    void cargarVentasDevolucion()
  }

  if (!user || !['CAJERO', 'ADMIN', 'SUPERADMIN'].includes(user.rol)) {
    return <Navigate to={user ? homePorRol(user.rol) : '/login'} replace />
  }

  async function cobrar() {
    if (cobrando || !turno || !almacenId || lineas.length === 0 || pagoId) return
    const sinRed = !navigator.onLine
    if (sinRed && medio !== 'efectivo') {
      setMsg('Sin conexión solo se cobra en efectivo: QR, tarjeta, transferencia y crédito necesitan confirmar en línea.')
      return
    }
    if (medio === 'credito' && !clientaId) {
      setMsg('Para vender al crédito elegí la clienta: la deuda queda a su nombre.')
      return
    }
    if (sinRed && cuponCodigo) {
      setMsg('Los cupones se validan en línea. Quitá el cupón para vender sin conexión.')
      return
    }
    setCobrando(true)
    setMsg('')
    const payload: VentaPos = {
      uuid: uuid(),
      canal: 'pos',
      medioPago: medio,
      almacenId,
      cajaTurnoId: turno.id,
      lineas: lineas.map(l => ({
        varianteId: l.variante.id,
        cantidad: l.cantidad,
      })),
      ...(clientaId ? { clientaId } : {}),
      ...(cuponCodigo ? { cuponCodigo } : {}),
    }
    // Con operaciones en cola, la venta va detrás de ellas (p. ej. la clienta recién creada sin red).
    if (medio === 'efectivo' && !cuponCodigo && (sinRed || sync.pendientes > 0)) {
      try {
        await venderSinRed(payload)
      } finally {
        setCobrando(false)
      }
      return
    }
    try {
      const venta = await enviarVenta(payload)
      setTicket(`Venta ${venta.id.slice(0, 8)} · Bs ${Number(venta.total).toFixed(2)} · ${medio}`)
      setComprobante({
        id: venta.id,
        medio,
        total: Number(venta.total),
        canal: 'pos',
        fecha: new Date().toLocaleString('es-BO'),
        sucursalNombre: turno?.sucursal.nombre,
        clientaNombre: clientas.find(c => c.id === clientaId)?.nombre,
        clientaEmail: clientas.find(c => c.id === clientaId)?.email,
        lineas: lineas.map(l => ({
          nombre: l.producto.nombre,
          detalle: `${l.variante.talla}/${l.variante.color}`,
          cantidad: l.cantidad,
          precioUnitario: precioEfectivo(l.producto),
          subtotal: precioEfectivo(l.producto) * l.cantidad,
        })),
      })
      if (venta.pago?.id && venta.pago.estado === 'pendiente') {
        setPagoId(venta.pago.id)
        setTicket(`Venta ${venta.id.slice(0, 8)} espera la pasarela de prueba.`)
        return
      }
      setLineas([])
      await cargarTurno({ soft: true })
      void cargarVentasDevolucion()
      void cargarCatalogo()
      setRecarga(n => n + 1)
    } catch (err) {
      if (esFalloRed(err)) {
        if (medio === 'efectivo' && !cuponCodigo) {
          // Mismo uuid: si el servidor alcanzó a registrarla, la sincronización no la duplica.
          await venderSinRed(payload)
        } else {
          setMsg('Se perdió la conexión. QR, tarjeta y cupones necesitan red: cobrá en efectivo o reintentá.')
        }
        return
      }
      const codigo = err instanceof Error ? err.message : ''
      const textos: Record<string, string> = {
        CUPON_INVALIDO: 'Ese cupón no existe o ya venció.',
        CUPON_AGOTADO: 'Ese cupón llegó a su tope de usos.',
        STOCK_INSUFICIENTE: 'No hay stock suficiente para completar el cobro.',
        TURNO_REQUERIDO: 'Necesitás un turno de caja abierto para cobrar.',
        TURNO_CERRADO: 'El turno de caja ya está cerrado.',
        TURNO_AJENO: 'Ese turno pertenece a otro cajero.',
        ALMACEN_FUERA_TURNO: 'El almacén no corresponde al turno abierto.',
        UUID_CONFLICTO: 'Esa venta ya fue registrada (UUID duplicado).',
      }
      setMsg(textos[codigo] ?? (codigo || 'Cobro falló'))
    } finally {
      setCobrando(false)
    }
  }

  const esperado = Number(turno?.fondoInicial ?? 0) + Number(turno?.totalSistema ?? 0)

  async function cerrarCaja() {
    setMsg('')
    if (sync.pendientes > 0 || sync.conflictos > 0) {
      setMsg('Hay operaciones de este dispositivo sin sincronizar o en conflicto. El arqueo tiene que incluirlas.')
      return
    }
    try {
      const res = await api<Arqueo>('/caja/cerrar', {
        method: 'POST',
        body: JSON.stringify({ totalDeclarado: Number(declarado || esperado) }),
      })
      setArqueo(res)
      setTurno(null)
      borrarCache(`turno:${user?.id}`)
      setTab('vender')
      setLineas([])
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se cerró la caja')
    }
  }

  function setDevCantidad(ventaId: string, lineaId: string, value: number, max: number) {
    const n = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
    setDevCant(prev => ({
      ...prev,
      [ventaId]: { ...(prev[ventaId] ?? {}), [lineaId]: n },
    }))
  }

  async function devolverVenta(venta: VentaSucursal) {
    setDevErr('')
    setDevMsg('')
    const lineasDev = venta.lineas
      .map(l => ({
        lineaId: l.id,
        cantidad: devCant[venta.id]?.[l.id] ?? 0,
      }))
      .filter(l => l.cantidad > 0)
    if (!lineasDev.length) {
      setDevErr('Elegí al menos una cantidad a devolver.')
      return
    }
    try {
      const res = await api<{ estado: string; pagoEstado?: string }>('/devoluciones', {
        method: 'POST',
        body: JSON.stringify({ ventaId: venta.id, lineas: lineasDev }),
      })
      await cargarVentasDevolucion()
      if (res.pagoEstado === 'reembolsado') {
        setDevMsg('Devolución registrada. El pago quedó reembolsado (modo prueba).')
      } else {
        setDevMsg(`Devolución registrada. Estado: ${res.estado}.`)
      }
    } catch (err) {
      const codigo = err instanceof Error ? err.message : ''
      setDevErr(ERRORES_DEV[codigo] ?? (codigo || 'No se pudo devolver'))
    }
  }

  if (turno === undefined) {
    return (
      <OpsPage title="Punto de venta" description="Cargando turno de caja…">
        <OpsEmpty title="Cargando caja…" />
      </OpsPage>
    )
  }

  if (!turno) {
    return (
      <OpsPage
        eyebrow="Caja"
        title="Abrir turno"
        description="Para vender necesitás un turno abierto. Elegí sucursal y fondo inicial; después vas al catálogo y al ticket."
      >
        {arqueo ? (
          <OpsPanel title="Arqueo del turno anterior">
            <div className="admin-kpis admin-kpis--dense">
              <article className="admin-kpi">
                <span>Esperado</span>
                <strong>Bs {Number(arqueo.esperado).toFixed(2)}</strong>
              </article>
              <article className="admin-kpi">
                <span>Declarado</span>
                <strong>Bs {Number(arqueo.totalDeclarado).toFixed(2)}</strong>
              </article>
              <article className="admin-kpi">
                <span>Diferencia</span>
                <strong className={Number(arqueo.diferencia) === 0 ? 'ok' : 'error'}>
                  Bs {Number(arqueo.diferencia).toFixed(2)}
                </strong>
              </article>
            </div>
          </OpsPanel>
        ) : null}

        <div className="pos-open-grid">
          <OpsPanel title="Nuevo turno">
            <form className="ops-inline-form" onSubmit={event => void abrir(event)}>
              <OpsField label="Sucursal" className="ops-inline-form__grow">
                <select value={sucursalId} onChange={e => setSucursalId(e.target.value)} required>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre} · {s.ciudad}</option>
                  ))}
                </select>
              </OpsField>
              <OpsField label="Fondo inicial (Bs)" className="ops-inline-form__sm">
                <input type="number" min={0} step="0.01" value={fondo} onChange={e => setFondo(e.target.value)} required />
              </OpsField>
              <OpsBtn type="submit" className="ops-inline-form__action">Abrir turno</OpsBtn>
            </form>
            {msg ? <p className="error">{msg}</p> : null}
            <p className="muted ops-moderation-help">
              Tip: con el turno abierto vas a ver el catálogo a la izquierda y el ticket a la derecha para cobrar.
            </p>
          </OpsPanel>

          <DevolucionesPanel
            ventas={ventasDev}
            cant={devCant}
            msg={devMsg}
            err={devErr}
            onRefresh={() => void cargarVentasDevolucion()}
            onCantidad={setDevCantidad}
            onDevolver={v => void devolverVenta(v)}
          />
        </div>
      </OpsPage>
    )
  }

  return (
    <OpsPage
      eyebrow={`Turno · ${turno.sucursal.nombre}`}
      title="Punto de venta"
      description={`Fondo Bs ${Number(turno.fondoInicial).toFixed(2)} · sistema Bs ${Number(turno.totalSistema).toFixed(2)} · al cierre esperado Bs ${esperado.toFixed(2)}${deCache ? ' · datos guardados en el dispositivo' : ''}`}
      actions={
        <div className="pos-tabs" role="tablist" aria-label="Secciones del POS">
          {([
            ['vender', 'Vender'],
            ['devoluciones', 'Devoluciones'],
            ['cierre', 'Cerrar turno'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`pos-tab${tab === id ? ' is-active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {tab === 'vender' ? (
        <div className="pos-sell-layout">
          <OpsPanel title="Catálogo" eyebrow={`${catalogoPlano.length} en vista`}>
            <label className="pos-search ops-field">
              <span>Buscar prenda o SKU</span>
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Ej. blazer, VESTA-DEMO…"
                autoFocus
              />
            </label>
            <div className="pos-product-grid">
              {catalogoPlano.map(({ producto: p, variante: v, stock }) => (
                <button
                  key={v.id}
                  type="button"
                  className="pos-product-card"
                  disabled={stock <= 0}
                  onClick={() => agregar(p, v)}
                >
                  {v.urlFoto ? (
                    <img className="pos-product-image" src={assetUrl(v.urlFoto)} alt="" />
                  ) : (
                    <span className="pos-product-image pos-product-image--empty" aria-hidden="true">V</span>
                  )}
                  <div className="pos-product-copy">
                    <strong>{p.nombre}</strong>
                  <span className="pos-product-variant">{v.talla} · {v.color}</span>
                  <span className="pos-product-sku muted">{v.sku}</span>
                  <div className="pos-product-meta">
                    <span className="price">Bs {precioEfectivo(p).toFixed(2)}</span>
                    <OpsStatus state={stock > 2 ? 'ok' : stock > 0 ? 'warn' : 'muted'}>
                      {stock > 0 ? `${stock} disp.` : 'Agotado'}
                    </OpsStatus>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {!catalogoPlano.length ? <OpsEmpty title="Sin coincidencias">Probá otro término de búsqueda.</OpsEmpty> : null}
          </OpsPanel>

          <aside className="pos-ticket-panel">
            <OpsPanel title="Ticket actual" eyebrow={lineas.length ? `${lineas.length} ítems` : 'Sin prendas'}>
              {lineas.length === 0 ? (
                <div className="pos-ticket-empty">
                  <p>Elegí una prenda del catálogo para armar la venta.</p>
                </div>
              ) : (
                <>
                  <ul className="pos-ticket-lines">
                    {lineas.map(l => (
                      <li key={l.variante.id}>
                        <div>
                          <strong>{l.producto.nombre}</strong>
                          <span className="muted">
                            {l.variante.talla}/{l.variante.color} · Bs{' '}
                            {(precioEfectivo(l.producto) * l.cantidad).toFixed(2)}
                          </span>
                        </div>
                        <div className="pos-qty-controls">
                          <button type="button" onClick={() => setLineas(items => items.map(item => (item.variante.id === l.variante.id ? { ...item, cantidad: Math.max(1, item.cantidad - 1) } : item)))}>−</button>
                          <span>{l.cantidad}</span>
                          <button type="button" onClick={() => agregar(l.producto, l.variante)}>+</button>
                          <button type="button" className="pos-qty-remove" onClick={() => setLineas(items => items.filter(item => item.variante.id !== l.variante.id))} aria-label="Quitar">×</button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="pos-ticket-total">Total Bs {total.toFixed(2)}</p>

                  <div className="pos-ticket-fields">
                    <OpsField label="Clienta">
                      <select value={clientaId} onChange={e => setClientaId(e.target.value)}>
                        <option value="">Sin clienta</option>
                        {clientas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} · {c.email}</option>
                        ))}
                      </select>
                      <button type="button" className="ghost pos-nueva-clienta" onClick={() => setAltaClienta({ nombre: '', email: '' })}>
                        + Nueva clienta
                      </button>
                    </OpsField>
                    <OpsField label="Cupón">
                      <input value={cuponCodigo} onChange={e => setCuponCodigo(e.target.value)} placeholder="VESTA10" />
                    </OpsField>
                    <OpsField label="Medio de pago">
                      <select value={medio} onChange={e => setMedio(e.target.value as typeof medio)}>
                        <option value="efectivo">Efectivo</option>
                        <option value="qr">QR simulado</option>
                        <option value="tarjeta">Tarjeta simulada</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="mixto">Mixto</option>
                        <option value="credito">Crédito (30 días)</option>
                      </select>
                    </OpsField>
                  </div>

                  {altaClienta ? (
                    <form className="pos-alta-clienta" onSubmit={e => void registrarClienta(e)}>
                      <p className="eyebrow">Nueva clienta {sync.online ? '' : '(sin conexión)'}</p>
                      <OpsField label="Nombre">
                        <input
                          value={altaClienta.nombre}
                          onChange={e => setAltaClienta({ ...altaClienta, nombre: e.target.value })}
                          required
                          autoFocus
                        />
                      </OpsField>
                      <OpsField label="Correo">
                        <input
                          type="email"
                          value={altaClienta.email}
                          onChange={e => setAltaClienta({ ...altaClienta, email: e.target.value })}
                          required
                        />
                      </OpsField>
                      <OpsActions>
                        <OpsBtn type="submit">Registrar</OpsBtn>
                        <OpsBtn type="button" variant="secondary" onClick={() => setAltaClienta(null)}>Cancelar</OpsBtn>
                      </OpsActions>
                    </form>
                  ) : null}

                  {medio === 'tarjeta' ? (
                    <OpsField label="Tarjeta de prueba">
                      <input value={tarjeta} onChange={e => setTarjeta(e.target.value)} placeholder="4242 4242 4242 4242" inputMode="numeric" />
                      <small className="muted">Aprueba 4242… · Rechaza 4000…0002</small>
                    </OpsField>
                  ) : null}

                  {pagoId ? (
                    <div className="pos-pay-pending">
                      <p>Cobro en espera de pasarela de prueba.</p>
                      <OpsActions>
                        {medio === 'tarjeta' ? (
                          <OpsBtn
                            type="button"
                            onClick={() => {
                              const decision = decisionTarjeta(tarjeta)
                              if (!decision) {
                                setMsg('Usá 4242424242424242 o 4000000000000002.')
                                return
                              }
                              void resolverPago(decision)
                            }}
                          >
                            Aplicar tarjeta
                          </OpsBtn>
                        ) : (
                          <>
                            <OpsBtn type="button" onClick={() => void resolverPago('aprobado')}>Aprobar</OpsBtn>
                            <OpsBtn type="button" variant="secondary" onClick={() => void resolverPago('rechazado')}>Rechazar</OpsBtn>
                          </>
                        )}
                      </OpsActions>
                    </div>
                  ) : null}

                  {msg ? <p className="error">{msg}</p> : null}

                  <div className="pos-ticket-pay">
                    <OpsBtn type="button" disabled={!lineas.length || cobrando || Boolean(pagoId)} onClick={() => void cobrar()}>
                      {cobrando ? 'Procesando…' : `Cobrar Bs ${total.toFixed(2)}`}
                    </OpsBtn>
                  </div>
                </>
              )}

              {ticket && !comprobante && lineas.length === 0 ? <p className="ok">{ticket}</p> : null}

              {sync.pendientes || sync.conflictos ? (
                <div className="pos-cola">
                  <p className="eyebrow">Hecho sin conexión en este dispositivo</p>
                  <ColaDispositivo turnoId={turno.id} />
                </div>
              ) : null}

              {comprobante && lineas.length === 0 ? (
                <details className="pos-last-ticket" open>
                  <summary>Última factura · Bs {comprobante.total.toFixed(2)}</summary>
                  <TicketPrint
                    ticket={comprobante}
                    enviandoCorreo={enviandoCorreo}
                    correoMsg={correoMsg}
                    onEnviarCorreo={(email) => {
                      if (!email) {
                        setCorreoMsg('Indicá un correo válido para enviar la factura.')
                        return
                      }
                      setEnviandoCorreo(true)
                      setCorreoMsg('')
                      void api<{ ok: boolean; modo: string; destino: string }>(`/ventas/${comprobante.id}/enviar-factura`, {
                        method: 'POST',
                        body: JSON.stringify({ email }),
                      })
                        .then(r => {
                          setComprobante(prev => (prev ? { ...prev, clientaEmail: r.destino } : prev))
                          setCorreoMsg(
                            r.modo === 'smtp'
                              ? `Factura enviada a ${r.destino}.`
                              : `Correo simulado a ${r.destino} (SMTP no configurado; quedó como notificación).`,
                          )
                        })
                        .catch(err => {
                          setCorreoMsg(err instanceof Error ? err.message : 'No se pudo enviar el correo.')
                        })
                        .finally(() => setEnviandoCorreo(false))
                    }}
                  />
                </details>
              ) : null}
            </OpsPanel>
          </aside>
        </div>
      ) : null}

      {tab === 'devoluciones' ? (
        <DevolucionesPanel
          ventas={ventasDev}
          cant={devCant}
          msg={devMsg}
          err={devErr}
          onRefresh={() => void cargarVentasDevolucion()}
          onCantidad={setDevCantidad}
          onDevolver={v => void devolverVenta(v)}
        />
      ) : null}

      {tab === 'cierre' ? (
        <OpsPanel title="Cerrar turno" eyebrow="Arqueo de caja">
          <div className="admin-kpis admin-kpis--dense">
            <article className="admin-kpi">
              <span>Fondo</span>
              <strong>Bs {Number(turno.fondoInicial).toFixed(2)}</strong>
            </article>
            <article className="admin-kpi">
              <span>Ventas sistema</span>
              <strong>Bs {Number(turno.totalSistema).toFixed(2)}</strong>
            </article>
            <article className="admin-kpi">
              <span>Esperado</span>
              <strong>Bs {esperado.toFixed(2)}</strong>
            </article>
          </div>
          <form
            className="ops-inline-form"
            onSubmit={e => {
              e.preventDefault()
              void cerrarCaja()
            }}
          >
            <OpsField label="Efectivo declarado (Bs)" className="ops-inline-form__grow">
              <input
                type="number"
                min={0}
                step="0.01"
                value={declarado}
                placeholder={String(esperado)}
                onChange={e => setDeclarado(e.target.value)}
              />
            </OpsField>
            <OpsBtn type="submit" className="ops-inline-form__action" disabled={sync.pendientes > 0 || sync.conflictos > 0 || !sync.online}>
              Cerrar turno
            </OpsBtn>
          </form>
          {sync.pendientes > 0 ? (
            <p className="error">
              Hay {sync.pendientes} operación(es) hechas sin conexión que todavía no llegaron al servidor. Sincronizá
              antes de cerrar para que el arqueo las incluya.
            </p>
          ) : sync.conflictos > 0 ? (
            <p className="error">
              Hay {sync.conflictos} operación(es) en conflicto: el dinero ya está en la caja pero la venta no está en el
              sistema. Resolvelas en la pestaña Vender antes de cerrar.
            </p>
          ) : !sync.online ? (
            <p className="error">El cierre de caja necesita conexión.</p>
          ) : null}
          {msg ? <p className="error">{msg}</p> : null}
          <p className="muted">Al cerrar volvés a la pantalla de apertura. El arqueo muestra la diferencia.</p>
        </OpsPanel>
      ) : null}
    </OpsPage>
  )
}
