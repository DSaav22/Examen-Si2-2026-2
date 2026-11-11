import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
const url = new URL(process.env.DATABASE_URL ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55442' || url.pathname !== '/ensayar_iconix_audit_20261111') throw Error('SOLO_COPIA_AUDITORIA');
const base = 'http://127.0.0.1:3303';
async function api(method: string, route: string, token?: string, body?: unknown) {
  const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() as any };
}
async function main() {
  const email = `iconix-${randomUUID()}@example.invalid`;
  const reg = await api('POST', '/plataforma/registro', undefined, { email, nombre: 'Suscriptora sintética auditoría', password: 'SoloPrueba123' });
  assert.equal(reg.status, 201, 'Registro en modo esquemas');
  const tokenVerificacion = new URL(reg.body.verificacion.url).searchParams.get('token');
  assert.equal((await api('POST', '/plataforma/verificar', undefined, { token: 'token-inexistente' })).status, 404);
  assert.equal((await api('POST', '/plataforma/login', undefined, { email, password: 'SoloPrueba123' })).status, 403);
  const ver = await api('POST', '/plataforma/verificar', undefined, { token: tokenVerificacion });
  assert.equal(ver.status, 201, 'Verificación de cuenta nueva en modo esquemas');
  assert.equal((await api('POST', '/plataforma/registro', undefined, { email, nombre: 'Duplicada', password: 'SoloPrueba123' })).status, 409);
  console.log('UC36/37: registro y enlace demo; sin verificar 403, token inexistente 404 y correo verificado duplicado 409.');
  const planes = await api('GET', '/plataforma/planes');
  const plan = planes.body.find((p: any) => p.codigo === 'INICIAL');
  const body = { planId: plan.id, periodo: 'MENSUAL', idempotencyKey: randomUUID(), metodoPago: 'tarjeta',
    tienda: { nombre: 'Alta limpia ICONIX', slug: `iconix-${randomUUID().replaceAll('-', '').slice(0, 20)}`, pais: 'BO', moneda: 'BOB' },
    pago: { titular: 'Prueba', numero: '4242424242424242', vence: '12/30', cvc: '123' } };
  const alta = await api('POST', '/plataforma/suscribir', ver.body.accessToken, body);
  assert.equal(alta.status, 201, `Alta limpia: ${alta.status} ${JSON.stringify(alta.body)}`);
  const rep = await api('POST', '/plataforma/suscribir', ver.body.accessToken, body);
  assert.equal(rep.status, 201); assert.equal(rep.body.tienda.id, alta.body.tienda.id);
  const me = await api('GET', '/auth/me', alta.body.accessToken);
  assert.equal(me.status, 200);
  const cuenta = await api('GET', '/plataforma/cuenta', ver.body.accessToken);
  assert.equal(cuenta.status, 200); assert.equal(cuenta.body.tiendas.length, 1);
  console.log('UC38 en esquemas: cuenta nueva sin tiendas heredadas crea tienda, entra a /auth/me y reintenta sin duplicarla.');
}
main().catch(e => { console.error('FALLÓ:', e.message); process.exitCode = 1; });
