jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { CuentasService } from './cuentas.service';

describe('Perfiles de cuenta por esquema', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  const nombre = 'tienda_00000000000040008000000000000001';
  const prisma = {
    tienda: { findMany: jest.fn(), findUnique: jest.fn() },
    usuario: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
  const tiendas = { porId: jest.fn() };
  const servicio = new CuentasService(prisma as any, {} as any, {} as any, tiendas as any);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.tienda.findMany.mockResolvedValue([{ id }]);
  });

  it('descubre el perfil únicamente en el esquema de la tienda', async () => {
    prisma.$queryRaw.mockResolvedValue([{ nspname: nombre }]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ tiendaId: id, esquemaTiendaId: id, rol: 'ADMIN' }]);
    prisma.tienda.findUnique.mockResolvedValue({ duenoCuentaId: 'cuenta' });
    tiendas.porId.mockResolvedValue({ id, slug: 'prueba', nombre: 'Prueba', vigente: true, plan: null });
    expect(await servicio.tiendasDe('cuenta')).toEqual([expect.objectContaining({ tiendaId: id, rol: 'ADMIN', esDueno: true })]);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining(`"${nombre}".usuarios`), 'cuenta');
    expect(prisma.usuario.findMany).not.toHaveBeenCalled();
  });

  it('rechaza un esquema faltante sin consultar usuarios compartidos', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(servicio.tiendasDe('cuenta')).rejects.toThrow('ESQUEMA_TIENDA_INEXISTENTE');
    expect(prisma.usuario.findMany).not.toHaveBeenCalled();
  });

  it('rechaza un perfil cuyo identificador no coincide con su esquema', async () => {
    prisma.$queryRaw.mockResolvedValue([{ nspname: nombre }]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ tiendaId: 'otro', esquemaTiendaId: id, rol: 'ADMIN' }]);
    await expect(servicio.tiendasDe('cuenta')).rejects.toThrow('PERFIL_TIENDA_INCONSISTENTE');
  });
});
