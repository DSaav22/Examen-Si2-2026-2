import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { InventarioModule } from '../inventario/inventario.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { VentasModule } from '../ventas/ventas.module';
import { IdempotenciaInterceptor } from './idempotencia.interceptor';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AuthModule, VentasModule, InventarioModule, NotificacionesModule],
  controllers: [SyncController],
  providers: [SyncService, { provide: APP_INTERCEPTOR, useClass: IdempotenciaInterceptor }],
})
export class SyncModule {}
