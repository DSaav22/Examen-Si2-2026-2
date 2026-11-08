import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { CuentaAuthGuard, CurrentCuenta, type CuentaSesion } from './cuenta-auth.guard';
import { CurrentUser } from './current-user';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from './jwt-payload';

class CambiarTiendaDto {
  @IsString()
  tiendaId!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  registro(@Body() dto: RegistroDto) {
    return this.auth.registro(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  logout(@Req() request: Request) {
    const authorization = request.headers.authorization;
    if (authorization?.startsWith('Bearer ')) this.auth.logout(authorization.slice(7));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @Get('mis-tiendas')
  @UseGuards(CuentaAuthGuard)
  misTiendas(@CurrentCuenta() cuenta: CuentaSesion) {
    return this.auth.misTiendas(cuenta.cuentaId);
  }

  @Post('cambiar-tienda')
  @UseGuards(CuentaAuthGuard)
  cambiarTienda(@CurrentCuenta() cuenta: CuentaSesion, @Body() dto: CambiarTiendaDto) {
    return this.auth.cambiarTienda(cuenta.cuentaId, dto.tiendaId);
  }

  @Post('cambiar-clave')
  @UseGuards(JwtAuthGuard)
  cambiarClave(@CurrentUser() user: JwtPayload, @Body() body: { actual?: string; nueva?: string }) {
    if (!body.actual || !body.nueva || body.nueva.length < 8) throw new BadRequestException('La nueva clave debe tener al menos 8 caracteres');
    return this.auth.cambiarClave(user.sub, body.actual, body.nueva);
  }
}
