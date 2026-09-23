import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Canal, MedioPago } from '@prisma/client';

export class LineaVentaDto {
  @IsString()
  varianteId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CrearVentaDto {
  @IsString()
  uuid!: string;

  @IsEnum(Canal)
  canal!: Canal;

  @IsEnum(MedioPago)
  medioPago!: MedioPago;

  @IsString()
  almacenId!: string;

  @IsOptional()
  @IsString()
  cajaTurnoId?: string;

  @IsOptional()
  @IsString()
  clientaId?: string;

  @IsOptional()
  @IsString()
  cuponCodigo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaVentaDto)
  lineas!: LineaVentaDto[];
}
