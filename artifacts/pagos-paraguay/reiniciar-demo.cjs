// Reinicia exclusivamente la API local de demostracion sin escribir credenciales.
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const entries = JSON.parse(execFileSync('docker', ['inspect', '--format', '{{json .Config.Env}}', 'ensayar-demo-local-20261110'], { encoding: 'utf8' }));
const config = Object.fromEntries(entries.map(s => { const i = s.indexOf('='); return [s.slice(0, i), s.slice(i + 1)]; }));
const env = { ...process.env, DATABASE_URL: `postgresql://${encodeURIComponent(config.POSTGRES_USER || 'postgres')}:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:55442/ensayar_demo?schema=public`, PORT: '3000', SMTP_HOST: '' };
execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'resolve', '--applied', '20261111180000_logo_tienda'], { cwd: backend, env, stdio: 'pipe' });
execFileSync('powershell.exe', ['-NoProfile', '-Command', "$api = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($api) { $apiProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $api.OwningProcess); if ($apiProcess.CommandLine -notmatch 'dist/src/main.js') { throw 'Proceso API inesperado' }; Stop-Process -Id $api.OwningProcess }"], { windowsHide: true });
const log = fs.openSync(path.join(os.tmpdir(), 'ensayar-logo-demo-api.log'), 'a');
const child = spawn(process.execPath, ['dist/src/main.js'], { cwd: backend, env, detached: true, windowsHide: true, stdio: ['ignore', log, log] });
child.unref();
console.log('API de demostracion reiniciada con logo de tienda.');
