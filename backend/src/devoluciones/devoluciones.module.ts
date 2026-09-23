import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventarioModule } from '../inventario/inventario.module';
import { DevolucionesController } from './devoluciones.controller';

@Module({
  imports: [AuthModule, InventarioModule],
  controllers: [DevolucionesController],
})
export class DevolucionesModule {}