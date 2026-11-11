import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Optional,
  Param,
  Post,
  UseGuards,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Canal, Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';
import { Idempotente } from '../sync/idempotencia.interceptor';
import { CrearVentaDto } from './dto/crear-venta.dto';
import {
  StockInsuficienteError,
  TurnoInvalidoError,
  TurnoRequeridoError,
  UuidConflictError,
} from './errores-venta';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(
    private readonly ventas: VentasService,
    private readonly prisma: PrismaService,
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

  @Get('historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA)
  historial(@CurrentUser() user: JwtPayload) {
    return this.ventas.historialClienta(user.sub);
  }

  @Get('sucursal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.CAJERO, Rol.SUPERADMIN)
  async deSucursal(@CurrentUser() user: JwtPayload) {
    if (user.rol === Rol.ADMIN || user.rol === Rol.SUPERADMIN) {
      return this.ventas.ventasDeSucursal(undefined);
    }
    const u = await this.db().usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!u.sucursalId) return [];
    return this.ventas.ventasDeSucursal(u.sucursalId);
  }

  @Post(':id/enviar-factura')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CAJERO, Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN, Rol.CLIENTA)
  async enviarFactura(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body?: { email?: string },
  ) {
    const venta = await this.db().venta.findUnique({
      where: { id },
      select: { id: true, clientaId: true },
    });
    if (!venta) throw new NotFoundException({ codigo: 'VENTA_NO' });
    if (user.rol === Rol.CLIENTA && venta.clientaId !== user.sub) {
      throw new ForbiddenException({ codigo: 'NO_ES_TU_VENTA' });
    }
    try {
      return await this.notificaciones.enviarFacturaVenta(id, body?.email);
    } catch (err) {
      const codigo =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { codigo?: string } }).response?.codigo
          : undefined;
      if (codigo === 'CLIENTA_SIN_CORREO') {
        throw new BadRequestException({
          codigo: 'CLIENTA_SIN_CORREO',
          message: 'Indicá un correo válido para enviar la factura.',
        });
      }
      throw err;
    }
  }

  @Post()
  @Idempotente()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CAJERO, Rol.ADMIN, Rol.CLIENTA, Rol.ENCARGADO, Rol.SUPERADMIN)
  async crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearVentaDto) {
    if (user.rol === Rol.CLIENTA) {
      dto.canal = Canal.online;
      dto.clientaId = user.sub;
      dto.cajaTurnoId = undefined;
      if (dto.medioPago === 'efectivo') dto.medioPago = 'contra_entrega';
    }
    if (user.rol === Rol.CAJERO) {
      dto.canal = Canal.pos;
    }
    try {
      return await this.ventas.cobrar(dto, { id: user.sub, rol: user.rol });
    } catch (error) {
      if (error instanceof StockInsuficienteError) {
        throw new ConflictException({
          codigo: 'STOCK_INSUFICIENTE',
          varianteId: error.varianteId,
          disponible: error.disponible,
          pedido: error.pedido,
        });
      }
      if (error instanceof UuidConflictError) {
        throw new ConflictException({ codigo: 'UUID_CONFLICTO' });
      }
      if (error instanceof TurnoRequeridoError) {
        throw new UnprocessableEntityException({ codigo: 'TURNO_REQUERIDO' });
      }
      if (error instanceof TurnoInvalidoError) {
        throw new UnprocessableEntityException({ codigo: error.codigo });
      }
      throw error;
    }
  }
}
