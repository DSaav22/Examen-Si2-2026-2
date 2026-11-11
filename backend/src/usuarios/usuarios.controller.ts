import {
  Body,
  ConflictException,
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
import { CuentasService } from '../auth/cuentas.service';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { esSuperadmin } from '../auth/rol-nivel';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Idempotente } from '../sync/idempotencia.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';
import { PlanLimitesService } from '../tenancy/plan-limites.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentas: CuentasService,
    private readonly limites: PlanLimitesService,
    private readonly esquemas: PrismaEsquemasService,
    private readonly config: ConfigService,
  ) {}

  private db(): PrismaService {
    const tiendaId = TenantContext.tiendaId();
    if (tiendaId && this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true') {
      return this.esquemas.clienteTienda(tiendaId) as unknown as PrismaService;
    }
    return this.prisma;
  }

  private assertPuedeAsignarRol(actor: JwtPayload, rol: Rol) {
    if (rol === Rol.SUPERADMIN && !esSuperadmin(actor.rol)) {
      throw new ForbiddenException({ codigo: 'SOLO_SUPERADMIN' });
    }
  }

  @Get()
  listar() {
    return this.db().usuario.findMany({
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

  /** Alta de un empleado: si el correo ya tiene cuenta en otra tienda, se reutiliza (una cuenta, varias tiendas). */
  @Post()
  @Idempotente()
  async crear(@CurrentUser() user: JwtPayload, @Body() dto: CrearUsuarioDto) {
    this.assertPuedeAsignarRol(user, dto.rol);
    if (dto.rol !== Rol.CLIENTA) await this.limites.verificar('usuarios', this.db());
    const email = this.cuentas.normalizar(dto.email);
    if (await this.db().usuario.findFirst({ where: { email }, select: { id: true } })) {
      throw new ConflictException({ codigo: 'EMAIL_EN_USO', message: 'Ese correo ya tiene un perfil en esta tienda.' });
    }
    const { cuenta, nueva } = await this.cuentas.obtenerOCrear({
      email,
      nombre: dto.nombre,
      password: dto.password,
      exigirClave: false,
    });
    const usuario = await this.db().usuario.create({
      data: {
        cuentaId: cuenta.id,
        email,
        nombre: dto.nombre,
        rol: dto.rol,
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
    return { ...usuario, cuentaExistente: !nueva };
  }

  @Patch(':id')
  async actualizar(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: PatchUsuarioDto,
  ) {
    const target = await this.db().usuario.findUniqueOrThrow({
      where: { id },
      select: { rol: true, activo: true },
    });
    if (target.rol === Rol.SUPERADMIN && !esSuperadmin(user.rol)) {
      throw new ForbiddenException({ codigo: 'SOLO_SUPERADMIN' });
    }
    if (dto.rol !== undefined) this.assertPuedeAsignarRol(user, dto.rol);
    const pasaAStaff = dto.rol !== undefined && dto.rol !== Rol.CLIENTA && target.rol === Rol.CLIENTA;
    const reactiva = dto.activo === true && !target.activo && (dto.rol ?? target.rol) !== Rol.CLIENTA;
    if (pasaAStaff || reactiva) await this.limites.verificar('usuarios', this.db());
    return this.db().usuario.update({
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
