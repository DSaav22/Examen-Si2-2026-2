import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CorreoService } from '../correo/correo.service';
import { NotificacionesService } from './notificaciones.service';

class ProbarCorreoDto {
  @IsEmail()
  @IsString()
  para!: string;
}

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Rol.CLIENTA,
  Rol.CAJERO,
  Rol.ADMIN,
  Rol.ENCARGADO,
  Rol.SUPERADMIN,
  Rol.PROVEEDOR,
)
export class NotificacionesController {
  constructor(
    private readonly notificaciones: NotificacionesService,
    private readonly correo: CorreoService,
  ) {}

  @Get()
  listar(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    return this.notificaciones.listar(user.sub, limit ? Number(limit) : 30);
  }

  @Get('no-leidas')
  async conteo(@CurrentUser() user: JwtPayload) {
    return { count: await this.notificaciones.noLeidas(user.sub) };
  }

  @Get('correo-estado')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN, Rol.CAJERO, Rol.ENCARGADO)
  estadoCorreo() {
    return {
      configurado: this.correo.estaConfigurado(),
      hint: this.correo.estaConfigurado()
        ? 'SMTP listo: los envíos de factura usan correo real.'
        : 'Falta SMTP_PASS (y USER/HOST) en backend/.env. Usá una contraseña de aplicación de Gmail.',
    };
  }

  @Post('probar-correo')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  async probar(@Body() dto: ProbarCorreoDto) {
    if (!this.correo.estaConfigurado()) {
      throw new BadRequestException({
        codigo: 'SMTP_NO_CONFIG',
        message:
          'SMTP no configurado. Completá SMTP_HOST, SMTP_USER y SMTP_PASS en backend/.env y reiniciá el API.',
      });
    }
    return this.correo.probar(dto.para);
  }

  @Patch(':id/leer')
  marcar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificaciones.marcarLeida(user.sub, id);
  }

  @Post('leer-todas')
  marcarTodas(@CurrentUser() user: JwtPayload) {
    return this.notificaciones.marcarTodas(user.sub);
  }
}
