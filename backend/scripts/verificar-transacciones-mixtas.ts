/** Ensayo en la base aislada: un pago global y una categoría local en la misma transacción. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { TransaccionesMixtasService } from '../src/prisma/transacciones-mixtas.service';

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || new URL(url).pathname !== '/ensayar_copia' || new URL(url).port !== '55443') {
  throw new Error('La prueba solo puede ejecutarse en el laboratorio aislado del puerto 55443.');
}
const tiendaId = '00000000-0000-4000-8000-000000000001';
const esquemas = new PrismaEsquemasService(new ConfigService());
const mixtas = new TransaccionesMixtasService(esquemas);
const global = esquemas.clientePlataforma();
const local = esquemas.clienteTienda(tiendaId);

async function main() {
  const suscripcion = await global.suscripcion.findFirstOrThrow({ where: { tiendaId } });
  const insertaPago = (tx: Prisma.TransactionClient, clave: string) => tx.$executeRaw`
    INSERT INTO public.pagos_suscripcion
      (id, suscripcion_id, monto, moneda, pasarela, referencia, estado, ultimos4, idempotency_key)
    VALUES (${randomUUID()}, ${suscripcion.id}, 1, 'USD', 'simulada:ensayo', 'laboratorio', 'aprobado'::public."EstadoPago", '', ${clave})`;
  const insertaCategoria = (tx: Prisma.TransactionClient, id: string) => tx.categoria.create({
    data: { id, nombre: `Laboratorio ${id}` },
  });
  const noPersistio = async (clave: string, id: string) => {
    assert.equal(await global.pagoSuscripcion.count({ where: { idempotencyKey: clave } }), 0);
    assert.equal(await local.categoria.count({ where: { id } }), 0);
  };

  for (const punto of ['global', 'local'] as const) {
    const clave = randomUUID(), id = randomUUID(), fallo = new Error(`FALLO_TRAS_${punto}`);
    await assert.rejects(() => mixtas.enTienda(tiendaId, async (tx) => {
      await insertaPago(tx, clave);
      if (punto === 'global') throw fallo;
      await insertaCategoria(tx, id);
      throw fallo;
    }), (e: Error) => e === fallo);
    await noPersistio(clave, id);
  }
  console.log('Rollback: los fallos tras el pago global o el registro local no dejaron datos parciales.');

  const clave = randomUUID(), id = randomUUID();
  await mixtas.enTienda(tiendaId, async (tx) => {
    await insertaPago(tx, clave);
    const categoria = await insertaCategoria(tx, id);
    assert.equal(categoria.tiendaId, tiendaId);
  });
  assert.equal(await global.pagoSuscripcion.count({ where: { idempotencyKey: clave } }), 1);
  assert.equal(await local.categoria.count({ where: { id } }), 1);
  console.log('Commit: el pago global y la categoría local quedaron registrados en el laboratorio.');

  const duplicada = randomUUID();
  await assert.rejects(() => mixtas.enTienda(tiendaId, async (tx) => {
    await insertaCategoria(tx, duplicada);
    await insertaPago(tx, clave);
  }));
  assert.equal(await local.categoria.count({ where: { id: duplicada } }), 0);
  assert.equal(await global.pagoSuscripcion.count({ where: { idempotencyKey: clave } }), 1);
  console.log('Clave duplicada: el error revirtió la escritura local previa y conservó un solo pago.');
}

main().catch((e: unknown) => {
  console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido');
  process.exitCode = 1;
}).finally(() => esquemas.onModuleDestroy());
