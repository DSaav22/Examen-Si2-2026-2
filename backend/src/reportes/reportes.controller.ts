import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReportesService } from './reportes.service';

class PreguntaDto {
  @IsString()
  @MinLength(4)
  pregunta!: string;
}

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERADMIN)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get('contexto')
  contexto() {
    return this.reportes.contexto();
  }

  /** Rankings y KPIs de negocio listos para el admin (sin SQL). */
  @Get('panel')
  panel(
    @CurrentUser() user: JwtPayload,
    @Query('periodo') periodo?: string,
    @Query('sucursal') sucursal?: string,
  ) {
    return this.reportes.panel(user.sub, periodo, sucursal);
  }

  @Get('negocio')
  negocio(
    @CurrentUser() user: JwtPayload,
    @Query('tipo') tipo = 'sucursales',
    @Query('periodo') periodo?: string,
    @Query('sucursal') sucursal?: string,
  ) {
    return this.reportes.negocio(tipo, periodo, sucursal, user.sub);
  }

  @Get('dia')
  delDia(
    @CurrentUser() user: JwtPayload,
    @Query('sucursal') sucursal?: string,
  ) {
    return this.reportes.delDia(sucursal, user.sub);
  }

  @Get('inventario')
  inventario(@CurrentUser() user: JwtPayload) {
    return this.reportes.inventario(user.sub);
  }

  @Post('generativo')
  generar(@CurrentUser() user: JwtPayload, @Body() dto: PreguntaDto) {
    return this.reportes.generar(dto.pregunta, user.sub);
  }
}
