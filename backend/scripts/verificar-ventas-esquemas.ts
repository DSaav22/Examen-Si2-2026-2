/** Verificación integral de ventas retail, pagos simulados, control de stock y aislamiento en ensayar_copia. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { metodosSimuladosPorPais, validarPagoVenta, validarMetodoPais } from '../src/pagos/metodos-pais';
import { TenantContext } from '../src/tenancy/tenant-context';
import { VentasService } from '../src/ventas/ventas.service';
import { PagosController } from '../src/pagos/pagos.controller';
import { DevolucionesController } from '../src/devoluciones/devoluciones.controller';
import { InventarioService } from '../src/inventario/inventario.service';
import { StockInsuficienteError, UuidConflictError } from '../src/ventas/errores-venta';
import { Canal, Rol } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') {
  throw new Error('La prueba solo puede conectarse al laboratorio aislado ensayar_copia en el puerto 55443.');
}

const config = new ConfigService({
  DATABASE_URL: process.env.DATABASE_URL,
  TENANT_SCHEMAS_PERFILES: 'true',
  TENANT_SCHEMAS_VENTAS: 'true',
  TENANT_SCHEMAS_INVENTARIO: 'true',
  TENANT_SCHEMAS_CATALOGO_ESCRITURA: 'true',
  TENANT_SCHEMAS_CATALOGO: 'true',
});

const servicioEsquemas = new PrismaEsquemasService(config);
const global = servicioEsquemas.clientePlataforma();

const idA = '00000000-0000-4000-8000-000000000001'; // Vesta (BO)
const idB = '33333333-3333-4333-8333-333333333333'; // Tienda sintética B

async function main() {
  console.log('Iniciando verificación de ventas retail e inventario en esquemas sobre ensayar_copia...');

  // 1. Disponibilidad de métodos por país
  const metodosBO = metodosSimuladosPorPais('BO');
  const metodosBR = metodosSimuladosPorPais('BR');
  const metodosAR = metodosSimuladosPorPais('AR');

  assert.ok(metodosBO.some((m) => m.codigo === 'qr_bolivia'));
  assert.ok(metodosBO.some((m) => m.codigo === 'tarjeta'));
  assert.ok(!metodosBO.some((m) => m.codigo === 'pix'), 'BO no debe tener Pix');

  assert.ok(metodosBR.some((m) => m.codigo === 'pix'));
  assert.ok(metodosBR.some((m) => m.codigo === 'paypal'));
  assert.ok(!metodosBR.some((m) => m.codigo === 'qr_bolivia'), 'BR no debe tener QR Bolivia');

  assert.ok(metodosAR.some((m) => m.codigo === 'mercado_pago'));
  assert.ok(metodosAR.some((m) => m.codigo === 'transferencia'));
  assert.ok(!metodosAR.some((m) => m.codigo === 'pix'), 'AR no debe tener Pix');

  assert.throws(() => validarMetodoPais('BO', 'pix'), BadRequestException);
  assert.throws(() => validarPagoVenta('BO', 'qr', 'pix'), BadRequestException);
  assert.equal(validarPagoVenta('BO', 'qr', 'qr_bolivia'), 'qr_bolivia');
  console.log('✓ Disponibilidad y restricción de métodos por país verificada (BO, BR, AR).');

  // 2. Conexión a tienda autorizada A
  const localA = servicioEsquemas.clienteTienda(idA);
  const localB = servicioEsquemas.clienteTienda(idB);

  const tiendaA = await global.tienda.findUniqueOrThrow({ where: { id: idA } });
  const almacenA = await localA.almacen.findFirstOrThrow();
  const sucursalA = await localA.sucursal.findFirstOrThrow();
  const cajeroA = await localA.usuario.findFirstOrThrow({ where: { rol: { in: ['ADMIN', 'CAJERO'] } } });

  // Preparar producto de prueba sintético dentro de tienda A
  const productoId = `prod-test-${randomUUID()}`;
  const varianteId = `var-test-${randomUUID()}`;
  const categoria = await localA.categoria.findFirstOrThrow();

  await localA.producto.create({
    data: {
      id: productoId,
      tiendaId: idA,
      nombre: 'Vestido de Prueba Concurrencia',
      precioBase: 120,
      categoria: 'vestidos',
      ocasion: 'casual',
      descuentoPct: 0,
      minimoMayorista: 0,
      variantes: {
        create: [
          {
            id: varianteId,
            tiendaId: idA,
            talla: 'M',
            color: 'Negro',
            sku: `SKU-${randomUUID().slice(0, 8)}`,
          },
        ],
      },
    },
  });

  // Fijar stock inicial de 1 sola unidad
  await localA.stockAlmacen.create({
    data: {
      tiendaId: idA,
      varianteId,
      almacenId: almacenA.id,
      cantidad: 1,
      reservado: 0,
    },
  });

  console.log('✓ Prenda sintética creada con exactamente 1 unidad disponible.');

  const inventario = new InventarioService(localA as any, servicioEsquemas, config);
  const notificaciones: any = { notificarTrasCobro: async () => undefined };
  const ventasService = new VentasService(localA as any, inventario, notificaciones, servicioEsquemas, config);
  const pagosController = new PagosController(localA as any, inventario, ventasService, notificaciones, servicioEsquemas, config);
  const devolucionesController = new DevolucionesController(localA as any, inventario, servicioEsquemas, config);

  // 3. Concurrencia sobre la última unidad
  const uuid1 = randomUUID();
  const uuid2 = randomUUID();

  const intentarCompra = (uuid: string) =>
    TenantContext.enTienda(idA, () =>
      ventasService.cobrar({
        uuid,
        canal: Canal.online,
        medioPago: 'qr',
        metodoPasarela: 'qr_bolivia',
        almacenId: almacenA.id,
        lineas: [{ varianteId, cantidad: 1 }],
      }),
    );

  const [res1, res2] = await Promise.allSettled([intentarCompra(uuid1), intentarCompra(uuid2)]);

  const exitosas = [res1, res2].filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
  const rechazadas = [res1, res2].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

  assert.equal(exitosas.length, 1, 'Exactamente una venta debe ganar la última unidad');
  assert.equal(rechazadas.length, 1, 'La segunda venta concurrente debe ser rechazada');
  assert.ok(rechazadas[0].reason instanceof StockInsuficienteError, 'El error debe ser StockInsuficienteError');

  const ventaGanadora = exitosas[0].value;
  assert.equal(ventaGanadora.estado, 'pendiente_pago');

  const stockTrasConcurrencia = await localA.stockAlmacen.findUniqueOrThrow({
    where: { varianteId_almacenId: { varianteId, almacenId: almacenA.id } },
  });
  assert.equal(stockTrasConcurrencia.cantidad, 1);
  assert.equal(stockTrasConcurrencia.reservado, 1, 'La unidad quedó reservada por la venta ganadora');
  console.log('✓ Concurrencia sobre última unidad: exactamente 1 venta aprobada y la otra rechazada con StockInsuficienteError.');

  // 4. Reintento de la venta ganadora (Idempotencia)
  await TenantContext.enTienda(idA, async () => {
    const reintento = await ventasService.cobrar({
      uuid: ventaGanadora.uuid,
      canal: Canal.online,
      medioPago: 'qr',
      metodoPasarela: 'qr_bolivia',
      almacenId: almacenA.id,
      lineas: [{ varianteId, cantidad: 1 }],
    });
    assert.equal(reintento.id, ventaGanadora.id, 'El reintento debe devolver la misma venta');

    // Mismo UUID con payload alterado debe dar UuidConflictError
    await assert.rejects(
      () =>
        ventasService.cobrar({
          uuid: ventaGanadora.uuid,
          canal: Canal.online,
          medioPago: 'qr',
          metodoPasarela: 'qr_bolivia',
          almacenId: almacenA.id,
          lineas: [{ varianteId, cantidad: 2 }], // cantidad diferente
        }),
      UuidConflictError,
    );
  });
  console.log('✓ Idempotencia de ventas: repetición exacta retorna sin duplicar y alteración produce conflicto.');

  // 5. Aprobación del pago simulado
  const pago = await localA.pagoSimulado.findUniqueOrThrow({ where: { ventaId: ventaGanadora.id } });
  assert.equal(pago.estado, 'pendiente');

  await TenantContext.enTienda(idA, async () => {
    const resPago = await pagosController.simular(
      { sub: cajeroA.id, rol: Rol.ADMIN } as any,
      pago.id,
      { resultado: 'aprobado' },
    );
    assert.equal(resPago.estado, 'aprobado');

    // Reintento de pago aprobado no modifica stock
    const resPagoReintento = await pagosController.simular(
      { sub: cajeroA.id, rol: Rol.ADMIN } as any,
      pago.id,
      { resultado: 'aprobado' },
    );
    assert.equal(resPagoReintento.estado, 'aprobado');
  });

  const stockTrasPago = await localA.stockAlmacen.findUniqueOrThrow({
    where: { varianteId_almacenId: { varianteId, almacenId: almacenA.id } },
  });
  assert.equal(stockTrasPago.cantidad, 0, 'La cantidad física se descontó');
  assert.equal(stockTrasPago.reservado, 0, 'La reserva se liberó');

  const ventaCobrada = await localA.venta.findUniqueOrThrow({ where: { id: ventaGanadora.id } });
  assert.equal(ventaCobrada.estado, 'cobrada');
  console.log('✓ Aprobación de pago simulado: venta cobrada, stock físico descontado a 0 y reserva liberada.');

  // 6. Devolución de la venta y reposición de stock
  await TenantContext.enTienda(idA, async () => {
    const lineaVenta = await localA.lineaVenta.findFirstOrThrow({ where: { ventaId: ventaGanadora.id } });
    const dev = await devolucionesController.crear(
      { sub: cajeroA.id, rol: Rol.ADMIN } as any,
      {
        ventaId: ventaGanadora.id,
        lineas: [{ lineaId: lineaVenta.id, cantidad: 1 }],
      },
    );
    assert.equal(dev.estado, 'devuelta');
    assert.equal(dev.pagoEstado, 'reembolsado');
    assert.equal(dev.reembolso, 120);
  });

  const stockTrasDevolucion = await localA.stockAlmacen.findUniqueOrThrow({
    where: { varianteId_almacenId: { varianteId, almacenId: almacenA.id } },
  });
  assert.equal(stockTrasDevolucion.cantidad, 1, 'El stock físico volvió a 1 tras la devolución');
  assert.equal(stockTrasDevolucion.reservado, 0);

  const ventaDevuelta = await localA.venta.findUniqueOrThrow({ where: { id: ventaGanadora.id } });
  assert.equal(ventaDevuelta.estado, 'devuelta');
  console.log('✓ Devolución verificada: stock reintegrado correctamente a 1, venta marcada como devuelta.');

  // 7. Aislamiento estricto entre tiendas
  // La tienda B no debe tener el producto, ni la variante, ni la venta, ni el pago de la tienda A
  const productoEnB = await localB.producto.count({ where: { id: productoId } });
  assert.equal(productoEnB, 0, 'Tienda B no debe tener el producto de Tienda A');

  const ventaEnB = await localB.venta.count({ where: { id: ventaGanadora.id } });
  assert.equal(ventaEnB, 0, 'Tienda B no debe tener la venta de Tienda A');

  // En la tabla compartida public tampoco deben existir
  const [enPublicVenta] = await global.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM public.ventas WHERE id = ${ventaGanadora.id}`;
  assert.equal(Number(enPublicVenta.n), 0, 'La venta no debe existir en public.ventas');

  console.log('✓ Aislamiento verificado: esquema tienda B y public no contienen datos de tienda A.');

  // Limpieza de datos sintéticos de la prueba en Tienda A
  await localA.devolucionLinea.deleteMany({ where: { tiendaId: idA, devolucion: { ventaId: ventaGanadora.id } } });
  await localA.devolucion.deleteMany({ where: { ventaId: ventaGanadora.id } });
  await localA.movimientoInventario.deleteMany({ where: { varianteId } });
  await localA.pagoSimulado.deleteMany({ where: { ventaId: ventaGanadora.id } });
  await localA.pedido.deleteMany({ where: { ventaId: ventaGanadora.id } });
  await localA.lineaVenta.deleteMany({ where: { ventaId: ventaGanadora.id } });
  await localA.venta.deleteMany({ where: { id: ventaGanadora.id } });
  await localA.stockAlmacen.deleteMany({ where: { varianteId } });
  await localA.variante.deleteMany({ where: { id: varianteId } });
  await localA.producto.deleteMany({ where: { id: productoId } });

  console.log('✓ Limpieza de datos sintéticos completada.');
  console.log('\nTODAS LAS COMPROBACIONES DE RETAIL, INVENTARIO Y PAGOS SIMULADOS PASARON EXITOSAMENTE.');
}

main()
  .catch((e: unknown) => {
    console.error('FALLÓ LA VERIFICACIÓN:', e instanceof Error ? e.message : 'Error desconocido', e);
    process.exitCode = 1;
  })
  .finally(() => servicioEsquemas.onModuleDestroy());
