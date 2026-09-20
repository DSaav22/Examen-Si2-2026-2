import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class AbrirCajaDto {
  @IsString()
  sucursalId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fondoInicial!: number;
}

export class CerrarCajaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalDeclarado!: number;
}
