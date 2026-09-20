import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(
    tx: Tx,
    data: {
      tipo: TipoMovimiento;
      varianteId: string;
      almacenId: string;
      cantidad: number;
      nota?: string;
      ventaId?: string;
      reservaId?: string;
      usuarioId?: string;
    },
  ) {
    return tx.movimientoInventario.create({
      data: {
        tipo: data.tipo,
        varianteId: data.varianteId,
        almacenId: data.almacenId,
        cantidad: data.cantidad,
        nota: data.nota ?? '',
        ventaId: data.ventaId,
        reservaId: data.reservaId,
        usuarioId: data.usuarioId,
      },
    });
  }

  listar(almacenId?: string) {
    return this.prisma.movimientoInventario.findMany({
      where: almacenId ? { almacenId } : undefined,
      include: {
        variante: { include: { producto: true } },
        almacen: { include: { sucursal: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  async ajustar(
    varianteId: string,
    almacenId: string,
    cantidad: number,
    nota: string,
    usuarioId: string,
  ) {
    const qty = Math.max(0, cantidad);
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ cantidad: number; reservado: number }[]>`
        SELECT cantidad, reservado FROM stock_almacen
        WHERE variante_id = ${varianteId} AND almacen_id = ${almacenId}
        FOR UPDATE
      `;
      if (!rows[0]) {
        await tx.stockAlmacen.create({
          data: { varianteId, almacenId, cantidad: qty, reservado: 0 },
        });
      } else {
        if (qty < rows[0].reservado) {
          throw new ConflictException({
            codigo: 'STOCK_MENOR_QUE_RESERVADO',
            reservado: rows[0].reservado,
            cantidad: qty,
          });
        }
        await tx.stockAlmacen.update({
          where: { varianteId_almacenId: { varianteId, almacenId } },
          data: { cantidad: qty },
        });
      }
      await this.registrar(tx, {
        tipo: 'ajuste',
        varianteId,
        almacenId,
        cantidad: qty,
        nota,
        usuarioId,
      });
      return tx.stockAlmacen.findUniqueOrThrow({
        where: { varianteId_almacenId: { varianteId, almacenId } },
      });
    });
  }

  async ingresoProveedor(
    varianteId: string,
    almacenId: string,
    cantidad: number,
    usuarioId: string,
    nota = 'Ingreso proveedor',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ cantidad: number }[]>`
        SELECT cantidad FROM stock_almacen
        WHERE variante_id = ${varianteId} AND almacen_id = ${almacenId}
        FOR UPDATE
      `;
      if (!rows[0]) {
        await tx.stockAlmacen.create({
          data: { varianteId, almacenId, cantidad, reservado: 0 },
        });
      } else {
        await tx.stockAlmacen.update({
          where: { varianteId_almacenId: { varianteId, almacenId } },
          data: { cantidad: { increment: cantidad } },
        });
      }
      await this.registrar(tx, {
        tipo: 'ingreso_proveedor',
        varianteId,
        almacenId,
        cantidad,
        nota,
        usuarioId,
      });
      return tx.stockAlmacen.findUniqueOrThrow({
        where: { varianteId_almacenId: { varianteId, almacenId } },
      });
    });
  }
}
