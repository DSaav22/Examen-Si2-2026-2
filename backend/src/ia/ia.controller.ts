import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { IaService } from './ia.service';

class PreguntaFichaDto {
  @IsString()
  productoId!: string;

  @IsString()
  @MinLength(3)
  pregunta!: string;
}

class TurnoDto {
  @IsIn(['clienta', 'asistente'])
  rol!: 'clienta' | 'asistente';

  @IsString()
  @MinLength(1)
  texto!: string;
}

class BotDto {
  @IsString()
  @MinLength(2)
  mensaje!: string;

  @IsOptional()
  @IsString()
  productoId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  historial?: TurnoDto[];
}

@Controller('ia')
export class IaController {
  constructor(private readonly ia: IaService) {}

  @Post('ficha')
  ficha(@Body() dto: PreguntaFichaDto) {
    return this.ia.ficha(dto.productoId, dto.pregunta);
  }

  @Post('bot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA)
  bot(@CurrentUser() user: JwtPayload, @Body() dto: BotDto) {
    return this.ia.bot(user.sub, dto.mensaje.trim(), dto.productoId, dto.historial ?? []);
  }
}
