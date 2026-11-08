import { Type } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

export const PERIODOS = ['MENSUAL', 'TRIMESTRAL', 'ANUAL'] as const;
export type Periodo = (typeof PERIODOS)[number];

export class RegistroCuentaDto {
  @IsString()
  @MinLength(2)
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginCuentaDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class VerificarDto {
  @IsString()
  token!: string;
}

export class ReenviarDto {
  @IsEmail()
  email!: string;
}

export class TarjetaDto {
  @IsString()
  @MinLength(2)
  titular!: string;

  @IsString()
  @Matches(/^[\d ]{13,23}$/)
  numero!: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}$/)
  vence!: string;

  @IsString()
  @Matches(/^\d{3,4}$/)
  cvc!: string;
}

export class DatosTiendaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  @IsString()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/)
  slug!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  pais?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  moneda?: string;
}

export class SuscribirDto {
  @IsString()
  planId!: string;

  @IsIn(PERIODOS)
  periodo!: Periodo;

  @ValidateNested()
  @Type(() => DatosTiendaDto)
  tienda!: DatosTiendaDto;

  @ValidateNested()
  @Type(() => TarjetaDto)
  pago!: TarjetaDto;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class RenovarDto {
  @IsString()
  planId!: string;

  @IsIn(PERIODOS)
  periodo!: Periodo;

  @ValidateNested()
  @Type(() => TarjetaDto)
  pago!: TarjetaDto;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class EntrarDto {
  @IsString()
  tiendaId!: string;
}
