import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CrearVentaDto } from './dto/crear-venta.dto';
import {
  StockInsuficienteError,
  TurnoRequeridoError,
  UuidConflictError,
} from './errores-venta';
import { VentasService } from './ventas.service';

@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  @Post()
  @HttpCode(201)
  async crear(@Body() dto: CrearVentaDto) {
    try {
      return await this.ventas.cobrar(dto);
    } catch (error) {
      if (error instanceof StockInsuficienteError) {
        throw new ConflictException({
          codigo: 'STOCK_INSUFICIENTE',
          varianteId: error.varianteId,
        });
      }
      if (error instanceof UuidConflictError) {
        throw new ConflictException({ codigo: 'UUID_CONFLICTO' });
      }
      if (error instanceof TurnoRequeridoError) {
        throw new UnprocessableEntityException({ codigo: 'TURNO_REQUERIDO' });
      }
      throw error;
    }
  }
}
