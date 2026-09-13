import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { VentasModule } from './ventas/ventas.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, VentasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
