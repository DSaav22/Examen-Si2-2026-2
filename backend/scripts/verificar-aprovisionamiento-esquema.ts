/** Crea exclusivamente tiendas sintéticas en el laboratorio aislado. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { AprovisionadorEsquemaService } from '../src/tenancy/aprovisionador-esquema.service';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';
import { verificarEnumsEsquema } from '../src/prisma/verificar-enums';
import { MODELOS_TIENDA } from '../src/tenancy/dominio-ambitos';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw new Error('SOLO_LABORATORIO');
const clientes = new PrismaEsquemasService(new ConfigService());
const global = clientes.clientePlataforma();
const provisionador = new AprovisionadorEsquemaService();

async function main() {
  const cuenta = await global.cuenta.findFirstOrThrow({ where: { emailVerificado: true } });
  const abortada = randomUUID();
  await assert.rejects(() => global.$transaction(async tx => {
    await tx.tienda.create({ data: { id: abortada, slug: `lab-fallo-${abortada}`, nombre: 'Laboratorio fallo', duenoCuentaId: cuenta.id } });
    await provisionador.crear(tx, abortada, cuenta, 'Laboratorio fallo');
    throw new Error('FALLO_INYECTADO');
  }, { timeout: 60000 }), /FALLO_INYECTADO/);
  assert.equal(await global.tienda.count({ where: { id: abortada } }), 0);
  const schemaFallo = nombreSchemaTienda(abortada);
  const esquemasAbortados = await global.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_namespace WHERE nspname=${schemaFallo}`;
  assert.equal(Number(esquemasAbortados[0].n), 0);

  const tienda = randomUUID();
  await global.$transaction(async tx => {
    await tx.tienda.create({ data: { id: tienda, slug: `lab-alta-${tienda}`, nombre: 'Laboratorio sintético', duenoCuentaId: cuenta.id } });
    await provisionador.crear(tx, tienda, cuenta, 'Laboratorio sintético');
  }, { timeout: 60000 });
  const local = clientes.clienteTienda(tienda);
  const schema = nombreSchemaTienda(tienda);
  const tablas = await global.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=${schema} AND c.relkind='r'`;
  assert.equal(Number(tablas[0].n), MODELOS_TIENDA.length);
  assert.deepEqual((await verificarEnumsEsquema(local, schema, 'tienda')).errores, []);
  const fks = await global.$queryRaw<{ local: bigint; global: bigint }[]>`
    SELECT count(*) FILTER (WHERE dn.nspname=${schema}) AS local, count(*) FILTER (WHERE dn.nspname='public') AS global
    FROM pg_constraint con JOIN pg_class src ON src.oid=con.conrelid JOIN pg_namespace sn ON sn.oid=src.relnamespace
    JOIN pg_class dst ON dst.oid=con.confrelid JOIN pg_namespace dn ON dn.oid=dst.relnamespace
    WHERE con.contype='f' AND sn.nspname=${schema}`;
  assert.ok(Number(fks[0].local) > 0 && Number(fks[0].global) > 0);
  const [usuarios, sucursales, almacenes, categorias, productos] = await Promise.all([
    local.usuario.count(), local.sucursal.count(), local.almacen.count(), local.categoria.count(), local.producto.count(),
  ]);
  assert.deepEqual([usuarios, sucursales, almacenes, categorias, productos], [1, 1, 1, 6, 0]);
  const usuario = await local.usuario.findFirstOrThrow();
  assert.equal(usuario.rol, 'ADMIN');
  assert.equal(usuario.cuentaId, cuenta.id);
  assert.equal(usuario.tiendaId, tienda);
  await assert.rejects(() => global.$transaction(tx => provisionador.crear(tx, tienda, cuenta, 'Duplicada'), { timeout: 60000 }));
  assert.equal(await local.usuario.count(), 1);
  console.log('Aprovisionamiento: esquema con datos iniciales, enum ADMIN y duplicado rechazado; fallo revierte tienda y esquema.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => clientes.onModuleDestroy());
