import { Injectable } from '@nestjs/common';
import { Canal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import {
  StockInsuficienteError,
  TurnoRequeridoError,
  UuidConflictError,
} from './errores-venta';

type StockLockRow = {
  variante_id: string;
  almacen_id: string;
  cantidad: number;
};

@Injectable()
export class VentasService {
  constructor(private readonly prisma: PrismaService) {}

  async cobrar(dto: CrearVentaDto) {
    if (dto.canal === Canal.pos && !dto.cajaTurnoId) {
      throw new TurnoRequeridoError();
    }

    const existente = await this.prisma.venta.findUnique({
      where: { uuid: dto.uuid },
      include: { lineas: true },
    });
    if (existente) {
      if (!this.mismoPayload(existente, dto)) {
        throw new UuidConflictError();
      }
      return existente;
    }

    const lineasConPrecio = await this.preciosDeLineas(dto);

    return this.prisma.$transaction(async (tx) => {
      const otraVez = await tx.venta.findUnique({
        where: { uuid: dto.uuid },
        include: { lineas: true },
      });
      if (otraVez) {
        if (!this.mismoPayload(otraVez, dto)) {
          throw new UuidConflictError();
        }
        return otraVez;
      }

      const ids = [...new Set(dto.lineas.map((l) => l.varianteId))].sort();
      const locked: StockLockRow[] = [];
      for (const varianteId of ids) {
        const rows = await tx.$queryRaw<StockLockRow[]>`
          SELECT variante_id, almacen_id, cantidad
          FROM stock_almacen
          WHERE almacen_id = ${dto.almacenId}
            AND variante_id = ${varianteId}
          FOR UPDATE
        `;
        locked.push(...rows);
      }

      const porVariante = new Map(locked.map((r) => [r.variante_id, r.cantidad]));
      const pedidas = new Map<string, number>();
      for (const linea of dto.lineas) {
        pedidas.set(
          linea.varianteId,
          (pedidas.get(linea.varianteId) ?? 0) + linea.cantidad,
        );
      }

      for (const [varianteId, cantidad] of pedidas) {
        const disponible = porVariante.get(varianteId);
        if (disponible === undefined || disponible < cantidad) {
          throw new StockInsuficienteError(varianteId);
        }
      }

      for (const [varianteId, cantidad] of pedidas) {
        await tx.stockAlmacen.update({
          where: {
            varianteId_almacenId: {
              varianteId,
              almacenId: dto.almacenId,
            },
          },
          data: { cantidad: { decrement: cantidad } },
        });
      }

      const total = lineasConPrecio.reduce(
        (acc, l) => acc + l.precioUnitario * l.cantidad,
        0,
      );

      const venta = await tx.venta.create({
        data: {
          uuid: dto.uuid,
          canal: dto.canal,
          estado: 'cobrada',
          medioPago: dto.medioPago,
          total,
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
        include: { lineas: true },
      });

      if (dto.cajaTurnoId) {
        await tx.cajaTurno.update({
          where: { id: dto.cajaTurnoId },
          data: { totalSistema: { increment: total } },
        });
      }

      return venta;
    });
  }

  private async preciosDeLineas(dto: CrearVentaDto) {
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
      return {
        varianteId: linea.varianteId,
        cantidad: linea.cantidad,
        precioUnitario: Number(variante.producto.precioBase),
      };
    });
  }

  private mismoPayload(
    venta: {
      canal: string;
      medioPago: string;
      almacenId: string;
      cajaTurnoId: string | null;
      lineas: { varianteId: string; cantidad: number }[];
    },
    dto: CrearVentaDto,
  ): boolean {
    if (
      venta.canal !== dto.canal ||
      venta.medioPago !== dto.medioPago ||
      venta.almacenId !== dto.almacenId ||
      (venta.cajaTurnoId ?? undefined) !== dto.cajaTurnoId
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
        linea.varianteId === b[i].varianteId && linea.cantidad === b[i].cantidad,
    );
  }
}
