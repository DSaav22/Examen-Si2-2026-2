import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';
import { crearPrismaTenant } from '../tenancy/prisma-tenant.extension';
import { exigirDeLaTienda } from '../tenancy/pertenencia';

type Tx = Prisma.TransactionClient;

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService, private readonly esquemas: PrismaEsquemasService, private readonly config: ConfigService) {}

  cliente(): PrismaService {
    if (this.config.get<string>('TENANT_SCHEMAS_INVENTARIO') !== 'true') return this.prisma;
    if (this.config.get<string>('TENANT_SCHEMAS_PERFILES') !== 'true' || this.config.get<string>('TENANT_SCHEMAS_CATALOGO_ESCRITURA') !== 'true') throw new Error('INVENTARIO_ESQUEMAS_REQUIERE_CATALOGO_Y_PERFILES');
    return crearPrismaTenant(this.esquemas.clienteTienda(TenantContext.tiendaIdOrThrow())) as unknown as PrismaService;
  }

  async registrar(
    tx: Tx,
    data: {
      tipo: TipoMovimiento;
      varianteId: string;
      almacenId: string;
      cantidad: number;
      nota?: string;
      ventaId?: string;
      reservaId?: string;
      usuarioId?: string;
      tiendaId?: string;
    },
  ) {
    const tiendaId = data.tiendaId ?? TenantContext.tiendaId();
    return tx.movimientoInventario.create({
      data: {
        ...(tiendaId ? { tiendaId } : {}),
        tipo: data.tipo,
        varianteId: data.varianteId,
        almacenId: data.almacenId,
        cantidad: data.cantidad,
        nota: data.nota ?? '',
        ventaId: data.ventaId,
        reservaId: data.reservaId,
        usuarioId: data.usuarioId,
      },
    });
  }

  listar(almacenId?: string) {
    return this.cliente().movimientoInventario.findMany({
      where: almacenId ? { almacenId } : undefined,
      include: {
        variante: { include: { producto: true } },
        almacen: { include: { sucursal: true } },
      },
      orderBy: { creadoEn: 'desc' },
      take: 200,
    });
  }

  async ajustar(
    varianteId: string,
    almacenId: string,
    cantidad: number,
    nota: string,
    usuarioId: string,
  ) {
    const qty = Math.max(0, cantidad);
    const prisma = this.cliente();
    await exigirDeLaTienda(prisma, { variante: varianteId, almacen: almacenId });
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ cantidad: number; reservado: number }[]>`
        SELECT cantidad, reservado FROM stock_almacen
        WHERE variante_id = ${varianteId} AND almacen_id = ${almacenId}
        FOR UPDATE
      `;
      if (!rows[0]) {
        const tiendaId = TenantContext.tiendaId();
        await tx.stockAlmacen.create({
          data: { ...(tiendaId ? { tiendaId } : {}), varianteId, almacenId, cantidad: qty, reservado: 0 },
        });
      } else {
        if (qty < rows[0].reservado) {
          throw new ConflictException({
            codigo: 'STOCK_MENOR_QUE_RESERVADO',
            reservado: rows[0].reservado,
            cantidad: qty,
          });
        }
        await tx.stockAlmacen.update({
          where: { varianteId_almacenId: { varianteId, almacenId } },
          data: { cantidad: qty },
        });
      }
      await this.registrar(tx, {
        tipo: 'ajuste',
        varianteId,
        almacenId,
        cantidad: qty,
        nota,
        usuarioId,
      });
      return tx.stockAlmacen.findUniqueOrThrow({
        where: { varianteId_almacenId: { varianteId, almacenId } },
      });
    });
  }

  async ingresoProveedor(
    varianteId: string,
    almacenId: string,
    cantidad: number,
    usuarioId: string,
    nota = 'Ingreso proveedor',
  ) {
    const prisma = this.cliente();
    await exigirDeLaTienda(prisma, { variante: varianteId, almacen: almacenId });
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ cantidad: number }[]>`
        SELECT cantidad FROM stock_almacen
        WHERE variante_id = ${varianteId} AND almacen_id = ${almacenId}
        FOR UPDATE
      `;
      if (!rows[0]) {
        const tiendaId = TenantContext.tiendaId();
        await tx.stockAlmacen.create({
          data: { ...(tiendaId ? { tiendaId } : {}), varianteId, almacenId, cantidad, reservado: 0 },
        });
      } else {
        await tx.stockAlmacen.update({
          where: { varianteId_almacenId: { varianteId, almacenId } },
          data: { cantidad: { increment: cantidad } },
        });
      }
      await this.registrar(tx, {
        tipo: 'ingreso_proveedor',
        varianteId,
        almacenId,
        cantidad,
        nota,
        usuarioId,
      });
      return tx.stockAlmacen.findUniqueOrThrow({
        where: { varianteId_almacenId: { varianteId, almacenId } },
      });
    });
  }

  async transferir(
    varianteId: string,
    origenId: string,
    destinoId: string,
    cantidad: number,
    usuarioId?: string,
  ) {
    if (origenId === destinoId) {
      throw new ConflictException({ codigo: 'MISMO_ALMACEN' });
    }
    if (cantidad < 1) {
      throw new ConflictException({ codigo: 'CANTIDAD_INVALIDA' });
    }
    const prisma = this.cliente();
    await exigirDeLaTienda(prisma, { variante: varianteId, almacen: origenId });
    await exigirDeLaTienda(prisma, { almacen: destinoId });
    return prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { cantidad: number; reservado: number }[]
      >`
        SELECT cantidad, reservado FROM stock_almacen
        WHERE variante_id = ${varianteId} AND almacen_id = ${origenId}
        FOR UPDATE
      `;
      const origen = rows[0];
      const disponible = origen ? origen.cantidad - origen.reservado : 0;
      if (!origen || disponible < cantidad) {
        throw new ConflictException({ codigo: 'STOCK_INSUFICIENTE' });
      }
      await tx.stockAlmacen.update({
        where: { varianteId_almacenId: { varianteId, almacenId: origenId } },
        data: { cantidad: { decrement: cantidad } },
      });
      const tiendaId = TenantContext.tiendaId();
      await tx.stockAlmacen.upsert({
        where: { varianteId_almacenId: { varianteId, almacenId: destinoId } },
        create: { ...(tiendaId ? { tiendaId } : {}), varianteId, almacenId: destinoId, cantidad, reservado: 0 },
        update: { cantidad: { increment: cantidad } },
      });
      await this.registrar(tx, {
        tipo: 'transferencia_salida',
        varianteId,
        almacenId: origenId,
        cantidad,
        usuarioId,
        nota: `Hacia ${destinoId}`,
      });
      await this.registrar(tx, {
        tipo: 'transferencia_entrada',
        varianteId,
        almacenId: destinoId,
        cantidad,
        usuarioId,
        nota: `Desde ${origenId}`,
      });
      return { varianteId, origenId, destinoId, cantidad };
    });
  }
}
