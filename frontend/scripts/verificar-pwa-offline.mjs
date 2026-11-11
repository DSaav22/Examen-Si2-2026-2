/** Comprueba reapertura del shell sin red en un perfil de navegador aislado. */
const tabs = await fetch('http://127.0.0.1:9337/json').then(r => r.json())
const tab = tabs.find(t => t.type === 'page')
if (!tab) throw Error('Navegador de prueba no disponible')
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let id = 0
const espera = new Map()
ws.onmessage = ({ data }) => { const r = JSON.parse(data); if (r.id && espera.has(r.id)) { const p = espera.get(r.id); espera.delete(r.id); r.error ? p.reject(Error(r.error.message)) : p.resolve(r.result) } }
function cmd(method, params = {}) { return new Promise((resolve, reject) => { const n = ++id; espera.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })) }) }
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms))
const evaluate = async expression => { const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value }
try {
  await cmd('Page.enable'); await cmd('Network.enable')
  await cmd('Page.navigate', { url: 'http://localhost:5173/planes' }); await pausa(2500)
  await evaluate('navigator.serviceWorker.ready.then(() => true)')
  await cmd('Page.reload'); await pausa(2000)
  if (!await evaluate('Boolean(navigator.serviceWorker.controller)')) throw Error('El service worker no controla la página')
  await cmd('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await cmd('Page.navigate', { url: 'http://localhost:5173/planes' }); await pausa(3000)
  const texto = await evaluate("document.querySelector('#root')?.innerText || ''")
  if (!texto.includes('Tu tienda, tus ventas')) throw Error('La página no volvió a abrir desde la caché sin red')
  console.log('PWA: service worker activo y página reabierta sin red en el navegador aislado.')
} finally {
  await cmd('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {})
  ws.close()
}
