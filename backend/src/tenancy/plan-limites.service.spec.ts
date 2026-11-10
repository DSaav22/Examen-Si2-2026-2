import { ForbiddenException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PlanLimitesService } from './plan-limites.service';
import { TenantContext } from './tenant-context';

describe('Límites del plan', () => {
  let prisma: any;
  let tiendas: any;
  let servicio: PlanLimitesService;
  const plan = { nombre: 'Inicial', codigo: 'INICIAL', maxUsuarios: 3, maxSucursales: 1, maxProductos: 200 };

  beforeEach(() => {
    prisma = {
      usuario: { count: jest.fn().mockResolvedValue(2) },
      sucursal: { count: jest.fn().mockResolvedValue(0) },
      producto: { count: jest.fn().mockResolvedValue(199) },
    };
    tiendas = { porId: jest.fn().mockResolvedValue({ plan }) };
    servicio = new PlanLimitesService(prisma, tiendas);
    jest.spyOn(TenantContext, 'tiendaIdOrThrow').mockReturnValue('tienda-a');
  });

  afterEach(() => jest.restoreAllMocks());

  it('cuenta personal activo, sin contabilizar clientas', async () => {
    await servicio.verificar('usuarios');
    expect(prisma.usuario.count).toHaveBeenCalledWith({ where: { rol: { not: Rol.CLIENTA }, activo: true } });
    expect(tiendas.porId).toHaveBeenCalledWith('tienda-a');
  });

  it.each([
    ['usuarios', 'usuario', 3],
    ['sucursales', 'sucursal', 1],
    ['productos', 'producto', 200],
  ] as const)('impide añadir %s cuando llega al límite', async (recurso, modelo, limite) => {
    prisma[modelo].count.mockResolvedValue(limite);
    await expect(servicio.verificar(recurso)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite agregar productos cuando el plan no tiene límite de productos', async () => {
    tiendas.porId.mockResolvedValue({ plan: { ...plan, maxProductos: null } });
    await expect(servicio.verificar('productos')).resolves.toBeUndefined();
  });

  it('rechaza la operación cuando no hay plan vigente', async () => {
    tiendas.porId.mockResolvedValue({ plan: null });
    await expect(servicio.verificar('productos')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
