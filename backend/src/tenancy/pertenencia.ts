import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Referencia =
  | 'variante'
  | 'almacen'
  | 'sucursal'
  | 'temporada'
  | 'coleccion'
  | 'proveedor'
  | 'producto'
  | 'usuario'
  | 'cajaTurno';
type Contador = { count(args: { where: { id: string } }): Promise<number> };

/**
 * Las FK no saben de tiendas: un id válido de otra tienda pasaría. Antes de escribir
 * con ids que vienen del cliente se confirma que existen dentro de la tienda activa
 * (el filtro por tienda lo pone la extensión de Prisma).
 */
export async function exigirDeLaTienda(
  prisma: PrismaService,
  refs: Partial<Record<Referencia, string | null | undefined>>,
) {
  for (const [modelo, id] of Object.entries(refs)) {
    if (!id) continue;
    const delegado = (prisma as unknown as Record<string, Contador>)[modelo];
    if ((await delegado.count({ where: { id } })) === 0) {
      throw new NotFoundException({ codigo: 'REFERENCIA_NO_EXISTE', recurso: modelo, id });
    }
  }
}
