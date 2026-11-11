/** Comprueba el proveedor real usando una tienda sintética existente; no imprime claves ni datos de clientes. */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw Error('SOLO_LABORATORIO_LOCAL');
const db = new PrismaClient();
async function post(route, body, headers) {
  const r = await fetch(`http://127.0.0.1:3000${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000) });
  const data = await r.json();
  if (!r.ok) throw Error(`${route}: HTTP ${r.status} ${data.codigo || ''}`);
  return { http: r.status, data };
}
(async () => {
  const candidatas = await db.$queryRawUnsafe(`SELECT t.id, t.slug, u.id AS sub, u.cuenta_id AS "cuentaId", u.rol
    FROM tiendas t JOIN usuarios u ON u.tienda_id=t.id
    WHERE t.es_prueba=true AND u.rol='ADMIN' AND u.activo=true
    AND EXISTS (SELECT 1 FROM suscripciones s WHERE s.tienda_id=t.id AND s.estado='activa' AND s.vence_en>now())`);
  let tienda;
  for (const t of candidatas) {
    if (!/^[a-f0-9-]{36}$/i.test(t.id)) continue;
    const schema = `tienda_${t.id.replaceAll('-', '')}`;
    const existe = await db.$queryRawUnsafe('SELECT to_regclass($1)::text AS tabla', `${schema}.usuarios`);
    if (!existe[0].tabla) continue;
    const perfil = await db.$queryRawUnsafe(`SELECT id FROM "${schema}".usuarios WHERE id=$1 AND activo=true`, t.sub);
    if (perfil.length) { tienda = t; break; }
  }
  if (!tienda) throw Error('No se encontro una tienda sintetica con perfil valido para esta prueba');
  const token = jwt.sign({ tipo: 'tienda', tiendaId: tienda.id, sub: tienda.sub, cuentaId: tienda.cuentaId, rol: tienda.rol }, process.env.JWT_SECRET, { expiresIn: '5m' });
  const bot = await post('/ia/bot', { mensaje: 'Hola, ¿en qué podés ayudarme a elegir prendas?' }, { 'X-Tienda': tienda.slug });
  assert.equal(bot.data.fuente, 'modelo', 'El chatbot utilizó reglas en vez de Gemini');
  assert(bot.data.respuesta?.length > 0);
  const reporte = await post('/reportes/inteligente', { pregunta: 'Los 5 productos más vendidos este mes, agrupados por producto y ordenados por cantidad de mayor a menor' }, { Authorization: `Bearer ${token}` });
  assert.equal(reporte.data.motor, 'modelo', `El reporte utilizó reglas en vez de Gemini: ${(reporte.data.avisos || []).join('; ')}`);
  assert(Array.isArray(reporte.data.filas));
  console.log(JSON.stringify({ chatbot: { http: bot.http, fuente: bot.data.fuente, respuestaRecibida: true }, reporte: { http: reporte.http, motor: reporte.data.motor, filas: reporte.data.filas.length }, proveedor: 'Gemini', modelo: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite' }));
})().catch(e => { console.error(e.meta?.message || e.message || e.code); process.exitCode = 1; }).finally(() => db.$disconnect());
