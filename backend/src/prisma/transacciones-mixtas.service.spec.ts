jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { TransaccionesMixtasService } from './transacciones-mixtas.service';
import { PrismaEsquemasService } from './prisma-esquemas.service';

describe('Transacciones mixtas', () => {
  const tiendaId = '00000000-0000-4000-8000-000000000001';
  let consulta: jest.Mock;
  let transaccion: jest.Mock;
  let servicio: TransaccionesMixtasService;

  beforeEach(() => {
    consulta = jest.fn().mockResolvedValue([{ esquema: 'tienda_00000000000040008000000000000001', tienda: tiendaId }]);
    transaccion = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ $queryRaw: consulta }));
    const esquemas = { clienteTienda: jest.fn(() => ({ $transaction: transaccion })) } as unknown as PrismaEsquemasService;
    servicio = new TransaccionesMixtasService(esquemas);
  });

  it('abre una transacción en la tienda y establece el contexto antes de ejecutar', async () => {
    const trabajo = jest.fn().mockResolvedValue('ok');
    await expect(servicio.enTienda(tiendaId, trabajo)).resolves.toBe('ok');
    expect(consulta).toHaveBeenCalledTimes(1);
    expect(trabajo).toHaveBeenCalledTimes(1);
    expect(transaccion).toHaveBeenCalledTimes(1);
  });

  it('rechaza un esquema equivocado antes de llamar al trabajo', async () => {
    consulta.mockResolvedValue([{ esquema: 'public', tienda: tiendaId }]);
    const trabajo = jest.fn();
    await expect(servicio.enTienda(tiendaId, trabajo)).rejects.toThrow('CONTEXTO_TIENDA_INVALIDO');
    expect(trabajo).not.toHaveBeenCalled();
  });

  it('propaga un fallo para que Prisma revierta la transacción', async () => {
    await expect(servicio.enTienda(tiendaId, async () => { throw new Error('FALLO'); })).rejects.toThrow('FALLO');
  });
});
