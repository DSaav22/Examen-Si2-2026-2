jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { ForbiddenException } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import type { TiendasService } from '../tenancy/tiendas.service';
import { TenantContext } from '../tenancy/tenant-context';

describe('AnaliticaService (aislamiento y planes)', () => {
  let service: AnaliticaService;
  let mockPrisma: any;
  let mockEsquemas: any;
  let mockTiendas: any;
  let mockConfig: any;

  const tiendaCadenaId = '00000000-0000-4000-8000-000000000001';
  const tiendaSinModuloId = '00000000-0000-4000-8000-000000000002';

  beforeEach(() => {
    mockPrisma = {
      venta: { findMany: jest.fn() },
      variante: { findMany: jest.fn() },
    };

    mockEsquemas = {
      clienteTienda: jest.fn().mockReturnValue(mockPrisma),
    };

    mockTiendas = {
      porId: jest.fn().mockImplementation((id: string) => {
        if (id === tiendaCadenaId) {
          return Promise.resolve({
            id: tiendaCadenaId,
            nombre: 'Tienda Cadena',
            moneda: 'BOB',
            vigente: true,
            plan: { modulos: ['catalogo', 'analitica'] },
          });
        }
        if (id === tiendaSinModuloId) {
          return Promise.resolve({
            id: tiendaSinModuloId,
            nombre: 'Tienda Inicial',
            moneda: 'BOB',
            vigente: true,
            plan: { modulos: ['catalogo', 'pos'] },
          });
        }
        return Promise.resolve(null);
      }),
    };

    mockConfig = {
      get: jest.fn().mockReturnValue('false'),
    };

    service = new AnaliticaService(
      mockPrisma as unknown as PrismaService,
      mockEsquemas as unknown as PrismaEsquemasService,
      mockTiendas as unknown as TiendasService,
      mockConfig as any,
    );
  });

  it('rechaza con ForbiddenException si el plan no incluye el módulo analítica', async () => {
    await expect(
      TenantContext.run({ tiendaId: tiendaSinModuloId }, () => service.panel()),
    ).rejects.toThrow(ForbiddenException);
  });

  it('devuelve estado vacío coherente si la tienda no tiene ventas en el período', async () => {
    mockPrisma.venta.findMany.mockResolvedValue([]);
    const res = await TenantContext.run({ tiendaId: tiendaCadenaId }, () => service.panel());

    expect(res.tienda.id).toBe(tiendaCadenaId);
    expect(res.datos.ventasCobradas).toBe(0);
    expect(res.datos.clientesConCompras).toBe(0);
    expect(res.datos.variantesConVentas28Dias).toBe(0);
    expect(res.demanda.predicciones).toEqual([]);
    expect(res.segmentos.grupos).toHaveLength(3);
    expect(res.segmentos.grupos.every((g: any) => g.cantidad === 0)).toBe(true);
  });

  it('filtra estrictamente por tiendaId en ventas, líneas y variantes', async () => {
    mockPrisma.venta.findMany.mockResolvedValue([
      {
        creadaEn: new Date(Date.now() - 2 * 86400_000),
        clientaId: 'c1',
        total: 100,
        lineas: [{ varianteId: 'var-1', cantidad: 3, cantidadDevuelta: 1 }],
      },
    ]);
    mockPrisma.variante.findMany.mockResolvedValue([
      {
        id: 'var-1',
        talla: 'M',
        color: 'Negro',
        sku: 'SKU-1',
        producto: { nombre: 'Vestido' },
        stocks: [{ cantidad: 10, reservado: 2 }],
      },
    ]);

    const res = await TenantContext.run({ tiendaId: tiendaCadenaId }, () => service.panel());

    expect(mockPrisma.venta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tiendaId: tiendaCadenaId, estado: 'cobrada' }),
      }),
    );

    expect(res.datos.ventasCobradas).toBe(1);
    expect(res.datos.clientesConCompras).toBe(1);
    expect(res.datos.variantesConVentas28Dias).toBe(1);
    expect(res.demanda.predicciones).toHaveLength(1);
    expect(res.demanda.predicciones[0].disponible).toBe(8); // 10 - 2
  });

  it('utiliza el cliente por esquema cuando TENANT_SCHEMAS_PERFILES es true', async () => {
    mockConfig.get.mockReturnValue('true');
    mockPrisma.venta.findMany.mockResolvedValue([]);

    await TenantContext.run({ tiendaId: tiendaCadenaId }, () => service.panel());

    expect(mockEsquemas.clienteTienda).toHaveBeenCalledWith(tiendaCadenaId);
  });
});
