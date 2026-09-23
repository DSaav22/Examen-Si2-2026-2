import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export class CrearProductoDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  categoria!: string;

  @IsString()
  ocasion!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  descuentoPct?: number;

  @IsOptional()
  @IsString()
  temporadaId?: string;

  @IsOptional()
  @IsString()
  coleccionId?: string;

  @IsOptional()
  @IsString()
  proveedorId?: string;
}

export class ActualizarProductoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  ocasion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  descuentoPct?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMayorista?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimoMayorista?: number;

  @IsOptional()
  @IsString()
  temporadaId?: string | null;

  @IsOptional()
  @IsString()
  coleccionId?: string | null;

  @IsOptional()
  @IsString()
  proveedorId?: string | null;
}
