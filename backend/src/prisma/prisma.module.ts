import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { crearPrismaTenant } from '../tenancy/prisma-tenant.extension';
import { PrismaService } from './prisma.service';
import { PrismaEsquemasService } from './prisma-esquemas.service';
import { TransaccionesMixtasService } from './transacciones-mixtas.service';
import { AprovisionadorEsquemaService } from '../tenancy/aprovisionador-esquema.service';

@Global()
@Module({
  providers: [
    PrismaEsquemasService,
    TransaccionesMixtasService,
    AprovisionadorEsquemaService,
    {
      provide: PrismaService,
      useFactory: async () => {
        const base = new PrismaClient();
        await base.$connect();
        return crearPrismaTenant(base);
      },
    },
  ],
  exports: [PrismaService, PrismaEsquemasService, TransaccionesMixtasService, AprovisionadorEsquemaService],
})
export class PrismaModule {}
