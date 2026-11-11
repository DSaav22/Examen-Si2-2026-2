jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../notificaciones/notificaciones.service', () => ({ NotificacionesService: class NotificacionesService {} }));
import { HttpException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { StockInsuficienteError, TurnoInvalidoError } from '../ventas/errores-venta';
import { SyncService } from './sync.service';
import { TenantContext } from '../tenancy/tenant-context';

describe('SyncService (Modo Esquemas / Offline)', () => {
  let service: SyncService;
  let mockPrisma: any;
  let mockVentas: any;
  let mockCuentas: any;
  let mockInventario: any;
  let mockLimites: any;
  let mockTiendas: any;
  let mockNotificaciones: any;
  let mockConfig: any;
  let mockEsquemas: any;

  const tiendaId = '00000000-0000-4000-8000-000000000001';
  const actorAdmin = { sub: 'usr-admin-1', rol: Rol.ADMIN, email: 'admin@tienda.com', tiendaId, tipo: 'tienda' as const, cuentaId: 'cta-1' };
  const actorCajero = { sub: 'usr-cajero-1', rol: Rol.CAJERO, email: 'cajero@tienda.com', tiendaId, tipo: 'tienda' as const, cuentaId: 'cta-2' };
  const actorCliente = { sub: 'usr-cli-1', rol: Rol.CLIENTA, email: 'cli@example.com', tiendaId, tipo: 'tienda' as const, cuentaId: 'cta-3' };

  beforeEach(() => {
    mockPrisma = {
      operacionSync: {
        findFirst: jest.fn(),
        create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'op-row-1', ...args.data })),
        update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      dispositivo: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      tienda: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ventanaOfflineDias: 7 }),
        update: jest.fn().mockResolvedValue({}),
      },
      usuario: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 'usr-admin-1' }]),
      },
      producto: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      variante: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      almacen: {
        count: jest.fn().mockResolvedValue(1),
      },
      cajaTurno: {
        count: jest.fn().mockResolvedValue(1),
      },
      variante: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => fn(mockPrisma)),
    };

    mockVentas = {
      cobrar: jest.fn(),
    };
    mockCuentas = {
      normalizar: jest.fn((e: string) => e.toLowerCase().trim()),
      obtenerOCrear: jest.fn().mockResolvedValue({ cuenta: { id: 'cta-nueva' } }),
    };
    mockInventario = {
      registrar: jest.fn().mockResolvedValue({ id: 'mov-1' }),
    };
    mockLimites = {
      verificar: jest.fn().mockResolvedValue(undefined),
    };
    mockTiendas = {
      invalidar: jest.fn(),
    };
    mockNotificaciones = {
      crear: jest.fn().mockResolvedValue({}),
    };
    mockConfig = {
      get: jest.fn((k: string) => (k === 'TENANT_SCHEMAS_PERFILES' ? 'true' : null)),
    };
    mockEsquemas = {
      clienteTienda: jest.fn(() => mockPrisma),
      clientePlataforma: jest.fn(() => mockPrisma),
    };

    service = new SyncService(
      mockPrisma,
      mockVentas,
      mockCuentas,
      mockInventario,
      mockLimites,
      mockTiendas,
      mockNotificaciones,
      mockConfig,
      mockEsquemas,
    );
  });

  describe('Idempotencia y estados de lote', () => {
    it('marca repetida si la operación ya fue aplicada con el mismo hash', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const opId = 'op-123';
        const creadaEn = new Date().toISOString();
        const datos = { id: 'cli-1', nombre: 'Ana', email: 'ana@example.com' };

        // Simula que la fila ya existe y su estado es aplicada
        mockPrisma.operacionSync.findFirst.mockResolvedValue({
          id: 'row-1',
          operationId: opId,
          hash: require('./idempotencia.interceptor').huella({ tipo: 'cliente', creadaEn, datos }),
          estado: 'aplicada',
          actualizadoEn: new Date(),
          resultado: { estado: 'aplicada', recursoId: 'cli-1' },
        });

        const res = await service.lote(
          { dispositivoId: 'dev-1', operaciones: [{ id: opId, tipo: 'cliente', creadaEn, datos }] },
          actorAdmin,
        );

        expect(res.procesadas).toBe(1);
        expect(res.resumen.repetida).toBe(1);
        expect(res.resultados[0].estado).toBe('repetida');
        expect(res.resultados[0].recursoId).toBe('cli-1');
      });
    });

    it('rechaza con IDEMPOTENCIA_CONFLICTO si el mismo ID se envía con distinto payload', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const opId = 'op-123';
        const creadaEn = new Date().toISOString();

        mockPrisma.operacionSync.findFirst.mockResolvedValue({
          id: 'row-1',
          operationId: opId,
          hash: 'hash-distinto-previo',
          estado: 'aplicada',
          actualizadoEn: new Date(),
        });

        const res = await service.lote(
          { dispositivoId: 'dev-1', operaciones: [{ id: opId, tipo: 'cliente', creadaEn, datos: { nombre: 'Otro' } }] },
          actorAdmin,
        );

        expect(res.resumen.rechazada).toBe(1);
        expect(res.resultados[0].codigo).toBe('IDEMPOTENCIA_CONFLICTO');
      });
    });
  });

  describe('Ventana offline y fechas', () => {
    it('marca vencida con FUERA_DE_VENTANA si supera los días configurados', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        // Ventana es 7 días; enviamos una de 10 días atrás
        const fechaAntigua = new Date(Date.now() - 10 * 86_400_000).toISOString();
        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [{ id: 'op-vieja', tipo: 'cliente', creadaEn: fechaAntigua, datos: { id: 'c1', nombre: 'X', email: 'x@ex.invalid' } }],
          },
          actorAdmin,
        );

        expect(res.resumen.vencida).toBe(1);
        expect(res.resultados[0].codigo).toBe('FUERA_DE_VENTANA');
      });
    });

    it('rechaza con FECHA_INVALIDA si la fecha está en el futuro', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const fechaFutura = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [{ id: 'op-futura', tipo: 'cliente', creadaEn: fechaFutura, datos: { id: 'c2', nombre: 'Y', email: 'y@ex.invalid' } }],
          },
          actorAdmin,
        );

        expect(res.resumen.rechazada).toBe(1);
        expect(res.resultados[0].codigo).toBe('FECHA_INVALIDA');
      });
    });
  });

  describe('Conflictos y tratamiento de errores', () => {
    it('marca conflicto con STOCK_INSUFICIENTE si la venta excede el stock', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        mockPrisma.usuario.count = jest.fn().mockResolvedValue(1);
        mockPrisma.variante.count = jest.fn().mockResolvedValue(1);
        mockPrisma.almacen.count = jest.fn().mockResolvedValue(1);

        mockVentas.cobrar.mockRejectedValue(new StockInsuficienteError('var-1', 0, 2));

        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [
              {
                id: 'op-vta-conflicto',
                tipo: 'venta',
                creadaEn: new Date().toISOString(),
                datos: {
                  almacenId: 'alm-1',
                  clientaId: 'cli-1',
                  medioPago: 'efectivo',
                  canal: 'pos',
                  lineas: [{ varianteId: 'var-1', cantidad: 2 }],
                },
              },
            ],
          },
          actorCajero,
        );

        expect(res.resumen.conflicto).toBe(1);
        expect(res.resultados[0].codigo).toBe('STOCK_INSUFICIENTE');
        expect(res.resultados[0].detalle?.disponible).toBe(0);
        expect(res.resultados[0].detalle?.pedido).toBe(2);
        // Debe haberse notificado a los administradores
        expect(mockNotificaciones.crear).toHaveBeenCalled();
      });
    });

    it('rechaza si un rol no autorizado intenta vender', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [
              {
                id: 'op-vta-cliente',
                tipo: 'venta',
                creadaEn: new Date().toISOString(),
                datos: { almacenId: 'alm-1', lineas: [], medioPago: 'efectivo', canal: 'pos' },
              },
            ],
          },
          actorCliente, // Rol CLIENTA no puede vender
        );

        expect(res.resumen.rechazada).toBe(1);
        expect(res.resultados[0].codigo).toBe('PERMISO_DENEGADO');
      });
    });

    it('rechaza ventas offline con medios de pago distintos a efectivo', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [
              {
                id: 'op-vta-qr',
                tipo: 'venta',
                creadaEn: new Date().toISOString(),
                datos: { almacenId: 'alm-1', lineas: [], medioPago: 'qr', canal: 'pos' },
              },
            ],
          },
          actorCajero,
        );

        expect(res.resumen.rechazada).toBe(1);
        expect(res.resultados[0].codigo).toBe('PAGO_REQUIERE_RED');
      });
    });

    it('permite a un administrador descartar un conflicto registrado', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        mockPrisma.operacionSync.findFirst.mockResolvedValue({
          id: 'row-conflicto-1',
          operationId: 'op-conflicto-1',
          estado: 'conflicto',
        });

        await service.descartar('row-conflicto-1', actorAdmin);

        expect(mockPrisma.auditoria.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ accion: 'sync_conflicto_descartado' }),
          }),
        );
        expect(mockPrisma.operacionSync.update).toHaveBeenCalledWith({
          where: { id: 'row-conflicto-1' },
          data: { estado: 'descartada' },
        });
      });
    });
  });

  describe('Fusión de clientes offline y propagación a ventas dependientes', () => {
    it('fusiona cliente existente y reasocia venta en el mismo lote', async () => {
      await TenantContext.enTienda(tiendaId, async () => {
        const { randomUUID } = require('crypto');
        const opCliId = randomUUID();
        const opVtaId = randomUUID();
        const clienteIdLocal = randomUUID();
        const clienteIdServidor = randomUUID();

        // Al buscar el correo, ya existe un usuario en la tienda
        mockPrisma.usuario.findUnique.mockResolvedValue(null);
        mockPrisma.usuario.findFirst.mockResolvedValue({ id: clienteIdServidor, rol: Rol.CLIENTA });

        mockPrisma.usuario.count = jest.fn().mockResolvedValue(1);
        mockPrisma.variante.count = jest.fn().mockResolvedValue(1);
        mockPrisma.almacen.count = jest.fn().mockResolvedValue(1);

        mockVentas.cobrar.mockResolvedValue({ id: 'vta-1', total: 100, clientaId: clienteIdServidor });

        const res = await service.lote(
          {
            dispositivoId: 'dev-1',
            operaciones: [
              {
                id: opCliId,
                tipo: 'cliente',
                creadaEn: new Date().toISOString(),
                datos: { id: clienteIdLocal, nombre: 'Ana Duplicada', email: 'ana@yaexiste.com' },
              },
              {
                id: opVtaId,
                tipo: 'venta',
                creadaEn: new Date().toISOString(),
                datos: {
                  almacenId: 'alm-1',
                  clientaId: clienteIdLocal, // Usa el id local
                  medioPago: 'efectivo',
                  canal: 'pos',
                  lineas: [{ varianteId: 'var-1', cantidad: 1 }],
                },
              },
            ],
          },
          actorCajero,
        );

        expect(res.procesadas).toBe(2);
        expect(res.resumen.fusionada).toBe(1);
        expect(res.resumen.aplicada).toBe(1);
        expect(res.resultados[0].estado).toBe('fusionada');
        expect(res.resultados[0].recursoId).toBe(clienteIdServidor);

        // Verifica que la venta fue cobrada con el clienteId del servidor (fusionado)
        expect(mockVentas.cobrar).toHaveBeenCalledWith(
          expect.objectContaining({ clientaId: clienteIdServidor }),
          expect.anything(),
          expect.anything(),
        );
      });
    });
  });
});
