import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nombreSchemaTienda } from '../tenancy/schema-nombre';
import { PrismaEsquemasService } from './prisma-esquemas.service';

/**
 * Transacción interactiva en una sola conexión PostgreSQL: modelos de la tienda
 * usan su cliente, y SQL de plataforma debe calificar explícitamente `public`.
 * El servicio que llama debe autorizar al usuario y validar sus datos antes.
 * No es un endpoint ni sustituye los permisos PostgreSQL o la idempotencia.
 */
@Injectable()
export class TransaccionesMixtasService {
  constructor(private readonly esquemas: PrismaEsquemasService) {}

  enTienda<T>(tiendaId: string, trabajo: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const esperado = nombreSchemaTienda(tiendaId);
    return this.esquemas.clienteTienda(tiendaId).$transaction(async (tx) => {
      const [contexto] = await tx.$queryRaw<{ esquema: string; tienda: string }[]>`
        SELECT current_schema() AS esquema, set_config('app.tienda_id', ${tiendaId}, true) AS tienda`;
      if (contexto?.esquema !== esperado || contexto.tienda !== tiendaId) throw new Error('CONTEXTO_TIENDA_INVALIDO');
      return trabajo(tx);
    });
  }
}
