import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
const url = new URL(process.env.DATABASE_URL ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55442' || url.pathname !== '/ensayar_iconix_audit_20261111') throw Error('SOLO_COPIA_AUDITORIA');
const db = new PrismaClient();
const esquemas = new PrismaEsquemasService(new ConfigService());
const base = 'http://127.0.0.1:3302';
async function api(method: string, route: string, token?: string, body?: unknown, server = base) {
  const r = await fetch(server + route, { method, headers: { 'Content-Type': 'application/json', 'X-Tienda': 'vesta', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json() as any };
}
async function main() {
  const adminLogin = await api('POST', '/auth/login', undefined, { email: 'admin@ensayar.bo', password: 'diego' });
  assert.equal(adminLogin.status, 201);
  const admin = adminLogin.body.accessToken;
  const cajeroLogin = await api('POST', '/auth/login', undefined, { email: 'cajero@ensayar.bo', password: 'diego' });
  assert.equal(cajeroLogin.status, 201);
  const cajero = cajeroLogin.body.accessToken;
  for (const dias of [0, 31]) assert.equal((await api('PATCH', '/sync/politica', admin, { ventanaOfflineDias: dias })).status, 400);
  assert.equal((await api('PATCH', '/sync/politica', cajero, { ventanaOfflineDias: 7 })).status, 403);
  console.log('UC46: ventana fuera de 1–30 rechazada con 400; cajero no puede modificarla (403).');
  const tiendaId = adminLogin.body.tienda.id;
  const turno = await db.cajaTurno.findFirstOrThrow({ where: { tiendaId, cajeroId: adminLogin.body.user.id, cerradoEn: null }, include: { sucursal: { include: { almacenes: true } } } });
  const almacenId = turno.sucursal.almacenes[0].id;
  const stock = await db.stockAlmacen.findFirstOrThrow({ where: { tiendaId, almacenId, cantidad: { gte: 3 } } });
  const datos = { uuid: randomUUID(), canal: 'pos', medioPago: 'efectivo', almacenId, cajaTurnoId: turno.id, lineas: [{ varianteId: stock.varianteId, cantidad: 999999 }] };
  const operationId = randomUUID();
  const sync = await api('POST', '/sync/lote', admin, { dispositivoId: 'auditoria-iconix-complementos', operaciones: [{ id: operationId, tipo: 'venta', creadaEn: new Date().toISOString(), datos }] });
  assert.equal(sync.status, 200); assert.equal(sync.body.resultados[0].estado, 'conflicto');
  const conflicto = await db.operacionSync.findUniqueOrThrow({ where: { tiendaId_operationId: { tiendaId, operationId } } });
  const descartarCajero = await api('POST', `/sync/operaciones/${conflicto.id}/descartar`, cajero);
  assert.equal(descartarCajero.status, 403);
  const listarCajero = await api('GET', '/sync/operaciones?estado=conflicto', cajero);
  assert.equal(listarCajero.status, 403);
  const descartarAdmin = await api('POST', `/sync/operaciones/${conflicto.id}/descartar`, admin);
  assert.equal(descartarAdmin.status, 200); assert.equal(descartarAdmin.body.estado, 'descartada');
  console.log('UC45: conflicto real generado; ADMIN lo descarta (200), CAJERO no puede listarlo ni descartarlo (403). Diferencia respecto al actor documentado.');
  const push = await api('GET', '/push/clave');
  assert.equal(push.status, 200); assert.equal(push.body.activo, false);
  const pruebaPush = await api('POST', '/push/probar', admin);
  assert.equal(pruebaPush.status, 200); assert.equal(pruebaPush.body.enviadas, 0);
  console.log('UC47: entorno de auditoría sin VAPID; activo=false y prueba entrega 0. No valida recepción de notificaciones.');
  const analiticaCompartida = await api('GET', '/analitica/panel', admin);
  assert.equal(analiticaCompartida.status, 503); assert.equal(analiticaCompartida.body.codigo, 'ANALITICA_REQUIERE_ESQUEMAS');
  console.log('UC52/53: modo compartido responde 503 ANALITICA_REQUIERE_ESQUEMAS.');
  const tiendaML = await db.tienda.findFirstOrThrow({ where: { slug: { startsWith: 'lab-ml-' } }, orderBy: { creadaEn: 'desc' } });
  const local = esquemas.clienteTienda(tiendaML.id);
  const perfil = await local.usuario.findFirstOrThrow({ where: { rol: 'ADMIN', activo: true } });
  const token = jwt.sign({ tipo: 'tienda', tiendaId: tiendaML.id, sub: perfil.id, cuentaId: perfil.cuentaId, rol: perfil.rol, email: perfil.email }, process.env.JWT_SECRET!, { expiresIn: '5m' });
  const bloqueado = await api('POST', '/sync/lote', token, { dispositivoId: 'auditoria-esquemas', operaciones: [{ id: randomUUID(), tipo: 'cliente', creadaEn: new Date().toISOString(), datos: { id: randomUUID(), nombre: 'Prueba sintética', email: `${randomUUID()}@example.invalid` } }] }, 'http://127.0.0.1:3303');
  assert.equal(bloqueado.status, 503); assert.equal(bloqueado.body.codigo, 'SYNC_ESQUEMAS_NO_DISPONIBLE');
  console.log('UC44: modo esquemas responde 503 SYNC_ESQUEMAS_NO_DISPONIBLE.');
  const metodos = await api('GET', '/pagos/metodos', admin);
  assert.equal(metodos.status, 200); assert.ok(metodos.body.metodos.length > 0 && metodos.body.metodos.every((m: any) => m.simulado));
  for (const resultado of ['aprobado', 'rechazado']) {
    const antes = await db.stockAlmacen.findUniqueOrThrow({ where: { varianteId_almacenId: { varianteId: stock.varianteId, almacenId } } });
    const venta = await api('POST', '/ventas', admin, { ...datos, uuid: randomUUID(), medioPago: 'qr', metodoPasarela: 'qr_bolivia', lineas: [{ varianteId: stock.varianteId, cantidad: 1 }] });
    assert.equal(venta.status, 201);
    const pago = await db.pagoSimulado.findUniqueOrThrow({ where: { ventaId: venta.body.id } });
    const simular = await api('POST', `/pagos/${pago.id}/simular`, admin, { resultado });
    assert.equal(simular.status, 201); assert.equal(simular.body.estado, resultado);
    const despues = await db.stockAlmacen.findUniqueOrThrow({ where: { varianteId_almacenId: { varianteId: stock.varianteId, almacenId } } });
    assert.equal(despues.cantidad, antes.cantidad - (resultado === 'aprobado' ? 1 : 0));
    assert.equal(despues.reservado, antes.reservado);
    console.log(`UC54 simulación QR ${resultado}: estado y stock correctos; reserva liberada.`);
  }
  for (const ruta of ['/analitica/prediccion', '/analitica/segmentos']) assert.equal((await api('GET', ruta, admin)).status, 404);
  assert.equal((await api('POST', '/pagos/pasarela', admin, {})).status, 404);
  console.log('Rutas antiguas documentadas de UC52, UC53 y UC54 responden 404; analítica actual usa /analitica/panel y pagos /ventas + /pagos/:id/simular.');
  for (const endpoint of ['http://127.0.0.1:3000/push/clave']) {
    try { const r = await fetch(endpoint); const p = await r.json() as any; console.log(`Servicio local existente: push HTTP ${r.status}, activo=${Boolean(p.activo)} (consulta de solo lectura).`); } catch { console.log('Servicio local existente: push no consultable.'); }
  }
}
main().catch(e => { console.error('FALLÓ:', e.message); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); await esquemas.onModuleDestroy(); });
