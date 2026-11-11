/** Alta con pago simulado contra una API y base de laboratorio locales. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const secret = process.env.JWT_SECRET;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia' || secret !== 'clave-sintetica-prueba-local-no-utilizar') throw new Error('SOLO_LABORATORIO');
const clientes = new PrismaEsquemasService(new ConfigService());
const global = clientes.clientePlataforma();

async function main() {
  const cuenta = await global.cuenta.findFirstOrThrow({ where: { emailVerificado: true } });
  const plan = await global.plan.findFirstOrThrow({ where: { activo: true } });
  const token = jwt.sign({ tipo: 'cuenta', sub: cuenta.id, email: cuenta.email, plataforma: cuenta.esPlataforma }, secret as string, { expiresIn: '5m' });
  const idempotencyKey = randomUUID();
  const body = { planId: plan.id, periodo: 'MENSUAL', idempotencyKey, metodoPago: 'tarjeta',
    tienda: { nombre: 'Tienda sintética laboratorio', slug: `lab-${idempotencyKey.replace(/-/g, '').slice(0, 20)}`, pais: 'BO', moneda: 'BOB' },
    pago: { titular: 'Prueba', numero: '4242424242424242', vence: '12/30', cvc: '123' } };
  const suscribir = () => fetch('http://127.0.0.1:3301/plataforma/suscribir', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const alta = await suscribir();
  if (alta.status !== 201) throw new Error(`ALTA_HTTP_${alta.status}: ${await alta.text()}`);
  const sesion = await alta.json() as { accessToken: string; tienda: { id: string }; tiendas: { tiendaId: string }[] };
  assert.ok(sesion.accessToken && sesion.tienda.id);
  assert.ok(sesion.tiendas.some(t => t.tiendaId === sesion.tienda.id));
  const tiendaId = sesion.tienda.id;
  await global.tienda.update({ where: { id: tiendaId }, data: { esPrueba: true } });
  const local = clientes.clienteTienda(tiendaId);
  assert.deepEqual(await Promise.all([local.usuario.count(), local.sucursal.count(), local.almacen.count(), local.categoria.count()]), [1, 1, 1, 6]);
  assert.equal(await global.pagoSuscripcion.count({ where: { idempotencyKey } }), 1);
  const detalle = await fetch(`http://127.0.0.1:3301/plataforma/tiendas/${tiendaId}`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(detalle.status, 200);
  const info = await detalle.json() as { uso: { usuarios: number; sucursales: number; productos: number } };
  assert.deepEqual(info.uso, { usuarios: 1, sucursales: 1, productos: 0 });
  const cuentaActual = await fetch('http://127.0.0.1:3301/plataforma/cuenta', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(cuentaActual.status, 200);
  const listado = await cuentaActual.json() as { tiendas: { tiendaId: string }[] };
  assert.ok(listado.tiendas.some(t => t.tiendaId === tiendaId), 'La cuenta debe descubrir la tienda nueva después del alta');
  const me = await fetch('http://127.0.0.1:3301/auth/me', { headers: { Authorization: `Bearer ${sesion.accessToken}` } });
  assert.equal(me.status, 200);
  const repetida = await suscribir();
  assert.equal(repetida.status, 201);
  const reintento = await repetida.json() as { repetido: boolean; tienda: { id: string } };
  assert.equal(reintento.repetido, true);
  assert.equal(reintento.tienda.id, tiendaId);
  assert.equal(await global.pagoSuscripcion.count({ where: { idempotencyKey } }), 1);
  const idempotencia2 = randomUUID();
  const tienda2 = { ...body, idempotencyKey: idempotencia2, tienda: { ...body.tienda, slug: `lab-${idempotencia2.replace(/-/g, '').slice(0, 20)}` } };
  const segunda = await fetch('http://127.0.0.1:3301/plataforma/suscribir', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(tienda2) });
  if (segunda.status !== 201) throw new Error(`SEGUNDA_TIENDA_HTTP_${segunda.status}: ${await segunda.text()}`);
  const otra = await segunda.json() as { tienda: { id: string; slug: string } };
  await global.tienda.update({ where: { id: otra.tienda.id }, data: { esPrueba: true } });
  const cuentaConDos = await fetch('http://127.0.0.1:3301/plataforma/cuenta', { headers: { Authorization: `Bearer ${token}` } });
  const ambas = await cuentaConDos.json() as { tiendas: { tiendaId: string }[] };
  assert.ok(ambas.tiendas.some(t => t.tiendaId === tiendaId) && ambas.tiendas.some(t => t.tiendaId === otra.tienda.id));
  const cambiar = await fetch('http://127.0.0.1:3301/plataforma/entrar', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tiendaId: otra.tienda.id }) });
  assert.equal(cambiar.status, 201);
  assert.equal((await cambiar.json() as { tienda: { id: string } }).tienda.id, otra.tienda.id);
  const clienteEmail = `laboratorio-${randomUUID()}@example.invalid`;
  const registro = await fetch('http://127.0.0.1:3301/auth/registro', { method: 'POST', headers: { 'X-Tienda': body.tienda.slug, 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: 'Clienta sintética', email: clienteEmail, password: 'SoloPrueba123' }) });
  if (registro.status !== 201) throw new Error(`REGISTRO_CLIENTA_HTTP_${registro.status}: ${await registro.text()}`);
  const login = await fetch('http://127.0.0.1:3301/auth/login', { method: 'POST', headers: { 'X-Tienda': body.tienda.slug, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: clienteEmail, password: 'SoloPrueba123' }) });
  assert.equal(login.status, 201);
  const clienteSesion = await login.json() as { accessToken: string };
  const ajena = await fetch('http://127.0.0.1:3301/plataforma/entrar', { method: 'POST', headers: { Authorization: `Bearer ${clienteSesion.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tiendaId: otra.tienda.id }) });
  assert.equal(ajena.status, 403);
  console.log('Alta HTTP: dos tiendas, membresías, cambio autorizado, cliente sin acceso a tienda ajena y reintento verificados.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => clientes.onModuleDestroy());
