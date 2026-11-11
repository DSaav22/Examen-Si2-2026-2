/** Prueba real de IndexedDB en un navegador aislado, con Vite en localhost:5173 y CDP en localhost:9337. */
const tabs = await fetch('http://127.0.0.1:9337/json').then(r => r.json())
const tab = tabs.find(t => t.type === 'page')
if (!tab) throw Error('Navegador de prueba no disponible')
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let id = 0
const espera = new Map()
ws.onmessage = ({ data }) => { const r = JSON.parse(data); if (r.id && espera.has(r.id)) { const { resolve, reject } = espera.get(r.id); espera.delete(r.id); r.error ? reject(Error(r.error.message)) : resolve(r.result) } }
function cmd(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; espera.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) }) }
await cmd('Page.enable')
await cmd('Page.navigate', { url: 'http://localhost:5173/' })
await new Promise(resolve => setTimeout(resolve, 1500))
const expression = `(async () => {
  const ok = (c, m) => { if (!c) throw Error(m) }
  const q = await import('/src/offline/cola.ts')
  localStorage.setItem('ensayar_tienda', 'ensayo-idb-a')
  const op = await q.encolar('venta', { lineas: [] }, 'Ensayo')
  await q.guardarOp({ ...op, estado: 'conflicto' })
  const duplicada = await q.encolar('producto', { nombre: 'Ensayo' }, 'Duplicada')
  const previo = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: () => duplicada.id })
  let fallo = false
  try { await q.reintentar({ ...op, estado: 'conflicto' }) } catch { fallo = true }
  if (previo) Object.defineProperty(crypto, 'randomUUID', previo); else delete crypto.randomUUID
  ok(fallo && (await q.listarOps('ensayo-idb-a')).some(x => x.id === op.id), 'La colisión no preservó el original')
  localStorage.setItem('ensayar_tienda', 'ensayo-idb-b')
  const nuevo = await q.reintentar({ ...op, estado: 'conflicto' })
  ok(nuevo.tienda === 'ensayo-idb-a' && (await q.listarOps('ensayo-idb-a')).some(x => x.id === nuevo.id), 'Reintento cambió de tienda')
  const cliente = { id: crypto.randomUUID(), tipo: 'cliente', creadaEn: new Date().toISOString(), tienda: 'ensayo-idb-a', resumen: 'Cliente', estado: 'pendiente', datos: { id: 'local' } }
  const venta = { id: crypto.randomUUID(), tipo: 'venta', creadaEn: new Date().toISOString(), tienda: 'ensayo-idb-a', resumen: 'Venta', estado: 'pendiente', datos: { clientaId: 'local' } }
  await q.guardarOp(cliente); await q.guardarOp(venta)
  const borrar = IDBObjectStore.prototype.delete
  IDBObjectStore.prototype.delete = function () { throw Error('Fallo simulado') }
  fallo = false
  try { await q.confirmarOp(cliente, 'servidor') } catch { fallo = true }
  IDBObjectStore.prototype.delete = borrar
  let filas = await q.listarOps('ensayo-idb-a')
  ok(fallo && filas.some(x => x.id === cliente.id) && filas.find(x => x.id === venta.id).datos.clientaId === 'local', 'Fallo no revirtió la fusión')
  await q.confirmarOp(cliente, 'servidor')
  filas = await q.listarOps('ensayo-idb-a')
  ok(!filas.some(x => x.id === cliente.id) && filas.find(x => x.id === venta.id).datos.clientaId === 'servidor', 'Fusión incompleta')
  localStorage.setItem('ensayar_cola_pos', '{inválido')
  fallo = false; try { await q.migrarColaVieja() } catch { fallo = true }
  ok(fallo && localStorage.getItem('ensayar_cola_pos') === '{inválido', 'Se perdió la cola antigua inválida')
  const raw = JSON.stringify([{ uuid: crypto.randomUUID(), almacenId: 'a', cajaTurnoId: 'c', lineas: [] }])
  localStorage.setItem('ensayar_cola_pos', raw); await q.migrarColaVieja()
  ok(localStorage.getItem('ensayar_cola_pos') === null && (await q.listarOps('ensayo-idb-b')).length === 1, 'Migración antigua incompleta')
  localStorage.setItem('ensayar_cola_pos', raw); await q.migrarColaVieja()
  ok((await q.listarOps('ensayo-idb-b')).length === 1, 'Migración antigua duplicada')
  return 'IndexedDB: rollback, reintento, aislamiento, fusión y migración de cola verificados.'
})()`
try {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
  console.log(r.result.value)
  await cmd('Page.reload')
  await new Promise(resolve => setTimeout(resolve, 1500))
  const reabierta = await cmd('Runtime.evaluate', { expression: "import('/src/offline/cola.ts').then(q => q.listarOps('ensayo-idb-b')).then(x => x.length)", awaitPromise: true, returnByValue: true })
  if (reabierta.exceptionDetails || reabierta.result.value !== 1) throw Error('La operación no persistió al recargar')
  console.log('IndexedDB: la operación permanece después de recargar la página.')
} finally { ws.close() }
