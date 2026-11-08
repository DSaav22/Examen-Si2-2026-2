import { Controller, Get, NotFoundException } from '@nestjs/common';
import { TenantContext } from './tenant-context';
import { TiendasService } from './tiendas.service';

/** Datos públicos de la tienda activa (vitrina: nombre, moneda, plan). */
@Controller('tienda')
export class TiendaPublicaController {
  constructor(private readonly tiendas: TiendasService) {}

  @Get()
  async actual() {
    const id = TenantContext.tiendaId();
    const t = id ? await this.tiendas.porId(id) : null;
    if (!t) throw new NotFoundException({ codigo: 'TIENDA_NO_EXISTE' });
    return {
      id: t.id,
      slug: t.slug,
      nombre: t.nombre,
      pais: t.pais,
      moneda: t.moneda,
      plan: t.plan ? { codigo: t.plan.codigo, nombre: t.plan.nombre, modulos: t.plan.modulos } : null,
    };
  }
}
