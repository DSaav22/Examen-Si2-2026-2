/** Crea únicamente datos sintéticos en ensayar_copia y prueba el endpoint aislado. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { AprovisionadorEsquemaService } from '../src/tenancy/aprovisionador-esquema.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const secret = process.env.JWT_SECRET;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia' || secret !== 'clave-sintetica-prueba-local-no-utilizar') throw new Error('SOLO_LABORATORIO');
const clientes = new PrismaEsquemasService(new ConfigService());
const global = clientes.clientePlataforma();
const provisionador = new AprovisionadorEsquemaService();

async function crearTienda(planId: string) {
  const cuenta = await global.cuenta.findFirstOrThrow({ where: { emailVerificado: true } });
  const id = randomUUID();
  await global.$transaction(async tx => {
    await tx.tienda.create({ data: { id, esPrueba: true, slug: `lab-ml-${id.replace(/-/g, '').slice(0, 20)}`, nombre: 'Analítica sintética', duenoCuentaId: cuenta.id } });
    await tx.suscripcion.create({ data: { tiendaId: id, planId, periodo: 'MENSUAL', monto: 0, venceEn: new Date(Date.now() + 30 * 86400_000) } });
    await provisionador.crear(tx, id, cuenta, 'Analítica sintética');
  }, { timeout: 60000 });
  const local = clientes.clienteTienda(id);
  const admin = await local.usuario.findFirstOrThrow({ where: { rol: 'ADMIN' } });
  const token = jwt.sign({ tipo: 'tienda', tiendaId: id, sub: admin.id, cuentaId: admin.cuentaId, rol: admin.rol, email: admin.email }, secret as string, { expiresIn: '5m' });
  return { id, local, token };
}

async function main() {
  const cadena = await global.plan.findFirstOrThrow({ where: { codigo: 'CADENA' } });
  const inicial = await global.plan.findFirstOrThrow({ where: { codigo: 'INICIAL' } });
  const a = await crearTienda(cadena.id), b = await crearTienda(cadena.id), sinPlan = await crearTienda(inicial.id);
  const producto = await a.local.producto.create({ data: { tiendaId: a.id, nombre: 'Prenda sintética ML', categoria: 'ensayo', ocasion: 'casual', precioBase: 50 } });
  const variante = await a.local.variante.create({ data: { tiendaId: a.id, productoId: producto.id, talla: 'M', color: 'Azul', sku: `ML-${randomUUID()}` } });
  const almacen = await a.local.almacen.findFirstOrThrow();
  await a.local.stockAlmacen.create({ data: { tiendaId: a.id, varianteId: variante.id, almacenId: almacen.id, cantidad: 12, reservado: 2 } });
  const cuentaCliente = await global.cuenta.create({ data: { email: `analitica-${randomUUID()}@example.invalid`, nombre: 'Clienta sintética', passwordHash: 'no-login-laboratorio', emailVerificado: true } });
  const cliente = await a.local.usuario.create({ data: { tiendaId: a.id, cuentaId: cuentaCliente.id, email: cuentaCliente.email, nombre: cuentaCliente.nombre, rol: 'CLIENTA' } });
  for (const dias of [1, 3, 10]) await a.local.venta.create({ data: {
    tiendaId: a.id, uuid: randomUUID(), canal: 'pos', estado: 'cobrada', medioPago: 'efectivo', total: 100,
    creadaEn: new Date(Date.now() - dias * 86400_000), almacenId: almacen.id, clientaId: cliente.id,
    lineas: { create: [{ tiendaId: a.id, varianteId: variante.id, cantidad: 2, precioUnitario: 50 }] },
  } });
  const puerto = process.env.PORT || '3000';
  const pedir = (token: string, extra: Record<string, string> = {}) => fetch(`http://127.0.0.1:${puerto}/analitica/panel`, { headers: { Authorization: `Bearer ${token}`, ...extra } });
  const ra = await pedir(a.token);
  if (ra.status !== 200) throw new Error(`ANALITICA_A_HTTP_${ra.status}: ${await ra.text()}`);
  const pa = await ra.json() as { tienda: { id: string }; datos: { ventasCobradas: number; clientesConCompras: number }; demanda: { predicciones: { varianteId: string; ventas7: number; ventas28: number; disponible: number }[] }; segmentos: { grupos: { cantidad: number }[] } };
  assert.equal(pa.tienda.id, a.id); assert.equal(pa.datos.ventasCobradas, 3); assert.equal(pa.datos.clientesConCompras, 1);
  assert.deepEqual(pa.demanda.predicciones.map(p => [p.varianteId, p.ventas7, p.ventas28, p.disponible]), [[variante.id, 4, 6, 10]]);
  assert.equal(pa.segmentos.grupos.reduce((s, g) => s + g.cantidad, 0), 1);
  const rb = await pedir(b.token, { 'X-Tienda': `lab-ml-${a.id.replace(/-/g, '').slice(0, 20)}` });
  assert.equal(rb.status, 200);
  const pb = await rb.json() as { tienda: { id: string }; demanda: { predicciones: unknown[] } };
  assert.equal(pb.tienda.id, b.id); assert.equal(pb.demanda.predicciones.length, 0);
  assert.equal((await pedir(sinPlan.token)).status, 403);
  const tokenCliente = jwt.sign({ tipo: 'tienda', tiendaId: a.id, sub: cliente.id, cuentaId: cliente.cuentaId, rol: cliente.rol, email: cliente.email }, secret as string, { expiresIn: '5m' });
  assert.equal((await pedir(tokenCliente)).status, 403);
  assert.equal((await fetch(`http://127.0.0.1:${puerto}/analitica/panel`)).status, 401);
  console.log('Analítica HTTP: demanda, segmentos, datos sintéticos, aislamiento de tiendas, plan y roles verificados.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => clientes.onModuleDestroy());
