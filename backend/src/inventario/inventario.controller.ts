import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Idempotente } from '../sync/idempotencia.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { InventarioService } from './inventario.service';

class AjusteDto {
  @IsString()
  varianteId!: string;
  @IsString()
  almacenId!: string;
  @IsInt()
  @Min(0)
  cantidad!: number;
  @IsOptional()
  @IsString()
  nota?: string;
}

class TransferenciaDto {
  @IsString()
  varianteId!: string;
  @IsString()
  origenId!: string;
  @IsString()
  destinoId!: string;
  @IsInt()
  @Min(1)
  cantidad!: number;
}

class IngresoDto {
  @IsString()
  varianteId!: string;
  @IsString()
  almacenId!: string;
  @IsInt()
  @Min(1)
  cantidad!: number;
  @IsOptional()
  @IsString()
  nota?: string;
}

@Controller('inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(
    private readonly inventario: InventarioService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('movimientos')
  @Roles(Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN)
  async movimientos(
    @CurrentUser() user: JwtPayload,
    @Query('almacenId') almacenId?: string,
  ) {
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) return [];
      if (almacenId) {
        await this.assertAlmacenDeSucursal(almacenId, u.sucursalId);
        return this.inventario.listar(almacenId);
      }
      const alms = await this.prisma.almacen.findMany({
        where: { sucursalId: u.sucursalId },
        select: { id: true },
      });
      const ids = alms.map((a) => a.id);
      const todos = await this.inventario.listar();
      return todos.filter((m) => ids.includes(m.almacenId));
    }
    return this.inventario.listar(almacenId);
  }

  @Post('ajuste')
  @Idempotente()
  @Roles(Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN)
  async ajustar(@CurrentUser() user: JwtPayload, @Body() dto: AjusteDto) {
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
      }
      await this.assertAlmacenDeSucursal(dto.almacenId, u.sucursalId);
    }
    return this.inventario.ajustar(
      dto.varianteId,
      dto.almacenId,
      dto.cantidad,
      dto.nota ?? 'Ajuste manual',
      user.sub,
    );
  }

  @Post('ingreso')
  @Idempotente()
  @Roles(Rol.ADMIN, Rol.PROVEEDOR, Rol.ENCARGADO, Rol.SUPERADMIN)
  async ingreso(@CurrentUser() user: JwtPayload, @Body() dto: IngresoDto) {
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
      }
      await this.assertAlmacenDeSucursal(dto.almacenId, u.sucursalId);
    }
    if (user.rol === Rol.PROVEEDOR) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.proveedorId) {
        throw new ForbiddenException({ codigo: 'PROVEEDOR_SIN_VINCULO' });
      }
      const variante = await this.prisma.variante.findUnique({
        where: { id: dto.varianteId },
        include: { producto: true },
      });
      if (!variante || variante.producto.proveedorId !== u.proveedorId) {
        throw new ForbiddenException({ codigo: 'VARIANTE_AJENA' });
      }
    }
    return this.inventario.ingresoProveedor(
      dto.varianteId,
      dto.almacenId,
      dto.cantidad,
      user.sub,
      dto.nota,
    );
  }

  @Post('transferencias')
  @Idempotente()
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  async transferir(@CurrentUser() user: JwtPayload, @Body() dto: TransferenciaDto) {
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
      }
      await this.assertAlmacenDeSucursal(dto.origenId, u.sucursalId);
      await this.assertAlmacenDeSucursal(dto.destinoId, u.sucursalId);
    }
    return this.inventario.transferir(
      dto.varianteId,
      dto.origenId,
      dto.destinoId,
      dto.cantidad,
      user.sub,
    );
  }

  private async assertAlmacenDeSucursal(
    almacenId: string,
    sucursalId: string,
  ) {
    const a = await this.prisma.almacen.findUnique({ where: { id: almacenId } });
    if (!a || a.sucursalId !== sucursalId) {
      throw new ForbiddenException({ codigo: 'ALMACEN_OTRA_SUCURSAL' });
    }
  }
}
