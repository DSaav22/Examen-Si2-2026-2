/** Escribe únicamente datos sintéticos en la tienda de laboratorio creada por verificar-alta-esquema-http. */
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
  const tienda = await global.tienda.findFirstOrThrow({ where: { slug: { startsWith: 'lab-' }, nombre: 'Tienda sintética laboratorio' }, orderBy: { creadaEn: 'desc' } });
  const local = clientes.clienteTienda(tienda.id);
  const admin = await local.usuario.findFirstOrThrow({ where: { rol: 'ADMIN', activo: true } });
  const almacen = await local.almacen.findFirstOrThrow();
  const token = jwt.sign({ tipo: 'tienda', sub: admin.id, tiendaId: tienda.id, cuentaId: admin.cuentaId, rol: admin.rol, email: admin.email }, secret as string, { expiresIn: '5m' });
  const base = 'http://127.0.0.1:3301';
  const request = (ruta: string, metodo: string, data?: object, clave?: string) => fetch(base + ruta, {
    method: metodo, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(clave ? { 'Idempotency-Key': clave } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const clave = randomUUID();
  const productoDto = { nombre: 'Prenda sintética catálogo', categoria: 'prueba', ocasion: 'casual', precioBase: 25 };
  const alta = await request('/catalogo/productos', 'POST', productoDto, clave);
  if (alta.status !== 201) throw new Error(`CREAR_PRODUCTO_HTTP_${alta.status}: ${await alta.text()}`);
  const producto = await alta.json() as { id: string; tiendaId: string };
  assert.equal(producto.tiendaId, tienda.id);
  const repetir = await request('/catalogo/productos', 'POST', productoDto, clave);
  assert.equal(repetir.status, 201);
  assert.equal(repetir.headers.get('Idempotent-Replayed'), 'true');
  assert.equal((await repetir.json() as { id: string }).id, producto.id);
  assert.equal((await request('/catalogo/productos', 'POST', { ...productoDto, precioBase: 99 }, clave)).status, 422);
  assert.equal(await local.producto.count({ where: { id: producto.id } }), 1);
  const editado = await request(`/catalogo/productos/${producto.id}`, 'PATCH', { nombre: 'Prenda sintética editada' });
  assert.equal(editado.status, 200);
  const nueva = await request(`/catalogo/productos/${producto.id}/variantes`, 'POST', { talla: 'M', color: 'Azul', sku: `LAB-${randomUUID()}` });
  if (nueva.status !== 201) throw new Error(`CREAR_VARIANTE_HTTP_${nueva.status}: ${await nueva.text()}`);
  const variante = await nueva.json() as { id: string };
  const stock = await request('/catalogo/stock', 'PUT', { varianteId: variante.id, almacenId: almacen.id, cantidad: 7 });
  if (stock.status !== 200) throw new Error(`STOCK_HTTP_${stock.status}: ${await stock.text()}`);
  assert.equal((await local.stockAlmacen.findFirstOrThrow({ where: { varianteId: variante.id, almacenId: almacen.id } })).cantidad, 7);
  const claveAjuste = randomUUID();
  const ajusteDto = { varianteId: variante.id, almacenId: almacen.id, cantidad: 8, nota: 'Prueba sintética' };
  const ajuste = await request('/inventario/ajuste', 'POST', ajusteDto, claveAjuste);
  if (ajuste.status !== 201) throw new Error(`AJUSTE_HTTP_${ajuste.status}: ${await ajuste.text()}`);
  const ajusteRepetido = await request('/inventario/ajuste', 'POST', ajusteDto, claveAjuste);
  assert.equal(ajusteRepetido.status, 201);
  assert.equal(ajusteRepetido.headers.get('Idempotent-Replayed'), 'true');
  const ingreso = await request('/inventario/ingreso', 'POST', { varianteId: variante.id, almacenId: almacen.id, cantidad: 2 });
  if (ingreso.status !== 201) throw new Error(`INGRESO_HTTP_${ingreso.status}: ${await ingreso.text()}`);
  const destino = await local.almacen.create({ data: { tiendaId: tienda.id, sucursalId: almacen.sucursalId, nombre: `Laboratorio ${randomUUID()}` } });
  const transferencia = await request('/inventario/transferencias', 'POST', { varianteId: variante.id, origenId: almacen.id, destinoId: destino.id, cantidad: 3 });
  if (transferencia.status !== 201) throw new Error(`TRANSFERENCIA_HTTP_${transferencia.status}: ${await transferencia.text()}`);
  assert.equal((await local.stockAlmacen.findFirstOrThrow({ where: { varianteId: variante.id, almacenId: almacen.id } })).cantidad, 7);
  assert.equal((await local.stockAlmacen.findFirstOrThrow({ where: { varianteId: variante.id, almacenId: destino.id } })).cantidad, 3);
  assert.equal(await local.movimientoInventario.count({ where: { varianteId: variante.id } }), 4);
  const otra = clientes.clienteTienda('00000000-0000-4000-8000-000000000001');
  assert.equal(await otra.producto.count({ where: { id: producto.id } }), 0);
  const productoAjeno = await otra.producto.findFirstOrThrow();
  const cruzado = await request(`/catalogo/productos/${productoAjeno.id}`, 'PATCH', { nombre: 'No debe cambiar' });
  assert.equal(cruzado.status, 404);
  const varianteAjena = await otra.variante.findFirstOrThrow();
  const stockAjeno = await request('/catalogo/stock', 'PUT', { varianteId: varianteAjena.id, almacenId: almacen.id, cantidad: 7 });
  assert.equal(stockAjeno.status, 404);
  const compartida = await global.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM public.productos WHERE id=${producto.id}`;
  assert.equal(Number(compartida[0].n), 0);
  console.log('Catálogo e inventario HTTP: alta, reintento, ajuste, ingreso, transferencia y aislamiento verificados en el esquema local.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => clientes.onModuleDestroy());
