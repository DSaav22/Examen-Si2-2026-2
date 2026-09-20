import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventarioModule } from '../inventario/inventario.module';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [AuthModule, InventarioModule],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
