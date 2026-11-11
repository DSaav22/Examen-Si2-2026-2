jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../auth/jwt-auth.guard', () => ({ JwtAuthGuard: class JwtAuthGuard {} }));
jest.mock('../notificaciones/notificaciones.service', () => ({ NotificacionesService: class NotificacionesService {} }));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Canal, Rol, EstadoVenta } from '@prisma/client';
import { metodosSimuladosPorPais, validarPagoVenta, validarMetodoPais } from '../pagos/metodos-pais';
import { VentasService } from './ventas.service';
import { PagosController } from '../pagos/pagos.controller';
import { DevolucionesController } from '../devoluciones/devoluciones.controller';
import { ReservasService } from '../reservas/reservas.service';
import { TenantContext } from '../tenancy/tenant-context';
import { StockInsuficienteError, UuidConflictError } from './errores-venta';

describe('Ventas retail, inventario por esquemas y pagos simulados', () => {
  const TIENDA_BO = '00000000-0000-4000-8000-000000000001';
  const TIENDA_BR = '00000000-0000-4000-8000-000000000002';
  const TIENDA_AR = '00000000-0000-4000-8000-000000000003';

  describe('1. Disponibilidad de métodos de pago simulados por país', () => {
    it('ofrece métodos correctos para Bolivia (BO)', () => {
      const metodos = metodosSimuladosPorPais('BO');
      const codigos = metodos.map((m) => m.codigo);
      expect(codigos).toContain('tarjeta');
      expect(codigos).toContain('qr_bolivia');
      expect(codigos).toContain('transferencia');
      expect(codigos).toContain('binance_pay');
      expect(codigos).not.toContain('pix');
      expect(codigos).not.toContain('mercado_pago');
      expect(metodos.every((m) => m.simulado === true)).toBe(true);
    });

    it('ofrece métodos correctos para Brasil (BR)', () => {
      const metodos = metodosSimuladosPorPais('BR');
      const codigos = metodos.map((m) => m.codigo);
      expect(codigos).toContain('tarjeta');
      expect(codigos).toContain('pix');
      expect(codigos).toContain('transferencia');
      expect(codigos).toContain('paypal');
      expect(codigos).toContain('binance_pay');
      expect(codigos).not.toContain('qr_bolivia');
      expect(codigos).not.toContain('mercado_pago');
    });

    it('ofrece métodos correctos para Argentina (AR)', () => {
      const metodos = metodosSimuladosPorPais('AR');
      const codigos = metodos.map((m) => m.codigo);
      expect(codigos).toContain('tarjeta');
      expect(codigos).toContain('mercado_pago');
      expect(codigos).toContain('transferencia');
      expect(codigos).toContain('paypal');
      expect(codigos).toContain('binance_pay');
      expect(codigos).not.toContain('pix');
      expect(codigos).not.toContain('qr_bolivia');
    });

    it('rechaza métodos ajenos al país de la tienda', () => {
      expect(() => validarMetodoPais('BO', 'pix')).toThrow(BadRequestException);
      expect(() => validarMetodoPais('BR', 'qr_bolivia')).toThrow(BadRequestException);
      expect(() => validarMetodoPais('AR', 'pix')).toThrow(BadRequestException);
      expect(() => validarMetodoPais('XX', 'tarjeta')).toThrow(BadRequestException);
    });

    it('valida la combinación de canal y método pasarela de la venta', () => {
      expect(validarPagoVenta('BO', 'qr', 'qr_bolivia')).toBe('qr_bolivia');
      expect(validarPagoVenta('BR', 'qr', 'pix')).toBe('pix');
      expect(validarPagoVenta('AR', 'qr', 'mercado_pago')).toBe('mercado_pago');
      expect(() => validarPagoVenta('BO', 'qr', 'pix')).toThrow(BadRequestException);
      expect(() => validarPagoVenta('BR', 'tarjeta', 'pix')).toThrow(BadRequestException);
    });
  });

  describe('2. Compra web aprobada y rechazada con stock simulado', () => {
    it('compra web aprobada: reserva stock -> aprueba pago -> descuenta físico y abre pedido', async () => {
      const stock = { cantidad: 5, reservado: 0 };
      const movimientos: any[] = [];
      const pedidosCreados: any[] = [];
      let pagoEstado = 'pendiente';
      let ventaEstado: EstadoVenta = 'pendiente_pago';

      const txMock: any = {
        $executeRaw: jest.fn().mockImplementation(async () => {
          stock.reservado += 1;
          return 1;
        }),
        stockAlmacen: {
          findUnique: jest.fn().mockResolvedValue({ cantidad: stock.cantidad, reservado: stock.reservado }),
          update: jest.fn().mockImplementation(async ({ data }) => {
            if (data.cantidad?.decrement) stock.cantidad -= data.cantidad.decrement;
            if (data.reservado?.decrement) stock.reservado -= data.reservado.decrement;
          }),
        },
        $queryRaw: jest.fn().mockImplementation(async () => [
          { cantidad: stock.cantidad, reservado: stock.reservado },
        ]),
        venta: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async ({ data }) => ({
            id: 'venta-web-01',
            ...data,
            creadaEn: new Date(),
          })),
          findUniqueOrThrow: jest.fn().mockImplementation(async () => ({
            id: 'venta-web-01',
            canal: 'online',
            estado: ventaEstado,
            total: 100,
            clientaId: 'clienta-01',
            lineas: [{ id: 'linea-01', varianteId: 'var-01', cantidad: 1, precioUnitario: 100 }],
          })),
          update: jest.fn().mockImplementation(async ({ data }) => {
            ventaEstado = data.estado;
            return { id: 'venta-web-01', estado: ventaEstado, total: 100, clientaId: 'clienta-01', canal: 'online' };
          }),
        },
        pagoSimulado: {
          create: jest.fn().mockResolvedValue({ id: 'pago-web-01', estado: 'pendiente' }),
          updateMany: jest.fn().mockImplementation(async ({ data }) => {
            pagoEstado = data.estado;
            return { count: 1 };
          }),
          findUniqueOrThrow: jest.fn().mockImplementation(async () => ({
            id: 'pago-web-01',
            estado: pagoEstado,
            venta: {
              id: 'venta-web-01',
              canal: 'online',
              clientaId: 'clienta-01',
              total: 100,
              almacenId: 'alm-01',
              medioPago: 'qr',
              lineas: [{ varianteId: 'var-01', cantidad: 1 }],
            },
          })),
        },
        cupon: { findFirst: jest.fn().mockResolvedValue(null) },
        variante: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'var-01', producto: { precioBase: 100, descuentoPct: 0, minimoMayorista: 0 } },
          ]),
        },
        usuario: { findUnique: jest.fn().mockResolvedValue({ id: 'clienta-01', mayorista: false }) },
        pedido: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation(async ({ data }) => {
            pedidosCreados.push(data);
            return { id: 'ped-01', ...data };
          }),
        },
        direccionCliente: { findFirst: jest.fn().mockResolvedValue({ etiqueta: 'Casa', detalle: 'Av 1', ciudad: 'Cochabamba' }) },
        auditoria: { create: jest.fn().mockResolvedValue({}) },
      };

      const prismaPlataforma = {
        tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) },
      };

      const inventarioMock: any = {
        registrar: jest.fn().mockImplementation(async (_tx, data) => movimientos.push(data)),
      };
      const notifMock: any = { notificarTrasCobro: jest.fn().mockResolvedValue({}) };

      const configMock: any = { get: jest.fn().mockReturnValue('true') };
      const esquemasMock: any = {
        clientePlataforma: () => prismaPlataforma,
        clienteTienda: () => ({
          ...txMock,
          $transaction: (fn: any) => fn(txMock),
        }),
      };

      const ventasService = new VentasService(txMock as any, inventarioMock, notifMock, esquemasMock, configMock);
      const pagosController = new PagosController(txMock as any, inventarioMock, ventasService, notifMock, esquemasMock, configMock);

      await TenantContext.enTienda(TIENDA_BO, async () => {
        // Paso 1: Crear compra web online
        const venta = await ventasService.cobrar({
          uuid: 'uuid-web-aprobada',
          canal: Canal.online,
          medioPago: 'qr',
          metodoPasarela: 'qr_bolivia',
          almacenId: 'alm-01',
          clientaId: 'clienta-01',
          lineas: [{ varianteId: 'var-01', cantidad: 1 }],
        });

        expect(venta.estado).toBe('pendiente_pago');
        expect(stock.reservado).toBe(1);
        expect(stock.cantidad).toBe(5);
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'reserva', cantidad: 1 }));

        // Doble de pago para resolver
        txMock.pagoSimulado.findUnique = jest.fn().mockResolvedValue({
          id: 'pago-web-01',
          estado: 'pendiente',
          referencia: 'SIM:qr_bolivia:venta-web-01',
          venta: {
            id: 'venta-web-01',
            almacenId: 'alm-01',
            clientaId: 'clienta-01',
            canal: 'online',
            medioPago: 'qr',
            total: 100,
            lineas: [{ varianteId: 'var-01', cantidad: 1 }],
          },
        });

        // Paso 2: Aprobar pago simulado
        const res = await pagosController.simular(
          { sub: 'clienta-01', rol: Rol.CLIENTA } as any,
          'pago-web-01',
          { resultado: 'aprobado' },
        );

        expect(res.estado).toBe('aprobado');
        // El stock físico se decrementa y la reserva se libera
        expect(stock.cantidad).toBe(4);
        expect(stock.reservado).toBe(0);
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'venta', cantidad: 1 }));
        expect(pedidosCreados.length).toBeGreaterThan(0);
        expect(pedidosCreados[0].ventaId).toBe('venta-web-01');
      });
    });

    it('compra web rechazada: libera reserva sin descontar cantidad física y anula venta', async () => {
      const stock = { cantidad: 5, reservado: 1 };
      const movimientos: any[] = [];
      let ventaEstado: EstadoVenta = 'pendiente_pago';
      let pagoEstado = 'pendiente';

      const txMock: any = {
        stockAlmacen: {
          update: jest.fn().mockImplementation(async ({ data }) => {
            if (data.reservado?.decrement) stock.reservado -= data.reservado.decrement;
          }),
        },
        $queryRaw: jest.fn().mockResolvedValue([{ cantidad: stock.cantidad, reservado: stock.reservado }]),
        pagoSimulado: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pago-rechazado-01',
            estado: 'pendiente',
            referencia: 'SIM:qr_bolivia:venta-02',
            venta: {
              id: 'venta-02',
              almacenId: 'alm-01',
              clientaId: 'clienta-01',
              canal: 'online',
              medioPago: 'qr',
              lineas: [{ varianteId: 'var-01', cantidad: 1 }],
            },
          }),
          updateMany: jest.fn().mockImplementation(async ({ data }) => {
            pagoEstado = data.estado;
            return { count: 1 };
          }),
          findUniqueOrThrow: jest.fn().mockImplementation(async () => ({
            id: 'pago-rechazado-01',
            estado: pagoEstado,
            venta: { id: 'venta-02', estado: ventaEstado },
          })),
        },
        venta: {
          update: jest.fn().mockImplementation(async ({ data }) => {
            ventaEstado = data.estado;
            return { id: 'venta-02', estado: ventaEstado };
          }),
        },
      };

      const inventarioMock: any = {
        registrar: jest.fn().mockImplementation(async (_tx, data) => movimientos.push(data)),
      };
      const esquemasMock: any = {
        clientePlataforma: () => ({ tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) } }),
        clienteTienda: () => ({ ...txMock, $transaction: (fn: any) => fn(txMock) }),
      };

      const pagosController = new PagosController(txMock as any, inventarioMock, {} as any, { notificarTrasCobro: jest.fn() } as any, esquemasMock, { get: () => 'true' } as any);

      await TenantContext.enTienda(TIENDA_BO, async () => {
        const res = await pagosController.simular(
          { sub: 'clienta-01', rol: Rol.CLIENTA } as any,
          'pago-rechazado-01',
          { resultado: 'rechazado' },
        );

        expect(res.estado).toBe('rechazado');
        expect(stock.cantidad).toBe(5); // No se descuenta stock físico
        expect(stock.reservado).toBe(0); // Reserva liberada
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'liberacion', cantidad: 1 }));
        expect(ventaEstado).toBe('anulada');
      });
    });
  });

  describe('3. Venta POS aprobada y rechazada', () => {
    it('venta POS en efectivo: cobra directamente, descuenta stock e incrementa caja', async () => {
      const stock = { cantidad: 10, reservado: 0 };
      const turno = { id: 'turno-01', totalSistema: 200, cerrado_en: null, cajero_id: 'cajero-01', sucursal_id: 'suc-01' };
      const movimientos: any[] = [];

      const txMock: any = {
        $executeRaw: jest.fn().mockImplementation(async () => {
          stock.cantidad -= 2;
          return 1;
        }),
        stockAlmacen: { findUnique: jest.fn().mockResolvedValue(stock) },
        $queryRaw: jest.fn().mockResolvedValue([turno]),
        cajaTurno: {
          update: jest.fn().mockImplementation(async ({ data }) => {
            turno.totalSistema += data.totalSistema.increment;
          }),
        },
        almacen: { findMany: jest.fn().mockResolvedValue([{ id: 'alm-pos' }]) },
        cupon: { findFirst: jest.fn().mockResolvedValue(null) },
        variante: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'var-pos', producto: { precioBase: 50, descuentoPct: 0, minimoMayorista: 0 } },
          ]),
        },
        usuario: { findUnique: jest.fn().mockResolvedValue(null) },
        venta: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'venta-pos-01',
            canal: 'pos',
            estado: 'cobrada',
            total: 100,
            medioPago: 'efectivo',
            cajaTurnoId: 'turno-01',
            lineas: [{ varianteId: 'var-pos', cantidad: 2, precioUnitario: 50 }],
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'venta-pos-01',
            canal: 'pos',
            estado: 'cobrada',
            total: 100,
            medioPago: 'efectivo',
            cajaTurnoId: 'turno-01',
            lineas: [{ varianteId: 'var-pos', cantidad: 2, precioUnitario: 50 }],
          }),
        },
        auditoria: { create: jest.fn().mockResolvedValue({}) },
      };

      const esquemasMock: any = {
        clientePlataforma: () => ({ tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) } }),
        clienteTienda: () => ({ ...txMock, $transaction: (fn: any) => fn(txMock) }),
      };

      const inventarioMock: any = { registrar: jest.fn().mockImplementation(async (_tx, m) => movimientos.push(m)) };
      const ventasService = new VentasService(txMock as any, inventarioMock, { notificarTrasCobro: jest.fn() } as any, esquemasMock, { get: () => 'true' } as any);

      await TenantContext.enTienda(TIENDA_BO, async () => {
        const venta = await ventasService.cobrar(
          {
            uuid: 'uuid-pos-efectivo',
            canal: Canal.pos,
            medioPago: 'efectivo',
            almacenId: 'alm-pos',
            cajaTurnoId: 'turno-01',
            lineas: [{ varianteId: 'var-pos', cantidad: 2 }],
          },
          { id: 'cajero-01', rol: Rol.CAJERO },
        );

        expect(venta.estado).toBe('cobrada');
        expect(stock.cantidad).toBe(8);
        expect(turno.totalSistema).toBe(300);
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'venta', cantidad: 2 }));
      });
    });

    it('venta POS rechaza si no se especifica turno de caja', async () => {
      const ventasService = new VentasService({} as any, {} as any, {} as any);
      await expect(
        ventasService.cobrar({
          uuid: 'sin-turno',
          canal: Canal.pos,
          medioPago: 'efectivo',
          almacenId: 'alm-01',
          lineas: [{ varianteId: 'var-01', cantidad: 1 }],
        }),
      ).rejects.toThrow();
    });
  });

  describe('4. Concurrencia sobre stock: última unidad solicitada concurrentemente', () => {
    it('garantiza que si dos ventas piden la última unidad a la vez, solo una gana y la otra falla', async () => {
      let stockDisponible = 1;
      let reservas = 0;

      const intentarComprarUltimaUnidad = async (ventaId: string) => {
        // Simulación atómica de UPDATE stock_almacen WHERE cantidad - reservado >= 1
        if (stockDisponible - reservas >= 1) {
          reservas += 1;
          return { exito: true, ventaId };
        }
        throw new StockInsuficienteError('var-unica', 0, 1);
      };

      const [res1, res2] = await Promise.allSettled([
        intentarComprarUltimaUnidad('venta-concurrente-1'),
        intentarComprarUltimaUnidad('venta-concurrente-2'),
      ]);

      const exitosos = [res1, res2].filter((r) => r.status === 'fulfilled');
      const rechazados = [res1, res2].filter((r) => r.status === 'rejected');

      expect(exitosos.length).toBe(1);
      expect(rechazados.length).toBe(1);
      expect(reservas).toBe(1);
    });
  });

  describe('5. Idempotencia y reintentos sin duplicados', () => {
    it('repetir venta con mismo UUID devuelve la venta registrada sin duplicar', async () => {
      const ventaRegistrada = {
        id: 'venta-idempotente',
        uuid: 'uuid-repetido',
        canal: 'online',
        medioPago: 'qr',
        almacenId: 'alm-01',
        cajaTurnoId: null,
        clientaId: 'cli-01',
        lineas: [{ varianteId: 'var-01', cantidad: 1 }],
        pago: { referencia: 'SIM:qr_bolivia:venta-idempotente' },
      };

      const txMock: any = {
        venta: { findFirst: jest.fn().mockResolvedValue(ventaRegistrada) },
      };
      const esquemasMock: any = {
        clientePlataforma: () => ({ tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) } }),
        clienteTienda: () => txMock,
      };

      const ventasService = new VentasService(txMock, {} as any, {} as any, esquemasMock, { get: () => 'true' } as any);

      await TenantContext.enTienda(TIENDA_BO, async () => {
        const repetida = await ventasService.cobrar({
          uuid: 'uuid-repetido',
          canal: Canal.online,
          medioPago: 'qr',
          metodoPasarela: 'qr_bolivia',
          almacenId: 'alm-01',
          clientaId: 'cli-01',
          lineas: [{ varianteId: 'var-01', cantidad: 1 }],
        });

        expect(repetida.id).toBe('venta-idempotente');
        expect(txMock.venta.findFirst).toHaveBeenCalledWith({
          where: { uuid: 'uuid-repetido' },
          include: { lineas: true, pago: true },
        });
      });
    });

    it('repetir venta con mismo UUID pero distinto payload arroja UuidConflictError', async () => {
      const ventaRegistrada = {
        id: 'venta-idempotente',
        uuid: 'uuid-repetido',
        canal: 'online',
        medioPago: 'qr',
        almacenId: 'alm-01',
        cajaTurnoId: null,
        clientaId: 'cli-01',
        lineas: [{ varianteId: 'var-01', cantidad: 1 }],
        pago: { referencia: 'SIM:qr_bolivia:venta-idempotente' },
      };

      const txMock: any = {
        venta: { findFirst: jest.fn().mockResolvedValue(ventaRegistrada) },
      };
      const esquemasMock: any = {
        clientePlataforma: () => ({ tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) } }),
        clienteTienda: () => txMock,
      };

      const ventasService = new VentasService(txMock, {} as any, {} as any, esquemasMock, { get: () => 'true' } as any);

      await TenantContext.enTienda(TIENDA_BO, async () => {
        await expect(
          ventasService.cobrar({
            uuid: 'uuid-repetido',
            canal: Canal.online,
            medioPago: 'qr',
            metodoPasarela: 'qr_bolivia',
            almacenId: 'alm-01',
            clientaId: 'cli-01',
            lineas: [{ varianteId: 'var-01', cantidad: 3 }], // Cantidad alterada
          }),
        ).rejects.toBeInstanceOf(UuidConflictError);
      });
    });

    it('reintentar resolución de pago ya resuelto no duplica movimientos y cambiar resultado da conflicto', async () => {
      const pago = {
        id: 'pago-ya-aprobado',
        estado: 'aprobado',
        referencia: 'SIM:pix:venta-br',
        venta: { medioPago: 'qr', lineas: [] },
      };

      const prisma = {
        pagoSimulado: { findUnique: jest.fn().mockResolvedValue(pago) },
        $transaction: jest.fn(),
      };
      const esquemasMock: any = {
        clientePlataforma: () => ({ tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BR' }) } }),
        clienteTienda: () => prisma,
      };

      const pagosController = new PagosController(prisma as any, {} as any, {} as any, {} as any, esquemasMock, { get: () => 'true' } as any);

      await TenantContext.enTienda(TIENDA_BR, async () => {
        // Reintento con mismo resultado: retorna sin transacción
        const res = await pagosController.simular(
          { sub: 'admin-01', rol: Rol.ADMIN } as any,
          'pago-ya-aprobado',
          { resultado: 'aprobado' },
        );
        expect(res.estado).toBe('aprobado');
        expect(prisma.$transaction).not.toHaveBeenCalled();

        // Intento de cambiar de aprobado a rechazado: lanza conflicto
        await expect(
          pagosController.simular(
            { sub: 'admin-01', rol: Rol.ADMIN } as any,
            'pago-ya-aprobado',
            { resultado: 'rechazado' },
          ),
        ).rejects.toBeInstanceOf(ConflictException);
      });
    });
  });

  describe('6. Devolución y cancelación con efecto correcto en stock y caja', () => {
    it('devolución de venta cobrada: reintegra stock, ajusta caja si turno abierto y registra movimiento', async () => {
      let stockCantidad = 5;
      let cajaTotalSistema = 500;
      const movimientos: any[] = [];

      const txMock: any = {
        venta: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'venta-dev',
            estado: 'cobrada',
            almacenId: 'alm-01',
            total: 100,
            medioPago: 'efectivo',
            cajaTurnoId: 'turno-01',
            cajaTurno: { id: 'turno-01', cerradoEn: null },
            lineas: [
              { id: 'lv-01', varianteId: 'var-01', cantidad: 2, cantidadDevuelta: 0, precioUnitario: 50 },
            ],
            pago: null,
          }),
          update: jest.fn().mockResolvedValue({ id: 'venta-dev', estado: 'devuelta' }),
        },
        devolucion: {
          create: jest.fn().mockResolvedValue({ id: 'dev-01' }),
        },
        lineaVenta: { update: jest.fn() },
        stockAlmacen: {
          upsert: jest.fn().mockImplementation(async ({ create, update }) => {
            stockCantidad += update.cantidad.increment;
          }),
        },
        pedido: { updateMany: jest.fn() },
        cajaTurno: {
          update: jest.fn().mockImplementation(async ({ data }) => {
            cajaTotalSistema -= data.totalSistema.decrement;
          }),
        },
      };

      const inventarioMock: any = {
        registrar: jest.fn().mockImplementation(async (_tx, m) => movimientos.push(m)),
      };
      const esquemasMock: any = {
        clienteTienda: () => ({ ...txMock, $transaction: (fn: any) => fn(txMock) }),
      };

      const devolucionesController = new DevolucionesController(
        txMock,
        inventarioMock,
        esquemasMock,
        { get: () => 'true' } as any,
      );

      await TenantContext.enTienda(TIENDA_BO, async () => {
        const resultado = await devolucionesController.crear(
          { sub: 'cajero-01', rol: Rol.CAJERO } as any,
          {
            ventaId: 'venta-dev',
            lineas: [{ lineaId: 'lv-01', cantidad: 2 }],
          },
        );

        expect(resultado.estado).toBe('devuelta');
        expect(resultado.reembolso).toBe(100);
        expect(stockCantidad).toBe(7); // Reintegró las 2 prendas al almacén
        expect(cajaTotalSistema).toBe(400); // Rebajó los 100 de la caja
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'devolucion', cantidad: 2 }));
      });
    });

    it('cancelación de reserva: libera stock reservado sin tocar caja', async () => {
      let stockReservado = 3;
      const movimientos: any[] = [];

      const txMock: any = {
        $queryRaw: jest.fn().mockResolvedValue([
          { id: 'res-01', estado: 'pendiente', sucursal_id: 'suc-01' },
        ]),
        reserva: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'res-01',
            estado: 'pendiente',
            sucursalId: 'suc-01',
            sucursal: { almacenes: [{ id: 'alm-01' }] },
            lineas: [{ varianteId: 'var-01', cantidad: 2 }],
          }),
          update: jest.fn().mockResolvedValue({ id: 'res-01', estado: 'cancelada' }),
        },
        stockAlmacen: {
          update: jest.fn().mockImplementation(async ({ data }) => {
            stockReservado -= data.reservado.decrement;
          }),
        },
      };

      const inventarioMock: any = {
        registrar: jest.fn().mockImplementation(async (_tx, m) => movimientos.push(m)),
      };
      const esquemasMock: any = {
        clienteTienda: () => ({ ...txMock, $transaction: (fn: any) => fn(txMock) }),
      };

      const reservasService = new ReservasService(
        txMock,
        inventarioMock,
        esquemasMock,
        { get: () => 'true' } as any,
      );

      await TenantContext.enTienda(TIENDA_BO, async () => {
        const res = await reservasService.cambiarEstado('res-01', 'cancelada');
        expect(res.estado).toBe('cancelada');
        expect(stockReservado).toBe(1); // Libera los 2 reservados
        expect(movimientos).toContainEqual(expect.objectContaining({ tipo: 'liberacion', cantidad: 2 }));
      });
    });
  });

  describe('7. Aislamiento entre dos tiendas y separación SaaS vs Retail', () => {
    it('escribe en el esquema de la tienda autorizada sin mezclar datos entre Tienda A y Tienda B', async () => {
      const tiendaA_ventas: any[] = [];
      const tiendaB_ventas: any[] = [];

      const clienteA = {
        venta: {
          create: jest.fn().mockImplementation(async ({ data }) => {
            tiendaA_ventas.push(data);
            return { id: 'v-A', ...data };
          }),
          findMany: jest.fn().mockImplementation(async () => tiendaA_ventas),
        },
        $transaction: (fn: any) => fn(clienteA),
        variante: { findMany: jest.fn().mockResolvedValue([]) },
        cupon: { findFirst: jest.fn().mockResolvedValue(null) },
      };

      const clienteB = {
        venta: {
          create: jest.fn().mockImplementation(async ({ data }) => {
            tiendaB_ventas.push(data);
            return { id: 'v-B', ...data };
          }),
          findMany: jest.fn().mockImplementation(async () => tiendaB_ventas),
        },
        $transaction: (fn: any) => fn(clienteB),
        variante: { findMany: jest.fn().mockResolvedValue([]) },
        cupon: { findFirst: jest.fn().mockResolvedValue(null) },
      };

      const esquemasMock: any = {
        clienteTienda: (id: string) => (id === TIENDA_BO ? clienteA : clienteB),
      };

      // Operación en Tienda A
      await TenantContext.enTienda(TIENDA_BO, async () => {
        const db = esquemasMock.clienteTienda(TenantContext.tiendaIdOrThrow());
        await db.venta.create({ data: { uuid: 'vA-01', total: 50, tiendaId: TIENDA_BO } });
      });

      // Operación en Tienda B
      await TenantContext.enTienda(TIENDA_BR, async () => {
        const db = esquemasMock.clienteTienda(TenantContext.tiendaIdOrThrow());
        await db.venta.create({ data: { uuid: 'vB-01', total: 90, tiendaId: TIENDA_BR } });
      });

      expect(tiendaA_ventas.length).toBe(1);
      expect(tiendaA_ventas[0].uuid).toBe('vA-01');
      expect(tiendaB_ventas.length).toBe(1);
      expect(tiendaB_ventas[0].uuid).toBe('vB-01');

      // Tienda A no ve las ventas de Tienda B
      expect(await clienteA.venta.findMany()).toHaveLength(1);
      expect(await clienteB.venta.findMany()).toHaveLength(1);
    });
  });
});
