import { BadRequestException, ConflictException, ForbiddenException, HttpException } from '@nestjs/common';
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../auth/auth.service', () => ({ AuthService: class AuthService {} }));
jest.mock('../auth/cuentas.service', () => ({ CuentasService: class CuentasService {} }));
jest.mock('../auth/token.service', () => ({ TokenService: class TokenService {} }));
import { PlataformaService } from './plataforma.service';

describe('Renovación de suscripciones: autorización e idempotencia', () => {
  const dto = { planId: 'plan-a', periodo: 'MENSUAL', idempotencyKey: 'clave-prueba', pago: {} } as any;
  const pago = { estado: 'aprobado', suscripcion: { tiendaId: 'tienda-a', planId: 'plan-a', periodo: 'MENSUAL' } };
  let prisma: any;
  let servicio: PlataformaService;
  let pasarela: any;

  beforeEach(() => {
    prisma = {
      tienda: { findUnique: jest.fn().mockResolvedValue({ id: 'tienda-a', duenoCuentaId: 'dueno-a', pais: 'BO' }) },
      pagoSuscripcion: { findUnique: jest.fn().mockResolvedValue(pago) },
    };
    pasarela = { cobrar: jest.fn() };
    servicio = new PlataformaService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, pasarela, {} as any, { get: () => undefined } as any, {} as any);
    jest.spyOn(servicio, 'detalleTienda').mockResolvedValue({ id: 'tienda-a' } as any);
  });

  it('impide renovar una tienda de otra cuenta', async () => {
    await expect(servicio.renovar('otra-cuenta', 'tienda-a', dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.pagoSuscripcion.findUnique).not.toHaveBeenCalled();
  });

  it('impide utilizar Pix para renovar una tienda boliviana', async () => {
    await expect(servicio.renovar('dueno-a', 'tienda-a', { ...dto, metodoPago: 'pix' })).rejects.toBeInstanceOf(BadRequestException);
    expect(pasarela.cobrar).not.toHaveBeenCalled();
  });

  it.each([['AR', 'yape'], ['AR', 'plin'], ['PE', 'pix'], ['BR', 'qr_bolivia']])(
    'rechaza renovar %s con el metodo extranjero %s', async (pais, metodoPago) => {
      prisma.tienda.findUnique.mockResolvedValue({ id: 'tienda-a', duenoCuentaId: 'dueno-a', pais });
      await expect(servicio.renovar('dueno-a', 'tienda-a', { ...dto, metodoPago })).rejects.toBeInstanceOf(BadRequestException);
      expect(pasarela.cobrar).not.toHaveBeenCalled();
    },
  );

  it.each([['BO', 'pix'], ['AR', 'yape'], ['PE', 'pix']])(
    'rechaza el alta %s con %s antes de cobrar o crear la tienda', async (pais, metodoPago) => {
      prisma.cuenta = { findUniqueOrThrow: jest.fn().mockResolvedValue({ emailVerificado: true }) };
      await expect(servicio.suscribir('dueno-a', {
        ...dto, metodoPago, tienda: { nombre: 'Tienda demo', slug: 'tienda-demo', pais },
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(pasarela.cobrar).not.toHaveBeenCalled();
      expect(prisma.pagoSuscripcion.findUnique).not.toHaveBeenCalled();
    },
  );

  it('acepta el reintento idéntico sin volver a cobrar', async () => {
    await expect(servicio.renovar('dueno-a', 'tienda-a', dto)).resolves.toMatchObject({ repetido: true });
    expect(pasarela.cobrar).not.toHaveBeenCalled();
  });

  it.each([
    { tiendaId: 'tienda-b', planId: 'plan-a', periodo: 'MENSUAL' },
    { tiendaId: 'tienda-a', planId: 'plan-b', periodo: 'MENSUAL' },
    { tiendaId: 'tienda-a', planId: 'plan-a', periodo: 'ANUAL' },
  ])('rechaza reutilizar la clave para otra operación: %o', async (suscripcion) => {
    prisma.pagoSuscripcion.findUnique.mockResolvedValue({ ...pago, suscripcion });
    await expect(servicio.renovar('dueno-a', 'tienda-a', dto)).rejects.toBeInstanceOf(ConflictException);
    expect(pasarela.cobrar).not.toHaveBeenCalled();
  });

  it('no considera aprobado un pago rechazado', async () => {
    prisma.pagoSuscripcion.findUnique.mockResolvedValue({ ...pago, estado: 'rechazado' });
    await expect(servicio.renovar('dueno-a', 'tienda-a', dto)).rejects.toBeInstanceOf(HttpException);
    expect(pasarela.cobrar).not.toHaveBeenCalled();
  });
});
