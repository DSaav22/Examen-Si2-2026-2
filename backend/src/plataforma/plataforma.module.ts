import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PasarelaSimulada, PasarelaSuscripcion } from './pasarela-suscripcion';
import { PlataformaController } from './plataforma.controller';
import { PlataformaService } from './plataforma.service';

@Module({
  imports: [AuthModule],
  controllers: [PlataformaController],
  providers: [PlataformaService, { provide: PasarelaSuscripcion, useClass: PasarelaSimulada }],
})
export class PlataformaModule {}
