import { BadRequestException } from '@nestjs/common';
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../auth/jwt-auth.guard', () => ({ JwtAuthGuard: class JwtAuthGuard {} }));
jest.mock('../inventario/inventario.service', () => ({ InventarioService: class InventarioService {} }));
jest.mock('../notificaciones/notificaciones.service', () => ({ NotificacionesService: class NotificacionesService {} }));
import { Canal, Rol } from '@prisma/client';
import { metodosSimuladosPorPais, validarPagoVenta } from './metodos-pais';
import { VentasService } from '../ventas/ventas.service';
import { TenantContext } from '../tenancy/tenant-context';
import { PagosController } from './pagos.controller';

describe('Restricciones de pagos por pais en operaciones', () => {
  it.each([
    ['BO', 'pix'], ['AR', 'yape'], ['AR', 'plin'], ['PE', 'pix'],
    ['BR', 'qr_bolivia'], ['BO', 'metodo_inventado'], ['XX', 'pix'],
  ])('rechaza %s con %s antes de consultar ventas o cambiar stock', async (pais, metodoPasarela) => {
    const prisma = {
      tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais }) },
      venta: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const servicio = new VentasService(prisma as any, {} as any, {} as any);
    await expect(TenantContext.enTienda('tienda-autorizada', () => servicio.cobrar({
      uuid: 'venta', canal: Canal.online, medioPago: 'qr', metodoPasarela,
      almacenId: 'almacen', lineas: [{ varianteId: 'prenda', cantidad: 1 }],
    }))).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.venta.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.tienda.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'tienda-autorizada' }, select: { pais: true } });
  });

  it.each([['BO', 'qr_bolivia'], ['BR', 'pix'], ['PE', 'yape'], ['AR', 'mercado_pago']])(
    'admite el metodo local %s/%s', (pais, metodo) => {
      expect(validarPagoVenta(pais, 'qr', metodo)).toBe(metodo);
    },
  );

  it('no permite disfrazar Pix como tarjeta, efectivo o transferencia', () => {
    for (const medio of ['tarjeta', 'efectivo', 'transferencia']) {
      expect(() => validarPagoVenta('BR', medio, 'pix')).toThrow(BadRequestException);
    }
    expect(() => validarPagoVenta('AR', 'qr')).toThrow(BadRequestException);
  });

  it('obtiene los botones del pais persistido y vuelve a validar al resolver un pago', async () => {
    const prisma = {
      tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'BO' }) },
      pagoSimulado: { findUnique: jest.fn().mockResolvedValue({
        referencia: 'SIM:pix:venta', venta: { medioPago: 'qr', clientaId: 'cliente', lineas: [] },
      }) },
      $transaction: jest.fn(),
    };
    const controlador = new PagosController(prisma as any, {} as any, {} as any, {} as any);
    await TenantContext.enTienda('tienda-bo', async () => {
      expect(await controlador.metodos()).toEqual({ pais: 'BO', metodos: metodosSimuladosPorPais('BO') });
      await expect(controlador.simular({ sub: 'cliente', rol: Rol.CLIENTA } as any, 'pago', { resultado: 'aprobado' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['aprobado', 'rechazado'] as const)('resuelve un pago %s y repetirlo no vuelve a modificar stock o caja', async resultado => {
    const pago: any = {
      id: 'pago', estado: 'pendiente', referencia: 'SIM:yape:venta', ventaId: 'venta',
      venta: { id: 'venta', medioPago: 'qr', canal: 'pos', clientaId: null,
        almacenId: 'almacen', cajaTurnoId: 'turno', total: 80,
        lineas: [{ varianteId: 'prenda', cantidad: 2 }] },
    };
    const tx = {
      pagoSimulado: {
        updateMany: jest.fn().mockImplementation(async ({ data }) => { pago.estado = data.estado; return { count: 1 }; }),
        findUniqueOrThrow: jest.fn().mockImplementation(async () => pago),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ cantidad: 5, reservado: 2 }]),
      stockAlmacen: { update: jest.fn() },
      venta: { update: jest.fn().mockResolvedValue(pago.venta) },
      cajaTurno: { update: jest.fn() },
    };
    const prisma = {
      tienda: { findUniqueOrThrow: jest.fn().mockResolvedValue({ pais: 'PE' }) },
      pagoSimulado: { findUnique: jest.fn().mockImplementation(async () => pago) },
      $transaction: jest.fn().mockImplementation(fn => fn(tx)),
    };
    const inventario = { registrar: jest.fn() };
    const controller = new PagosController(prisma as any, inventario as any, {} as any, {} as any);
    await TenantContext.enTienda('tienda-pe', async () => {
      const user = { sub: 'admin', rol: Rol.ADMIN } as any;
      await expect(controller.simular(user, 'pago', { resultado })).resolves.toMatchObject({ estado: resultado });
      await controller.simular(user, 'pago', { resultado });
      await expect(controller.simular(user, 'pago', { resultado: resultado === 'aprobado' ? 'rechazado' : 'aprobado' })).rejects.toThrow();
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.stockAlmacen.update).toHaveBeenCalledTimes(1);
    expect(tx.stockAlmacen.update).toHaveBeenCalledWith(expect.objectContaining({
      data: resultado === 'aprobado'
        ? { cantidad: { decrement: 2 }, reservado: { decrement: 2 } }
        : { reservado: { decrement: 2 } },
    }));
    expect(tx.cajaTurno.update).toHaveBeenCalledTimes(resultado === 'aprobado' ? 1 : 0);
    expect(tx.venta.update).toHaveBeenCalledWith(expect.objectContaining({ data: { estado: resultado === 'aprobado' ? 'cobrada' : 'anulada' } }));
  });
});
