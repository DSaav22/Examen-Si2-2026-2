import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from './api'
import { useSession } from './session'
import { colors } from './theme'
import type { Producto, Variante } from './types'
import { precioEfectivo } from './types'

type CajaTurno = { id: string; fondoInicial: string | number; totalSistema: string | number; sucursal?: { nombre: string } }
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

function CajaPos({ onCambio }: { onCambio: () => void }) {
  const s = useSession()
  const [turno, setTurno] = useState<CajaTurno | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [ticket, setTicket] = useState<LineaPos[]>([])
  const [fondo, setFondo] = useState('0')
  const [declarado, setDeclarado] = useState('0')
  const [medio, setMedio] = useState<'efectivo' | 'qr'>('efectivo')
  const cargar = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api<CajaTurno | null>('/caja/turno-abierto', s.token), api<{ items?: Producto[] } | Producto[]>('/catalogo/productos?limite=24', null)])
      setTurno(t); setProductos(Array.isArray(p) ? p : p.items ?? [])
    } catch (e) { s.setError(e instanceof Error ? e.message : 'No se pudo cargar caja') }
  }, [s.token])
  useEffect(() => { void cargar() }, [cargar])
  const total = ticket.reduce((sum, l) => sum + precioEfectivo(l.producto) * l.cantidad, 0)
  function agregar(producto: Producto, variante: Variante) { setTicket(prev => { const i = prev.findIndex(l => l.variante.id === variante.id); return i < 0 ? [...prev, { producto, variante, cantidad: 1 }] : prev.map((l, n) => n === i ? { ...l, cantidad: l.cantidad + 1 } : l) }) }
  async function abrir() { try { await api('/caja/abrir', s.token, { method: 'POST', body: JSON.stringify({ sucursalId: s.sucursalId, fondoInicial: Number(fondo) || 0 }) }); s.setAviso('Caja abierta'); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se abrió la caja') } }
  async function cerrar() { if (!turno) return; try { await api('/caja/cerrar', s.token, { method: 'POST', body: JSON.stringify({ totalDeclarado: Number(declarado) || 0 }) }); s.setAviso('Caja cerrada'); setTicket([]); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se cerró la caja') } }
  async function cobrar() { if (!turno || !ticket.length || !s.almacenId) return; try { const venta = await api<{ id: string; pago?: { id: string } }>('/ventas', s.token, { method: 'POST', body: JSON.stringify({ uuid: `movil-pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, canal: 'pos', medioPago: medio, almacenId: s.almacenId, cajaTurnoId: turno.id, lineas: ticket.map(l => ({ varianteId: l.variante.id, cantidad: l.cantidad })) }) }); if (medio === 'qr' && venta.pago?.id) await api(`/pagos/${venta.pago.id}/simular`, s.token, { method: 'POST', body: JSON.stringify({ resultado: 'aprobado' }) }); setTicket([]); s.setAviso(`Venta POS ${venta.id.slice(0, 8)} cobrada`); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se pudo cobrar') } }
  return <>
    <Card><Text style={styles.cardTitle}>Caja</Text>{turno ? <><Text style={styles.rowTitle}>Turno abierto · {turno.sucursal?.nombre ?? s.sucursal?.nombre}</Text><Text style={styles.muted}>Fondo Bs {Number(turno.fondoInicial).toFixed(2)} · Sistema Bs {Number(turno.totalSistema).toFixed(2)}</Text><TextInput value={declarado} onChangeText={setDeclarado} keyboardType="decimal-pad" style={styles.input} placeholder="Total declarado para cierre" /><Action label="CERRAR CAJA" onPress={() => void cerrar()} secondary /></> : <><Text style={styles.muted}>No hay turno abierto en esta sesión.</Text><TextInput value={fondo} onChangeText={setFondo} keyboardType="decimal-pad" style={styles.input} placeholder="Fondo inicial" /><Action label="ABRIR CAJA" onPress={() => void abrir()} /></>}</Card>
    <Card><Text style={styles.cardTitle}>Punto de venta</Text><Text style={styles.muted}>Tocá una variante para añadirla al ticket.</Text>{productos.map(p => <View key={p.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{p.nombre}</Text><Text style={styles.muted}>Bs {precioEfectivo(p).toFixed(2)}</Text></View>{p.variantes.slice(0, 3).map(v => <Pressable key={v.id} onPress={() => agregar(p, v)} style={styles.pill}><Text style={styles.pillText}>{v.talla}/{v.color}</Text></Pressable>)}</View>)}</Card>
    <Card><Text style={styles.cardTitle}>Ticket · Bs {total.toFixed(2)}</Text>{ticket.length ? ticket.map(l => <View key={l.variante.id} style={styles.row}><Text style={styles.rowTitle}>{l.producto.nombre} · {l.variante.talla}/{l.variante.color} × {l.cantidad}</Text><Pressable onPress={() => setTicket(p => p.flatMap(x => x.variante.id === l.variante.id ? x.cantidad === 1 ? [] : [{ ...x, cantidad: x.cantidad - 1 }] : [x]))}><Text style={styles.remove}>Quitar</Text></Pressable></View>) : <Text style={styles.muted}>Sin artículos.</Text>}<View style={styles.chips}><Pressable style={[styles.chip, medio === 'efectivo' && styles.chipOn]} onPress={() => setMedio('efectivo')}><Text>Efectivo</Text></Pressable><Pressable style={[styles.chip, medio === 'qr' && styles.chipOn]} onPress={() => setMedio('qr')}><Text>QR simulado</Text></Pressable></View><Action label="COBRAR TICKET" disabled={!turno || !ticket.length} onPress={() => void cobrar()} /></Card>
  </>
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
  const s = useSession(); const [resumen, setResumen] = useState<Record<string, unknown> | null>(null); const [panel, setPanel] = useState<Record<string, unknown> | null>(null); const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; email: string; rol: string; activo: boolean }[]>([]); const [opiniones, setOpiniones] = useState<{ id: string; comentario?: string; puntuacion?: number; producto?: { nombre: string }; usuario?: { nombre: string } }[]>([])
  const cargar = useCallback(async () => { try { const [r, p, u, o] = await Promise.all([api<Record<string, unknown>>('/admin/resumen', s.token), api<Record<string, unknown>>('/reportes/panel', s.token), api<typeof usuarios>('/usuarios', s.token), api<typeof opiniones>('/admin/opiniones/pendientes', s.token)]); setResumen(r); setPanel(p); setUsuarios(u); setOpiniones(o) } catch (e) { s.setError(e instanceof Error ? e.message : 'No se cargó administración') } }, [s.token])
  useEffect(() => { void cargar() }, [cargar])
  async function moderar(id: string, aprobar: boolean) { try { await api(`/admin/opiniones/${id}/moderacion`, s.token, { method: 'PATCH', body: JSON.stringify({ aprobar }) }); s.setAviso(aprobar ? 'Opinión publicada' : 'Opinión rechazada'); await cargar(); onCambio() } catch (e) { s.setError(e instanceof Error ? e.message : 'No se moderó la opinión') } }
  return <><Card><Text style={styles.cardTitle}>Resumen diario</Text><Text style={styles.pre}>{resumen ? JSON.stringify(resumen, null, 2) : 'Cargando…'}</Text></Card><Card><Text style={styles.cardTitle}>Reportes de negocio</Text><Text style={styles.pre}>{panel ? JSON.stringify(panel, null, 2) : 'Cargando…'}</Text></Card><Card><Text style={styles.cardTitle}>Usuarios · {usuarios.length}</Text>{usuarios.slice(0, 20).map(u => <View key={u.id} style={styles.row}><Text style={styles.rowTitle}>{u.nombre} · {u.rol}</Text><Text style={styles.muted}>{u.email} · {u.activo ? 'activo' : 'inactivo'}</Text></View>)}</Card><Card><Text style={styles.cardTitle}>Moderación · {opiniones.length}</Text>{opiniones.length ? opiniones.map(o => <View key={o.id} style={styles.row}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{o.producto?.nombre ?? 'Producto'} · {o.puntuacion ?? 0}/5</Text><Text style={styles.muted}>{o.usuario?.nombre ?? ''}: {o.comentario ?? ''}</Text></View><Action label="APROBAR" onPress={() => void moderar(o.id, true)} /><Action label="RECHAZAR" secondary onPress={() => void moderar(o.id, false)} /></View>) : <Text style={styles.muted}>No hay opiniones pendientes.</Text>}</Card></>
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 42, gap: 10, backgroundColor: colors.paper }, link: { color: colors.wine, marginBottom: 4 }, eyebrow: { color: colors.taupe, fontSize: 11, letterSpacing: 1.8 }, title: { color: colors.ink, fontSize: 28, fontWeight: '700', textTransform: 'capitalize' }, lead: { color: colors.taupe, lineHeight: 19 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 13, gap: 8, marginTop: 4 }, cardTitle: { color: colors.ink, fontWeight: '700', fontSize: 18 }, row: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, gap: 3 }, rowTitle: { color: colors.ink, fontWeight: '600' }, muted: { color: colors.taupe, fontSize: 12, lineHeight: 17 }, input: { borderWidth: 1, borderColor: colors.line, color: colors.ink, padding: 11, backgroundColor: colors.paper, marginTop: 4 }, action: { backgroundColor: colors.wine, padding: 11, alignItems: 'center', marginTop: 4 }, actionText: { color: colors.white, fontSize: 11, fontWeight: '700', letterSpacing: .8 }, secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.wine }, secondaryText: { color: colors.wine }, disabled: { opacity: .45 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }, chip: { borderWidth: 1, borderColor: colors.line, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: colors.paper }, chipOn: { borderColor: colors.wine, backgroundColor: '#f1e4e7' }, pill: { borderWidth: 1, borderColor: colors.wine, paddingHorizontal: 6, paddingVertical: 4, marginLeft: 3 }, pillText: { color: colors.wine, fontSize: 10 }, remove: { color: colors.wine, fontSize: 12 }, pre: { color: colors.ink, fontSize: 11, lineHeight: 16 },
})
