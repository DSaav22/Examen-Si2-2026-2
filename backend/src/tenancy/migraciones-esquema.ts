import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { nombreSchemaTienda } from './schema-nombre';

/** Las migraciones son inmutables: agregar una nueva entrada, nunca editar una aplicada. */
export const MIGRACIONES_TIENDA = [
  { version: '0001_indice_producto_nombre', sql: 'CREATE INDEX "ensayar_producto_nombre_v1" ON {{schema}}."productos" ("nombre")' },
] as const;

export function huellaMigracion(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export async function comprobarMigracion(tx: Prisma.TransactionClient, tiendaId: string, version: string) {
  const schema = nombreSchemaTienda(tiendaId);
  if (version === '0001_indice_producto_nombre') {
    const [r] = await tx.$queryRaw<{ valido: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid
        JOIN pg_class tabla ON tabla.oid=i.indrelid JOIN pg_namespace n ON n.oid=tabla.relnamespace
        WHERE n.nspname=${schema} AND tabla.relname='productos' AND idx.relname='ensayar_producto_nombre_v1'
          AND i.indisvalid AND NOT i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL
          AND i.indnkeyatts=1 AND pg_get_indexdef(i.indexrelid, 1, true)='nombre'
      ) AS valido`;
    if (!r.valido) throw new Error(`OBJETO_MIGRACION_INVALIDO: ${version}`);
    return;
  }
  throw new Error(`MIGRACION_DESCONOCIDA: ${version}`);
}

/** Debe ejecutarse dentro de una transacción; no recibe nombres SQL del cliente. */
export async function migrarEsquema(tx: Prisma.TransactionClient, tiendaId: string) {
  const schema = nombreSchemaTienda(tiendaId);
  // Serializa la creación del registro y las migraciones para evitar doble ejecución.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(714203821)::text AS bloqueo`;
  await tx.$executeRaw`CREATE TABLE IF NOT EXISTS public._ensayar_migraciones_tienda (
    tienda_id text NOT NULL, version text NOT NULL, checksum text NOT NULL,
    aplicada_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tienda_id, version)
  )`;
  const [existe] = await tx.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=${schema}) AS existe`;
  if (!existe.existe) throw new Error('ESQUEMA_TIENDA_INEXISTENTE');
  const aplicadas = await tx.$queryRaw<{ version: string; checksum: string }[]>`
    SELECT version, checksum FROM public._ensayar_migraciones_tienda WHERE tienda_id=${tiendaId} ORDER BY version`;
  for (const aplicada of aplicadas) {
    const conocida = MIGRACIONES_TIENDA.find(m => m.version === aplicada.version);
    if (!conocida || huellaMigracion(conocida.sql) !== aplicada.checksum) throw new Error(`MIGRACION_DESCONOCIDA_O_MODIFICADA: ${aplicada.version}`);
    await comprobarMigracion(tx, tiendaId, aplicada.version);
  }
  let nuevas = 0;
  for (const m of MIGRACIONES_TIENDA) {
    if (aplicadas.some(a => a.version === m.version)) continue;
    await tx.$executeRawUnsafe(m.sql.replace('{{schema}}', `"${schema}"`));
    await comprobarMigracion(tx, tiendaId, m.version);
    await tx.$executeRaw`INSERT INTO public._ensayar_migraciones_tienda(tienda_id,version,checksum) VALUES(${tiendaId},${m.version},${huellaMigracion(m.sql)})`;
    nuevas++;
  }
  return nuevas;
}
