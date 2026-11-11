import { Controller, Get, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AnaliticaService } from './analitica.service';

@Controller('analitica')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERADMIN)
export class AnaliticaController {
  constructor(private readonly analitica: AnaliticaService) {}
  @Get('panel') panel() { return this.analitica.panel(); }
}
