/** Solo ensayar_copia. Por defecto inspecciona; --aplicar confirma los cambios por tienda. */
import { PrismaClient } from '@prisma/client';
import { MIGRACIONES_TIENDA, comprobarMigracion, huellaMigracion, migrarEsquema } from '../src/tenancy/migraciones-esquema';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const aplicar = process.argv.includes('--aplicar');
const db = new PrismaClient();

async function main() {
  const tiendas = await db.tienda.findMany({ select: { id: true, slug: true }, orderBy: { slug: 'asc' } });
  let errores = 0, total = 0;
  for (const tienda of tiendas) {
    try {
      const schema = nombreSchemaTienda(tienda.id);
      const [estado] = await db.$queryRaw<{ esquema: boolean; registro: boolean }[]>`
        SELECT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname=${schema}) esquema,
          to_regclass('public._ensayar_migraciones_tienda') IS NOT NULL registro`;
      if (!estado.esquema) throw new Error('ESQUEMA_TIENDA_INEXISTENTE');
      if (aplicar) {
        const n = await db.$transaction(tx => migrarEsquema(tx, tienda.id), { timeout: 60000, maxWait: 10000 });
        total += n;
        console.log(`${tienda.slug}: ${n} migraciones aplicadas`);
      } else {
        const aplicadas = estado.registro ? await db.$queryRaw<{ version: string; checksum: string }[]>`
          SELECT version, checksum FROM public._ensayar_migraciones_tienda WHERE tienda_id=${tienda.id}` : [];
        if (aplicadas.some(a => !MIGRACIONES_TIENDA.some(m => m.version === a.version && huellaMigracion(m.sql) === a.checksum))) throw new Error('MIGRACION_DESCONOCIDA_O_MODIFICADA');
        for (const a of aplicadas) await comprobarMigracion(db, tienda.id, a.version);
        const n = MIGRACIONES_TIENDA.filter(m => !aplicadas.some(a => a.version === m.version)).length;
        total += n;
        console.log(`${tienda.slug}: ${n} migraciones pendientes`);
      }
    } catch (error) {
      errores++;
      console.error(`${tienda.slug}: ${error instanceof Error ? error.message : 'ERROR'}`);
    }
  }
  console.log(`Tiendas: ${tiendas.length}; ${aplicar ? 'aplicadas' : 'pendientes'}: ${total}; errores: ${errores}`);
  if (errores) process.exitCode = 1;
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
