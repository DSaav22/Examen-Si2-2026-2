import { BadRequestException, ConflictException, ForbiddenException, HttpException } from '@nestjs/common';
jest.mock('@nestjs/config', () => ({ ConfigService: class ConfigService {} }));
jest.mock('../auth/auth.service', () => ({ AuthService: class AuthService {} }));
jest.mock('../auth/cuentas.service', () => ({ CuentasService: class CuentasService {} }));
jest.mock('../auth/token.service', () => ({ TokenService: class TokenService {} }));
import { PlataformaService } from './plataforma.service';

describe('Flujo SaaS integral: planes, cuentas, verificación, pagos simulados y restricciones', () => {
  let prisma: any;
  let servicio: PlataformaService;
  let pasarela: any;
  let esquemas: any;
  let cuentas: any;
  let auth: any;
  let limites: any;

  beforeEach(() => {
    prisma = {
      cuenta: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      tienda: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      plan: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'plan-inicial', codigo: 'INICIAL', nombre: 'Inicial', activo: true, precioMensual: 19, moneda: 'USD', orden: 1, maxUsuarios: 3, maxSucursales: 1, maxProductos: 200, modulos: ['catalogo'] },
          { id: 'plan-crecimiento', codigo: 'CRECIMIENTO', nombre: 'Crecimiento', activo: true, precioMensual: 49, moneda: 'USD', orden: 2, maxUsuarios: 10, maxSucursales: 3, maxProductos: 2000, modulos: ['catalogo', 'reportes_ia'] },
          { id: 'plan-cadena', codigo: 'CADENA', nombre: 'Cadena', activo: true, precioMensual: 129, moneda: 'USD', orden: 3, maxUsuarios: 50, maxSucursales: 20, maxProductos: null, modulos: ['catalogo', 'analitica'] },
        ]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'plan-inicial') return Promise.resolve({ id: 'plan-inicial', codigo: 'INICIAL', nombre: 'Inicial', precioMensual: 19, moneda: 'USD', maxUsuarios: 3, maxSucursales: 1, maxProductos: 200 });
          if (where.id === 'plan-crecimiento') return Promise.resolve({ id: 'plan-crecimiento', codigo: 'CRECIMIENTO', nombre: 'Crecimiento', precioMensual: 49, moneda: 'USD', maxUsuarios: 10, maxSucursales: 3, maxProductos: 2000 });
          if (where.id === 'plan-cadena') return Promise.resolve({ id: 'plan-cadena', codigo: 'CADENA', nombre: 'Cadena', precioMensual: 129, moneda: 'USD', maxUsuarios: 50, maxSucursales: 20, maxProductos: null });
          return Promise.resolve(null);
        }),
      },
      pagoSuscripcion: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(cb => cb(prisma)),
    };
    pasarela = {
      cobrar: jest.fn().mockResolvedValue({ aprobado: true, referencia: 'SIM-TEST-REF', ultimos4: '4242', pasarela: 'simulada' }),
      reembolsar: jest.fn().mockResolvedValue(undefined),
    };
    esquemas = {
      crear: jest.fn().mockResolvedValue('tienda_test'),
    };
    cuentas = {
      buscar: jest.fn(),
      crear: jest.fn(),
      enviarVerificacion: jest.fn().mockResolvedValue({ modo: 'simulado', url: 'http://localhost:5173/verificar?token=token-123' }),
      verificar: jest.fn(),
      validarClave: jest.fn(),
      tiendasDe: jest.fn().mockResolvedValue([]),
    };
    auth = {
      cambiarTienda: jest.fn().mockResolvedValue({
        accessToken: 'jwt-tienda',
        user: { id: 'user-admin', email: 'admin@tienda.invalid', rol: 'ADMIN' },
        tienda: { id: 'tienda-1', slug: 'tienda-1', nombre: 'Tienda 1' },
        tiendas: [{ tiendaId: 'tienda-1', slug: 'tienda-1', nombre: 'Tienda 1', rol: 'ADMIN', vigente: true }],
      }),
    };
    limites = {
      uso: jest.fn().mockResolvedValue({ usuarios: 1, sucursales: 1, productos: 50 }),
    };

    servicio = new PlataformaService(
      prisma,
      cuentas,
      auth,
      {} as any,
      {
        invalidar: jest.fn(),
        porId: jest.fn().mockResolvedValue({ id: 'tienda-1', vigente: true, venceEn: new Date(), plan: { nombre: 'Crecimiento' } }),
      } as any,
      limites,
      pasarela,
      esquemas,
      { get: (key: string) => (key === 'TENANT_SCHEMAS_ALTA' ? 'true' : undefined) } as any,
      { clienteTienda: () => prisma } as any,
    );
  });

  describe('1. Catálogo de planes y validaciones de país/moneda', () => {
    it('retorna los tres planes con límites, módulos y descuentos', async () => {
      const planes = await servicio.planes();
      expect(planes).toHaveLength(3);
      expect(planes.map(p => p.codigo)).toEqual(['INICIAL', 'CRECIMIENTO', 'CADENA']);
      expect(planes[0].limites.productos).toBe(200);
      expect(planes[1].limites.productos).toBe(2000);
      expect(planes[2].limites.productos).toBeNull();
      expect(planes[0].precios.TRIMESTRAL).toBe(51.3); // 19 * 3 * 0.9
      expect(planes[0].precios.ANUAL).toBe(182.4); // 19 * 12 * 0.8
    });

    it('rechaza moneda incompatible con el país de la tienda', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', emailVerificado: true });
      await expect(
        servicio.suscribir('c1', {
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          idempotencyKey: 'idem-1',
          tienda: { nombre: 'Tienda BO', slug: 'tienda-bo', pais: 'BO', moneda: 'USD' }, // BO exige BOB
          pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('2. Registro y verificación de correo', () => {
    it('muestra modo demo sin afirmar envío real si SMTP no está configurado', async () => {
      cuentas.buscar.mockResolvedValue(null);
      cuentas.crear.mockResolvedValue({ id: 'c1', email: 'test@example.invalid' });

      const res = await servicio.registrar({
        nombre: 'Nuevo Usuario',
        email: 'test@example.invalid',
        password: 'Password123',
      });

      expect(res.ok).toBe(true);
      expect(res.verificacion.modo).toBe('simulado');
      expect(res.verificacion.url).toContain('/verificar?token=');
    });

    it('rechaza login con 403 si el correo no está verificado', async () => {
      cuentas.validarClave.mockResolvedValue({ id: 'c1', email: 'test@example.invalid', emailVerificado: false });

      await expect(
        servicio.login({ email: 'test@example.invalid', password: 'Password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('impide suscribirse si la cuenta no está verificada', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', emailVerificado: false });

      await expect(
        servicio.suscribir('c1', {
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          idempotencyKey: 'idem-1',
          tienda: { nombre: 'Tienda Test', slug: 'tienda-test', pais: 'BO', moneda: 'BOB' },
          pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('3. Pago simulado aprobado y rechazado', () => {
    it('un pago simulado rechazado no crea tienda ni esquema', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', emailVerificado: true });
      prisma.tienda.findUnique.mockResolvedValue(null);
      pasarela.cobrar.mockResolvedValue({ aprobado: false, motivo: 'TARJETA_RECHAZADA', ultimos4: '0002', pasarela: 'simulada' });

      await expect(
        servicio.suscribir('c1', {
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          idempotencyKey: 'idem-rechazo',
          tienda: { nombre: 'Tienda Rechazo', slug: 'tienda-rechazo', pais: 'BO', moneda: 'BOB' },
          pago: { titular: 'Test', numero: '4000000000000002', vence: '12/30', cvc: '123' },
        }),
      ).rejects.toBeInstanceOf(HttpException);

      expect(prisma.tienda.create).not.toHaveBeenCalled();
      expect(esquemas.crear).not.toHaveBeenCalled();
    });

    it('un pago simulado aprobado crea la tienda y conecta el aprovisionamiento de esquema', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', email: 'c1@test.invalid', nombre: 'Dueño 1', emailVerificado: true });
      prisma.tienda.findUnique.mockResolvedValue(null);

      const res = await servicio.suscribir('c1', {
        planId: 'plan-inicial',
        periodo: 'MENSUAL',
        idempotencyKey: 'idem-aprobado',
        tienda: { nombre: 'Tienda Aprobada', slug: 'tienda-aprobada', pais: 'BO', moneda: 'BOB' },
        pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });

      expect(pasarela.cobrar).toHaveBeenCalled();
      expect(prisma.tienda.create).toHaveBeenCalled();
      expect(esquemas.crear).toHaveBeenCalled();
      expect(auth.cambiarTienda).toHaveBeenCalled();
      expect(res.user.rol).toBe('ADMIN');
    });
  });

  describe('4. Idempotencia y protección contra doble cobro/creación', () => {
    it('un reintento idéntico devuelve la tienda ya creada sin cobrar ni crear de nuevo', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', emailVerificado: true });
      prisma.pagoSuscripcion.findUnique.mockResolvedValue({
        id: 'pago-1',
        estado: 'aprobado',
        pasarela: 'simulada:tarjeta',
        suscripcion: {
          tiendaId: 'tienda-existente',
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          tienda: { duenoCuentaId: 'c1', slug: 'tienda-existente', pais: 'BO', nombre: 'Tienda Existente', logo: null },
        },
      });

      const res = await servicio.suscribir('c1', {
        planId: 'plan-inicial',
        periodo: 'MENSUAL',
        idempotencyKey: 'clave-repetida',
        metodoPago: 'tarjeta',
        tienda: { nombre: 'Tienda Existente', slug: 'tienda-existente', pais: 'BO', moneda: 'BOB' },
        pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });

      expect(res.repetido).toBe(true);
      expect(pasarela.cobrar).not.toHaveBeenCalled();
      expect(prisma.tienda.create).not.toHaveBeenCalled();
    });

    it('rechaza la reutilización de idempotencyKey con datos distintos', async () => {
      prisma.cuenta.findUniqueOrThrow.mockResolvedValue({ id: 'c1', emailVerificado: true });
      prisma.pagoSuscripcion.findUnique.mockResolvedValue({
        id: 'pago-1',
        estado: 'aprobado',
        pasarela: 'simulada:tarjeta',
        suscripcion: {
          tiendaId: 'tienda-existente',
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          tienda: { duenoCuentaId: 'c1', slug: 'tienda-existente', pais: 'BO', nombre: 'Tienda Existente', logo: null },
        },
      });

      await expect(
        servicio.suscribir('c1', {
          planId: 'plan-crecimiento', // PLAN DISTINTO
          periodo: 'MENSUAL',
          idempotencyKey: 'clave-repetida',
          metodoPago: 'tarjeta',
          tienda: { nombre: 'Tienda Existente', slug: 'tienda-existente', pais: 'BO', moneda: 'BOB' },
          pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('5. Renovación, mejora y restricción de reducción por límites', () => {
    it('rechaza reducir a un plan inferior si el inventario actual supera el límite', async () => {
      prisma.tienda.findUnique.mockResolvedValue({ id: 'tienda-1', duenoCuentaId: 'c1', pais: 'BO' });
      // La tienda tiene 500 productos actualmente
      limites.uso.mockResolvedValue({ usuarios: 2, sucursales: 1, productos: 500 });

      // Intenta bajar a plan-inicial cuyo límite es 200 productos
      await expect(
        servicio.renovar('c1', 'tienda-1', {
          planId: 'plan-inicial',
          periodo: 'MENSUAL',
          idempotencyKey: 'clave-down',
          metodoPago: 'tarjeta',
          pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(pasarela.cobrar).not.toHaveBeenCalled();
    });

    it('permite upgrade a plan con límites superiores cuando el pago se aprueba', async () => {
      prisma.tienda.findUnique.mockResolvedValue({
        id: 'tienda-1', duenoCuentaId: 'c1', pais: 'BO',
        suscripciones: [{ id: 's1', plan: { nombre: 'Crecimiento' }, periodo: 'MENSUAL', estado: 'activa', inicio: new Date(), venceEn: new Date(), monto: 49, moneda: 'USD', pagos: [] }],
      });
      limites.uso.mockResolvedValue({ usuarios: 2, sucursales: 1, productos: 100 });
      prisma.suscripcion = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 's2' }),
      };
      prisma.tienda.update = jest.fn();

      const res = await servicio.renovar('c1', 'tienda-1', {
        planId: 'plan-crecimiento',
        periodo: 'MENSUAL',
        idempotencyKey: 'clave-upgrade',
        metodoPago: 'tarjeta',
        pago: { titular: 'Test', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });

      expect(pasarela.cobrar).toHaveBeenCalled();
      expect(res.id).toBe('tienda-1');
    });
  });
});
