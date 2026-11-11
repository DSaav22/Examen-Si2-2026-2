const fs = require('node:fs');
const path = require('node:path');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const response = await fetch('http://localhost:3000/plataforma/directorio');
  const empresas = await response.json();
  if (response.status !== 200 || !Array.isArray(empresas) || !empresas.length) throw Error('Directorio no disponible');
  for (const e of empresas) if (Object.keys(e).some(k => !['slug', 'nombre', 'logo', 'pais'].includes(k))) throw Error('Campo no publico');
  const tabs = await fetch('http://localhost:9341/json/list').then(r => r.json());
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const waiting = new Map();
  ws.onmessage = ({ data }) => { const r = JSON.parse(data), p = waiting.get(r.id); if (p) { waiting.delete(r.id); r.error ? p.reject(Error(r.error.message)) : p.resolve(r.result); } };
  const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; waiting.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; };
  const screenshot = async name => { const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(__dirname, name), Buffer.from(r.data, 'base64')); };
  try {
    await cmd('Page.enable'); await cmd('Page.navigate', { url: 'http://localhost:5173/' }); await pause(3000);
    await evaluate(`localStorage.clear(); localStorage.setItem('ensayar_theme', 'light'); location.reload()`); await pause(3000);
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    if (!await evaluate(`Boolean(document.querySelector('#saas-titulo')) && !document.querySelector('.pf-pricing')`)) throw Error('Portada o separacion de planes incorrecta');
    if (await evaluate(`document.querySelectorAll('.saas-company').length`) !== empresas.length) throw Error('Directorio incompleto');
    await screenshot('01-portada-escritorio.png');
    await evaluate(`document.querySelector('input[type="search"]').focus()`);
    await evaluate(`(() => { const input = document.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'no-existe-esta-tienda-xyz'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`); await pause(300);
    if (!await evaluate(`document.body.innerText.includes('No encontramos tiendas')`)) throw Error('Busqueda vacia incorrecta');
    await cmd('Page.reload'); await pause(2500);
    await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    if (await evaluate(`document.documentElement.scrollWidth > innerWidth + 1`)) throw Error('Desborde horizontal movil');
    await screenshot('02-portada-movil.png');
    const empresa = empresas.find(e => e.slug !== 'vesta') || empresas[0];
    await evaluate(`document.querySelector('a[href="/t/${empresa.slug}/admin"]').click()`); await pause(2500);
    if (!await evaluate(`location.pathname === '/login' && localStorage.getItem('ensayar_tienda') === ${JSON.stringify(empresa.slug)}`)) throw Error('Acceso administrador incorrecto');
    await screenshot('03-acceso-administracion.png');
    await cmd('Page.navigate', { url: 'http://localhost:5173/' }); await pause(2500);
    await evaluate(`document.querySelector('a[href="/t/${empresa.slug}"]').click()`); await pause(3000);
    if (!await evaluate(`location.pathname === '/inicio'`)) throw Error('Acceso a tienda incorrecto');
    await cmd('Page.navigate', { url: 'http://localhost:5173/planes' }); await pause(2500);
    if (!await evaluate(`Boolean(document.querySelector('.pf-pricing'))`)) throw Error('Planes no disponibles');
    await cmd('Page.navigate', { url: 'http://localhost:5173/' }); await pause(2500);
    console.log(JSON.stringify({ directorioPublico: true, tiendas: empresas.length, portada: true, busqueda: true, accesoAdmin: true, accesoTienda: true, planes: true, movilSinDesborde: true }));
  } finally { ws.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
