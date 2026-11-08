import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from './tenant-context';

export type TiendaInfo = {
  id: string;
  slug: string;
  nombre: string;
  pais: string;
  moneda: string;
  activa: boolean;
  vigente: boolean;
  venceEn: Date | null;
  plan: {
    id: string;
    codigo: string;
    nombre: string;
    maxUsuarios: number;
    maxSucursales: number;
    maxProductos: number | null;
    modulos: string[];
  } | null;
};

const TTL_MS = 30_000;

/** Resolución de tiendas con caché corta: se consulta en cada petición. */
@Injectable()
export class TiendasService {
  private cache = new Map<string, { info: TiendaInfo | null; hasta: number }>();

  constructor(private readonly prisma: PrismaService) {}

  porSlug(slug: string) {
    return this.cargar(`slug:${slug.toLowerCase()}`, { slug: slug.toLowerCase() });
  }

  porId(id: string) {
    return this.cargar(`id:${id}`, { id });
  }

  invalidar(tiendaId?: string) {
    if (!tiendaId) {
      this.cache.clear();
      return;
    }
    for (const [k, v] of this.cache) {
      if (k === `id:${tiendaId}` || v.info?.id === tiendaId) this.cache.delete(k);
    }
  }

  private async cargar(clave: string, where: { id: string } | { slug: string }) {
    const hit = this.cache.get(clave);
    if (hit && hit.hasta > Date.now()) return hit.info;

    const ahora = new Date();
    const tienda = await TenantContext.sinFiltro(() =>
      this.prisma.tienda.findUnique({
        where,
        include: {
          suscripciones: {
            where: { estado: 'activa', venceEn: { gt: ahora } },
            orderBy: { venceEn: 'desc' },
            take: 1,
            include: { plan: true },
          },
        },
      }),
    );
    const sus = tienda?.suscripciones[0];
    const info: TiendaInfo | null = tienda
      ? {
          id: tienda.id,
          slug: tienda.slug,
          nombre: tienda.nombre,
          pais: tienda.pais,
          moneda: tienda.moneda,
          activa: tienda.estado === 'activa',
          vigente: tienda.estado === 'activa' && Boolean(sus),
          venceEn: sus?.venceEn ?? null,
          plan: sus
            ? {
                id: sus.plan.id,
                codigo: sus.plan.codigo,
                nombre: sus.plan.nombre,
                maxUsuarios: sus.plan.maxUsuarios,
                maxSucursales: sus.plan.maxSucursales,
                maxProductos: sus.plan.maxProductos,
                modulos: sus.plan.modulos,
              }
            : null,
        }
      : null;
    this.cache.set(clave, { info, hasta: Date.now() + TTL_MS });
    return info;
  }
}
