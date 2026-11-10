import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cuenta, PeriodoPlan, Plan, Prisma, Rol } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { CuentasService } from '../auth/cuentas.service';
import { CuentaPayload } from '../auth/jwt-payload';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlanLimitesService } from '../tenancy/plan-limites.service';
import { TenantContext } from '../tenancy/tenant-context';
import { TiendasService } from '../tenancy/tiendas.service';
import { PasarelaSuscripcion } from './pasarela-suscripcion';
import { LoginCuentaDto, RegistroCuentaDto, RenovarDto, SuscribirDto } from './plataforma.dto';
import { DESCUENTO, MESES, precioPeriodo, sumarMeses } from './precios';
import { metodosSimuladosPorPais, monedaDePais } from '../pagos/metodos-pais';

const SLUGS_RESERVADOS = new Set(['www', 'api', 'admin', 'plataforma', 'app', 'login', 'planes', 'soporte', 'ensayar']);

const CATEGORIAS_BASE = ['Vestidos', 'Blusas', 'Pantalones', 'Faldas', 'Abrigos', 'Accesorios'];

function validarMetodoPais(pais: string, metodo: string) {
  if (!metodosSimuladosPorPais(pais).some((m) => m.codigo === metodo)) {
    throw new BadRequestException({ codigo: 'METODO_NO_DISPONIBLE', message: 'El método de pago no está disponible para el país de la tienda.' });
  }
}

function claveMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

@Injectable()
export class PlataformaService {
  private readonly log = new Logger(PlataformaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentas: CuentasService,
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly tiendas: TiendasService,
    private readonly limites: PlanLimitesService,
    private readonly pasarela: PasarelaSuscripcion,
  ) {}

  // ── Catálogo público ────────────────────────────────────────────────

  async planes() {
    const planes = await this.prisma.plan.findMany({ where: { activo: true }, orderBy: { orden: 'asc' } });
    return planes.map((p) => this.planPublico(p));
  }

  private planPublico(p: Plan) {
    const mensual = Number(p.precioMensual);
    return {
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion,
      moneda: p.moneda,
      destacado: p.destacado,
      limites: { usuarios: p.maxUsuarios, sucursales: p.maxSucursales, productos: p.maxProductos },
      modulos: p.modulos,
      precios: {
        MENSUAL: precioPeriodo(mensual, 'MENSUAL'),
        TRIMESTRAL: precioPeriodo(mensual, 'TRIMESTRAL'),
        ANUAL: precioPeriodo(mensual, 'ANUAL'),
      },
      descuentos: DESCUENTO,
    };
  }

  async slugDisponible(slug: string) {
    const s = slug.trim().toLowerCase();
    if (SLUGS_RESERVADOS.has(s) || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s)) return { slug: s, disponible: false };
    const t = await this.prisma.tienda.findUnique({ where: { slug: s }, select: { id: true } });
    return { slug: s, disponible: !t };
  }

  // ── Cuenta ──────────────────────────────────────────────────────────

  async registrar(dto: RegistroCuentaDto) {
    const existente = await this.cuentas.buscar(dto.email);
    if (existente?.emailVerificado) throw new ConflictException({ codigo: 'EMAIL_EN_USO' });
    const cuenta = existente ?? (await this.cuentas.crear(dto));
    const verificacion = await this.cuentas.enviarVerificacion(cuenta);
    return { ok: true, email: cuenta.email, verificacion };
  }

  async reenviar(email: string) {
    const cuenta = await this.cuentas.buscar(email);
    if (!cuenta || cuenta.emailVerificado) return { ok: true };
    const verificacion = await this.cuentas.enviarVerificacion(cuenta);
    return { ok: true, verificacion };
  }

  async verificar(token: string) {
    const cuenta = await this.cuentas.verificar(token);
    if (!cuenta) throw new NotFoundException({ codigo: 'VERIFICACION_INVALIDA' });
    return this.sesionCuenta(cuenta);
  }

  async login(dto: LoginCuentaDto) {
    const cuenta = await this.cuentas.validarClave(dto.email, dto.password);
    if (!cuenta) throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    if (!cuenta.emailVerificado) throw new ForbiddenException({ codigo: 'EMAIL_NO_VERIFICADO', email: cuenta.email });
    return this.sesionCuenta(cuenta);
  }

  async sesionCuenta(cuenta: Cuenta) {
    const payload: CuentaPayload = { tipo: 'cuenta', sub: cuenta.id, email: cuenta.email, plataforma: cuenta.esPlataforma };
    return {
      accessToken: this.tokens.sign(payload),
      cuenta: { id: cuenta.id, email: cuenta.email, nombre: cuenta.nombre, plataforma: cuenta.esPlataforma },
      tiendas: await this.cuentas.tiendasDe(cuenta.id),
    };
  }

  async miCuenta(cuentaId: string) {
    const cuenta = await this.prisma.cuenta.findUniqueOrThrow({ where: { id: cuentaId } });
    return this.sesionCuenta(cuenta);
  }

  entrar(cuentaId: string, tiendaId: string) {
    return this.auth.cambiarTienda(cuentaId, tiendaId);
  }

  // ── Suscripción y alta automática de la tienda ──────────────────────

  async suscribir(cuentaId: string, dto: SuscribirDto) {
    const cuenta = await this.prisma.cuenta.findUniqueOrThrow({ where: { id: cuentaId } });
    if (!cuenta.emailVerificado) throw new ForbiddenException({ codigo: 'EMAIL_NO_VERIFICADO' });
    const pais = dto.tienda.pais ?? 'BO';
    const moneda = monedaDePais(pais);
    if (!moneda || (dto.tienda.moneda && dto.tienda.moneda !== moneda)) {
      throw new BadRequestException({ codigo: 'PAIS_O_MONEDA_INVALIDOS', message: 'El país o la moneda de la tienda no son válidos.' });
    }
    validarMetodoPais(pais, dto.metodoPago ?? 'tarjeta');

    // Reintento del mismo pago (doble clic, red inestable): devuelve la tienda ya creada.
    const previo = await this.prisma.pagoSuscripcion.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { suscripcion: { include: { tienda: true } } },
    });
    if (previo) {
      const metodoAnterior = previo.pasarela.split(':')[1] ?? 'tarjeta';
      if (previo.suscripcion.tienda.duenoCuentaId !== cuentaId ||
          previo.suscripcion.tienda.slug !== dto.tienda.slug.toLowerCase() ||
          previo.suscripcion.planId !== dto.planId || previo.suscripcion.periodo !== dto.periodo ||
          metodoAnterior !== (dto.metodoPago ?? 'tarjeta')) {
        throw new ConflictException({ codigo: 'IDEMPOTENCIA_DATOS_DISTINTOS' });
      }
      if (previo.estado !== 'aprobado') throw new HttpException({ codigo: 'PAGO_RECHAZADO' }, HttpStatus.PAYMENT_REQUIRED);
      return { ...(await this.entrar(cuentaId, previo.suscripcion.tiendaId)), repetido: true };
    }

    const slug = dto.tienda.slug.toLowerCase();
    if (!(await this.slugDisponible(slug)).disponible) throw new ConflictException({ codigo: 'SLUG_EN_USO' });
    const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, activo: true } });
    if (!plan) throw new NotFoundException({ codigo: 'PLAN_NO_EXISTE' });

    const monto = precioPeriodo(Number(plan.precioMensual), dto.periodo);
    const cobro = await this.pasarela.cobrar(monto, plan.moneda, dto.pago, dto.idempotencyKey);
    if (!cobro.aprobado) {
      throw new HttpException({ codigo: 'PAGO_RECHAZADO', motivo: cobro.motivo }, HttpStatus.PAYMENT_REQUIRED);
    }

    const tiendaId = randomUUID();
    const ahora = new Date();
    try {
      await TenantContext.enTienda(tiendaId, () =>
        this.prisma.$transaction(async (tx) => {
          await tx.tienda.create({
            data: {
              id: tiendaId,
              slug,
              nombre: dto.tienda.nombre.trim(),
              pais,
              moneda,
              duenoCuentaId: cuenta.id,
              suscripciones: {
                create: {
                  planId: plan.id,
                  periodo: dto.periodo,
                  inicio: ahora,
                  venceEn: sumarMeses(ahora, MESES[dto.periodo]),
                  monto,
                  moneda: plan.moneda,
                  pagos: {
                    create: {
                      monto,
                      moneda: plan.moneda,
                      pasarela: `${cobro.pasarela}:${dto.metodoPago ?? 'tarjeta'}`,
                      referencia: cobro.referencia,
                      estado: 'aprobado',
                      ultimos4: cobro.ultimos4,
                      idempotencyKey: dto.idempotencyKey,
                    },
                  },
                },
              },
            },
          });
          await this.aprovisionar(tx, cuenta, dto.tienda.nombre.trim());
        }),
      );
    } catch (error) {
      // Compensación: si la base falla después de cobrar, se devuelve el dinero.
      await this.pasarela.reembolsar(cobro.referencia).catch(() => undefined);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ codigo: 'SLUG_EN_USO' });
      }
      throw error;
    }

    this.tiendas.invalidar(tiendaId);
    this.log.log(`Tienda creada ${slug} (${plan.codigo}/${dto.periodo}) para ${cuenta.email}`);
    return this.entrar(cuentaId, tiendaId);
  }

  /** Espacio de trabajo inicial de una tienda nueva (corre dentro de la tienda). */
  private async aprovisionar(tx: Prisma.TransactionClient, cuenta: Cuenta, nombreTienda: string) {
    const sucursal = await tx.sucursal.create({ data: { nombre: `${nombreTienda} · Casa matriz`, ciudad: 'Por definir' } });
    await tx.almacen.create({ data: { nombre: 'Almacén principal', sucursalId: sucursal.id } });
    await tx.usuario.create({
      data: {
        cuentaId: cuenta.id,
        email: cuenta.email,
        nombre: cuenta.nombre,
        rol: Rol.ADMIN,
        sucursalId: sucursal.id,
      },
    });
    await tx.categoria.createMany({ data: CATEGORIAS_BASE.map((nombre) => ({ nombre })) });
  }

  async detalleTienda(cuentaId: string, tiendaId: string) {
    const tienda = await this.prisma.tienda.findUnique({
      where: { id: tiendaId },
      include: {
        suscripciones: { orderBy: { creadaEn: 'desc' }, include: { plan: true, pagos: { orderBy: { creadoEn: 'desc' } } } },
      },
    });
    if (!tienda || tienda.duenoCuentaId !== cuentaId) throw new ForbiddenException({ codigo: 'SOLO_DUENO' });
    const info = await this.tiendas.porId(tiendaId);
    const uso = await TenantContext.enTienda(tiendaId, () => this.limites.uso());
    return {
      id: tienda.id,
      slug: tienda.slug,
      nombre: tienda.nombre,
      pais: tienda.pais,
      vigente: info?.vigente ?? false,
      venceEn: info?.venceEn ?? null,
      plan: info?.plan ?? null,
      uso,
      historial: tienda.suscripciones.map((s) => ({
        id: s.id,
        plan: s.plan.nombre,
        periodo: s.periodo,
        estado: s.estado,
        inicio: s.inicio,
        venceEn: s.venceEn,
        monto: Number(s.monto),
        moneda: s.moneda,
        pagos: s.pagos.map((p) => ({
          referencia: p.referencia,
          monto: Number(p.monto),
          estado: p.estado,
          pasarela: p.pasarela,
          ultimos4: p.ultimos4,
          fecha: p.creadoEn,
        })),
      })),
    };
  }

  /** Renovar o cambiar de plan. Mismo plan: extiende desde el vencimiento; otro plan: empieza hoy. */
  async renovar(cuentaId: string, tiendaId: string, dto: RenovarDto) {
    const tienda = await this.prisma.tienda.findUnique({ where: { id: tiendaId } });
    if (!tienda || tienda.duenoCuentaId !== cuentaId) throw new ForbiddenException({ codigo: 'SOLO_DUENO' });
    validarMetodoPais(tienda.pais, dto.metodoPago ?? 'tarjeta');

    const previo = await this.prisma.pagoSuscripcion.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { suscripcion: true },
    });
    if (previo) {
      if (
        previo.suscripcion.tiendaId !== tiendaId ||
        previo.suscripcion.planId !== dto.planId ||
        previo.suscripcion.periodo !== dto.periodo
        || (previo.pasarela?.split(':')[1] ?? 'tarjeta') !== (dto.metodoPago ?? 'tarjeta')
      ) {
        throw new ConflictException({ codigo: 'IDEMPOTENCIA_DATOS_DISTINTOS' });
      }
      if (previo.estado !== 'aprobado') {
        throw new HttpException({ codigo: 'PAGO_RECHAZADO' }, HttpStatus.PAYMENT_REQUIRED);
      }
      return { ...(await this.detalleTienda(cuentaId, tiendaId)), repetido: true };
    }

    const plan = await this.prisma.plan.findFirst({ where: { id: dto.planId, activo: true } });
    if (!plan) throw new NotFoundException({ codigo: 'PLAN_NO_EXISTE' });
    if (plan.maxProductos != null || plan.maxUsuarios || plan.maxSucursales) {
      const uso = await TenantContext.enTienda(tiendaId, () => this.limites.uso());
      if (
        uso.usuarios > plan.maxUsuarios ||
        uso.sucursales > plan.maxSucursales ||
        (plan.maxProductos != null && uso.productos > plan.maxProductos)
      ) {
        throw new ConflictException({ codigo: 'PLAN_INSUFICIENTE', uso });
      }
    }

    const monto = precioPeriodo(Number(plan.precioMensual), dto.periodo);
    const cobro = await this.pasarela.cobrar(monto, plan.moneda, dto.pago, dto.idempotencyKey);
    if (!cobro.aprobado) {
      throw new HttpException({ codigo: 'PAGO_RECHAZADO', motivo: cobro.motivo }, HttpStatus.PAYMENT_REQUIRED);
    }

    const ahora = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        const actual = await tx.suscripcion.findFirst({
          where: { tiendaId, estado: 'activa', venceEn: { gt: ahora } },
          orderBy: { venceEn: 'desc' },
        });
        const mismoPlan = actual?.planId === plan.id;
        const inicio = mismoPlan && actual ? actual.venceEn : ahora;
        if (actual && !mismoPlan) {
          await tx.suscripcion.update({ where: { id: actual.id }, data: { estado: 'cancelada', venceEn: ahora } });
        }
        await tx.suscripcion.create({
          data: {
            tiendaId,
            planId: plan.id,
            periodo: dto.periodo,
            inicio,
            venceEn: sumarMeses(inicio, MESES[dto.periodo]),
            monto,
            moneda: plan.moneda,
            pagos: {
              create: {
                monto,
                moneda: plan.moneda,
                pasarela: `${cobro.pasarela}:${dto.metodoPago ?? 'tarjeta'}`,
                referencia: cobro.referencia,
                estado: 'aprobado',
                ultimos4: cobro.ultimos4,
                idempotencyKey: dto.idempotencyKey,
              },
            },
          },
        });
        await tx.tienda.update({ where: { id: tiendaId }, data: { estado: 'activa' } });
      });
    } catch (error) {
      await this.pasarela.reembolsar(cobro.referencia).catch(() => undefined);
      throw error;
    }
    this.tiendas.invalidar(tiendaId);
    return this.detalleTienda(cuentaId, tiendaId);
  }

  // ── Métricas del dueño de la plataforma ─────────────────────────────

  async metricas() {
    const ahora = new Date();
    const [tiendas, suscripciones, pagos] = await Promise.all([
      this.prisma.tienda.findMany({ select: { id: true, slug: true, nombre: true, creadaEn: true, estado: true } }),
      this.prisma.suscripcion.findMany({ include: { plan: true } }),
      this.prisma.pagoSuscripcion.findMany({ where: { estado: 'aprobado' }, select: { monto: true, creadoEn: true } }),
    ]);

    const vigentePorTienda = new Map<string, (typeof suscripciones)[number]>();
    const ultimaPorTienda = new Map<string, (typeof suscripciones)[number]>();
    for (const s of suscripciones) {
      const u = ultimaPorTienda.get(s.tiendaId);
      if (!u || s.venceEn > u.venceEn) ultimaPorTienda.set(s.tiendaId, s);
      if (s.estado === 'activa' && s.venceEn > ahora) {
        const v = vigentePorTienda.get(s.tiendaId);
        if (!v || s.venceEn > v.venceEn) vigentePorTienda.set(s.tiendaId, s);
      }
    }
    const vigentes = [...vigentePorTienda.values()];
    const mensual = (s: (typeof suscripciones)[number]) => Number(s.monto) / MESES[s.periodo];
    const mrr = vigentes.reduce((a, s) => a + mensual(s), 0);

    const porPlan = new Map<string, { plan: string; tiendas: number; mrr: number }>();
    const porPeriodo: Record<PeriodoPlan, number> = { MENSUAL: 0, TRIMESTRAL: 0, ANUAL: 0 };
    for (const s of vigentes) {
      const e = porPlan.get(s.plan.codigo) ?? { plan: s.plan.nombre, tiendas: 0, mrr: 0 };
      e.tiendas += 1;
      e.mrr += mensual(s);
      porPlan.set(s.plan.codigo, e);
      porPeriodo[s.periodo] += 1;
    }

    const hace30 = new Date(ahora.getTime() - 30 * 86400_000);
    const bajas30 = [...ultimaPorTienda.entries()].filter(
      ([tiendaId, s]) => !vigentePorTienda.has(tiendaId) && s.venceEn >= hace30 && s.venceEn <= ahora,
    ).length;
    const en30 = new Date(ahora.getTime() + 30 * 86400_000);
    const renovaciones = vigentes
      .filter((s) => s.venceEn <= en30)
      .map((s) => ({
        tiendaId: s.tiendaId,
        tienda: tiendas.find((t) => t.id === s.tiendaId)?.nombre ?? s.tiendaId,
        plan: s.plan.nombre,
        venceEn: s.venceEn,
        monto: Number(s.monto),
      }))
      .sort((a, b) => a.venceEn.getTime() - b.venceEn.getTime());

    // Serie de los últimos 12 meses: ingresos cobrados y altas de tiendas.
    const meses: string[] = [];
    for (let i = 11; i >= 0; i--) meses.push(claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)));
    const ingresos = Object.fromEntries(meses.map((m) => [m, 0]));
    const altas = Object.fromEntries(meses.map((m) => [m, 0]));
    for (const p of pagos) {
      const k = claveMes(p.creadoEn);
      if (k in ingresos) ingresos[k] += Number(p.monto);
    }
    for (const t of tiendas) {
      const k = claveMes(t.creadaEn);
      if (k in altas) altas[k] += 1;
    }

    // Proyección a 6 meses: MRR con churn mensual observado + altas promedio de los últimos 3 meses.
    const altasPromedio = meses.slice(-3).reduce((a, m) => a + altas[m], 0) / 3;
    const arpu = vigentes.length ? mrr / vigentes.length : 0;
    const churnMensual = vigentes.length + bajas30 ? bajas30 / (vigentes.length + bajas30) : 0;
    const proyeccion: { mes: string; mrr: number; ingresosEsperados: number; tiendas: number }[] = [];
    let mrrProy = mrr;
    let tiendasProy = vigentes.length;
    for (let i = 1; i <= 6; i++) {
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth() + i, 1);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + i + 1, 1);
      mrrProy = mrrProy * (1 - churnMensual) + altasPromedio * arpu;
      tiendasProy = tiendasProy * (1 - churnMensual) + altasPromedio;
      // Cada suscripción vigente renueva cada `periodo`; la k-ésima renovación pesa (1 − churn)^k.
      let renuevan = 0;
      for (const s of vigentes) {
        let fecha = s.venceEn;
        for (let k = 1; fecha < finMes; k++, fecha = sumarMeses(fecha, MESES[s.periodo])) {
          if (fecha >= inicioMes) renuevan += Number(s.monto) * (1 - churnMensual) ** k;
        }
      }
      proyeccion.push({
        mes: claveMes(inicioMes),
        mrr: Math.round(mrrProy * 100) / 100,
        ingresosEsperados: Math.round((renuevan + altasPromedio * arpu) * 100) / 100,
        tiendas: Math.round(tiendasProy),
      });
    }

    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
      moneda: 'USD',
      resumen: {
        tiendas: tiendas.length,
        tiendasVigentes: vigentes.length,
        mrr: r2(mrr),
        arr: r2(mrr * 12),
        arpu: r2(arpu),
        bajas30,
        churnMensual: r2(churnMensual * 100),
      },
      porPlan: [...porPlan.values()].map((p) => ({ ...p, mrr: r2(p.mrr) })),
      porPeriodo,
      serie: meses.map((m) => ({ mes: m, ingresos: r2(ingresos[m]), altas: altas[m] })),
      renovaciones,
      proyeccion,
      supuestos: {
        altasPromedio: r2(altasPromedio),
        churnMensual: r2(churnMensual * 100),
        explicacion:
          'MRR del mes siguiente = MRR × (1 − churn mensual) + altas promedio de los últimos 3 meses × ARPU. ' +
          'Ingresos esperados = renovaciones de ese mes (cada una × probabilidad de seguir activa) + altas estimadas × ARPU.',
      },
      tiendasDetalle: tiendas
        .map((t) => {
          const s = vigentePorTienda.get(t.id) ?? ultimaPorTienda.get(t.id);
          return {
            id: t.id,
            slug: t.slug,
            nombre: t.nombre,
            creadaEn: t.creadaEn,
            vigente: vigentePorTienda.has(t.id) && t.estado === 'activa',
            plan: s?.plan.nombre ?? null,
            periodo: s?.periodo ?? null,
            venceEn: s?.venceEn ?? null,
          };
        })
        .sort((a, b) => b.creadaEn.getTime() - a.creadaEn.getTime()),
    };
  }
}
