import { Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { crearPrismaTenant } from '../tenancy/prisma-tenant.extension';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: async () => {
        const base = new PrismaClient();
        await base.$connect();
        return crearPrismaTenant(base);
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
