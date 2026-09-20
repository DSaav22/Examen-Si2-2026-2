import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProveedoresController } from './proveedores.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProveedoresController],
})
export class ProveedoresModule {}
