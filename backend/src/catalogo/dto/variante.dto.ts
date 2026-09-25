import { IsOptional, IsString } from 'class-validator';

export class CrearVarianteDto {
  @IsString()
  talla!: string;

  @IsString()
  color!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  urlFoto?: string;

  @IsOptional()
  @IsString()
  urlOverlay?: string;

  @IsOptional()
  @IsString()
  urlModelo?: string;
}

export class ActualizarVarianteDto {
  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  urlFoto?: string;

  @IsOptional()
  @IsString()
  urlOverlay?: string;

  @IsOptional()
  @IsString()
  urlModelo?: string;
}
