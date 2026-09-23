import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuariosController } from './usuarios.controller';
import { ClienteController } from './cliente.controller';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController, ClienteController],
})
export class UsuariosModule {}
