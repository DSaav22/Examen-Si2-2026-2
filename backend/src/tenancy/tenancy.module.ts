import { Global, Module } from '@nestjs/common';
import { PlanLimitesService } from './plan-limites.service';
import { TiendaPublicaController } from './tienda-publica.controller';
import { TiendasService } from './tiendas.service';

@Global()
@Module({
  controllers: [TiendaPublicaController],
  providers: [TiendasService, PlanLimitesService],
  exports: [TiendasService, PlanLimitesService],
})
export class TenancyModule {}
