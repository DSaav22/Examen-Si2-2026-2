/** Crea un rol temporal y lo revierte en la misma transacción. Solo ensayar_copia. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const db = new PrismaClient();
const rol = `ensayar_lab_${randomUUID().replace(/-/g, '')}`;
const a = 'tienda_00000000000040008000000000000001';
const b = 'tienda_33333333333343338333333333333333';

async function main() {
  const aborto = new Error('REVERSIÓN_CONTROLADA');
  await assert.rejects(() => db.$transaction(async tx => {
    await tx.$executeRawUnsafe(`CREATE ROLE "${rol}" NOLOGIN`);
    await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA "${a}" TO "${rol}"`);
    await tx.$executeRawUnsafe(`GRANT SELECT ON "${a}".categorias TO "${rol}"`);
    await tx.$executeRawUnsafe(`SET LOCAL ROLE "${rol}"`);
    const propias = await tx.$queryRawUnsafe<{ total: bigint }[]>(`SELECT count(*) total FROM "${a}".categorias`);
    assert.ok(Number(propias[0].total) > 0);
    for (const tabla of [`"${b}".categorias`, 'public.cuentas']) {
      await tx.$executeRawUnsafe('SAVEPOINT antes_de_acceso');
      await assert.rejects(() => tx.$queryRawUnsafe(`SELECT count(*) FROM ${tabla}`), /permission denied|permiso denegado/i);
      await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT antes_de_acceso');
      await tx.$executeRawUnsafe('RELEASE SAVEPOINT antes_de_acceso');
    }
    throw aborto;
  }, { timeout: 30000 }), e => e === aborto);
  const [resultado] = await db.$queryRaw<{ existe: boolean }[]>`SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=${rol}) AS existe`;
  assert.equal(resultado.existe, false);
  console.log('Rol temporal: consulta autorizada y accesos a otra tienda y cuentas globales denegados; cambios revertidos.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => db.$disconnect());
