import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditosController } from './creditos.controller';

@Module({
  imports: [AuthModule],
  controllers: [CreditosController],
})
export class CreditosModule {}
