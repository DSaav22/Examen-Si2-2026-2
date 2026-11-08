import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Canal, EstadoVenta, Prisma, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventarioService } from '../inventario/inventario.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { TenantContext } from '../tenancy/tenant-context';
import { CrearVentaDto } from './dto/crear-venta.dto';
import {
  StockInsuficienteError,
  TurnoInvalidoError,
  TurnoRequeridoError,
  UuidConflictError,
} from './errores-venta';

type Tx = Prisma.TransactionClient;

export const PLAZO_CREDITO_DIAS = 30;

export type OpcionesCobro = {
  /** Hora real de la venta cuando se hizo sin red y se sincroniza después. */
  hechaEn?: Date;
};

@Injectable()
export class VentasService {
  private readonly log = new Logger(VentasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  historialClienta(clientaId: string) {
    return this.prisma.venta.findMany({
      where: { clientaId },
      include: {
        lineas: { include: { variante: { include: { producto: true } } } },
        pago: true,
        pedido: true,
        almacen: { include: { sucursal: true } },
      },
      orderBy: { creadaEn: 'desc' },
    });
  }

  async ventasDeSucursal(sucursalId?: string) {
    return this.prisma.venta.findMany({
      where: {
        ...(sucursalId ? { almacen: { sucursalId } } : {}),
        estado: { in: ['cobrada', 'pendiente_pago', 'devuelta', 'devuelta_parcial'] },
      },
      include: {
        lineas: { include: { variante: { include: { producto: true } } } },
        clienta: { select: { id: true, nombre: true, email: true } },
        almacen: { include: { sucursal: true } },
      },
      orderBy: { creadaEn: 'desc' },
      take: 100,
    });
  }

  async cobrar(
    dto: CrearVentaDto,
    actor?: { id: string; rol: Rol },
    opciones: OpcionesCobro = {},
  ) {
    if (dto.canal === Canal.pos && !dto.cajaTurnoId) {
      throw new TurnoRequeridoError();
    }
    const tiendaId = TenantContext.tiendaIdOrThrow();

    const existente = await this.prisma.venta.findFirst({
      where: { uuid: dto.uuid },
      include: { lineas: true, pago: true },
    });
    if (existente) {
      if (!this.mismoPayload(existente, dto)) {
        throw new UuidConflictError();
      }
      return existente;
    }

    const lineasConPrecio = await this.preciosDeLineas(dto);
    const codigoCupon = dto.cuponCodigo?.trim();
    const cupon = codigoCupon
      ? await this.prisma.cupon.findFirst({
          where: {
            codigo: codigoCupon,
            activo: true,
            OR: [{ venceEn: null }, { venceEn: { gt: new Date() } }],
          },
        })
      : null;
    if (codigoCupon && !cupon) {
      throw new ConflictException({ codigo: 'CUPON_INVALIDO' });
    }
    if (cupon?.usoMaximo != null && cupon.usado >= cupon.usoMaximo) {
      throw new ConflictException({ codigo: 'CUPON_AGOTADO' });
    }
    const pendientePago = dto.medioPago === 'qr' || dto.medioPago === 'tarjeta';
    const alCredito = dto.medioPago === 'credito';
    if (alCredito) {
      if (dto.canal !== Canal.pos || !dto.clientaId) {
        throw new ConflictException({
          codigo: 'CREDITO_REQUIERE_CLIENTA',
          mensaje: 'La venta al crédito se hace en caja y a nombre de una clienta registrada.',
        });
      }
      const clienta = await this.prisma.usuario.findFirst({
        where: { id: dto.clientaId, activo: true },
        select: { id: true },
      });
      if (!clienta) throw new ConflictException({ codigo: 'CREDITO_REQUIERE_CLIENTA' });
    }

    const creada = await this.transaccionVenta(dto, async (tx) => {
      if (dto.canal === Canal.pos && dto.cajaTurnoId) {
        await this.validarTurnoEnTx(
          tx,
          dto.cajaTurnoId,
          dto.almacenId,
          actor,
        );
      }

      const otraVez = await tx.venta.findFirst({
        where: { uuid: dto.uuid },
        include: { lineas: true, pago: true },
      });
      if (otraVez) {
        if (!this.mismoPayload(otraVez, dto)) {
          throw new UuidConflictError();
        }
        return otraVez;
      }

      const pedidas = new Map<string, number>();
      for (const linea of dto.lineas) {
        pedidas.set(
          linea.varianteId,
          (pedidas.get(linea.varianteId) ?? 0) + linea.cantidad,
        );
      }

      // UPDATE condicional: la base descuenta solo si alcanza, de forma atómica.
      // Dos cajas que venden la última unidad a la vez: una actualiza 1 fila y la otra 0.
      // Orden fijo por variante para que dos ventas cruzadas no se bloqueen entre sí.
      for (const varianteId of [...pedidas.keys()].sort()) {
        const cantidad = pedidas.get(varianteId)!;
        const filas = pendientePago
          ? await tx.$executeRaw`
              UPDATE stock_almacen SET reservado = reservado + ${cantidad}
              WHERE tienda_id = ${tiendaId} AND almacen_id = ${dto.almacenId}
                AND variante_id = ${varianteId} AND cantidad - reservado >= ${cantidad}`
          : await tx.$executeRaw`
              UPDATE stock_almacen SET cantidad = cantidad - ${cantidad}
              WHERE tienda_id = ${tiendaId} AND almacen_id = ${dto.almacenId}
                AND variante_id = ${varianteId} AND cantidad - reservado >= ${cantidad}`;
        if (filas === 0) {
          const actual = await tx.stockAlmacen.findUnique({
            where: { varianteId_almacenId: { varianteId, almacenId: dto.almacenId } },
            select: { cantidad: true, reservado: true },
          });
          // Lanzar aborta la transacción: lo ya descontado en esta venta se revierte.
          throw new StockInsuficienteError(
            varianteId,
            Math.max(0, (actual?.cantidad ?? 0) - (actual?.reservado ?? 0)),
            cantidad,
          );
        }
      }

      const subtotal = lineasConPrecio.reduce(
        (acc, l) => acc + l.precioUnitario * l.cantidad,
        0,
      );
      const total = Math.max(0, subtotal * (1 - (cupon ? Number(cupon.porcentaje) / 100 : 0)));
      if (cupon) {
        const fresco = await tx.cupon.findUnique({ where: { id: cupon.id } });
        if (!fresco || (fresco.usoMaximo != null && fresco.usado >= fresco.usoMaximo)) {
          throw new ConflictException({ codigo: 'CUPON_AGOTADO' });
        }
        await tx.cupon.update({ where: { id: cupon.id }, data: { usado: { increment: 1 } } });
      }

      const estado: EstadoVenta = pendientePago ? 'pendiente_pago' : 'cobrada';

      const venta = await tx.venta.create({
        data: {
          uuid: dto.uuid,
          canal: dto.canal,
          estado,
          medioPago: dto.medioPago,
          total,
          ...(opciones.hechaEn ? { creadaEn: opciones.hechaEn } : {}),
          almacenId: dto.almacenId,
          cajaTurnoId: dto.cajaTurnoId,
          clientaId: dto.clientaId,
          lineas: {
            create: lineasConPrecio.map((l) => ({
              varianteId: l.varianteId,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
            })),
          },
        },
        include: { lineas: true, pago: true },
      });

      if (pendientePago) {
        await tx.pagoSimulado.create({
          data: {
            ventaId: venta.id,
            estado: 'pendiente',
            referencia: `PRUEBA-${dto.medioPago}-${venta.id.slice(0, 8)}`,
          },
        });
        for (const [varianteId, cantidad] of pedidas) {
          await this.inventario.registrar(tx, {
            tipo: 'reserva',
            varianteId,
            almacenId: dto.almacenId,
            cantidad,
            ventaId: venta.id,
            usuarioId: dto.clientaId,
            nota: 'Hold stock pago QR',
          });
        }
      } else {
        for (const [varianteId, cantidad] of pedidas) {
          await this.inventario.registrar(tx, {
            tipo: 'venta',
            varianteId,
            almacenId: dto.almacenId,
            cantidad,
            ventaId: venta.id,
            usuarioId: dto.clientaId,
            nota: dto.canal === 'pos' ? 'Venta POS' : 'Venta online',
          });
        }
      }

      // A crédito no entra dinero a la caja: lo que entra son los abonos.
      if (dto.cajaTurnoId && !pendientePago && !alCredito) {
        await tx.cajaTurno.update({
          where: { id: dto.cajaTurnoId },
          data: { totalSistema: { increment: total } },
        });
      }

      if (alCredito) {
        const plazo = new Date(venta.creadaEn);
        plazo.setDate(plazo.getDate() + PLAZO_CREDITO_DIAS);
        await tx.cuentaCobrar.create({
          data: {
            ventaId: venta.id,
            clientaId: dto.clientaId!,
            monto: total,
            saldo: total,
            venceEn: plazo,
          },
        });
      }

      await tx.auditoria.create({ data: { accion: 'venta_creada', recurso: venta.id, detalle: dto.canal, usuarioId: actor?.id ?? dto.clientaId } });

      if (estado === 'cobrada' && dto.canal === 'online' && dto.clientaId) {
        await this.abrirPedido(tx, {
          id: venta.id,
          clientaId: dto.clientaId,
          total,
          direccionId: dto.direccionId,
        });
      }

      return tx.venta.findUniqueOrThrow({
        where: { id: venta.id },
        include: { lineas: true, pago: true },
      });
    });

    if (creada.estado === 'cobrada' && creada.clientaId) {
      // Online: aviso in-app + correo automático (estilo BioFarm).
      // POS/caja: solo aviso in-app; el correo sale al pulsar "Enviar al correo".
      const enviarCorreo = creada.canal === Canal.online;
      void this.notificaciones
        .notificarTrasCobro(creada.id, { enviarCorreo })
        .catch((err) => {
          this.log.warn(`No se notificó venta ${creada.id}: ${err}`);
        });
    }

    return creada;
  }

  /**
   * Dos envíos simultáneos del mismo uuid pasan ambos el chequeo previo; el índice único
   * (tienda, uuid) frena al segundo, que entonces devuelve la venta ya registrada.
   */
  private async transaccionVenta<T>(dto: CrearVentaDto, fn: (tx: Tx) => Promise<T>) {
    try {
      return await this.prisma.$transaction(fn);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const ganadora = await this.prisma.venta.findFirst({
        where: { uuid: dto.uuid },
        include: { lineas: true, pago: true },
      });
      if (!ganadora) throw error;
      if (!this.mismoPayload(ganadora, dto)) throw new UuidConflictError();
      return ganadora as T;
    }
  }

  private async validarTurnoEnTx(
    tx: Tx,
    cajaTurnoId: string,
    almacenId: string,
    actor?: { id: string; rol: Rol },
  ) {
    const locked = await tx.$queryRaw<
      {
        id: string;
        cerrado_en: Date | null;
        cajero_id: string;
        sucursal_id: string;
      }[]
    >`
      SELECT id, cerrado_en, cajero_id, sucursal_id
      FROM caja_turnos
      WHERE id = ${cajaTurnoId}
      FOR UPDATE
    `;
    const turno = locked[0];
    if (!turno || turno.cerrado_en) {
      throw new TurnoInvalidoError('TURNO_CERRADO');
    }
    if (actor?.rol === Rol.CAJERO && turno.cajero_id !== actor.id) {
      throw new TurnoInvalidoError('TURNO_AJENO');
    }
    const alms = await tx.almacen.findMany({
      where: { sucursalId: turno.sucursal_id },
      select: { id: true },
    });
    if (!alms.some((a) => a.id === almacenId)) {
      throw new TurnoInvalidoError('ALMACEN_FUERA_TURNO');
    }
  }

  private async preciosDeLineas(dto: CrearVentaDto) {
    const clienta = dto.clientaId
      ? await this.prisma.usuario.findUnique({ where: { id: dto.clientaId } })
      : null;
    const mayorista = !!clienta?.mayorista;
    const variantes = await this.prisma.variante.findMany({
      where: { id: { in: dto.lineas.map((l) => l.varianteId) } },
      include: { producto: true },
    });
    const porId = new Map(variantes.map((v) => [v.id, v]));

    return dto.lineas.map((linea) => {
      const variante = porId.get(linea.varianteId);
      if (!variante) {
        throw new StockInsuficienteError(linea.varianteId);
      }
      const producto = variante.producto;
      const base = Number(producto.precioBase);
      const desc =
        Math.min(100, Math.max(0, Number(producto.descuentoPct))) / 100;
      const detalle = Math.round(base * (1 - desc) * 100) / 100;
      const mayor =
        producto.precioMayorista != null
          ? Number(producto.precioMayorista)
          : null;
      const usaMayorista =
        mayorista &&
        mayor != null &&
        producto.minimoMayorista > 0 &&
        linea.cantidad >= producto.minimoMayorista;
      return {
        varianteId: linea.varianteId,
        cantidad: linea.cantidad,
        precioUnitario: usaMayorista ? mayor : detalle,
      };
    });
  }

  private mismoPayload(
    venta: {
      canal: string;
      medioPago: string;
      almacenId: string;
      cajaTurnoId: string | null;
      clientaId: string | null;
      lineas: { varianteId: string; cantidad: number }[];
    },
    dto: CrearVentaDto,
  ): boolean {
    if (
      venta.canal !== dto.canal ||
      venta.medioPago !== dto.medioPago ||
      venta.almacenId !== dto.almacenId ||
      (venta.cajaTurnoId ?? undefined) !== dto.cajaTurnoId ||
      (venta.clientaId ?? undefined) !== dto.clientaId
    ) {
      return false;
    }
    if (venta.lineas.length !== dto.lineas.length) {
      return false;
    }
    const a = [...venta.lineas].sort((x, y) =>
      x.varianteId.localeCompare(y.varianteId),
    );
    const b = [...dto.lineas].sort((x, y) =>
      x.varianteId.localeCompare(y.varianteId),
    );
    return a.every(
      (linea, i) =>
        linea.varianteId === b[i].varianteId &&
        linea.cantidad === b[i].cantidad,
    );
  }

  async abrirPedido(
    tx: Tx,
    venta: {
      id: string;
      clientaId: string;
      total: Prisma.Decimal | number;
      direccionId?: string;
    },
  ) {
    const existe = await tx.pedido.findUnique({ where: { ventaId: venta.id } });
    if (existe) return existe;
    const direccion = venta.direccionId
      ? await tx.direccionCliente.findFirst({
          where: { id: venta.direccionId, usuarioId: venta.clientaId },
        })
      : await tx.direccionCliente.findFirst({
          where: { usuarioId: venta.clientaId },
          orderBy: { id: 'desc' },
        });
    return tx.pedido.create({
      data: {
        usuarioId: venta.clientaId,
        ventaId: venta.id,
        total: venta.total,
        estado: 'pendiente',
        direccion: direccion
          ? `${direccion.etiqueta}: ${direccion.detalle}, ${direccion.ciudad}`
          : '',
      },
    });
  }
}
