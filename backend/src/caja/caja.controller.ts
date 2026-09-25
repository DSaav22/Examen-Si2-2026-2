import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CajaService } from './caja.service';
import { AbrirCajaDto, CerrarCajaDto } from './dto/caja.dto';

@Controller('caja')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.CAJERO, Rol.ADMIN, Rol.SUPERADMIN)
export class CajaController {
  constructor(private readonly caja: CajaService) {}

  @Get('turno-abierto')
  turno(@CurrentUser() user: JwtPayload) {
    return this.caja.turnoAbierto(user.sub);
  }

  @Post('abrir')
  abrir(@CurrentUser() user: JwtPayload, @Body() dto: AbrirCajaDto) {
    return this.caja.abrir(user.sub, dto.sucursalId, dto.fondoInicial, user.rol);
  }

  @Post('cerrar')
  cerrar(@CurrentUser() user: JwtPayload, @Body() dto: CerrarCajaDto) {
    return this.caja.cerrar(user.sub, dto.totalDeclarado);
  }
}
