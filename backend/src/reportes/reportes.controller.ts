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
@Roles(Rol.ADMIN)
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

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
