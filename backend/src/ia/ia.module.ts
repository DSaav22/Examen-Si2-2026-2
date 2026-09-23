import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { ModeloClient } from './modelo.client';

@Module({
  imports: [AuthModule],
  controllers: [IaController],
  providers: [IaService, ModeloClient],
  exports: [ModeloClient],
})
export class IaModule {}
