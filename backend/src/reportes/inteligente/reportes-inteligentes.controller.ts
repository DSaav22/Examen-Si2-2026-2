import { BadRequestException, Body, Controller, Get, Post, StreamableFile, UseGuards } from '@nestjs/common';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../../auth/current-user';
import type { JwtPayload } from '../../auth/jwt-payload';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ReportesInteligentesService } from './reportes-inteligentes.service';
import type { Motor } from './reportes-inteligentes.service';

class PreguntaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  pregunta!: string;
}

class EjecutarDto {
  @IsObject()
  especificacion!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  pregunta?: string;

  @IsOptional()
  @IsIn(['modelo', 'reglas', 'manual'])
  motor?: Motor;
}

class ExportarDto {
  @IsIn(['pdf', 'excel'])
  formato!: 'pdf' | 'excel';

  @IsOptional()
  @IsObject()
  especificacion?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(600)
  pregunta?: string;

  @IsOptional()
  @IsIn(['modelo', 'reglas', 'manual'])
  motor?: Motor;
}

@Controller('reportes/inteligente')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN)
export class ReportesInteligentesController {
  constructor(private readonly reportes: ReportesInteligentesService) {}

  /** Fuentes, campos y operadores que entiende el motor (para la pantalla y la documentación). */
  @Get('catalogo')
  catalogo() {
    return this.reportes.catalogo();
  }

  /** Lenguaje natural (texto o voz transcrita) → reporte en pantalla. */
  @Post()
  generar(@CurrentUser() user: JwtPayload, @Body() dto: PreguntaDto) {
    return this.reportes.generar(dto.pregunta, user.sub);
  }

  /** Solo interpreta: devuelve la especificación sin ejecutarla. */
  @Post('interpretar')
  interpretar(@Body() dto: PreguntaDto) {
    return this.reportes.interpretar(dto.pregunta);
  }

  /** Ejecuta una especificación editada por el usuario (quitar un criterio, cambiar el orden…). */
  @Post('ejecutar')
  ejecutar(@CurrentUser() user: JwtPayload, @Body() dto: EjecutarDto) {
    return this.reportes.ejecutar(dto.especificacion, { adminId: user.sub, motor: dto.motor ?? 'manual', pregunta: dto.pregunta });
  }

  /** Mismo reporte como archivo. Se vuelve a validar y ejecutar: el cliente nunca manda SQL ni filas. */
  @Post('exportar')
  async exportar(@CurrentUser() user: JwtPayload, @Body() dto: ExportarDto) {
    let especificacion = dto.especificacion;
    let motor: Motor = dto.motor ?? 'manual';
    if (!especificacion) {
      if (!dto.pregunta) throw new BadRequestException({ codigo: 'FALTA_REPORTE', mensaje: 'Enviá la especificación o la pregunta.' });
      const interpretado = await this.reportes.interpretar(dto.pregunta);
      especificacion = interpretado.especificacion as unknown as Record<string, unknown>;
      motor = interpretado.motor;
    }
    const archivo = await this.reportes.exportar(especificacion, dto.formato, user.sub, motor, dto.pregunta);
    return new StreamableFile(archivo.buffer, {
      type: archivo.tipo,
      disposition: `attachment; filename="${archivo.nombre}"`,
      length: archivo.buffer.length,
    });
  }
}
