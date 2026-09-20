import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MetaController } from './meta.controller';

@Module({
  imports: [AuthModule],
  controllers: [MetaController],
})
export class MetaModule {}
