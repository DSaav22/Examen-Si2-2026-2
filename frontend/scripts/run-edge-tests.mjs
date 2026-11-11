import { spawn } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const userDataDir = join(tmpdir(), `edge-test-profile-${Date.now()}`);
mkdirSync(userDataDir, { recursive: true });

console.log('Iniciando Microsoft Edge con perfil aislado en CDP :9337...');
const edgeProc = spawn(edgePath, [
  '--remote-debugging-port=9337',
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--headless=new',
  'http://localhost:5173/',
], {
  stdio: 'ignore',
  detached: false,
});

async function waitCdp(ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch('http://127.0.0.1:9337/json');
      if (res.ok) {
        const tabs = await res.json();
        if (Array.isArray(tabs) && tabs.length > 0) return tabs;
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('No se pudo conectar a CDP en :9337 tras ' + ms + 'ms');
}

async function run() {
  try {
    await waitCdp();
    console.log('Edge CDP listo. Ejecutando verificación de IndexedDB...');
    const { spawnSync } = await import('node:child_process');
    const r1 = spawnSync('node', ['frontend/scripts/verificar-cola-idb.mjs'], { stdio: 'inherit' });
    if (r1.status !== 0) throw new Error('Falló verificar-cola-idb.mjs');

    console.log('\nEjecutando verificación de Service Worker y PWA sin red...');
    const r2 = spawnSync('node', ['frontend/scripts/verificar-pwa-offline.mjs'], { stdio: 'inherit' });
    if (r2.status !== 0) throw new Error('Falló verificar-pwa-offline.mjs');

    console.log('\nEjecutando verificación de flujo completo offline (venta, clienta, producto, conflicto, multi-tienda)...');
    const r3 = spawnSync('node', ['frontend/scripts/verificar-flujo-offline-completo.mjs'], { stdio: 'inherit' });
    if (r3.status !== 0) throw new Error('Falló verificar-flujo-offline-completo.mjs');

    console.log('\n--- TODAS LAS PRUEBAS EN NAVEGADOR PASARON EXITOSAMENTE ---');
  } finally {
    console.log('Cerrando Edge...');
    try {
      edgeProc.kill('SIGKILL');
    } catch {
      /* ignore */
    }
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

run().catch((err) => {
  console.error('ERROR EN PRUEBAS DE NAVEGADOR:', err.message);
  process.exit(1);
});
