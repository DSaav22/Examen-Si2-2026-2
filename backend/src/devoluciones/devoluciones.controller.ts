import {
  Body,
  ConflictException,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Idempotente } from '../sync/idempotencia.interceptor';
import { InventarioService } from '../inventario/inventario.service';
import { PrismaService } from '../prisma/prisma.service';

class LineaDevolucionDto {
  @IsString()
  lineaId!: string;
  @IsInt()
  @Min(1)
  cantidad!: number;
}

class CrearDevolucionDto {
  @IsString()
  ventaId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineaDevolucionDto)
  lineas!: LineaDevolucionDto[];
}

@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucionesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  @Post()
  @Idempotente()
  @Roles(Rol.CLIENTA, Rol.CAJERO, Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN)
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearDevolucionDto) {
    if (!dto.lineas?.length) {
      throw new ConflictException({ codigo: 'CANTIDAD_INVALIDA' });
    }
    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findUnique({
        where: { id: dto.ventaId },
        include: { lineas: true, pago: true, cajaTurno: true },
      });
      if (!venta) throw new ConflictException({ codigo: 'VENTA_NO' });
      if (venta.estado === 'anulada' || venta.estado === 'pendiente_pago') {
        throw new ConflictException({ codigo: 'VENTA_NO' });
      }
      if (venta.estado === 'devuelta') {
        throw new ConflictException({ codigo: 'YA_DEVUELTA' });
      }
      if (user.rol === Rol.CLIENTA) {
        if (venta.clientaId !== user.sub || venta.canal !== 'online') {
          throw new ConflictException({ codigo: 'NO_ES_TU_VENTA' });
        }
      }

      const porLinea = new Map(venta.lineas.map((l) => [l.id, l]));
      let reembolso = 0;
      for (const pedida of dto.lineas) {
        const linea = porLinea.get(pedida.lineaId);
        const queda = linea ? linea.cantidad - linea.cantidadDevuelta : 0;
        if (!linea || pedida.cantidad < 1 || pedida.cantidad > queda) {
          throw new ConflictException({ codigo: 'CANTIDAD_INVALIDA' });
        }
        reembolso += pedida.cantidad * Number(linea.precioUnitario);
      }

      const devolucion = await tx.devolucion.create({
        data: {
          ventaId: venta.id,
          usuarioId: user.sub,
          lineas: {
            create: dto.lineas.map((l) => ({
              lineaVentaId: l.lineaId,
              cantidad: l.cantidad,
            })),
          },
        },
      });

      for (const pedida of dto.lineas) {
        const linea = porLinea.get(pedida.lineaId)!;
        await tx.lineaVenta.update({
          where: { id: linea.id },
          data: { cantidadDevuelta: { increment: pedida.cantidad } },
        });
        await tx.stockAlmacen.upsert({
          where: {
            varianteId_almacenId: {
              varianteId: linea.varianteId,
              almacenId: venta.almacenId,
            },
          },
          create: {
            varianteId: linea.varianteId,
            almacenId: venta.almacenId,
            cantidad: pedida.cantidad,
            reservado: 0,
          },
          update: { cantidad: { increment: pedida.cantidad } },
        });
        await this.inventario.registrar(tx, {
          tipo: 'devolucion',
          varianteId: linea.varianteId,
          almacenId: venta.almacenId,
          cantidad: pedida.cantidad,
          ventaId: venta.id,
          usuarioId: user.sub,
          nota: `Devolución ${devolucion.id}`,
        });
        linea.cantidadDevuelta += pedida.cantidad;
      }

      const completa = venta.lineas.every(
        (l) => l.cantidadDevuelta >= l.cantidad,
      );
      const estado = completa ? 'devuelta' : 'devuelta_parcial';
      await tx.venta.update({ where: { id: venta.id }, data: { estado } });
      await tx.pedido.updateMany({
        where: { ventaId: venta.id },
        data: { estado: completa ? 'devuelto' : 'devuelto_parcial' },
      });

      let pagoEstado = venta.pago?.estado ?? null;
      if (venta.pago?.estado === 'aprobado') {
        if (completa) {
          await tx.pagoSimulado.update({
            where: { id: venta.pago.id },
            data: { estado: 'reembolsado' },
          });
          pagoEstado = 'reembolsado';
        } else {
          pagoEstado = 'aprobado';
        }
      }
      const bruto = venta.lineas.reduce(
        (acc, l) => acc + l.cantidad * Number(l.precioUnitario),
        0,
      );
      const factor = bruto > 0 ? Number(venta.total) / bruto : 1;
      let ajuste = Math.round(reembolso * factor * 100) / 100;
      if (venta.medioPago === 'credito') {
        // Lo devuelto primero rebaja la deuda; solo lo ya abonado se reintegra en efectivo.
        const cuenta = await tx.cuentaCobrar.findUnique({ where: { ventaId: venta.id } });
        if (cuenta) {
          const rebaja = Math.min(Number(cuenta.saldo), ajuste);
          await tx.cuentaCobrar.update({
            where: { id: cuenta.id },
            data: { saldo: { decrement: rebaja } },
          });
          ajuste = Math.round((ajuste - rebaja) * 100) / 100;
        }
      }
      if (ajuste > 0 && venta.cajaTurnoId && venta.cajaTurno && !venta.cajaTurno.cerradoEn) {
        await tx.cajaTurno.update({
          where: { id: venta.cajaTurnoId },
          data: { totalSistema: { decrement: ajuste } },
        });
      }

      return { id: devolucion.id, estado, pagoEstado, reembolso };
    });
  }
}
