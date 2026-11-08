import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsString, IsUrl, Length, ValidateNested } from 'class-validator';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PushService } from './push.service';

class ClavesPushDto {
  @IsString()
  @Length(1, 200)
  p256dh!: string;

  @IsString()
  @Length(1, 100)
  auth!: string;
}

class SuscripcionDto {
  @IsUrl({ require_tld: false })
  endpoint!: string;

  @ValidateNested()
  @Type(() => ClavesPushDto)
  keys!: ClavesPushDto;
}

class DesuscribirDto {
  @IsString()
  endpoint!: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('clave')
  clave() {
    return this.push.clave();
  }

  @Post('suscribir')
  @UseGuards(JwtAuthGuard)
  suscribir(@CurrentUser() user: JwtPayload, @Body() dto: SuscripcionDto) {
    return this.push.suscribir(user.sub, { endpoint: dto.endpoint, ...dto.keys });
  }

  @Post('desuscribir')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  desuscribir(@CurrentUser() user: JwtPayload, @Body() dto: DesuscribirDto) {
    return this.push.desuscribir(user.sub, dto.endpoint);
  }

  @Post('probar')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  probar(@CurrentUser() user: JwtPayload) {
    return this.push.enviar(user.sub, {
      titulo: 'Notificaciones activadas',
      cuerpo: 'Así te avisaremos de ventas, pedidos y conflictos de sincronización.',
      enlace: '/',
      tipo: 'prueba',
    });
  }
}
