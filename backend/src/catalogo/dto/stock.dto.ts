import { Type } from 'class-transformer';
import { IsInt, IsString, Min } from 'class-validator';

export class UpsertStockDto {
  @IsString()
  varianteId!: string;

  @IsString()
  almacenId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidad!: number;
}
