import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { VENTANA_MAX_DIAS, VENTANA_MIN_DIAS } from './politica';

export const TIPOS_OPERACION = ['venta', 'cliente', 'producto'] as const;
export type TipoOperacion = (typeof TIPOS_OPERACION)[number];

export class OperacionDto {
  /** UUID generado por el dispositivo: es la clave de idempotencia de la operación. */
  @IsUUID()
  id!: string;

  @IsIn(TIPOS_OPERACION)
  tipo!: TipoOperacion;

  /** Momento en que se hizo la operación en el dispositivo. */
  @IsISO8601()
  creadaEn!: string;

  @IsObject()
  datos!: Record<string, unknown>;
}

export class LoteSyncDto {
  @IsString()
  @Length(1, 100)
  dispositivoId!: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  nombreDispositivo?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OperacionDto)
  operaciones!: OperacionDto[];
}

export class PoliticaDto {
  @IsInt()
  @Min(VENTANA_MIN_DIAS)
  @Max(VENTANA_MAX_DIAS)
  ventanaOfflineDias!: number;
}

export class ClienteOfflineDto {
  @IsUUID()
  id!: string;

  @IsString()
  @Length(1, 120)
  nombre!: string;

  @IsEmail()
  email!: string;
}

export class VarianteOfflineDto {
  @IsUUID()
  id!: string;

  @IsString()
  @Length(1, 20)
  talla!: string;

  @IsString()
  @Length(1, 40)
  color!: string;

  @IsString()
  @Length(1, 60)
  sku!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}

export class ProductoOfflineDto {
  @IsUUID()
  id!: string;

  @IsString()
  @Length(1, 160)
  nombre!: string;

  @IsString()
  categoria!: string;

  @IsString()
  ocasion!: string;

  @IsNumber()
  @Min(0)
  precioBase!: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Almacén donde se carga el stock inicial de las variantes. */
  @IsOptional()
  @IsString()
  almacenId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => VarianteOfflineDto)
  variantes!: VarianteOfflineDto[];
}
