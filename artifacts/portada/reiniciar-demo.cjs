// Reinicia exclusivamente la API local de demostracion sin escribir credenciales.
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const database = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(database.hostname)) throw Error('SOLO_BASE_LOCAL');
const env = { ...process.env, PORT: '3000' };
execFileSync('powershell.exe', ['-NoProfile', '-Command', "$api = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($api) { $apiProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $api.OwningProcess); if ($apiProcess.CommandLine -notmatch 'dist/src/main.js') { throw 'Proceso API inesperado' }; Stop-Process -Id $api.OwningProcess }; exit 0"], { windowsHide: true });
const log = fs.openSync(path.join(os.tmpdir(), 'ensayar-logo-demo-api.log'), 'a');
const child = spawn(process.execPath, ['dist/src/main.js'], { cwd: backend, env, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
child.unref();
console.log('API de demostracion reiniciada con logo de tienda.');