import { metodosSimuladosPorPais, validarPagoVenta } from './metodos-pais';
import { TenantContext } from '../tenancy/tenant-context';
import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  NotFoundException,
  Optional,
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
import { Idempotente } from '../sync/idempotencia.interceptor';
import { InventarioService } from '../inventario/inventario.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { VentasService } from '../ventas/ventas.service';

class SimularDto {
  @IsIn(['aprobado', 'rechazado'])
  resultado!: 'aprobado' | 'rechazado';
}

@Controller('pagos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagosController {
  private readonly log = new Logger(PagosController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
    private readonly ventas: VentasService,
    private readonly notificaciones: NotificacionesService,
    @Optional() private readonly esquemas?: PrismaEsquemasService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  private db(): PrismaService {
    const tiendaId = TenantContext.tiendaId();
    if (tiendaId && (this.config?.get<string>('TENANT_SCHEMAS_PERFILES') === 'true' || this.config?.get<string>('TENANT_SCHEMAS_VENTAS') === 'true') && this.esquemas) {
      return this.esquemas.clienteTienda(tiendaId) as unknown as PrismaService;
    }
    return this.prisma;
  }

  @Get('metodos')
  @Roles(Rol.CLIENTA, Rol.ADMIN, Rol.CAJERO, Rol.ENCARGADO, Rol.SUPERADMIN)
  async metodos() {
    const tienda = await ((this.config?.get<string>('TENANT_SCHEMAS_PERFILES') === 'true' || this.config?.get<string>('TENANT_SCHEMAS_VENTAS') === 'true') && this.esquemas
      ? this.esquemas.clientePlataforma()
      : this.prisma).tienda.findUniqueOrThrow({ where: { id: TenantContext.tiendaIdOrThrow() }, select: { pais: true } });
    return { pais: tienda.pais, metodos: metodosSimuladosPorPais(tienda.pais) };
  }

  @Get(':id')
  @Roles(Rol.CLIENTA, Rol.ADMIN, Rol.CAJERO, Rol.ENCARGADO, Rol.SUPERADMIN)
  async uno(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const pago = await this.db().pagoSimulado.findUnique({
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
  @Idempotente()
  @Roles(Rol.CLIENTA, Rol.ADMIN, Rol.CAJERO, Rol.ENCARGADO, Rol.SUPERADMIN)
  async simular(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SimularDto,
  ) {
    const pago = await this.db().pagoSimulado.findUnique({
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

    const tienda = await ((this.config?.get<string>('TENANT_SCHEMAS_PERFILES') === 'true' || this.config?.get<string>('TENANT_SCHEMAS_VENTAS') === 'true') && this.esquemas
      ? this.esquemas.clientePlataforma()
      : this.prisma).tienda.findUniqueOrThrow({ where: { id: TenantContext.tiendaIdOrThrow() }, select: { pais: true } });
    const metodo = pago.referencia?.startsWith('SIM:') ? pago.referencia.split(':')[1] : undefined;
    validarPagoVenta(tienda.pais, pago.venta.medioPago, metodo);

    // Una respuesta perdida puede reenviarse sin cobrar ni notificar otra vez.
    if (pago.estado !== 'pendiente') {
      if (pago.estado === dto.resultado) return pago;
      throw new ConflictException({ codigo: 'PAGO_YA_RESUELTO' });
    }

    return this.db().$transaction(async (tx) => {
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
      const cobrada = await tx.venta.update({
        where: { id: pago.ventaId },
        data: { estado: 'cobrada' },
      });
      if (cobrada.canal === 'online' && cobrada.clientaId) {
        await this.ventas.abrirPedido(tx, {
          id: cobrada.id,
          clientaId: cobrada.clientaId,
          total: cobrada.total,
        });
      }
      if (pago.venta.cajaTurnoId) {
        await tx.cajaTurno.update({
          where: { id: pago.venta.cajaTurnoId },
          data: { totalSistema: { increment: pago.venta.total } },
        });
      }
      return tx.pagoSimulado.findUniqueOrThrow({
        where: { id },
        include: { venta: { include: { lineas: true } } },
      });
    }).then((resultado) => {
      if (dto.resultado === 'aprobado' && resultado.venta.clientaId) {
        const enviarCorreo = resultado.venta.canal === 'online';
        void this.notificaciones
          .notificarTrasCobro(resultado.venta.id, { enviarCorreo })
          .catch((err) => {
            this.log.warn(`No se notificó pago ${id}: ${err}`);
          });
      }
      return resultado;
    });
  }
}
