/** Auditoría de solo lectura: no copia, modifica ni elimina registros. */
import { PrismaClient, Prisma } from '@prisma/client';
import { MODELOS_TIENDA } from '../src/tenancy/dominio-ambitos';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const db = new PrismaClient();
const tablas = MODELOS_TIENDA.map(n => {
  const m = Prisma.dmmf.datamodel.models.find(x => x.name === n);
  const tabla = m?.dbName ?? m?.name;
  if (!tabla || !/^[a-z_][a-z0-9_]*$/.test(tabla)) throw new Error('TABLA_INVALIDA');
  return tabla;
});

async function main() {
  const tiendas = await db.tienda.findMany({ select: { id: true, slug: true } });
  for (const tienda of tiendas) {
    const esquema = nombreSchemaTienda(tienda.id);
    const existe = await db.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname=${esquema}) AS existe`;
    if (!existe[0].existe) { console.log(`${tienda.slug}: esquema no creado`); continue; }
    const diferencias: string[] = [];
    let fuente = 0, destino = 0;
    for (const tabla of tablas) {
      const resultados = await db.$queryRawUnsafe<{ fuente: bigint; destino: bigint; faltan: bigint; adicionales: bigint }[]>(
        `WITH a AS (SELECT to_jsonb(t) AS fila FROM public."${tabla}" t WHERE tienda_id=$1), b AS (SELECT to_jsonb(t) AS fila FROM "${esquema}"."${tabla}" t)
         SELECT (SELECT count(*) FROM a) fuente, (SELECT count(*) FROM b) destino,
           (SELECT count(*) FROM (SELECT fila FROM a EXCEPT SELECT fila FROM b) d) faltan,
           (SELECT count(*) FROM (SELECT fila FROM b EXCEPT SELECT fila FROM a) d) adicionales`, tienda.id);
      const x = resultados[0]; fuente += Number(x.fuente); destino += Number(x.destino);
      if (Number(x.faltan) || Number(x.adicionales)) diferencias.push(`${tabla}: faltan=${x.faltan}, distintas_o_adicionales=${x.adicionales}`);
    }
    console.log(`${tienda.slug}: fuente=${fuente}, esquema=${destino}, tablas con diferencias=${diferencias.length}`);
    diferencias.forEach(d => console.log(`  ${d}`));
  }
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
