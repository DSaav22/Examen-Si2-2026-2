import { Module } from '@nestjs/common';
import { CorreoModule } from '../correo/correo.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CuentaAuthGuard, PlataformaGuard } from './cuenta-auth.guard';
import { CuentasService } from './cuentas.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { TokenService } from './token.service';

@Module({
  imports: [CorreoModule],
  controllers: [AuthController],
  providers: [AuthService, CuentasService, TokenService, JwtAuthGuard, CuentaAuthGuard, PlataformaGuard, RolesGuard],
  exports: [AuthService, CuentasService, TokenService, JwtAuthGuard, CuentaAuthGuard, PlataformaGuard, RolesGuard],
})
export class AuthModule {}
