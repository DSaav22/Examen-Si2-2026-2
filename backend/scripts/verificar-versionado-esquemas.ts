/** Ensayo de versionado e integridad con rollback; no deja tienda de prueba. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { AprovisionadorEsquemaService } from '../src/tenancy/aprovisionador-esquema.service';
import { migrarEsquema } from '../src/tenancy/migraciones-esquema';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const db = new PrismaClient();
async function main() {
  const id = randomUUID(), aborto = new Error('REVERSIÓN_CONTROLADA');
  await assert.rejects(() => db.$transaction(async tx => {
    await new AprovisionadorEsquemaService().crearEstructura(tx, id);
    assert.equal(await migrarEsquema(tx, id), 0);
    const [registro] = await tx.$queryRaw<{ total: bigint }[]>`SELECT count(*) total FROM public._ensayar_migraciones_tienda WHERE tienda_id=${id}`;
    assert.equal(Number(registro.total), 1);
    await tx.$executeRawUnsafe('SAVEPOINT antes_de_alterar');
    await tx.$executeRawUnsafe(`DROP INDEX "${nombreSchemaTienda(id)}"."ensayar_producto_nombre_v1"`);
    await assert.rejects(() => migrarEsquema(tx, id), /OBJETO_MIGRACION_INVALIDO/);
    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT antes_de_alterar');
    await tx.$executeRawUnsafe('RELEASE SAVEPOINT antes_de_alterar');
    await tx.$executeRaw`UPDATE public._ensayar_migraciones_tienda SET checksum='alterado' WHERE tienda_id=${id}`;
    await assert.rejects(() => migrarEsquema(tx, id), /MIGRACION_DESCONOCIDA_O_MODIFICADA/);
    throw aborto;
  }, { timeout: 60000 }), e => e === aborto);
  assert.equal((await db.$queryRaw<{ total: bigint }[]>`SELECT count(*) total FROM public._ensayar_migraciones_tienda WHERE tienda_id=${id}`)[0].total, 0n);
  console.log('Versionado: nuevo esquema actualizado, repetición sin cambios, índice ausente y checksum alterado rechazados; ensayo revertido.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
