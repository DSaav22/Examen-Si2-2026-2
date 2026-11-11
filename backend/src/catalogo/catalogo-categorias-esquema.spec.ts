jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { CatalogoController } from './catalogo.controller';
import { TenantContext } from '../tenancy/tenant-context';

describe('Catálogo: piloto de categorías por esquema', () => {
  const idA = '00000000-0000-4000-8000-000000000001';
  const idB = '33333333-3333-4333-8333-333333333333';

  function preparar(activo: boolean) {
    const legacy = { categoria: { findMany: jest.fn().mockResolvedValue([{ nombre: 'Compartida' }]) } };
    const clientes = new Map([
      [idA, { categoria: { findMany: jest.fn().mockResolvedValue([{ nombre: 'A' }]) } }],
      [idB, { categoria: { findMany: jest.fn().mockResolvedValue([{ nombre: 'B' }]) } }],
    ]);
    const esquemas = { clienteTienda: jest.fn((id: string) => {
      const cliente = clientes.get(id);
      if (!cliente) throw new Error('ESQUEMA_INEXISTENTE');
      return cliente;
    }) };
    const config = { get: () => activo ? 'true' : undefined };
    const controller = new CatalogoController({} as never, {} as never, legacy as never, esquemas as never, config as never);
    return { controller, legacy, esquemas };
  }

  it('conserva la consulta anterior cuando el piloto está desactivado', async () => {
    const { controller, legacy, esquemas } = preparar(false);
    await expect(controller.categorias()).resolves.toEqual([{ nombre: 'Compartida' }]);
    expect(legacy.categoria.findMany).toHaveBeenCalledTimes(1);
    expect(esquemas.clienteTienda).not.toHaveBeenCalled();
  });

  it('encamina solicitudes concurrentes al esquema de su propio contexto', async () => {
    const { controller, esquemas } = preparar(true);
    const resultado = await Promise.all([idA, idB, idA, idB].map(id =>
      TenantContext.enTienda(id, async () => { await Promise.resolve(); return controller.categorias(); }),
    ));
    expect(resultado).toEqual([[{ nombre: 'A' }], [{ nombre: 'B' }], [{ nombre: 'A' }], [{ nombre: 'B' }]]);
    expect(esquemas.clienteTienda.mock.calls.map(([id]) => id)).toEqual([idA, idB, idA, idB]);
  });

  it('rechaza ausencia de tienda o esquema inválido sin volver a la base compartida', async () => {
    const { controller, legacy } = preparar(true);
    await expect(controller.categorias()).rejects.toThrow('TENANT_REQUERIDO');
    await expect(TenantContext.enTienda('inexistente', () => controller.categorias())).rejects.toThrow('ESQUEMA_INEXISTENTE');
    expect(legacy.categoria.findMany).not.toHaveBeenCalled();
  });
});
