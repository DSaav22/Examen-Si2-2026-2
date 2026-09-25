import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventarioModule } from '../inventario/inventario.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { VentasModule } from '../ventas/ventas.module';
import { PagosController } from './pagos.controller';

@Module({
  imports: [AuthModule, InventarioModule, VentasModule, NotificacionesModule],
  controllers: [PagosController],
})
export class PagosModule {}
