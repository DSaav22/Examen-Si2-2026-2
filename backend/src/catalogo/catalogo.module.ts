import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { ImagenService } from './imagen.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogoController],
  providers: [CatalogoService, ImagenService],
})
export class CatalogoModule {}
