import { InventarioModule } from '../inventario/inventario.module';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [AuthModule, InventarioModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
