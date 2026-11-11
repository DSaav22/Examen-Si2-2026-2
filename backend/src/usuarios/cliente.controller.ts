import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString, MinLength } from 'class-validator';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';

class DireccionDto {
  @IsString()
  @MinLength(3)
  detalle!: string;
  @IsString()
  ciudad!: string;
  @IsString()
  etiqueta!: string;
}
class PerfilDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
}

const avatarUploadDir = (() => {
  const dir = join(process.cwd(), 'public', 'uploads', 'avatars');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
})();

@Controller('cliente')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.CLIENTA)
export class ClienteController {
  constructor(
    private readonly prisma: PrismaService,
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

  @Get('favoritos')
  favoritos(@CurrentUser() user: JwtPayload) {
    return this.db().favorito
      .findMany({
        where: { usuarioId: user.sub },
        select: { productoId: true },
        orderBy: { creadoEn: 'desc' },
      })
      .then((items) => items.map((item) => item.productoId));
  }

  @Post('favoritos/:productoId')
  guardar(
    @CurrentUser() user: JwtPayload,
    @Param('productoId') productoId: string,
  ) {
    return this.db().favorito.upsert({
      where: {
        usuarioId_productoId: { usuarioId: user.sub, productoId },
      },
      update: {},
      create: { usuarioId: user.sub, productoId },
    });
  }

  @Delete('favoritos/:productoId')
  quitar(
    @CurrentUser() user: JwtPayload,
    @Param('productoId') productoId: string,
  ) {
    return this.db().favorito.deleteMany({
      where: { usuarioId: user.sub, productoId },
    });
  }

  @Get('perfil')
  perfil(@CurrentUser() user: JwtPayload) {
    return this.db().usuario.findUniqueOrThrow({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        avatarUrl: true,
        direcciones: true,
        lealtad: true,
      },
    });
  }

  @Patch('perfil')
  async renombrar(@CurrentUser() user: JwtPayload, @Body() dto: PerfilDto) {
    return this.db().usuario.update({
      where: { id: user.sub },
      data: { nombre: dto.nombre.trim() },
      select: { id: true, nombre: true, email: true, avatarUrl: true },
    });
  }

  @Post('perfil/avatar')
  @UseInterceptors(
    FileInterceptor('archivo', {
      dest: avatarUploadDir,
      limits: { fileSize: 2_000_000 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException({ codigo: 'AVATAR_TIPO' }) as never, false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async subirAvatar(
    @CurrentUser() user: JwtPayload,
    @UploadedFile()
    archivo?: { filename: string },
  ) {
    if (!archivo?.filename) {
      throw new BadRequestException({ codigo: 'AVATAR_REQUERIDO' });
    }
    const avatarUrl = `/uploads/avatars/${archivo.filename}`;
    return this.db().usuario.update({
      where: { id: user.sub },
      data: { avatarUrl },
      select: { id: true, nombre: true, email: true, avatarUrl: true },
    });
  }

  @Get('direcciones')
  direcciones(@CurrentUser() user: JwtPayload) {
    return this.db().direccionCliente.findMany({
      where: { usuarioId: user.sub },
      orderBy: { id: 'desc' },
    });
  }

  @Post('direcciones')
  direccion(@CurrentUser() user: JwtPayload, @Body() dto: DireccionDto) {
    return this.db().direccionCliente.create({
      data: { ...dto, usuarioId: user.sub },
    });
  }

  @Patch('direcciones/:id')
  async editarDireccion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: DireccionDto,
  ) {
    const propia = await this.db().direccionCliente.findFirst({
      where: { id, usuarioId: user.sub },
    });
    if (!propia) throw new NotFoundException({ codigo: 'DIRECCION_NO' });
    return this.db().direccionCliente.update({ where: { id }, data: dto });
  }

  @Get('cupones')
  async cupones() {
    const items = await this.db().cupon.findMany({
      where: {
        activo: true,
        OR: [{ venceEn: null }, { venceEn: { gt: new Date() } }],
      },
      select: {
        id: true,
        codigo: true,
        porcentaje: true,
        venceEn: true,
        usoMaximo: true,
        usado: true,
      },
      orderBy: { creadoEn: 'desc' },
    });
    return items.filter(
      (item) => item.usoMaximo == null || item.usado < item.usoMaximo,
    );
  }
}
