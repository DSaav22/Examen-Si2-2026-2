import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsIn, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request } from 'express';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TokenService } from '../auth/token.service';
import { TenantContext } from '../tenancy/tenant-context';
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
  @IsString({ each: true })
  carritoIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TurnoDto)
  historial?: TurnoDto[];
}

class ProbarDto {
  @IsString()
  varianteId!: string;

  /** data URL o base64 puro de la foto de la clienta */
  @IsString()
  @MinLength(80)
  imagenBase64!: string;
}

@Controller('ia')
export class IaController {
  constructor(
    private readonly ia: IaService,
    private readonly tokens: TokenService,
  ) {}

  @Post('ficha')
  ficha(@Body() dto: PreguntaFichaDto) {
    return this.ia.ficha(dto.productoId, dto.pregunta);
  }

  /** Público: invitadas preguntan por catálogo; con sesión CLIENTA también ve pedidos. */
  @Post('bot')
  async bot(@Req() request: Request, @Body() dto: BotDto) {
    let clientaId: string | null = null;
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (token) {
      try {
        const payload = this.tokens.verify(token);
        if (payload.tipo === 'tienda' && payload.tiendaId === TenantContext.tiendaId() && payload.rol === Rol.CLIENTA && !await this.tokens.isRevoked(token)) {
          clientaId = payload.sub;
        }
      } catch {
        /* invitada */
      }
    }
    return this.ia.bot(clientaId, dto.mensaje.trim(), dto.productoId, dto.historial ?? [], dto.carritoIds);
  }

  /** Try-on con FLUX (Azure AI). Solo clienta; la foto no se reutiliza fuera de esta petición. */
  @Post('probar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA, Rol.ADMIN, Rol.SUPERADMIN)
  probar(@Body() dto: ProbarDto) {
    return this.ia.probar(dto.varianteId, dto.imagenBase64);
  }
}
