import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const secret = process.env.JWT_SECRET || 'clave-sintetica-prueba-local-no-utilizar';
const baseUrl = 'http://127.0.0.1:3301';

async function main() {
  console.log('--- INICIO PRUEBA E2E OPERACIONES Y SYNC POR ESQUEMA ---');
  const esquemas = new PrismaEsquemasService(new ConfigService());
  const global = esquemas.clientePlataforma();

  // 1. Usar tienda sintética creada en verificar-alta
  const tienda = await global.tienda.findFirstOrThrow({
    where: { slug: { startsWith: 'lab-' }, nombre: 'Tienda sintética laboratorio' },
    orderBy: { creadaEn: 'desc' },
  });
  const tiendaId = tienda.id;
  const local = esquemas.clienteTienda(tiendaId);
  const admin = await local.usuario.findFirstOrThrow({ where: { rol: 'ADMIN', activo: true } });
  const almacen = await local.almacen.findFirstOrThrow();
  const token = jwt.sign(
    { tipo: 'tienda', sub: admin.id, tiendaId, cuentaId: admin.cuentaId, rol: admin.rol, email: admin.email },
    secret,
    { expiresIn: '15m' },
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let turno = await local.cajaTurno.findFirst({
    where: { sucursalId: almacen.sucursalId, cerradoEn: null },
  });
  if (!turno) {
    turno = await local.cajaTurno.create({
      data: {
        tiendaId,
        sucursalId: almacen.sucursalId,
        cajeroId: admin.id,
        fondoInicial: 500,
      },
    });
  }

  // 2. Probar Sincronización Offline (/sync/lote)
  console.log('1. Probando sincronización offline (/sync/lote)...');
  const productoIdOffline = randomUUID();
  const varianteIdOffline = randomUUID();
  const skuOffline = `SYNC-${randomUUID().slice(0, 8)}`;
  const clienteIdOffline = randomUUID();
  const opClienteId = randomUUID();
  const opProductoId = randomUUID();
  const opVentaId = randomUUID();

  const loteDto = {
    dispositivoId: 'pos-offline-term-01',
    nombreDispositivo: 'Terminal Mostrador 1',
    operaciones: [
      {
        id: opClienteId,
        tipo: 'cliente',
        creadaEn: new Date(Date.now() - 60000).toISOString(),
        datos: {
          id: clienteIdOffline,
          nombre: 'Comprador Offline',
          email: `offline-${randomUUID()}@example.invalid`,
        },
      },
      {
        id: opProductoId,
        tipo: 'producto',
        creadaEn: new Date(Date.now() - 50000).toISOString(),
        datos: {
          id: productoIdOffline,
          nombre: 'Pantalón Cargo Offline',
          categoria: 'pantalones',
          ocasion: 'casual',
          precioBase: 120,
          almacenId: almacen.id,
          variantes: [
            { id: varianteIdOffline, talla: 'L', color: 'Verde Militar', sku: skuOffline, stock: 5 },
          ],
        },
      },
      {
        id: opVentaId,
        tipo: 'venta',
        creadaEn: new Date(Date.now() - 40000).toISOString(),
        datos: {
          almacenId: almacen.id,
          cajaTurnoId: turno.id,
          clientaId: clienteIdOffline,
          medioPago: 'efectivo',
          canal: 'pos',
          lineas: [
            { varianteId: varianteIdOffline, cantidad: 2 },
          ],
        },
      },
    ],
  };

  const resSync = await fetch(`${baseUrl}/sync/lote`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(loteDto),
  });
  const syncResult = await resSync.json() as any;
  console.log('syncResult:', JSON.stringify(syncResult, null, 2));
  assert.equal(resSync.status, 200, `Error en sync lote: ${JSON.stringify(syncResult)}`);
  assert.equal(syncResult.procesadas, 3);
  assert.equal(syncResult.resumen.aplicada, 3);

  // Verificar que quedaron en el esquema local y NO en public
  const clienteEnEsquema = await local.usuario.findUnique({ where: { id: clienteIdOffline } });
  assert.ok(clienteEnEsquema, 'El cliente offline debe existir en el esquema de la tienda');

  const prodEnEsquema = await local.producto.findUnique({ where: { id: productoIdOffline } });
  assert.ok(prodEnEsquema, 'El producto offline debe existir en el esquema de la tienda');

  const stockEnEsquema = await local.stockAlmacen.findUnique({
    where: { varianteId_almacenId: { varianteId: varianteIdOffline, almacenId: almacen.id } },
  });
  // Tenía 5 iniciales - 2 vendidos = 3
  assert.equal(stockEnEsquema?.cantidad, 3, 'El stock remanente en el esquema debe ser 3');

  const ventaEnEsquema = await local.venta.findFirst({ where: { lineas: { some: { varianteId: varianteIdOffline } } } });
  assert.ok(ventaEnEsquema, 'La venta offline debe existir en el esquema de la tienda');

  // Verificar que NO se escribió en public
  const [prodPublico] = await global.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM public.productos WHERE id = ${productoIdOffline}`;
  assert.equal(Number(prodPublico.count), 0, 'El producto NO debe existir en public.productos');
  const [ventaPublica] = await global.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM public.ventas WHERE id = ${ventaEnEsquema.id}`;
  assert.equal(Number(ventaPublica.count), 0, 'La venta NO debe existir en public.ventas');

  console.log('-> Sincronización offline verificada: cliente, producto, venta y stock en esquema local; 0 en tablas públicas.');

  // Reintento del lote offline (idempotencia sync)
  const resSyncRepetido = await fetch(`${baseUrl}/sync/lote`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(loteDto),
  });
  assert.equal(resSyncRepetido.status, 200);
  const syncRepetidoResult = await resSyncRepetido.json() as any;
  assert.equal(syncRepetidoResult.resumen.repetida, 3, 'El lote repetido debe marcar 3 operaciones repetidas');
  console.log('-> Idempotencia de lote offline verificada.');

  // 3. Probar concurrencia de stock en ventas directas
  console.log('2. Probando ventas concurrentes por el remanente de stock (3 unidades)...');
  // Intentamos 2 compras concurrentes de 2 unidades cada una (total 4 requeridas, pero solo hay 3)
  const intentoVenta = (idempotencyKey: string) => fetch(`${baseUrl}/ventas`, {
    method: 'POST',
    headers: { ...authHeaders, 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      uuid: idempotencyKey,
      almacenId: almacen.id,
      cajaTurnoId: turno.id,
      clientaId: clienteIdOffline,
      medioPago: 'efectivo',
      canal: 'pos',
      lineas: [{ varianteId: varianteIdOffline, cantidad: 2 }],
    }),
  });

  const [resVenta1, resVenta2] = await Promise.all([
    intentoVenta(randomUUID()),
    intentoVenta(randomUUID()),
  ]);

  const b1 = await resVenta1.json().catch(() => null);
  const b2 = await resVenta2.json().catch(() => null);
  console.log('Venta 1 status:', resVenta1.status, b1);
  console.log('Venta 2 status:', resVenta2.status, b2);

  const statuses = [resVenta1.status, resVenta2.status].sort();
  // Uno debe ser 201 y el otro 409 (StockInsuficiente - Conflict)
  assert.deepEqual(statuses, [201, 409], 'Una venta debe tener éxito y la otra fallar por stock insuficiente');

  const stockFinal = await local.stockAlmacen.findUnique({
    where: { varianteId_almacenId: { varianteId: varianteIdOffline, almacenId: almacen.id } },
  });
  assert.equal(stockFinal?.cantidad, 1, 'Stock final debe ser exactamente 1 (3 - 2 = 1)');
  console.log('-> Concurrencia de stock verificada: 1 venta aprobada, 1 rechazada por stock insuficiente; remanente 1.');

  // 4. Probar Reportes sobre esquema
  console.log('3. Probando reportes sobre esquema...');
  const resReporte = await fetch(`${baseUrl}/reportes/panel`, {
    headers: authHeaders,
  });
  const datosReporte = await resReporte.json() as any;
  assert.equal(resReporte.status, 200, `Error en reporte: ${JSON.stringify(datosReporte)}`);
  assert.ok(Array.isArray(datosReporte) || typeof datosReporte === 'object');
  console.log('-> Reportes sobre esquema verificados exitosamente.');

  console.log('--- TODAS LAS PRUEBAS E2E DE OPERACIONES POR ESQUEMA PASARON SATISFACTORIAMENTE ---');
  await esquemas.onModuleDestroy();
}

main().catch((err) => {
  console.error('FALLÓ PRUEBA E2E:', err);
  process.exit(1);
});
