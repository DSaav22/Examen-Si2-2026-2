import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Canal, MedioPago, Prisma, Rol } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { JwtPayload } from '../auth/jwt-payload';
import { CuentasService } from '../auth/cuentas.service';
import { InventarioService } from '../inventario/inventario.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { exigirDeLaTienda } from '../tenancy/pertenencia';
import { PlanLimitesService } from '../tenancy/plan-limites.service';
import { TenantContext } from '../tenancy/tenant-context';
import { TiendasService } from '../tenancy/tiendas.service';
import { CrearVentaDto } from '../ventas/dto/crear-venta.dto';
import {
  StockInsuficienteError,
  TurnoInvalidoError,
  TurnoRequeridoError,
  UuidConflictError,
} from '../ventas/errores-venta';
import { VentasService } from '../ventas/ventas.service';
import { huella } from './idempotencia.interceptor';
import { POLITICA_OFFLINE } from './politica';
import {
  ClienteOfflineDto,
  LoteSyncDto,
  OperacionDto,
  ProductoOfflineDto,
} from './sync.dto';

export type EstadoOperacion =
  | 'aplicada'
  | 'repetida'
  | 'fusionada'
  | 'conflicto'
  | 'rechazada'
  | 'vencida'
  | 'en_curso'
  | 'error';

export type ResultadoOperacion = {
  id: string;
  tipo: string;
  estado: EstadoOperacion;
  codigo?: string;
  mensaje?: string;
  /** Id definitivo en el servidor (venta, cliente o producto). */
  recursoId?: string;
  detalle?: Record<string, unknown>;
};

/** Resultado de aplicar una operación (sin id/tipo, que agrega el lote). */
type Aplicacion = Omit<ResultadoOperacion, 'id' | 'tipo'>;

const ROLES_VENTA: Rol[] = [Rol.CAJERO, Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN];
const ROLES_PRODUCTO: Rol[] = [Rol.ADMIN, Rol.SUPERADMIN];
const DEFINITIVOS = new Set(['aplicada', 'fusionada']);
const HUERFANA_MS = 60_000;
/** Tolerancia para relojes de dispositivo adelantados. */
const DESFASE_RELOJ_MS = 5 * 60_000;

class OperacionFallida extends Error {
  constructor(readonly resultado: Aplicacion) {
    super(resultado.codigo);
  }
}

const rechazo = (codigo: string, mensaje: string, detalle?: Record<string, unknown>) =>
  new OperacionFallida({ estado: 'rechazada', codigo, mensaje, detalle });
const conflicto = (codigo: string, mensaje: string, detalle?: Record<string, unknown>) =>
  new OperacionFallida({ estado: 'conflicto', codigo, mensaje, detalle });

async function validar<T extends object>(clase: new () => T, datos: unknown): Promise<T> {
  const obj = plainToInstance(clase, datos);
  const errores = await validate(obj, { whitelist: true, forbidNonWhitelisted: true });
  if (errores.length) {
    const campos = errores.map((e) => e.property);
    throw rechazo('DATOS_INVALIDOS', `Datos inválidos: ${campos.join(', ')}`, { campos });
  }
  return obj;
}

function aJson(valor: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(valor ?? null)) as Prisma.InputJsonValue;
}

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ventas: VentasService,
    private readonly cuentas: CuentasService,
    private readonly inventario: InventarioService,
    private readonly limites: PlanLimitesService,
    private readonly tiendas: TiendasService,
    private readonly notificaciones: NotificacionesService,
    private readonly config: ConfigService,
    private readonly esquemas: PrismaEsquemasService,
  ) {}

  private db(): PrismaService {
    const tiendaId = TenantContext.tiendaId();
    if (tiendaId && this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true') {
      return this.esquemas.clienteTienda(tiendaId) as unknown as PrismaService;
    }
    return this.prisma;
  }

  private dbPlataforma(): PrismaService {
    return (this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true'
      ? this.esquemas.clientePlataforma()
      : this.prisma) as unknown as PrismaService;
  }

  async politica() {
    const tienda = await this.dbPlataforma().tienda.findUniqueOrThrow({
      where: { id: TenantContext.tiendaIdOrThrow() },
      select: { ventanaOfflineDias: true },
    });
    return { ventanaOfflineDias: tienda.ventanaOfflineDias, ...POLITICA_OFFLINE };
  }

  async fijarVentana(dias: number) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    await this.dbPlataforma().tienda.update({ where: { id: tiendaId }, data: { ventanaOfflineDias: dias } });
    this.tiendas.invalidar(tiendaId);
    return this.politica();
  }

  operaciones(estado?: string) {
    return this.db().operacionSync.findMany({
      where: { tipo: { not: 'http' }, ...(estado ? { estado } : {}) },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    });
  }

  /** El administrador da por resuelto un conflicto (p. ej. tras contar el stock físico). */
  async descartar(id: string, actor: JwtPayload) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const fila = await this.db().operacionSync.findFirst({ where: { id, estado: 'conflicto' } });
    if (!fila) throw new HttpException({ codigo: 'OPERACION_NO_EN_CONFLICTO' }, 404);
    await this.db().auditoria.create({
      data: { tiendaId, accion: 'sync_conflicto_descartado', recurso: fila.operationId, usuarioId: actor.sub },
    });
    return this.db().operacionSync.update({ where: { id }, data: { estado: 'descartada' } });
  }

  /**
   * Aplica en orden las operaciones hechas sin red. Cada una corre en su propia transacción:
   * un conflicto en una no deshace las demás, y repetir el lote no duplica nada.
   */
  async lote(dto: LoteSyncDto, actor: JwtPayload) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const tienda = await this.dbPlataforma().tienda.findUniqueOrThrow({
      where: { id: tiendaId },
      select: { ventanaOfflineDias: true },
    });
    await this.registrarDispositivo(dto);

    // Clientes creados sin red cuyo correo ya existía: su id local pasa a ser el del servidor.
    const remap = new Map<string, string>();
    const resultados: ResultadoOperacion[] = [];
    for (const op of dto.operaciones) {
      const r = await this.procesar(op, dto.dispositivoId, actor, tienda.ventanaOfflineDias, remap);
      if (op.tipo === 'cliente' && r.recursoId && r.recursoId !== op.datos.id) {
        remap.set(String(op.datos.id), r.recursoId);
      }
      resultados.push({ id: op.id, tipo: op.tipo, ...r });
    }

    const conflictos = resultados.filter((r) => r.estado === 'conflicto');
    if (conflictos.length) void this.avisarConflictos(conflictos.length, actor);

    const resumen = resultados.reduce<Record<string, number>>((acc, r) => {
      acc[r.estado] = (acc[r.estado] ?? 0) + 1;
      return acc;
    }, {});
    return { procesadas: resultados.length, resumen, resultados, servidorEn: new Date().toISOString() };
  }

  private async procesar(
    op: OperacionDto,
    dispositivoId: string,
    actor: JwtPayload,
    ventanaDias: number,
    remap: Map<string, string>,
  ): Promise<Aplicacion> {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const hash = huella({ tipo: op.tipo, creadaEn: op.creadaEn, datos: op.datos });
    const previa = await this.db().operacionSync.findFirst({ where: { operationId: op.id } });
    if (previa) {
      if (previa.hash !== hash) {
        return {
          estado: 'rechazada',
          codigo: 'IDEMPOTENCIA_CONFLICTO',
          mensaje: 'Ese id de operación ya se usó con otro contenido.',
        };
      }
      const huerfana =
        previa.estado === 'en_curso' && Date.now() - previa.actualizadoEn.getTime() > HUERFANA_MS;
      if (previa.estado === 'en_curso' && !huerfana) {
        return { estado: 'en_curso', codigo: 'OPERACION_EN_CURSO' };
      }
      if (!huerfana) {
        const guardado = (previa.resultado ?? {}) as Aplicacion;
        return {
          ...guardado,
          estado: DEFINITIVOS.has(previa.estado) ? 'repetida' : (previa.estado as EstadoOperacion),
          detalle: { ...(guardado.detalle ?? {}), estadoOriginal: previa.estado },
        };
      }
    }

    const creadaEn = new Date(op.creadaEn);
    const ahora = Date.now();
    const hechaEn = new Date(Math.min(creadaEn.getTime(), ahora));
    const fila = previa
      ? previa
      : await this.db().operacionSync
          .create({
            data: {
              tiendaId,
              operationId: op.id,
              dispositivoId,
              usuarioId: actor.sub,
              tipo: op.tipo,
              hash,
              payload: aJson(op.datos),
              hechaEn,
            },
          })
          .catch((error: unknown) => {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return null;
            throw error;
          });
    if (!fila) return { estado: 'en_curso', codigo: 'OPERACION_EN_CURSO' };

    let resultado: Aplicacion;
    if (creadaEn.getTime() > ahora + DESFASE_RELOJ_MS) {
      resultado = {
        estado: 'rechazada',
        codigo: 'FECHA_INVALIDA',
        mensaje: 'La fecha de la operación está en el futuro; revisá el reloj del dispositivo.',
      };
    } else if (ahora - creadaEn.getTime() > ventanaDias * 86_400_000) {
      resultado = {
        estado: 'vencida',
        codigo: 'FUERA_DE_VENTANA',
        mensaje: `La operación tiene más de ${ventanaDias} días sin sincronizar; debe revisarla un administrador.`,
        detalle: { ventanaOfflineDias: ventanaDias, creadaEn: op.creadaEn },
      };
    } else {
      try {
        resultado =
          op.tipo === 'venta'
            ? await this.venta(op, actor, hechaEn, remap)
            : op.tipo === 'cliente'
              ? await this.cliente(op)
              : await this.producto(op, actor);
      } catch (error) {
        const r = this.traducir(error);
        if (!r) {
          // Error del servidor: se libera la operación para que el dispositivo la reintente.
          this.log.error(`Operación ${op.id} falló: ${String(error)}`);
          await this.db().operacionSync.deleteMany({ where: { id: fila.id } });
          return { estado: 'error', codigo: 'ERROR_SERVIDOR', mensaje: 'Error temporal; se reintentará.' };
        }
        resultado = r;
      }
    }

    await this.db().operacionSync.update({
      where: { id: fila.id },
      data: {
        estado: resultado.estado,
        resultado: aJson(resultado),
        error: resultado.codigo && !DEFINITIVOS.has(resultado.estado) ? resultado.codigo : '',
      },
    });
    return resultado;
  }

  private traducir(error: unknown): Aplicacion | null {
    if (error instanceof OperacionFallida) return error.resultado;
    if (error instanceof StockInsuficienteError) {
      return {
        estado: 'conflicto',
        codigo: 'STOCK_INSUFICIENTE',
        mensaje:
          error.disponible == null
            ? 'La variante ya no existe en esta tienda.'
            : `Stock insuficiente: había ${error.disponible} y la venta pedía ${error.pedido}. Otra caja vendió antes.`,
        detalle: { varianteId: error.varianteId, disponible: error.disponible, pedido: error.pedido },
      };
    }
    if (error instanceof TurnoInvalidoError || error instanceof TurnoRequeridoError) {
      const codigo = error instanceof TurnoInvalidoError ? error.codigo : 'TURNO_REQUERIDO';
      return { estado: 'conflicto', codigo, mensaje: 'El turno de caja de la venta ya no es válido.' };
    }
    if (error instanceof UuidConflictError) {
      return { estado: 'rechazada', codigo: 'UUID_CONFLICTO', mensaje: 'Ya existe otra venta con ese id.' };
    }
    if (error instanceof HttpException && error.getStatus() < 500) {
      const body = error.getResponse();
      const datos = typeof body === 'object' && body ? (body as Record<string, unknown>) : { message: body };
      return {
        estado: 'rechazada',
        codigo: typeof datos.codigo === 'string' ? datos.codigo : `HTTP_${error.getStatus()}`,
        mensaje: typeof datos.message === 'string' ? datos.message : undefined,
        detalle: datos,
      };
    }
    return null;
  }

  private async venta(
    op: OperacionDto,
    actor: JwtPayload,
    hechaEn: Date,
    remap: Map<string, string>,
  ): Promise<Aplicacion> {
    if (!ROLES_VENTA.includes(actor.rol)) throw rechazo('PERMISO_DENEGADO', 'Tu rol no puede vender en caja.');
    const datos = { ...op.datos } as Record<string, unknown>;
    if (datos.medioPago !== MedioPago.efectivo) {
      throw rechazo('PAGO_REQUIERE_RED', 'Sin conexión solo se aceptan ventas en efectivo.');
    }
    if (typeof datos.clientaId === 'string') {
      datos.clientaId = remap.get(datos.clientaId) ?? (await this.clienteFusionado(datos.clientaId));
    }
    const dto = await validar(CrearVentaDto, {
      almacenId: datos.almacenId,
      cajaTurnoId: datos.cajaTurnoId ?? undefined,
      clientaId: datos.clientaId ?? undefined,
      lineas: datos.lineas,
      medioPago: MedioPago.efectivo,
      canal: Canal.pos,
      uuid: op.id,
    });
    await exigirDeLaTienda(this.db(), {
      almacen: dto.almacenId,
      cajaTurno: dto.cajaTurnoId,
      usuario: dto.clientaId,
    });
    for (const l of dto.lineas) await exigirDeLaTienda(this.db(), { variante: l.varianteId });

    const venta = await this.ventas.cobrar(dto, { id: actor.sub, rol: actor.rol }, { hechaEn });
    return {
      estado: 'aplicada',
      recursoId: venta.id,
      detalle: { total: Number(venta.total), clientaId: venta.clientaId },
    };
  }

  /** Si el cliente local se fusionó en un lote anterior, devuelve el id del servidor. */
  private async clienteFusionado(idLocal: string) {
    const op = await this.db().operacionSync.findFirst({
      where: { tipo: 'cliente', estado: 'fusionada', payload: { path: ['id'], equals: idLocal } },
      select: { resultado: true },
    });
    return (op?.resultado as Aplicacion | null)?.recursoId ?? idLocal;
  }

  private async cliente(op: OperacionDto): Promise<Aplicacion> {
    const dto = await validar(ClienteOfflineDto, op.datos);
    const email = this.cuentas.normalizar(dto.email);
    const mismo = await this.db().usuario.findUnique({ where: { id: dto.id }, select: { id: true } });
    if (mismo) return { estado: 'aplicada', recursoId: mismo.id };

    const porCorreo = await this.db().usuario.findFirst({ where: { email }, select: { id: true, rol: true } });
    if (porCorreo) {
      return {
        estado: 'fusionada',
        codigo: 'EMAIL_EXISTENTE',
        mensaje: 'Ese correo ya estaba registrado; las ventas se asocian al cliente existente.',
        recursoId: porCorreo.id,
        detalle: { idLocal: dto.id },
      };
    }
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const { cuenta } = await this.cuentas.obtenerOCrear({ email, nombre: dto.nombre, exigirClave: false });
    const usuario = await this.db().usuario.create({
      data: { tiendaId, id: dto.id, cuentaId: cuenta.id, email, nombre: dto.nombre, rol: Rol.CLIENTA },
      select: { id: true },
    });
    return { estado: 'aplicada', recursoId: usuario.id };
  }

  private async producto(op: OperacionDto, actor: JwtPayload): Promise<Aplicacion> {
    if (!ROLES_PRODUCTO.includes(actor.rol)) {
      throw rechazo('PERMISO_DENEGADO', 'Solo un administrador puede registrar productos.');
    }
    const dto = await validar(ProductoOfflineDto, op.datos);
    const existente = await this.db().producto.findUnique({ where: { id: dto.id }, select: { id: true } });
    if (existente) return { estado: 'aplicada', recursoId: existente.id };

    const skus = dto.variantes.map((v) => v.sku.trim());
    if (new Set(skus).size !== skus.length) throw rechazo('SKU_REPETIDO', 'Dos variantes tienen el mismo SKU.');
    const usados = await this.db().variante.findMany({ where: { sku: { in: skus } }, select: { sku: true } });
    if (usados.length) {
      throw conflicto('SKU_EN_USO', `El SKU ${usados[0].sku} ya existe en la tienda.`, {
        skus: usados.map((u) => u.sku),
      });
    }
    const conStock = dto.variantes.some((v) => (v.stock ?? 0) > 0);
    if (conStock && !dto.almacenId) throw rechazo('ALMACEN_REQUERIDO', 'Indicá el almacén del stock inicial.');
    await exigirDeLaTienda(this.db(), { almacen: dto.almacenId });
    await this.limites.verificar('productos', this.db());

    const tiendaId = TenantContext.tiendaIdOrThrow();
    const producto = await this.db().$transaction(async (tx) => {
      const p = await tx.producto.create({
        data: {
          tiendaId,
          id: dto.id,
          nombre: dto.nombre,
          descripcion: dto.descripcion ?? '',
          categoria: dto.categoria,
          ocasion: dto.ocasion,
          precioBase: dto.precioBase,
          variantes: {
            create: dto.variantes.map((v) => ({ tiendaId, id: v.id, talla: v.talla, color: v.color, sku: v.sku.trim() })),
          },
        },
      });
      for (const v of dto.variantes) {
        if (!v.stock || !dto.almacenId) continue;
        await tx.stockAlmacen.create({ data: { tiendaId, varianteId: v.id, almacenId: dto.almacenId, cantidad: v.stock } });
        await this.inventario.registrar(tx, {
          tiendaId,
          tipo: 'ajuste',
          varianteId: v.id,
          almacenId: dto.almacenId,
          cantidad: v.stock,
          usuarioId: actor.sub,
          nota: 'Stock inicial (alta sin conexión)',
        });
      }
      return p;
    });
    return { estado: 'aplicada', recursoId: producto.id };
  }

  private async registrarDispositivo(dto: LoteSyncDto) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    try {
      await this.db().dispositivo.upsert({
        where: { id: dto.dispositivoId },
        create: { tiendaId, id: dto.dispositivoId, nombre: dto.nombreDispositivo ?? '' },
        update: { ultimoUso: new Date(), ...(dto.nombreDispositivo ? { nombre: dto.nombreDispositivo } : {}) },
      });
    } catch (error) {
      this.log.warn(`Dispositivo ${dto.dispositivoId} no registrado: ${String(error)}`);
    }
  }

  private async avisarConflictos(cantidad: number, actor: JwtPayload) {
    try {
      const responsables = await this.db().usuario.findMany({
        where: { rol: { in: [Rol.ADMIN, Rol.ENCARGADO] }, activo: true },
        select: { id: true },
      });
      for (const r of responsables) {
        await this.notificaciones.crear({
          usuarioId: r.id,
          tipo: 'sync_conflicto',
          titulo: 'Conflicto al sincronizar',
          cuerpo: `${cantidad} operación(es) hechas sin conexión por ${actor.email} quedaron en conflicto.`,
          enlace: '/sincronizacion',
        });
      }
    } catch (error) {
      this.log.warn(`No se avisó el conflicto: ${String(error)}`);
    }
  }
}
