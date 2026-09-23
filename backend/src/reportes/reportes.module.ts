import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IaModule } from '../ia/ia.module';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

@Module({
  imports: [AuthModule, IaModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
