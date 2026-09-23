import { CatalogoService } from './catalogo.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('CatalogoService.listarProductos', () => {
  const producto = { id: 'p-1', nombre: 'Blazer', variantes: [] };
  let service: CatalogoService;
  let prisma: {
    producto: { count: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      producto: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([producto]),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    service = new CatalogoService(prisma as unknown as PrismaService);
  });

  it('combina búsqueda, filtros y devuelve metadatos de paginación', async () => {
    const result = await service.listarProductos({
      busqueda: 'blazer',
      sku: 'SKU-1',
      categoria: 'sastreria',
      talla: 'M',
      color: 'negro',
      sucursalId: 's-1',
      descuento: true,
      ordenar: 'precio-desc',
      pagina: 2,
      limite: 3,
    });

    expect(result).toMatchObject({
      items: [producto],
      total: 1,
      pagina: 2,
      limite: 3,
      totalPaginas: 1,
      hayMas: false,
    });
    const options = prisma.producto.findMany.mock.calls[0][0];
    expect(options.where).toMatchObject({
      categoria: 'sastreria',
      descuentoPct: { gt: 0 },
      AND: [{ variantes: { some: { sku: { contains: 'SKU-1', mode: 'insensitive' } } } }],
    });
    expect(options.skip).toBe(3);
    expect(options.take).toBe(3);
    expect(options.orderBy).toEqual({ precioBase: 'desc' });
  });

  it('mantiene el formato de lista para consumidores existentes sin paginación', async () => {
    const result = await service.listarProductos({ ordenar: 'relevancia' });

    expect(result).toEqual([producto]);
    expect(prisma.producto.findMany.mock.calls[0][0].take).toBeUndefined();
  });
});
