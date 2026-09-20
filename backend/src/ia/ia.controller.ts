import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { IaService } from './ia.service';

class PreguntaFichaDto {
  @IsString()
  productoId!: string;

  @IsString()
  @MinLength(3)
  pregunta!: string;
}

@Controller('ia')
export class IaController {
  constructor(private readonly ia: IaService) {}

  @Post('ficha')
  ficha(@Body() dto: PreguntaFichaDto) {
    return this.ia.ficha(dto.productoId, dto.pregunta);
  }
}
