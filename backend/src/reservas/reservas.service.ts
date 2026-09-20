import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EstadoReserva } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventarioService } from '../inventario/inventario.service';

const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  pendiente: ['preparada', 'en_atencion', 'cancelada'],
  preparada: ['en_atencion', 'completada', 'cancelada'],
  en_atencion: ['completada', 'cancelada'],
  completada: [],
  cancelada: [],
};

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  misReservas(clientaId: string) {
    return this.prisma.reserva.findMany({
      where: { clientaId },
      include: {
        sucursal: true,
        lineas: { include: { variante: { include: { producto: true } } } },
      },
      orderBy: { creadaEn: 'desc' },
    });
  }

  deSucursal(sucursalId: string) {
    return this.prisma.reserva.findMany({
      where: {
        sucursalId,
        estado: { in: ['pendiente', 'preparada', 'en_atencion'] },
      },
      include: {
        clienta: { select: { id: true, nombre: true, email: true } },
        lineas: { include: { variante: { include: { producto: true } } } },
      },
      orderBy: { horario: 'asc' },
    });
  }

  async crear(
    clientaId: string,
    data: {
      sucursalId: string;
      horario: string;
      nota?: string;
      lineas: { varianteId: string; cantidad: number }[];
    },
  ) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: data.sucursalId },
      include: { almacenes: true },
    });
    if (!sucursal?.almacenes[0]) {
      throw new NotFoundException({ codigo: 'SUCURSAL_SIN_ALMACEN' });
    }
    const almacenId = sucursal.almacenes[0].id;

    return this.prisma.$transaction(async (tx) => {
      for (const linea of data.lineas) {
        const rows = await tx.$queryRaw<
          { cantidad: number; reservado: number }[]
        >`
          SELECT cantidad, reservado FROM stock_almacen
          WHERE variante_id = ${linea.varianteId} AND almacen_id = ${almacenId}
          FOR UPDATE
        `;
        const row = rows[0];
        const disponible = row ? row.cantidad - row.reservado : 0;
        if (!row || disponible < linea.cantidad) {
          throw new ConflictException({
            codigo: 'STOCK_INSUFICIENTE',
            varianteId: linea.varianteId,
          });
        }
        await tx.stockAlmacen.update({
          where: {
            varianteId_almacenId: {
              varianteId: linea.varianteId,
              almacenId,
            },
          },
          data: { reservado: { increment: linea.cantidad } },
        });
      }

      const reserva = await tx.reserva.create({
        data: {
          clientaId,
          sucursalId: data.sucursalId,
          horario: new Date(data.horario),
          nota: data.nota ?? '',
          estado: 'pendiente',
          lineas: {
            create: data.lineas.map((l) => ({
              varianteId: l.varianteId,
              cantidad: l.cantidad,
            })),
          },
        },
        include: {
          sucursal: true,
          lineas: { include: { variante: { include: { producto: true } } } },
        },
      });

      for (const linea of data.lineas) {
        await this.inventario.registrar(tx, {
          tipo: 'reserva',
          varianteId: linea.varianteId,
          almacenId,
          cantidad: linea.cantidad,
          reservaId: reserva.id,
          usuarioId: clientaId,
          nota: 'Reserva clienta',
        });
      }
      return reserva;
    });
  }

  async cambiarEstado(
    id: string,
    estado: EstadoReserva,
    sucursalId?: string | null,
    exigirSucursal = false,
  ) {
    if (exigirSucursal && !sucursalId) {
      throw new ConflictException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
    }

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; estado: EstadoReserva; sucursal_id: string }[]>`
        SELECT id, estado, sucursal_id FROM reservas WHERE id = ${id} FOR UPDATE
      `;
      if (!locked[0]) throw new NotFoundException({ codigo: 'RESERVA_NO' });

      const reserva = await tx.reserva.findUniqueOrThrow({
        where: { id },
        include: { lineas: true, sucursal: { include: { almacenes: true } } },
      });

      if (sucursalId && reserva.sucursalId !== sucursalId) {
        throw new ConflictException({ codigo: 'OTRA_SUCURSAL' });
      }

      const permitidos = TRANSICIONES[reserva.estado];
      if (!permitidos.includes(estado)) {
        throw new ConflictException({
          codigo: 'TRANSICION_INVALIDA',
          desde: reserva.estado,
          hacia: estado,
        });
      }

      const almacenId = reserva.sucursal.almacenes[0]?.id;
      if (!almacenId) throw new NotFoundException({ codigo: 'SIN_ALMACEN' });

      if (estado === 'cancelada') {
        for (const linea of reserva.lineas) {
          await tx.$queryRaw`
            SELECT cantidad FROM stock_almacen
            WHERE variante_id = ${linea.varianteId} AND almacen_id = ${almacenId}
            FOR UPDATE
          `;
          await tx.stockAlmacen.update({
            where: {
              varianteId_almacenId: {
                varianteId: linea.varianteId,
                almacenId,
              },
            },
            data: { reservado: { decrement: linea.cantidad } },
          });
          await this.inventario.registrar(tx, {
            tipo: 'liberacion',
            varianteId: linea.varianteId,
            almacenId,
            cantidad: linea.cantidad,
            reservaId: id,
            nota: 'Cancelación reserva',
          });
        }
      }

      if (estado === 'completada') {
        const lineasConPrecio: {
          varianteId: string;
          cantidad: number;
          precioUnitario: number;
        }[] = [];
        for (const linea of reserva.lineas) {
          const rows = await tx.$queryRaw<
            { cantidad: number; reservado: number }[]
          >`
            SELECT cantidad, reservado FROM stock_almacen
            WHERE variante_id = ${linea.varianteId} AND almacen_id = ${almacenId}
            FOR UPDATE
          `;
          if (!rows[0] || rows[0].reservado < linea.cantidad) {
            throw new ConflictException({
              codigo: 'STOCK_INSUFICIENTE',
              varianteId: linea.varianteId,
            });
          }
          const variante = await tx.variante.findUniqueOrThrow({
            where: { id: linea.varianteId },
            include: { producto: true },
          });
          const base = Number(variante.producto.precioBase);
          const desc =
            Math.min(
              100,
              Math.max(0, Number(variante.producto.descuentoPct)),
            ) / 100;
          lineasConPrecio.push({
            varianteId: linea.varianteId,
            cantidad: linea.cantidad,
            precioUnitario: Math.round(base * (1 - desc) * 100) / 100,
          });
          await tx.stockAlmacen.update({
            where: {
              varianteId_almacenId: {
                varianteId: linea.varianteId,
                almacenId,
              },
            },
            data: {
              reservado: { decrement: linea.cantidad },
              cantidad: { decrement: linea.cantidad },
            },
          });
        }

        const total = lineasConPrecio.reduce(
          (acc, l) => acc + l.precioUnitario * l.cantidad,
          0,
        );
        const venta = await tx.venta.create({
          data: {
            uuid: randomUUID(),
            canal: 'pos',
            estado: 'cobrada',
            medioPago: 'efectivo',
            total,
            almacenId,
            clientaId: reserva.clientaId,
            lineas: {
              create: lineasConPrecio.map((l) => ({
                varianteId: l.varianteId,
                cantidad: l.cantidad,
                precioUnitario: l.precioUnitario,
              })),
            },
          },
        });

        for (const linea of lineasConPrecio) {
          await this.inventario.registrar(tx, {
            tipo: 'venta',
            varianteId: linea.varianteId,
            almacenId,
            cantidad: linea.cantidad,
            reservaId: id,
            ventaId: venta.id,
            nota: 'Compra tras reserva en tienda',
          });
        }
      }

      return tx.reserva.update({
        where: { id },
        data: { estado },
        include: {
          clienta: { select: { id: true, nombre: true, email: true } },
          lineas: { include: { variante: { include: { producto: true } } } },
        },
      });
    });
  }

  obtener(id: string) {
    return this.prisma.reserva.findUnique({
      where: { id },
      include: {
        sucursal: true,
        clienta: { select: { id: true, nombre: true, email: true } },
        lineas: { include: { variante: { include: { producto: true } } } },
      },
    });
  }
}
