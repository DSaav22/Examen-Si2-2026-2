/** Migra solo tiendas sin esquema, en ensayar_copia; no modifica ni borra las tablas fuente. */
import { Prisma, PrismaClient } from '@prisma/client';
import { MODELOS_TIENDA } from '../src/tenancy/dominio-ambitos';
import { AprovisionadorEsquemaService } from '../src/tenancy/aprovisionador-esquema.service';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const tablas = MODELOS_TIENDA.map(n => {
  const m = Prisma.dmmf.datamodel.models.find(x => x.name === n); const t = m?.dbName ?? m?.name;
  if (!t || !/^[a-z_][a-z0-9_]*$/.test(t)) throw new Error('TABLA_INVALIDA');
  return t;
});
const db = new PrismaClient();
const aprovisionador = new AprovisionadorEsquemaService();

async function main() {
  const fks = await db.$queryRaw<{ origen: string; destino: string }[]>`
    SELECT s.relname AS origen, d.relname AS destino FROM pg_constraint c
    JOIN pg_class s ON s.oid=c.conrelid JOIN pg_namespace sn ON sn.oid=s.relnamespace
    JOIN pg_class d ON d.oid=c.confrelid JOIN pg_namespace dn ON dn.oid=d.relnamespace
    WHERE c.contype='f' AND sn.nspname='public' AND dn.nspname='public'`;
  const restantes = new Set(tablas), orden: string[] = [];
  while (restantes.size) {
    const listas = [...restantes].filter(t => !fks.some(f => f.origen === t && f.destino !== t && restantes.has(f.destino)));
    if (!listas.length) throw new Error('DEPENDENCIAS_CICLICAS: migración detenida sin cambios');
    listas.sort().forEach(t => { restantes.delete(t); orden.push(t); });
  }
  const tiendas = await db.tienda.findMany({ select: { id: true, slug: true } });
  for (const tienda of tiendas) {
    const esquema = nombreSchemaTienda(tienda.id);
    const existe = await db.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname=${esquema}) AS existe`;
    if (existe[0].existe) { console.log(`${tienda.slug}: omitida; esquema existente sin modificar`); continue; }
    const copiados = await db.$transaction(async tx => {
      for (const tabla of [...tablas].sort()) await tx.$executeRawUnsafe(`LOCK TABLE public."${tabla}" IN SHARE MODE`);
      await aprovisionador.crearEstructura(tx, tienda.id);
      let total = 0;
      for (const tabla of orden) {
        await tx.$executeRawUnsafe(`INSERT INTO "${esquema}"."${tabla}" SELECT (jsonb_populate_record(NULL::"${esquema}"."${tabla}",to_jsonb(s))).* FROM public."${tabla}" s WHERE s.tienda_id=$1`, tienda.id);
        const [r] = await tx.$queryRawUnsafe<{ fuente: bigint; destino: bigint; faltan: bigint; extras: bigint }[]>(
          `WITH a AS (SELECT to_jsonb(s) fila FROM public."${tabla}" s WHERE tienda_id=$1), b AS (SELECT to_jsonb(d) fila FROM "${esquema}"."${tabla}" d)
           SELECT (SELECT count(*) FROM a) fuente, (SELECT count(*) FROM b) destino,
           (SELECT count(*) FROM (SELECT fila FROM a EXCEPT SELECT fila FROM b) x) faltan,
           (SELECT count(*) FROM (SELECT fila FROM b EXCEPT SELECT fila FROM a) x) extras`, tienda.id);
        if (r.fuente !== r.destino || r.faltan !== 0n || r.extras !== 0n) throw new Error(`DIFERENCIA_${tabla}`);
        total += Number(r.fuente);
      }
      return total;
    }, { timeout: 120000, maxWait: 10000 });
    console.log(`${tienda.slug}: ${copiados} registros copiados y comparados; fuente conservada`);
  }
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
