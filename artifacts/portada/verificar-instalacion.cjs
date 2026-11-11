const fs = require('node:fs');
const path = require('node:path');
const pause = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const tabs = await fetch('http://localhost:9341/json/list').then(r => r.json());
  const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let id = 0; const pending = new Map();
  ws.onmessage = ({ data }) => { const r = JSON.parse(data), p = pending.get(r.id); if (p) { pending.delete(r.id); r.error ? p.reject(Error(r.error.message)) : p.resolve(r.result); } };
  const cmd = (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); });
  const evaluate = async expression => { const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.text); return r.result.value; };
  const screenshot = async (name, width, height) => { const r = await cmd('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } }); fs.writeFileSync(path.join(__dirname, name), Buffer.from(r.data, 'base64')); };
  try {
    await cmd('Page.enable');
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
    await cmd('Page.navigate', { url: 'http://localhost:5173/inicio' }); await pause(2500);
    if (!await evaluate(`Boolean(document.querySelector('.shell-actions .pwa-install-button'))`)) throw Error('Boton no visible junto a sucursal');
    await screenshot('05-instalar-junto-sucursal.png', 1440, 950);
    await evaluate(`(() => { const e = new Event('beforeinstallprompt'); e.prompt = async () => { window.instaladorSolicitado = true }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); })()`); await pause(150);
    await evaluate(`document.querySelector('.shell-actions .pwa-install-button').click()`); await pause(200);
    if (!await evaluate(`window.instaladorSolicitado === true`)) throw Error('No se solicito instalador');
    await evaluate(`document.querySelector('.shell-actions .pwa-install-button').click()`); await pause(200);
    if (!await evaluate(`Boolean(document.querySelector('.shell-actions dialog[open]'))`)) throw Error('No se muestran instrucciones sin evento nativo');
    await screenshot('06-instrucciones-instalar.png', 1440, 950);
    await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await pause(200);
    if (await evaluate(`document.documentElement.scrollWidth > innerWidth + 1`)) throw Error('Desborde horizontal movil');
    await screenshot('07-instalar-movil.png', 390, 844);
    await evaluate(`window.dispatchEvent(new Event('appinstalled'))`); await pause(150);
    if (!await evaluate(`document.querySelector('.shell-actions .pwa-install-button').disabled`)) throw Error('No refleja estado instalado');
    console.log(JSON.stringify({ botonVisible: true, eventoInstalacionSimulado: true, instrucciones: true, movilSinDesborde: true, estadoInstaladoSimulado: true }));
    await cmd('Page.reload');
  } finally { ws.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
