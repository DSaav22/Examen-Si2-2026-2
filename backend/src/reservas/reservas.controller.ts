import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoReserva, Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ReservasService } from './reservas.service';

class LineaReservaDto {
  @IsString()
  varianteId!: string;
  @IsInt()
  @Min(1)
  cantidad!: number;
}

class CrearReservaDto {
  @IsString()
  sucursalId!: string;
  @IsDateString()
  horario!: string;
  @IsOptional()
  @IsString()
  nota?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineaReservaDto)
  lineas!: LineaReservaDto[];
}

class EstadoDto {
  @IsEnum(EstadoReserva)
  estado!: EstadoReserva;
}

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservasController {
  constructor(
    private readonly reservas: ReservasService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('mias')
  @Roles(Rol.CLIENTA)
  mias(@CurrentUser() user: JwtPayload) {
    return this.reservas.misReservas(user.sub);
  }

  @Get('sucursal')
  @Roles(Rol.ENCARGADO, Rol.ADMIN)
  async deSucursal(@CurrentUser() user: JwtPayload) {
    if (user.rol === Rol.ADMIN) {
      return this.prisma.reserva.findMany({
        where: { estado: { in: ['pendiente', 'preparada', 'en_atencion'] } },
        include: {
          clienta: { select: { id: true, nombre: true, email: true } },
          sucursal: true,
          lineas: { include: { variante: { include: { producto: true } } } },
        },
        orderBy: { horario: 'asc' },
      });
    }
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!u.sucursalId) return [];
    return this.reservas.deSucursal(u.sucursalId);
  }

  @Get(':id')
  @Roles(Rol.CLIENTA, Rol.ENCARGADO, Rol.ADMIN)
  async una(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const r = await this.reservas.obtener(id);
    if (!r) throw new NotFoundException({ codigo: 'RESERVA_NO' });
    if (user.rol === Rol.ADMIN) return r;
    if (user.rol === Rol.CLIENTA) {
      if (r.clientaId !== user.sub) {
        throw new ForbiddenException({ codigo: 'NO_ES_TU_RESERVA' });
      }
      return r;
    }
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!u.sucursalId || r.sucursalId !== u.sucursalId) {
      throw new ForbiddenException({ codigo: 'OTRA_SUCURSAL' });
    }
    return r;
  }

  @Post()
  @Roles(Rol.CLIENTA)
  crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearReservaDto) {
    return this.reservas.crear(user.sub, dto);
  }

  @Patch(':id/estado')
  @Roles(Rol.CLIENTA, Rol.ENCARGADO, Rol.ADMIN)
  async estado(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: EstadoDto,
  ) {
    if (user.rol === Rol.CLIENTA && dto.estado !== 'cancelada') {
      throw new ForbiddenException({ codigo: 'CLIENTA_SOLO_CANCELA' });
    }
    if (user.rol === Rol.CLIENTA) {
      const r = await this.reservas.obtener(id);
      if (!r || r.clientaId !== user.sub) {
        throw new ForbiddenException({ codigo: 'NO_ES_TU_RESERVA' });
      }
    }
    let sucursalId: string | undefined;
    let exigirSucursal = false;
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
      }
      sucursalId = u.sucursalId;
      exigirSucursal = true;
    }
    return this.reservas.cambiarEstado(id, dto.estado, sucursalId, exigirSucursal);
  }
}
