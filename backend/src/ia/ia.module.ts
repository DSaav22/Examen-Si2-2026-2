import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FluxClient } from './flux.client';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { ModeloClient } from './modelo.client';

@Module({
  imports: [AuthModule],
  controllers: [IaController],
  providers: [IaService, ModeloClient, FluxClient],
  exports: [ModeloClient, FluxClient],
})
export class IaModule {}
