import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';

@Module({ imports: [AuthModule], controllers: [AnaliticaController], providers: [AnaliticaService] })
export class AnaliticaModule {}
