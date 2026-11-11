import { ConfigService } from '@nestjs/config';
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
import { PrismaEsquemasService, urlParaEsquema } from './prisma-esquemas.service';

const URL_PRUEBA = 'postgresql://test:test@localhost:5432/test?schema=public';
const ID_A = '00000000-0000-4000-8000-000000000001';
const ID_B = '00000000-0000-4000-8000-000000000002';

describe('Clientes Prisma por esquema', () => {
  let servicio: PrismaEsquemasService;
  beforeEach(() => { servicio = new PrismaEsquemasService({ get: () => URL_PRUEBA } as unknown as ConfigService); });
  afterEach(async () => { await servicio.onModuleDestroy(); });

  it('asigna el esquema interno y limita conexiones sin aceptar identificadores arbitrarios', () => {
    const url = new URL(urlParaEsquema(URL_PRUEBA, 'tienda_00000000000040008000000000000001'));
    expect(url.searchParams.get('schema')).toBe('tienda_00000000000040008000000000000001');
    expect(url.searchParams.get('connection_limit')).toBe('2');
    expect(() => urlParaEsquema(URL_PRUEBA, 'public; DROP SCHEMA public')).toThrow('ESQUEMA_INVALIDO');
    expect(() => urlParaEsquema('no-es-una-url', 'public')).toThrow('DATABASE_URL_INVALIDA');
  });

  it('reutiliza el cliente por tienda y mantiene clientes distintos por ámbito', () => {
    expect(servicio.clienteTienda(ID_A)).toBe(servicio.clienteTienda(ID_A));
    expect(servicio.clienteTienda(ID_A)).not.toBe(servicio.clienteTienda(ID_B));
    expect(servicio.clienteTienda(ID_A)).not.toBe(servicio.clientePlataforma());
    expect(() => servicio.clienteTienda('public')).toThrow('TIENDA_ID_INVALIDO');
  });

  it('rechaza modelos globales desde tienda y modelos de tienda desde plataforma', () => {
    expect(() => servicio.clienteTienda(ID_A).tienda).toThrow('MODELO_FUERA_DE_AMBITO');
    expect(() => servicio.clientePlataforma().usuario).toThrow('MODELO_FUERA_DE_AMBITO');
  });

  it('no devuelve clientes después del cierre', async () => {
    await servicio.onModuleDestroy();
    expect(() => servicio.clientePlataforma()).toThrow('CLIENTES_EN_CIERRE');
    expect(() => servicio.clienteTienda(ID_A)).toThrow('CLIENTES_EN_CIERRE');
  });

  it('desaloja clientes inactivos bajo LRU permitiendo atender más de 20 tiendas', () => {
    for (let i = 1; i <= 25; i++) {
      const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      expect(servicio.clienteTienda(id)).toBeDefined();
    }
    expect(servicio.totalClientesEnCache()).toBeLessThanOrEqual(20);
  });

  it('falla cerrado cuando todas las conexiones tienen operaciones activas concurrentes', () => {
    const terminaciones: (() => void)[] = [];
    for (let i = 1; i <= 20; i++) {
      const id = `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`;
      servicio.clienteTienda(id);
      terminaciones.push(servicio.iniciarOperacion(id));
    }
    expect(() => servicio.clienteTienda('00000000-0000-4000-8000-000000000021')).toThrow('LIMITE_CLIENTES_TIENDA');
    terminaciones.forEach((fn) => fn());
    expect(() => servicio.clienteTienda('00000000-0000-4000-8000-000000000021')).not.toThrow();
  });
});
