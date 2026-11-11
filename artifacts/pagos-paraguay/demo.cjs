const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const pause = ms => new Promise(r => setTimeout(r, ms));
const base = 'http://localhost:3000';
async function post(route, body, token) {
  const r = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const data = await r.json();
  if (!r.ok) throw Error(`${route}: HTTP ${r.status} ${data.codigo || ''}`);
  return data;
}
async function main() {
  const stamp = Date.now().toString(36);
  const registro = await post('/plataforma/registro', { nombre: 'Demo Paraguay', email: `pagos-py-${stamp}@example.invalid`, password: crypto.randomBytes(24).toString('base64url') });
  if (!registro.verificacion?.url) throw Error('La verificacion no esta en modo simulado; se requiere acceso de demostracion.');
  const sesion = await post('/plataforma/verificar', { token: new URL(registro.verificacion.url).searchParams.get('token') });
  const tabs = await fetch('http://localhost:9341/json/list').then(r => r.json());
  const tab = tabs.find(t => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map();
  ws.onmessage = ({ data }) => { const r = JSON.parse(data); const p = pending.get(r.id); if (p) { pending.delete(r.id); r.error ? p.reject(Error(r.error.message)) : p.resolve(r.result); } };
  const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const click = text => evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.innerText.includes(${JSON.stringify(text)})); if (!b || b.disabled) throw Error('Boton no disponible'); b.click(); })()`);
  const screenshot = async name => { await pause(500); const r = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); fs.writeFileSync(path.join(__dirname, name), Buffer.from(r.data, 'base64')); };
  try {
    await cmd('Page.enable');
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url: 'http://localhost:5173/planes' }); await pause(1500);
    await evaluate(`localStorage.setItem('ensayar_cuenta_token', ${JSON.stringify(sesion.accessToken)}); localStorage.setItem('ensayar_cuenta', ${JSON.stringify(JSON.stringify({ cuenta: sesion.cuenta, tiendas: sesion.tiendas }))});`);
    await cmd('Page.navigate', { url: 'http://localhost:5173/plataforma/nueva?plan=plan-inicial&periodo=MENSUAL' }); await pause(1800);
    await click('Continuar'); await pause(500);
    await evaluate(`(() => { const input = document.querySelector('.pf-store-form input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'Demo Paraguay ${stamp}'); input.dispatchEvent(new Event('input', { bubbles: true })); const select = document.querySelector('.pf-store-form select'); select.value = 'PY'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await pause(1200); await screenshot('01-tienda-paraguay.png');
    await click('Continuar'); await pause(1000);
    const methods = await evaluate(`[...document.querySelectorAll('input[name="metodo-pago-pais"]')].map(i => i.value)`);
    if (methods.includes('pix') || methods.includes('yape') || !methods.includes('tigo_money')) throw Error('Catalogo de Paraguay incorrecto');
    await evaluate(`document.querySelector('input[value="tigo_money"]').click()`);
    await screenshot('02-pago-tigo-money.png');
    await evaluate(`(() => { const select = document.querySelector('.pf-subscription-methods select'); select.value = 'rechazado'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await click('Simular pago y crear tienda'); await pause(1600);
    const rejected = await evaluate(`document.body.innerText.includes('No se pudo completar el pago simulado')`);
    if (!rejected) throw Error('No se mostro rechazo');
    await screenshot('03-pago-rechazado.png');
    await evaluate(`(() => { const select = document.querySelector('.pf-subscription-methods select'); select.value = 'aprobado'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await click('Simular pago y crear tienda'); await pause(2200);
    const approved = await evaluate(`document.body.innerText.includes('Tu tienda est') && document.body.innerText.toLowerCase().includes('pago simulado aprobado')`);
    if (!approved) { const text = await evaluate(`document.querySelector('[role="alert"]')?.innerText || document.querySelector('.pf-error')?.innerText || 'Sin mensaje'`); throw Error('Alta no confirmada: ' + text); }
    await screenshot('04-pago-aprobado.png');
    console.log(JSON.stringify({ methods, rejected, approved, capturas: 4, url: 'http://localhost:5173/plataforma/nueva' }));
  } finally { ws.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
