jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../auth/auth.service', () => ({ AuthService: class AuthService {} }));
jest.mock('../auth/cuentas.service', () => ({ CuentasService: class CuentasService {} }));
jest.mock('../auth/token.service', () => ({ TokenService: class TokenService {} }));
import { PlataformaService } from './plataforma.service';

describe('Directorio público de empresas', () => {
  it('selecciona exclusivamente identidad pública de tiendas activas y vigentes', async () => {
    const empresas = [{ slug: 'tienda-demo', nombre: 'Tienda demo', logo: null, pais: 'PY' }];
    const prisma = { tienda: { findMany: jest.fn().mockResolvedValue(empresas) } };
    const servicio = new PlataformaService(prisma as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, { get: () => undefined } as any);
    await expect(servicio.directorio()).resolves.toEqual(empresas);
    const consulta = prisma.tienda.findMany.mock.calls[0][0];
    expect(consulta.select).toEqual({ slug: true, nombre: true, logo: true, pais: true });
    expect(consulta.where.estado).toBe('activa');
    expect(consulta.where.esPrueba).toBe(false);
    expect(consulta.where.suscripciones.some.estado).toBe('activa');
    expect(consulta.where.suscripciones.some.inicio.lte).toBeInstanceOf(Date);
    expect(consulta.where.suscripciones.some.venceEn.gt).toEqual(consulta.where.suscripciones.some.inicio.lte);
    expect(consulta.take).toBe(60);
  });
});
