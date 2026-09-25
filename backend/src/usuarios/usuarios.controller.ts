import {

  Body,

  Controller,

  ForbiddenException,

  Get,

  Param,

  Patch,

  Post,

  UseGuards,

} from '@nestjs/common';

import {

  IsBoolean,

  IsEmail,

  IsEnum,

  IsOptional,

  IsString,

  MinLength,

} from 'class-validator';

import { Rol } from '@prisma/client';

import * as bcrypt from 'bcrypt';

import { CurrentUser } from '../auth/current-user';

import type { JwtPayload } from '../auth/jwt-payload';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { esSuperadmin } from '../auth/rol-nivel';

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

  @IsOptional()

  @IsBoolean()

  activo?: boolean;

  @IsOptional()

  @IsBoolean()

  mayorista?: boolean;

}



@Controller('usuarios')

@UseGuards(JwtAuthGuard, RolesGuard)

@Roles(Rol.ADMIN, Rol.SUPERADMIN)

export class UsuariosController {

  constructor(private readonly prisma: PrismaService) {}



  private assertPuedeAsignarRol(actor: JwtPayload, rol: Rol) {

    if (rol === Rol.SUPERADMIN && !esSuperadmin(actor.rol)) {

      throw new ForbiddenException({ codigo: 'SOLO_SUPERADMIN' });

    }

  }



  @Get()

  listar() {

    return this.prisma.usuario.findMany({

      select: {

        id: true,

        email: true,

        nombre: true,

        rol: true,

        activo: true,

        mayorista: true,

        sucursalId: true,

        proveedorId: true,

        sucursal: true,

        proveedor: true,

      },

      orderBy: { email: 'asc' },

    });

  }



  @Post()

  async crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearUsuarioDto) {

    this.assertPuedeAsignarRol(user, dto.rol);

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

  async actualizar(

    @CurrentUser() user: JwtPayload,

    @Param('id') id: string,

    @Body() dto: PatchUsuarioDto,

  ) {

    const target = await this.prisma.usuario.findUniqueOrThrow({

      where: { id },

      select: { rol: true },

    });

    if (target.rol === Rol.SUPERADMIN && !esSuperadmin(user.rol)) {

      throw new ForbiddenException({ codigo: 'SOLO_SUPERADMIN' });

    }

    if (dto.rol !== undefined) this.assertPuedeAsignarRol(user, dto.rol);

    return this.prisma.usuario.update({

      where: { id },

      data: {

        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),

        ...(dto.rol !== undefined ? { rol: dto.rol } : {}),

        ...(dto.sucursalId !== undefined ? { sucursalId: dto.sucursalId } : {}),

        ...(dto.proveedorId !== undefined

          ? { proveedorId: dto.proveedorId }

          : {}),

        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),

        ...(dto.mayorista !== undefined ? { mayorista: dto.mayorista } : {}),

      },

      select: {

        id: true,

        email: true,

        nombre: true,

        rol: true,

        activo: true,

        mayorista: true,

        sucursalId: true,

        proveedorId: true,

      },

    });

  }

}


