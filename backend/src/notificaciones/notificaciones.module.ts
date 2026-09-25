import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CorreoModule } from '../correo/correo.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [PrismaModule, CorreoModule, AuthModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesGateway],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
