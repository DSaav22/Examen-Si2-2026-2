import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StockInsuficienteError } from './errores-venta';
import { VentasService } from './ventas.service';
import { SPIKE_UUIDS } from '../spike-ids';

const enabled = process.env.SPIKE_B === '1';

(enabled ? describe : describe.skip)('Spike B — última unidad (UC07)', () => {
  let prisma: PrismaService;
  let ventas: VentasService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PrismaService, VentasService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    ventas = moduleRef.get(VentasService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.lineaVenta.deleteMany();
    await prisma.venta.deleteMany();
    await prisma.stockAlmacen.update({
      where: {
        varianteId_almacenId: {
          varianteId: SPIKE_UUIDS.variante,
          almacenId: SPIKE_UUIDS.almacen,
        },
      },
      data: { cantidad: 1 },
    });
  });

  it('una cobra, la otra falla; stock final = 0; uuid no duplica', async () => {
    const payload = {
      canal: 'pos' as const,
      medioPago: 'efectivo' as const,
      almacenId: SPIKE_UUIDS.almacen,
      cajaTurnoId: SPIKE_UUIDS.turno,
      lineas: [{ varianteId: SPIKE_UUIDS.variante, cantidad: 1 }],
    };

    const a = { ...payload, uuid: randomUUID() };
    const b = { ...payload, uuid: randomUUID() };

    const resultados = await Promise.allSettled([
      ventas.cobrar(a),
      ventas.cobrar(b),
    ]);

    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const ko = resultados.filter((r) => r.status === 'rejected');

    expect(ok).toHaveLength(1);
    expect(ko).toHaveLength(1);
    if (ko[0].status === 'rejected') {
      expect(ko[0].reason).toBeInstanceOf(StockInsuficienteError);
    }

    const stock = await prisma.stockAlmacen.findUniqueOrThrow({
      where: {
        varianteId_almacenId: {
          varianteId: SPIKE_UUIDS.variante,
          almacenId: SPIKE_UUIDS.almacen,
        },
      },
    });
    expect(stock.cantidad).toBe(0);

    const cobradas = await prisma.venta.count({ where: { estado: 'cobrada' } });
    expect(cobradas).toBe(1);

    const idem = await Promise.all([
      ventas.cobrar(a),
      ventas.cobrar(a),
    ]);
    expect(idem[0].id).toBe(idem[1].id);
    expect(await prisma.venta.count()).toBe(1);
  });
});
