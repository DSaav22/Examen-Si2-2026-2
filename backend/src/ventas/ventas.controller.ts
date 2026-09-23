import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
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
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

  @Get('historial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA)
  historial(@CurrentUser() user: JwtPayload) {
    return this.ventas.historialClienta(user.sub);
  }

  @Get('sucursal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ENCARGADO, Rol.ADMIN)
  async deSucursal(@CurrentUser() user: JwtPayload) {
    if (user.rol === Rol.ADMIN) {
      return this.ventas.ventasDeSucursal(undefined);
    }
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!u.sucursalId) return [];
    return this.ventas.ventasDeSucursal(u.sucursalId);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CAJERO, Rol.ADMIN, Rol.CLIENTA, Rol.VENDEDOR, Rol.ENCARGADO)
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
