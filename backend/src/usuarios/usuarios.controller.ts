import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class CrearUsuarioDto {
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(4)
  password!: string;
  @IsString()
  nombre!: string;
  @IsEnum(Rol)
  rol!: Rol;
  @IsOptional()
  @IsString()
  sucursalId?: string;
  @IsOptional()
  @IsString()
  proveedorId?: string;
}

class PatchUsuarioDto {
  @IsOptional()
  @IsString()
  nombre?: string;
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
  @IsOptional()
  @IsString()
  sucursalId?: string | null;
  @IsOptional()
  @IsString()
  proveedorId?: string | null;
}

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        sucursalId: true,
        proveedorId: true,
        sucursal: true,
        proveedor: true,
      },
      orderBy: { email: 'asc' },
    });
  }

  @Post()
  async crear(@Body() dto: CrearUsuarioDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        nombre: dto.nombre,
        rol: dto.rol,
        passwordHash,
        sucursalId: dto.sucursalId,
        proveedorId: dto.proveedorId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        sucursalId: true,
        proveedorId: true,
      },
    });
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: PatchUsuarioDto) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.rol !== undefined ? { rol: dto.rol } : {}),
        ...(dto.sucursalId !== undefined ? { sucursalId: dto.sucursalId } : {}),
        ...(dto.proveedorId !== undefined
          ? { proveedorId: dto.proveedorId }
          : {}),
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        sucursalId: true,
        proveedorId: true,
      },
    });
  }
}
