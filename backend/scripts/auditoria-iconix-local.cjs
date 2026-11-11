/** Ejecuta verificaciones únicamente contra la copia local de auditoría. */
const path = require('node:path');
const fs = require('node:fs');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const out = path.resolve(root, '../artifacts/auditoria-iconix-20261111');
fs.mkdirSync(out, { recursive: true });
Object.assign(process.env, {
  DATABASE_URL: 'postgresql://iconix_audit_20261111:solo-auditoria-local-20261111@127.0.0.1:55442/ensayar_iconix_audit_20261111?schema=public',
  JWT_SECRET: 'clave-sintetica-auditoria-local-no-utilizar', PORT: '3302', API_URL: 'http://127.0.0.1:3302',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '',
  AZURE_OPENAI_ENDPOINT: '', AZURE_OPENAI_API_KEY: '', AZURE_AI_ENDPOINT: '', AZURE_AI_API_KEY: '',
  TENANT_SCHEMAS_PERFILES: 'false', TENANT_SCHEMAS_ALTA: 'false', TENANT_SCHEMAS_CATALOGO: 'false',
  TENANT_SCHEMAS_CATALOGO_ESCRITURA: 'false', TENANT_SCHEMAS_CATEGORIAS: 'false', TENANT_SCHEMAS_INVENTARIO: 'false',
});
const mode = process.argv[2];
if (mode?.startsWith('esquemas-')) Object.assign(process.env, {
  PORT: '3303', API_URL: 'http://127.0.0.1:3303', TENANT_SCHEMAS_PERFILES: 'true', TENANT_SCHEMAS_ALTA: 'true',
  TENANT_SCHEMAS_CATALOGO: 'true', TENANT_SCHEMAS_CATALOGO_ESCRITURA: 'true', TENANT_SCHEMAS_INVENTARIO: 'true', TENANT_SCHEMAS_CATEGORIAS: 'true',
});
if (mode === 'server' || mode === 'esquemas-server') {
  require('../dist/src/main.js');
} else {
  let script = `scripts/${mode}.ts`;
  if (mode?.startsWith('esquemas-')) {
    const original = mode.slice('esquemas-'.length);
    script = `scripts/.auditoria-${original}.ts`;
    fs.writeFileSync(script, fs.readFileSync(`scripts/${original}.ts`, 'utf8')
      .replaceAll('55443', '55442').replaceAll('ensayar_copia', 'ensayar_iconix_audit_20261111')
      .replaceAll('clave-sintetica-prueba-local-no-utilizar', process.env.JWT_SECRET).replaceAll('3301', '3303'));
  }
  const args = mode === 'migrate' ? [require.resolve('prisma/build/index.js'), 'migrate', 'deploy']
    : [require.resolve('ts-node/dist/bin.js'), script];
  const r = cp.spawnSync(process.execPath, args, { cwd: root, env: process.env, encoding: 'utf8', timeout: 180000 });
  const output = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(path.join(out, `${mode}.log`), output);
  if (script.startsWith('scripts/.auditoria-')) fs.unlinkSync(script);
  console.log(output);
  if (r.error) console.error(r.error.message);
  process.exitCode = r.status ?? 1;
}
