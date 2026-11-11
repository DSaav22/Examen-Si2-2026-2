import { ForbiddenException, Injectable } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from './tenant-context';
import { TiendasService } from './tiendas.service';

export type RecursoPlan = 'usuarios' | 'sucursales' | 'productos';

/** Hace cumplir los límites del plan contratado por la tienda activa. */
@Injectable()
export class PlanLimitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tiendas: TiendasService,
  ) {}

  async uso(cliente: PrismaService = this.prisma) {
    const [usuarios, sucursales, productos] = await Promise.all([
      cliente.usuario.count({ where: { rol: { not: Rol.CLIENTA }, activo: true } }),
      cliente.sucursal.count(),
      cliente.producto.count(),
    ]);
    return { usuarios, sucursales, productos };
  }

  async verificar(recurso: RecursoPlan, cliente: PrismaService = this.prisma) {
    const tienda = await this.tiendas.porId(TenantContext.tiendaIdOrThrow());
    const plan = tienda?.plan;
    if (!plan) throw new ForbiddenException({ codigo: 'SUSCRIPCION_VENCIDA' });
    const max =
      recurso === 'usuarios' ? plan.maxUsuarios : recurso === 'sucursales' ? plan.maxSucursales : plan.maxProductos;
    if (max == null) return;
    const actual = (await this.uso(cliente))[recurso];
    if (actual >= max) {
      throw new ForbiddenException({
        codigo: 'LIMITE_PLAN',
        message: `Tu plan ${plan.nombre} permite hasta ${max} ${recurso}. Mejorá el plan para agregar más.`,
        recurso,
        max,
        plan: plan.codigo,
      });
    }
  }
}
