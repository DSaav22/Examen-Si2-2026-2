import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InventarioService } from '../inventario/inventario.service';
import { PrismaService } from '../prisma/prisma.service';

class SimularDto {
  @IsIn(['aprobado', 'rechazado'])
  resultado!: 'aprobado' | 'rechazado';
}

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  @Get(':id')
  @Roles(Rol.CLIENTA, Rol.ADMIN)
  async uno(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const pago = await this.prisma.pagoSimulado.findUnique({
      where: { id },
      include: { venta: { include: { lineas: true } } },
    });
    if (!pago) throw new NotFoundException({ codigo: 'PAGO_NO' });
    if (
      user.rol === Rol.CLIENTA &&
      (!pago.venta.clientaId || pago.venta.clientaId !== user.sub)
    ) {
      throw new ForbiddenException({ codigo: 'NO_ES_TU_PAGO' });
    }
    return pago;
  }

  @Post(':id/simular')
  @Roles(Rol.CLIENTA, Rol.ADMIN)
  async simular(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SimularDto,
  ) {
    const pago = await this.prisma.pagoSimulado.findUnique({
      where: { id },
      include: { venta: { include: { lineas: true } } },
    });
    if (!pago) throw new NotFoundException({ codigo: 'PAGO_NO' });
    if (
      user.rol === Rol.CLIENTA &&
      (!pago.venta.clientaId || pago.venta.clientaId !== user.sub)
    ) {
      throw new ForbiddenException({ codigo: 'NO_ES_TU_PAGO' });
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.pagoSimulado.updateMany({
        where: { id, estado: 'pendiente' },
        data: {
          estado: dto.resultado === 'aprobado' ? 'aprobado' : 'rechazado',
          actualizado: new Date(),
        },
      });
      if (claim.count === 0) {
        throw new ConflictException({ codigo: 'PAGO_YA_RESUELTO' });
      }

      if (dto.resultado === 'rechazado') {
        for (const linea of pago.venta.lineas) {
          await tx.$queryRaw`
            SELECT cantidad, reservado FROM stock_almacen
            WHERE variante_id = ${linea.varianteId}
              AND almacen_id = ${pago.venta.almacenId}
            FOR UPDATE
          `;
          await tx.stockAlmacen.update({
            where: {
              varianteId_almacenId: {
                varianteId: linea.varianteId,
                almacenId: pago.venta.almacenId,
              },
            },
            data: { reservado: { decrement: linea.cantidad } },
          });
          await this.inventario.registrar(tx, {
            tipo: 'liberacion',
            varianteId: linea.varianteId,
            almacenId: pago.venta.almacenId,
            cantidad: linea.cantidad,
            ventaId: pago.ventaId,
            usuarioId: user.sub,
            nota: 'Pago QR rechazado — libera hold',
          });
        }
        await tx.venta.update({
          where: { id: pago.ventaId },
          data: { estado: 'anulada' },
        });
        return tx.pagoSimulado.findUniqueOrThrow({
          where: { id },
          include: { venta: true },
        });
      }

      for (const linea of pago.venta.lineas) {
        const rows = await tx.$queryRaw<
          { cantidad: number; reservado: number }[]
        >`
          SELECT cantidad, reservado FROM stock_almacen
          WHERE variante_id = ${linea.varianteId}
            AND almacen_id = ${pago.venta.almacenId}
          FOR UPDATE
        `;
        if (!rows[0] || rows[0].reservado < linea.cantidad) {
          throw new ConflictException({
            codigo: 'STOCK_INSUFICIENTE',
            varianteId: linea.varianteId,
          });
        }
        await tx.stockAlmacen.update({
          where: {
            varianteId_almacenId: {
              varianteId: linea.varianteId,
              almacenId: pago.venta.almacenId,
            },
          },
          data: {
            cantidad: { decrement: linea.cantidad },
            reservado: { decrement: linea.cantidad },
          },
        });
        await this.inventario.registrar(tx, {
          tipo: 'venta',
          varianteId: linea.varianteId,
          almacenId: pago.venta.almacenId,
          cantidad: linea.cantidad,
          ventaId: pago.ventaId,
          usuarioId: user.sub,
          nota: 'Pago QR aprobado',
        });
      }
      await tx.venta.update({
        where: { id: pago.ventaId },
        data: { estado: 'cobrada' },
      });
      return tx.pagoSimulado.findUniqueOrThrow({
        where: { id },
        include: { venta: { include: { lineas: true } } },
      });
    });
  }
}
