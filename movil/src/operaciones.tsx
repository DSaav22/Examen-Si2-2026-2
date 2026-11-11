import { medioDeMetodo, useMetodosPago } from './pagos'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { api, esFalloRed, tiendaActiva } from './api'
import { borrarCache, guardarCache, leerCache } from './offline/almacen'
import { alSincronizar, cambiosReintento, descartar, encolar, motor, reintentar, sincronizar, textoReintento, useAutoSync, useSync, uuid } from './offline/sync'
import type { OperacionLocal } from './offline/tipos'
import { ReporteInteligenteMovil } from './reporte-inteligente'
import { useSession } from './session'
import { colors } from './theme'
import type { Producto, Variante } from './types'
import { precioEfectivo } from './types'

type CajaTurno = { id: string; fondoInicial: string | number; totalSistema: string | number; sucursal?: { id: string; nombre: string; almacenes?: { id: string }[] } }
type Clienta = { id: string; nombre: string; email: string }
type LineaPos = { variante: Variante; producto: Producto; cantidad: number }
type ReservaOperativa = {
  id: string; estado: string; horario: string
  clienta?: { nombre: string; email: string }
  sucursal?: { nombre: string }
  lineas?: { cantidad: number; variante: { talla: string; color: string; producto: { nombre: string } } }[]
}
type Pedido = { id: string; estado: string; direccion?: string; venta?: { id: string; total?: string | number; lineas?: { cantidad: number; variante: { producto: { nombre: string } } }[] } }
type Stock = { varianteId: string; almacenId: string; cantidad: number; reservado?: number; variante?: { sku: string; talla: string; color: string; producto: { nombre: string } } }
type Movimiento = { id: string; tipo: string; cantidad: number; creadoEn: string; nota?: string; variante?: { sku: string; producto?: { nombre: string } } }

function Action({ label, onPress, secondary, disabled }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text></Pressable>
}

function Card({ children }: { children: React.ReactNode }) { return <View style={styles.card}>{children}</View> }

/** Panel móvil para funciones operativas. El backend conserva todas las validaciones de rol y sucursal. */
export function OperacionesScreen() {
  const s = useSession()
  const rol = s.user?.rol ?? ''
  const [recargar, setRecargar] = useState(0)
  const [avisos, setAvisos] = useState<{ id: string; titulo?: string; mensaje?: string; leida?: boolean }[]>([])

  const cargarAvisos = useCallback(async () => {
    if (!s.token) return
    try { setAvisos(await api('/notificaciones?limit=8', s.token)) } catch { /* módulo opcional */ }
  }, [s.token])

  useEffect(() => { void cargarAvisos() }, [cargarAvisos, recargar])

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Pressable onPress={s.back}><Text style={styles.link}>← Volver</Text></Pressable>
      <Text style={styles.eyebrow}>ENSAYAR · OPERACIONES</Text>
      <Text style={styles.title}>Panel de {rol.toLowerCase()}</Text>
      <Text style={styles.lead}>Las acciones se validan nuevamente en el backend con tu sesión y sucursal asignada.</Text>
      {['ADMIN', 'SUPERADMIN', 'ENCARGADO'].includes(rol) ? <ReporteInteligenteMovil /> : null}
      {rol === 'CAJERO' ? <CajaPos onCambio={() => setRecargar(n => n + 1)} /> : null}
      {rol === 'ENCARGADO' ? <Encargado onCambio={() => setRecargar(n => n + 1)} /> : null}
      {rol === 'PROVEEDOR' ? <Proveedor onCambio={() => setRecargar(n => n + 1)} /> : null}
      {rol === 'ADMIN' || rol === 'SUPERADMIN' ? <Administrador onCambio={() => setRecargar(n => n + 1)} /> : null}
      {!['CAJERO', 'ENCARGADO', 'PROVEEDOR', 'ADMIN', 'SUPERADMIN'].includes(rol) ? <Card><Text style={styles.muted}>Este rol no tiene operaciones móviles asignadas.</Text></Card> : null}
      <Card>
        <Text style={styles.cardTitle}>Avisos recientes</Text>
        {avisos.length ? avisos.map(a => <View key={a.id} style={styles.row}><Text style={styles.rowTitle}>{a.titulo ?? 'Aviso'}</Text><Text style={styles.muted}>{a.mensaje ?? ''}</Text></View>) : <Text style={styles.muted}>No hay avisos pendientes.</Text>}
        <Action label="ACTUALIZAR AVISOS" secondary onPress={() => void cargarAvisos()} />
      </Card>
    </ScrollView>
  )
}

/** Pide al backend y guarda la respuesta en SQLite; sin red devuelve la última copia guardada. */
async function conCache<T>(clave: string, pedir: () => Promise<T>): Promise<{ datos: T; deCache: boolean }> {
  const t = tiendaActiva()
  try {
    const datos = await pedir()
    await guardarCache(clave, datos, t)
    return { datos, deCache: false }
  } catch (err) {
    const copia = esFalloRed(err) ? await leerCache<T>(clave, t) : null
    if (copia === null) throw err
    return { datos: copia, deCache: true }
  }
}

function CajaPos({ onCambio }: { onCambio: () => void }) {
  const s = useSession()
  useAutoSync(s.token, s.user?.cuentaId ?? s.user?.id)
  const sync = useSync()
  const [turno, setTurno] = useState<CajaTurno | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [stock, setStock] = useState<Record<string, number>>({})
  const [deCache, setDeCache] = useState(false)
  const [ticket, setTicket] = useState<LineaPos[]>([])
  const [fondo, setFondo] = useState('0')
  const [declarado, setDeclarado] = useState('0')
  const [medio, setMedio] = useState<'efectivo' | 'qr' | 'tarjeta' | 'transferencia'>('efectivo')
  const pagos = useMetodosPago(s.token)
  const [metodo, setMetodo] = useState('')
  const [pagoPendiente, setPagoPendiente] = useState('')
  const [cobrando, setCobrando] = useState(false)
  const [clientas, setClientas] = useState<Clienta[]>([])
  const [clientaId, setClientaId] = useState('')
  const [altaClienta, setAltaClienta] = useState(false)
  const [nombreClienta, setNombreClienta] = useState('')
  const [emailClienta, setEmailClienta] = useState('')
  const pendientes = sync.ops.filter(o => o.estado === 'pendiente').length
  const almacenId = turno?.sucursal?.almacenes?.[0]?.id ?? s.almacenId

  const cargar = useCallback(async () => {
    try {
      const [t, p, c] = await Promise.all([
        conCache(`turno:${s.user?.id}`, () => api<CajaTurno | null>('/caja/turno-abierto', s.token)),
        conCache('catalogo-pos', async () => {
          const r = await api<{ items?: Producto[] } | Producto[]>('/catalogo/productos?limite=60', null)
          return Array.isArray(r) ? r : r.items ?? []
        }),
        leerCache<Clienta[]>('clientas', tiendaActiva()),
      ])
      setTurno(t.datos ?? null)
      setProductos(p.datos)
      setClientas(c ?? [])
      setDeCache(t.deCache || p.deCache)
      const sucursalId = t.datos?.sucursal?.id
      if (sucursalId) {
        const inv = await conCache(`inventario:${sucursalId}`, async () => {
          const items = await api<{ varianteId: string; disponible: number }[]>(`/catalogo/disponibilidad?sucursalId=${sucursalId}`, s.token)
          return Object.fromEntries(items.map(i => [i.varianteId, Math.max(0, i.disponible)]))
        })
        setStock(inv.datos)
      }
    } catch (e) { s.setError(e instanceof Error ? e.message : 'No se pudo cargar caja') }
  }, [s.token, s.user?.id])
  useEffect(() => { void cargar() }, [cargar])
  useEffect(() => alSincronizar(resultados => {
    void cargar(); onCambio()
    const ok = resultados.filter(r => r.estado === 'aplicada' || r.estado === 'repetida' || r.estado === 'fusionada').length
    const revisar = resultados.filter(r => r.estado === 'conflicto' || r.estado === 'rechazada' || r.estado === 'vencida').length
    s.setAviso(revisar ? `${ok} operación(es) sincronizadas; ${revisar} necesitan revisión en el panel de arriba.` : `${ok} operación(es) del teléfono sincronizadas.`)
  }), [cargar])

  const total = ticket.reduce((sum, l) => sum + precioEfectivo(l.producto) * l.cantidad, 0)
  function agregar(producto: Producto, variante: Variante) {
    setTicket(prev => {
      const i = prev.findIndex(l => l.variante.id === variante.id)
      const actual = i < 0 ? 0 : prev[i].cantidad
      if (stock[variante.id] !== undefined && actual >= stock[variante.id]) { s.setError('No queda más stock de esa variante.'); return prev }
      return i < 0 ? [...prev, { producto, variante, cantidad: 1 }] : prev.map((l, n) => n === i ? { ...l, cantidad: l.cantidad + 1 } : l)
    })
  }
  async function abrir() {
    try {
      const t = await api<CajaTurno>('/caja/abrir', s.token, { method: 'POST', headers: { 'Idempotency-Key': uuid() }, body: JSON.stringify({ sucursalId: s.sucursalId, fondoInicial: Number(fondo) || 0 }) })
      await guardarCache(`turno:${s.user?.id}`, t, tiendaActiva())
      s.setAviso('Caja abierta'); await cargar(); onCambio()
    } catch (e) { s.setError(e instanceof Error ? e.message : 'No se abrió la caja') }
  }
  async function cerrar() {
    if (!turno) return
    try {
      await api('/caja/cerrar', s.token, { method: 'POST', headers: { 'Idempotency-Key': uuid() }, body: JSON.stringify({ totalDeclarado: Number(declarado) || 0 }) })
      await borrarCache(`turno:${s.user?.id}`, tiendaActiva())
      s.setAviso('Caja cerrada'); setTicket([]); await cargar(); onCambio()
    } catch (e) { s.setError(e instanceof Error ? e.message : 'No se cerró la caja') }
  }
  async function venderSinRed(payload: { uuid: string; almacenId: string; cajaTurnoId: string; clientaId?: string; lineas: { varianteId: string; cantidad: number }[] }) {
    const prendas = payload.lineas.reduce((n, l) => n + l.cantidad, 0)
    await encolar('venta', { almacenId: payload.almacenId, cajaTurnoId: payload.cajaTurnoId, clientaId: payload.clientaId, medioPago: 'efectivo', lineas: payload.lineas }, `Venta Bs ${total.toFixed(2)} · ${prendas} prenda(s)`, { id: payload.uuid, cuentaId: s.user?.cuentaId ?? s.user?.id })
    const resto = { ...stock }
    for (const l of payload.lineas) resto[l.varianteId] = Math.max(0, (resto[l.varianteId] ?? 0) - l.cantidad)
    setStock(resto)
    if (turno?.sucursal?.id) await guardarCache(`inventario:${turno.sucursal.id}`, resto, tiendaActiva())
    setTicket([])
    s.setAviso(`Venta ${payload.uuid.slice(0, 8)} guardada en el teléfono (${motor}); se sincroniza sola al volver la red.`)
    void sincronizar(s.token, s.user?.cuentaId ?? s.user?.id)
  }
  async function cobrar() {
    if (cobrando || pagoPendiente) return
    if (medio !== 'efectivo' && !pagos.metodos.some(m => m.codigo === metodo)) { s.setError('Elegí un método disponible.'); return }
    if (!turno || !ticket.length || !almacenId) return
    const payload = { uuid: uuid(), almacenId, cajaTurnoId: turno.id, clientaId: clientaId || undefined, lineas: ticket.map(l => ({ varianteId: l.variante.id, cantidad: l.cantidad })) }
    if (medio !== 'efectivo' && !sync.online) { s.setError('El pago simulado necesita conexión con el servidor. Sin conexión cobrá en efectivo.'); return }
    // Detrás de operaciones pendientes la venta también va a la cola, para respetar el orden (p. ej. una clienta recién creada).
    if (medio === 'efectivo' && (!sync.online || pendientes > 0)) { await venderSinRed(payload); return }
    setCobrando(true)
    try {
      const venta = await api<{ id: string; pago?: { id: string } }>('/ventas', s.token, { method: 'POST', headers: { 'Idempotency-Key': payload.uuid }, body: JSON.stringify({ ...payload, canal: 'pos', medioPago: medio, ...(medio !== 'efectivo' ? { metodoPasarela: metodo } : {}) }) })
      if (venta.pago?.id) { setPagoPendiente(venta.pago.id); s.setAviso('Pago simulado pendiente: aprobá o rechazá el cobro.'); return }
      setTicket([]); s.setAviso(`Venta POS ${venta.id.slice(0, 8)} cobrada`); await cargar(); onCambio()
    } catch (e) {
      if (esFalloRed(e) && medio === 'efectivo') { await venderSinRed(payload); return }
      s.setError(e instanceof Error ? e.message : 'No se pudo cobrar')
    } finally { setCobrando(false) }
  }
  async function resolverPago(resultado: 'aprobado' | 'rechazado') {
    if (!pagoPendiente || cobrando) return
    setCobrando(true)
    try {
      await api(`/pagos/${pagoPendiente}/simular`, s.token, { method: 'POST', headers: { 'Idempotency-Key': `${pagoPendiente}:${resultado}` }, body: JSON.stringify({ resultado }) })
      setPagoPendiente(''); setTicket([]); await cargar(); onCambio()
      s.setAviso(resultado === 'aprobado' ? 'Pago simulado aprobado' : 'Pago rechazado; stock liberado')
    } catch (e) { s.setError(e instanceof Error ? e.message : 'No se pudo resolver el pago') }
    finally { setCobrando(false) }
  }
  async function registrarClienta() {
    const nombre = nombreClienta.trim()
    const email = emailClienta.trim().toLowerCase()
    if (!nombre || !/^\S+@\S+\.\S+$/.test(email)) { s.setError('Completá nombre y un correo válido.'); return }
    const id = uuid()
    await encolar('cliente', { id, nombre, email }, `Clienta ${nombre} · ${email}`, { id, cuentaId: s.user?.cuentaId ?? s.user?.id })
    const lista = [...clientas, { id, nombre, email }]
    setClientas(lista); await guardarCache('clientas', lista, tiendaActiva())
    setClientaId(id); setAltaClienta(false); setNombreClienta(''); setEmailClienta('')
    s.setAviso(`${nombre} quedó registrada en el teléfono.`)
    void sincronizar(s.token, s.user?.cuentaId ?? s.user?.id)
  }

  return <>
    <ColaMovil turnoId={turno?.id} />
    <Card><Text style={styles.cardTitle}>Caja</Text>{deCache ? <Text style={styles.muted}>Datos guardados en el teléfono: la última copia antes de perder la red.</Text> : null}{turno ? <><Text style={styles.rowTitle}>Turno abierto · {turno.sucursal?.nombre ?? s.sucursal?.nombre}</Text><Text style={styles.muted}>Fondo Bs {Number(turno.fondoInicial).toFixed(2)} · Sistema Bs {Number(turno.totalSistema).toFixed(2)}</Text><TextInput value={declarado} onChangeText={setDeclarado} keyboardType="decimal-pad" style={styles.input} placeholder="Total declarado para cierre" />{sync.ops.length > 0 || !sync.online ? <Text style={styles.muted}>El cierre espera a que las ventas del teléfono se sincronicen y sus conflictos se resuelvan.</Text> : null}<Action label="CERRAR CAJA" disabled={sync.ops.length > 0 || !sync.online} onPress={() => void cerrar()} secondary /></> : <><Text style={styles.muted}>No hay turno abierto en esta sesión.</Text><TextInput value={fondo} onChangeText={setFondo} keyboardType="decimal-pad" style={styles.input} placeholder="Fondo inicial" /><Action label="ABRIR CAJA" disabled={!sync.online} onPress={() => void abrir()} /></>}</Card>
    <Card><Text style={styles.cardTitle}>Punto de venta</Text><Text style={styles.muted}>Tocá una variante para añadirla al ticket.</Text>{productos.map(p => <View key={p.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{p.nombre}</Text><Text style={styles.muted}>Bs {precioEfectivo(p).toFixed(2)}</Text></View>{p.variantes.slice(0, 3).map(v => { const disp = stock[v.id]; const agotado = disp === 0; return <Pressable key={v.id} disabled={agotado} onPress={() => agregar(p, v)} style={[styles.pill, agotado && styles.disabled]}><Text style={styles.pillText}>{v.talla}/{v.color}{disp !== undefined ? ` · ${disp}` : ''}</Text></Pressable> })}</View>)}</Card>
    <Card><Text style={styles.cardTitle}>Ticket · Bs {total.toFixed(2)}</Text>{ticket.length ? ticket.map(l => <View key={l.variante.id} style={styles.row}><Text style={styles.rowTitle}>{l.producto.nombre} · {l.variante.talla}/{l.variante.color} × {l.cantidad}</Text><Pressable onPress={() => setTicket(p => p.flatMap(x => x.variante.id === l.variante.id ? x.cantidad === 1 ? [] : [{ ...x, cantidad: x.cantidad - 1 }] : [x]))}><Text style={styles.remove}>Quitar</Text></Pressable></View>) : <Text style={styles.muted}>Sin artículos.</Text>}
      <Text style={styles.rowTitle}>Clienta</Text>
      <View style={styles.chips}><Pressable style={[styles.chip, medio === 'efectivo' && styles.chipOn]} onPress={() => { setMedio('efectivo'); setMetodo('') }}><Text>Efectivo</Text></Pressable>{pagos.metodos.map(m => <Pressable key={m.codigo} disabled={!sync.online || !!pagoPendiente} style={[styles.chip, metodo === m.codigo && styles.chipOn]} onPress={() => { setMetodo(m.codigo); setMedio(medioDeMetodo(m.codigo)) }}><Text>{m.nombre} - simulado</Text></Pressable>)}</View>
      {pagos.error ? <Text>{pagos.error}</Text> : null}
      {pagoPendiente ? <><Text>Pago simulado pendiente. No se cobra dinero real.</Text><Action label="APROBAR PAGO" disabled={cobrando} onPress={() => void resolverPago('aprobado')} /><Action label="RECHAZAR PAGO" disabled={cobrando} onPress={() => void resolverPago('rechazado')} secondary /></> : null}
      {altaClienta ? <View style={styles.row}><TextInput value={nombreClienta} onChangeText={setNombreClienta} style={styles.input} placeholder="Nombre" /><TextInput value={emailClienta} onChangeText={setEmailClienta} style={styles.input} placeholder="Correo" keyboardType="email-address" autoCapitalize="none" /><Action label="REGISTRAR CLIENTA" onPress={() => void registrarClienta()} /></View> : null}
      <View style={styles.chips}><Pressable style={[styles.chip, medio === 'efectivo' && styles.chipOn]} onPress={() => setMedio('efectivo')}><Text>Efectivo</Text></Pressable><Pressable style={[styles.chip, medio === 'qr' && styles.chipOn, !sync.online && styles.disabled]} disabled={!sync.online} onPress={() => setMedio('qr')}><Text>QR simulado{sync.online ? '' : ' (requiere red)'}</Text></Pressable></View>
      <Action label="COBRAR TICKET" disabled={!turno || !ticket.length} onPress={() => void cobrar()} />
    </Card>
  </>
}

const ETIQUETA_ESTADO: Record<OperacionLocal['estado'], string> = { pendiente: 'Pendiente', conflicto: 'Conflicto', rechazada: 'Rechazada', vencida: 'Vencida' }

/** Estado de la red y de la cola SQLite del teléfono, con acciones para resolver conflictos. */
function ColaMovil({ turnoId }: { turnoId?: string }) {
  const s = useSession()
  const sync = useSync()
  const pendientes = sync.ops.filter(o => o.estado === 'pendiente').length
  return <Card>
    <View style={styles.syncHead}><Text style={styles.cardTitle}>Modo sin conexión</Text><Text style={[styles.estado, sync.online ? styles.estadoOk : styles.estadoOff]}>{sync.online ? 'Conectado' : 'Sin red'}</Text></View>
    <Text style={styles.muted}>{sync.online ? 'Las ventas en efectivo y las clientas nuevas se guardan primero en el teléfono si la red falla.' : 'Podés seguir vendiendo en efectivo y registrando clientas: quedan en la base local y se envían solas al volver la red.'} Base local: {motor}.{sync.ultimaSync ? ` Última sincronización: ${new Date(sync.ultimaSync).toLocaleTimeString()}.` : ''}</Text>
    {sync.ultimoError ? <Text style={styles.errorText}>{sync.ultimoError}</Text> : null}
    {sync.ops.map(op => {
      const cambios = op.estado === 'pendiente' ? null : cambiosReintento(op, turnoId)
      return <View key={op.id} style={[styles.row, op.estado !== 'pendiente' && styles.opConflicto]}>
        <Text style={styles.rowTitle}>{op.resumen}</Text>
        <Text style={styles.muted}>{op.tipo} · {new Date(op.creadaEn).toLocaleString()} · {op.id.slice(0, 8)} · {ETIQUETA_ESTADO[op.estado]}</Text>
        {op.error ? <Text style={styles.errorText}>{op.error.mensaje ?? op.error.codigo}</Text> : null}
        <View style={styles.chips}>
          {cambios ? <Action label={textoReintento(op)} onPress={() => void reintentar(op, cambios).then(() => sincronizar(s.token))} /> : null}
          <Action label="DESCARTAR" secondary onPress={() => void descartar(op.id)} />
        </View>
      </View>
    })}
    {sync.ops.length ? <Action label={sync.sincronizando ? 'SINCRONIZANDO…' : `SINCRONIZAR (${pendientes})`} disabled={sync.sincronizando || !sync.online || !pendientes} secondary onPress={() => void sincronizar(s.token)} /> : <Text style={styles.muted}>No hay operaciones pendientes en el teléfono.</Text>}
  </Card>
}

function Encargado({ onCambio }: { onCambio: () => void }) {
  const s = useSession(); const [reservas, setReservas] = useState<ReservaOperativa[]>([]); const [pedidos, setPedidos] = useState<Pedido[]>([]); const [stock, setStock] = useState<Stock[]>([]); const [movs, setMovs] = useState<Movimiento[]>([]); const [varianteId, setVarianteId] = useState(''); const [cantidad, setCantidad] = useState('')
  const cargar = useCallback(async () => { try { const [r, p, st, m] = await Promise.all([api<ReservaOperativa[]>('/reservas/sucursal', s.token), api<Pedido[]>('/pedidos/despacho', s.token), api<Stock[]>(`/catalogo/stock?almacenId=${s.almacenId}`, s.token), api<Movimiento[]>(`/inventario/movimientos?almacenId=${s.almacenId}`, s.token)]); setReservas(r); setPedidos(p); setStock(st); setMovs(m) } catch (e) { s.setError(e instanceof Error ? e.message : 'No se cargaron operaciones') } }, [s.token, s.almacenId])
  useEffect(() => { void cargar() }, [cargar])
  async function estado(id: string, next: string) { try { await api(`/reservas/${id}/estado`, s.token, { method: 'PATCH', body: JSON.stringify({ estado: next }) }); s.setAviso('Reserva actualizada'); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se actualizó') } }
  async function ajustar() { try { await api('/inventario/ajuste', s.token, { method: 'POST', body: JSON.stringify({ varianteId, almacenId: s.almacenId, cantidad: Number(cantidad), nota: 'Ajuste desde móvil' }) }); s.setAviso('Inventario ajustado'); setCantidad(''); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se ajustó inventario') } }
  async function despachar(id: string) { try { await api(`/pedidos/${id}/despachar`, s.token, { method: 'POST' }); s.setAviso('Pedido despachado'); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se despachó') } }
  return <>
    <Card><Text style={styles.cardTitle}>Reservas de sucursal</Text>{reservas.length ? reservas.map(r => <View key={r.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{r.clienta?.nombre ?? 'Clienta'} · {r.estado}</Text><Text style={styles.muted}>{new Date(r.horario).toLocaleString()} · {r.lineas?.map(x => x.variante.producto.nombre).join(', ')}</Text></View><Action label="PREPARAR" secondary onPress={() => void estado(r.id, 'preparada')} /></View>) : <Text style={styles.muted}>No hay reservas activas.</Text>}</Card>
    <Card><Text style={styles.cardTitle}>Despacho</Text>{pedidos.length ? pedidos.map(p => <View key={p.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>Pedido {p.id.slice(0, 8)} · {p.estado}</Text><Text style={styles.muted}>{p.direccion ?? 'Sin dirección'}</Text></View><Action label="DESPACHAR" onPress={() => void despachar(p.id)} /></View>) : <Text style={styles.muted}>No hay pedidos pendientes.</Text>}</Card>
    <Card><Text style={styles.cardTitle}>Ajustar inventario</Text><Text style={styles.muted}>Seleccioná una variante del stock y definí su cantidad física.</Text><View style={styles.chips}>{stock.slice(0, 18).map(x => <Pressable key={x.varianteId} onPress={() => setVarianteId(x.varianteId)} style={[styles.chip, varianteId === x.varianteId && styles.chipOn]}><Text>{x.variante?.sku ?? x.varianteId.slice(0, 6)} · {x.cantidad}</Text></Pressable>)}</View><TextInput value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" style={styles.input} placeholder="Cantidad física" /><Action label="GUARDAR AJUSTE" disabled={!varianteId || cantidad === ''} onPress={() => void ajustar()} /></Card>
    <Card><Text style={styles.cardTitle}>Últimos movimientos</Text>{movs.slice(0, 8).map(m => <View key={m.id} style={styles.row}><Text style={styles.rowTitle}>{m.tipo} · {m.cantidad}</Text><Text style={styles.muted}>{m.variante?.producto?.nombre ?? m.variante?.sku ?? ''}</Text></View>)}</Card>
  </>
}

function Proveedor({ onCambio }: { onCambio: () => void }) {
  const s = useSession(); const [productos, setProductos] = useState<Producto[]>([]); const [ingresos, setIngresos] = useState<{ items?: Movimiento[]; total?: number }>({}); const [varianteId, setVarianteId] = useState(''); const [cantidad, setCantidad] = useState('')
  const variantes = useMemo(() => productos.flatMap(p => p.variantes.map(v => ({ p, v }))), [productos])
  const cargar = useCallback(async () => { try { const [p, i] = await Promise.all([api<Producto[]>('/proveedores/mis-productos', s.token), api<{ items?: Movimiento[]; total?: number }>('/proveedores/mis-ingresos?pagina=1&limite=12', s.token)]); setProductos(p); setIngresos(i) } catch (e) { s.setError(e instanceof Error ? e.message : 'No se pudo cargar proveedor') } }, [s.token])
  useEffect(() => { void cargar() }, [cargar])
  async function ingresar() { try { await api('/inventario/ingreso', s.token, { method: 'POST', body: JSON.stringify({ varianteId, almacenId: s.almacenId, cantidad: Number(cantidad), nota: 'Ingreso reportado desde móvil' }) }); s.setAviso('Ingreso de stock registrado'); setCantidad(''); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se ingresó stock') } }
  return <><Card><Text style={styles.cardTitle}>Mis productos</Text>{productos.length ? productos.map(p => <View key={p.id} style={styles.row}><Text style={styles.rowTitle}>{p.nombre}</Text><Text style={styles.muted}>{p.variantes.length} variante(s)</Text></View>) : <Text style={styles.muted}>No hay productos vinculados.</Text>}</Card><Card><Text style={styles.cardTitle}>Ingresar stock</Text><View style={styles.chips}>{variantes.map(({ p, v }) => <Pressable key={v.id} onPress={() => setVarianteId(v.id)} style={[styles.chip, varianteId === v.id && styles.chipOn]}><Text>{p.nombre} · {v.talla}/{v.color}</Text></Pressable>)}</View><TextInput value={cantidad} onChangeText={setCantidad} keyboardType="number-pad" style={styles.input} placeholder="Cantidad a ingresar" /><Action label="REGISTRAR INGRESO" disabled={!varianteId || !cantidad} onPress={() => void ingresar()} /></Card><Card><Text style={styles.cardTitle}>Historial de ingresos · {ingresos.total ?? 0}</Text>{ingresos.items?.map(i => <View key={i.id} style={styles.row}><Text style={styles.rowTitle}>{i.cantidad} unidad(es) · {i.variante?.producto?.nombre ?? i.variante?.sku ?? ''}</Text><Text style={styles.muted}>{new Date(i.creadoEn).toLocaleString()}</Text></View>)}</Card></>
}

function Administrador({ onCambio }: { onCambio: () => void }) {
  const s = useSession()
  const sync = useSync()
  const [resumen, setResumen] = useState<Record<string, unknown> | null>(null)
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null)
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; email: string; rol: string; activo: boolean }[]>([])
  const [opiniones, setOpiniones] = useState<{ id: string; comentario?: string; puntuacion?: number; producto?: { nombre: string }; usuario?: { nombre: string } }[]>([])

  const [nombreProd, setNombreProd] = useState('')
  const [catProd, setCatProd] = useState('vestidos')
  const [ocasionProd, setOcasionProd] = useState('casual')
  const [precioProd, setPrecioProd] = useState('280')
  const [descProd, setDescProd] = useState('')
  const [tallaProd, setTallaProd] = useState('M')
  const [colorProd, setColorProd] = useState('Negro')
  const [stockProd, setStockProd] = useState('10')
  const [creandoProd, setCreandoProd] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [r, p, u, o] = await Promise.all([
        api<Record<string, unknown>>('/admin/resumen', s.token),
        api<Record<string, unknown>>('/reportes/panel', s.token),
        api<typeof usuarios>('/usuarios', s.token),
        api<typeof opiniones>('/admin/opiniones/pendientes', s.token),
      ])
      setResumen(r)
      setPanel(p)
      setUsuarios(u)
      setOpiniones(o)
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se cargó administración')
    }
  }, [s.token])

  useEffect(() => { void cargar() }, [cargar])

  async function registrarProducto() {
    const nom = nombreProd.trim()
    const precio = Number(precioProd)
    if (!nom || isNaN(precio) || precio <= 0) {
      s.setError('Completá nombre y un precio base válido.')
      return
    }
    setCreandoProd(true)
    const prodId = uuid()
    const varId = uuid()
    const sku = `${nom.slice(0, 3).toUpperCase()}-${tallaProd.toUpperCase()}-${colorProd.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
    const payload = {
      id: prodId,
      nombre: nom,
      categoria: catProd,
      ocasion: ocasionProd,
      precioBase: precio,
      descripcion: descProd.trim() || undefined,
      almacenId: s.almacenId || undefined,
      variantes: [
        {
          id: varId,
          talla: tallaProd.trim() || 'M',
          color: colorProd.trim() || 'Negro',
          sku,
          stock: Number(stockProd) || 0,
        },
      ],
    }
    if (!sync.online) {
      await encolar('producto', payload, `Producto ${nom} · Bs ${precio.toFixed(2)}`, { id: prodId, cuentaId: s.user?.cuentaId ?? s.user?.id })
      s.setAviso(`Producto "${nom}" guardado en SQLite local (${motor}); se sincronizará al volver la red.`)
      setNombreProd('')
      setDescProd('')
      setCreandoProd(false)
      onCambio()
      return
    }
    try {
      await api('/sync/lote', s.token, {
        method: 'POST',
        body: JSON.stringify({
          dispositivoId: 'movil-admin',
          nombreDispositivo: `Admin ${Platform.OS} · ${motor}`,
          operaciones: [{ id: prodId, tipo: 'producto', creadaEn: new Date().toISOString(), datos: payload }],
        }),
      })
      s.setAviso(`Producto "${nom}" registrado exitosamente.`)
      setNombreProd('')
      setDescProd('')
      onCambio()
    } catch (err) {
      if (esFalloRed(err)) {
        await encolar('producto', payload, `Producto ${nom} · Bs ${precio.toFixed(2)}`, { id: prodId, cuentaId: s.user?.cuentaId ?? s.user?.id })
        s.setAviso(`Sin red: producto "${nom}" guardado en la cola local (${motor}).`)
        setNombreProd('')
        setDescProd('')
        onCambio()
      } else {
        s.setError(err instanceof Error ? err.message : 'No se pudo registrar el producto')
      }
    } finally {
      setCreandoProd(false)
    }
  }

  async function moderar(id: string, aprobar: boolean) {
    try {
      await api(`/admin/opiniones/${id}/moderacion`, s.token, { method: 'PATCH', body: JSON.stringify({ aprobar }) })
      s.setAviso(aprobar ? 'Opinión publicada' : 'Opinión rechazada')
      await cargar()
      onCambio()
    } catch (e) {
      s.setError(e instanceof Error ? e.message : 'No se moderó la opinión')
    }
  }

  return (
    <>
      <Card>
        <Text style={styles.cardTitle}>Nuevo producto (en línea o sin conexión)</Text>
        <Text style={styles.muted}>Crea prendas que se sincronizan con el catálogo y el esquema de la tienda activa.</Text>
        <TextInput value={nombreProd} onChangeText={setNombreProd} style={styles.input} placeholder="Nombre de la prenda (ej. Vestido Noche)" />
        <TextInput value={descProd} onChangeText={setDescProd} style={styles.input} placeholder="Descripción opcional" />
        <View style={styles.chips}>
          <Text style={styles.rowTitle}>Categoría:</Text>
          {['vestidos', 'conjuntos', 'blusas', 'pantalones', 'calzados'].map(c => (
            <Pressable key={c} onPress={() => setCatProd(c)} style={[styles.chip, catProd === c && styles.chipOn]}>
              <Text style={{ textTransform: 'capitalize' }}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.chips}>
          <Text style={styles.rowTitle}>Ocasión:</Text>
          {['casual', 'fiesta', 'gala', 'trabajo', 'noche'].map(o => (
            <Pressable key={o} onPress={() => setOcasionProd(o)} style={[styles.chip, ocasionProd === o && styles.chipOn]}>
              <Text style={{ textTransform: 'capitalize' }}>{o}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TextInput value={precioProd} onChangeText={setPrecioProd} keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} placeholder="Precio Bs" />
          <TextInput value={tallaProd} onChangeText={setTallaProd} style={[styles.input, { flex: 1 }]} placeholder="Talla (ej. M)" />
          <TextInput value={colorProd} onChangeText={setColorProd} style={[styles.input, { flex: 1 }]} placeholder="Color (ej. Negro)" />
          <TextInput value={stockProd} onChangeText={setStockProd} keyboardType="number-pad" style={[styles.input, { flex: 1 }]} placeholder="Stock" />
        </View>
        <Action label={creandoProd ? 'GUARDANDO…' : 'REGISTRAR PRODUCTO'} disabled={creandoProd || !nombreProd.trim() || !precioProd} onPress={() => void registrarProducto()} />
      </Card>
      <Card><Text style={styles.cardTitle}>Resumen diario</Text><Text style={styles.pre}>{resumen ? JSON.stringify(resumen, null, 2) : 'Cargando…'}</Text></Card>
      <Card><Text style={styles.cardTitle}>Reportes de negocio</Text><Text style={styles.pre}>{panel ? JSON.stringify(panel, null, 2) : 'Cargando…'}</Text></Card>
      <Card><Text style={styles.cardTitle}>Usuarios · {usuarios.length}</Text>{usuarios.slice(0, 20).map(u => <View key={u.id} style={styles.row}><Text style={styles.rowTitle}>{u.nombre} · {u.rol}</Text><Text style={styles.muted}>{u.email} · {u.activo ? 'activo' : 'inactivo'}</Text></View>)}</Card>
      <Card><Text style={styles.cardTitle}>Moderación · {opiniones.length}</Text>{opiniones.length ? opiniones.map(o => <View key={o.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{o.producto?.nombre ?? 'Producto'} · {o.puntuacion ?? 0}/5</Text><Text style={styles.muted}>{o.usuario?.nombre ?? ''}: {o.comentario ?? ''}</Text></View><Action label="APROBAR" onPress={() => void moderar(o.id, true)} /><Action label="RECHAZAR" secondary onPress={() => void moderar(o.id, false)} /></View>) : <Text style={styles.muted}>No hay opiniones pendientes.</Text>}</Card>
    </>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 42, gap: 10, backgroundColor: colors.paper }, link: { color: colors.wine, marginBottom: 4 }, eyebrow: { color: colors.taupe, fontSize: 11, letterSpacing: 1.8 }, title: { color: colors.ink, fontSize: 28, fontWeight: '700', textTransform: 'capitalize' }, lead: { color: colors.taupe, lineHeight: 19 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 13, gap: 8, marginTop: 4 }, cardTitle: { color: colors.ink, fontWeight: '700', fontSize: 18 }, row: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 3 }, rowTitle: { color: colors.ink, fontWeight: '600' }, muted: { color: colors.taupe, fontSize: 12, lineHeight: 17 }, input: { borderWidth: 1, borderColor: colors.line, color: colors.ink, padding: 11, backgroundColor: colors.paper, marginTop: 4 }, action: { backgroundColor: colors.wine, padding: 11, alignItems: 'center', marginTop: 4 }, actionText: { color: colors.white, fontSize: 11, fontWeight: '700', letterSpacing: .8 }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.wine }, secondaryText: { color: colors.wine }, disabled: { opacity: .45 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }, chip: { borderWidth: 1, borderColor: colors.line, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: colors.paper }, chipOn: { borderColor: colors.wine, backgroundColor: '#f1e4e7' }, pill: { borderWidth: 1, borderColor: colors.wine, paddingHorizontal: 6, paddingVertical: 4, marginLeft: 3 }, pillText: { color: colors.wine, fontSize: 10 }, remove: { color: colors.wine, fontSize: 12 }, pre: { color: colors.ink, fontSize: 11, lineHeight: 16 },
  syncHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, estado: { fontSize: 11, fontWeight: '700', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1 }, estadoOk: { color: '#2f5d3a', borderColor: '#2f5d3a' }, estadoOff: { color: '#8a5a12', borderColor: '#8a5a12', backgroundColor: '#f7ecd6' }, errorText: { color: colors.wine, fontSize: 12, lineHeight: 17 }, opConflicto: { borderLeftWidth: 3, borderLeftColor: colors.wine, paddingLeft: 8 },
})
