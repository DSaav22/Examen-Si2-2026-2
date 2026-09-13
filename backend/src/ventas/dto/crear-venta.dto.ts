import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Canal, MedioPago } from '@prisma/client';

export class LineaVentaDto {
  @IsUUID()
  varianteId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CrearVentaDto {
  @IsUUID()
  uuid!: string;

  @IsEnum(Canal)
  canal!: Canal;

  @IsEnum(MedioPago)
  medioPago!: MedioPago;

  @IsUUID()
  almacenId!: string;

  @IsOptional()
  @IsUUID()
  cajaTurnoId?: string;

  @IsOptional()
  @IsUUID()
  clientaId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaVentaDto)
  lineas!: LineaVentaDto[];
}
