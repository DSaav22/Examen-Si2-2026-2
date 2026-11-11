const fs=require('node:fs');const path=require('node:path');const pause=ms=>new Promise(r=>setTimeout(r,ms));async function main(){
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
    const slug = await evaluate(`document.querySelector('.pf-success-details')?.innerText.split('/t/')[1]?.split(String.fromCharCode(10))[0]`);
    await click('Entrar a mi tienda'); await pause(2200);
    const logoPanel = await evaluate(`Boolean(document.querySelector('.ops-brand-mark img'))`);
    if (!logoPanel) throw Error('Logo no visible en operaciones');
    await screenshot('06-logo-en-panel.png');
    await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('07-logo-panel-movil.png');
    await cmd('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
    await evaluate(`localStorage.clear();localStorage.setItem('ensayar_tienda', ${JSON.stringify(slug)});location.assign('/inicio')`); await pause(2200);
    const logoVitrina = await evaluate(`Boolean(document.querySelector('.brand-mark img'))`);
    if (!logoVitrina) throw Error('Logo no visible en vitrina');
    await screenshot('08-logo-en-vitrina.png');
    await cmd('Page.reload'); await pause(1500);
    if (!await evaluate(`Boolean(document.querySelector('.brand-mark img'))`)) throw Error('Logo no persiste tras recargar');
    await cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await screenshot('09-logo-vitrina-movil.png');
    console.log(JSON.stringify({ logoPersistente: true, logoPanel: true, logoVitrina: true, url: 'http://localhost:5173/inicio' }));
  } finally { ws.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
