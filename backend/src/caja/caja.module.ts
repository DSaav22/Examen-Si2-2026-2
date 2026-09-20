import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';

@Module({
  imports: [AuthModule],
  controllers: [CajaController],
  providers: [CajaService],
})
export class CajaModule {}
