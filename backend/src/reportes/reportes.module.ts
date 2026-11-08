import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IaModule } from '../ia/ia.module';
import { ReportesInteligentesController } from './inteligente/reportes-inteligentes.controller';
import { ReportesInteligentesService } from './inteligente/reportes-inteligentes.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [AuthModule, IaModule],
  controllers: [ReportesController, ReportesInteligentesController],
  providers: [ReportesService, ReportesInteligentesService],
})
export class ReportesModule {}
