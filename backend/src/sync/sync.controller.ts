import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LoteSyncDto, PoliticaDto } from './sync.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get('politica')
  politica() {
    return this.sync.politica();
  }

  @Patch('politica')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  fijarPolitica(@Body() dto: PoliticaDto) {
    return this.sync.fijarVentana(dto.ventanaOfflineDias);
  }

  @Post('lote')
  @HttpCode(200)
  @Roles(Rol.CAJERO, Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  lote(@CurrentUser() user: JwtPayload, @Body() dto: LoteSyncDto) {
    return this.sync.lote(dto, user);
  }

  @Get('operaciones')
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  operaciones(@Query('estado') estado?: string) {
    return this.sync.operaciones(estado);
  }

  @Post('operaciones/:id/descartar')
  @HttpCode(200)
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  descartar(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.sync.descartar(id, user);
  }
}
