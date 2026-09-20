import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class SucursalDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
  @IsString()
  @MinLength(2)
  ciudad!: string;
}

class NombreDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}

@Controller()
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('temporadas')
  temporadas() {
    return this.prisma.temporada.findMany({ orderBy: { nombre: 'asc' } });
  }

  @Post('temporadas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearTemporada(@Body() dto: NombreDto) {
    return this.prisma.temporada.create({ data: { nombre: dto.nombre } });
  }

  @Get('colecciones')
  colecciones() {
    return this.prisma.coleccion.findMany({ orderBy: { nombre: 'asc' } });
  }

  @Post('colecciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearColeccion(@Body() dto: NombreDto) {
    return this.prisma.coleccion.create({ data: { nombre: dto.nombre } });
  }

  @Get('sucursales')
  listarSucursales() {
    return this.prisma.sucursal.findMany({
      include: { almacenes: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Post('sucursales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearSucursal(@Body() dto: SucursalDto) {
    return this.prisma.sucursal.create({
      data: {
        nombre: dto.nombre,
        ciudad: dto.ciudad,
        almacenes: { create: { nombre: 'Piso venta' } },
      },
      include: { almacenes: true },
    });
  }

  @Patch('sucursales/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  patchSucursal(@Param('id') id: string, @Body() dto: SucursalDto) {
    return this.prisma.sucursal.update({
      where: { id },
      data: { nombre: dto.nombre, ciudad: dto.ciudad },
      include: { almacenes: true },
    });
  }
}
