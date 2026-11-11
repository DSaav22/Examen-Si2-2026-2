/** Prueba de solo lectura contra el laboratorio aislado; no migra ni aprovisiona tiendas. */
import { strict as assert } from 'node:assert';
import { ConfigService } from '@nestjs/config';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || new URL(url).pathname !== '/ensayar_copia' || new URL(url).port !== '55443') {
  throw new Error('La prueba solo puede conectarse al laboratorio aislado ensayar_copia en el puerto 55443.');
}

const idA = '00000000-0000-4000-8000-000000000001';
const idB = '33333333-3333-4333-8333-333333333333';
const servicio = new PrismaEsquemasService(new ConfigService());

async function main() {
  const a = servicio.clienteTienda(idA);
  const b = servicio.clienteTienda(idB);
  const global = servicio.clientePlataforma();
  const [tiendas, productosA, productosB] = await Promise.all([
    global.tienda.count(), a.producto.count(), b.producto.count(),
  ]);
  assert.ok(tiendas > 0 && productosA > 0);
  assert.ok(productosB > 0, 'El ensayo necesita el producto sintético de la tienda B');
  assert.equal(await a.producto.count({ where: { id: 'lab-producto-b-001' } }), 0);
  assert.equal(await b.producto.count({ where: { id: 'lab-producto-b-001' } }), 1);
  const muestras = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? b : a).$transaction(async (tx) => {
    const [{ esquema }] = await tx.$queryRaw<{ esquema: string }[]>`SELECT current_schema() AS esquema`;
    const total = await tx.producto.count();
    return { esquema, total };
  })));
  for (const [i, muestra] of muestras.entries()) {
    assert.equal(muestra.esquema, i % 2 ? 'tienda_33333333333343338333333333333333' : 'tienda_00000000000040008000000000000001');
    assert.equal(muestra.total, i % 2 ? productosB : productosA);
  }
  await assert.rejects(() => a.$transaction(async (tx) => tx.tienda.count()), /MODELO_FUERA_DE_AMBITO/);
  await assert.rejects(() => global.$transaction(async (tx) => tx.usuario.count()), /MODELO_FUERA_DE_AMBITO/);
  await assert.rejects(() => servicio.clienteTienda('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa').producto.count());
  console.log('Conexiones: plataforma y dos tiendas correctas; transacciones concurrentes aisladas; cruce de modelos y esquema inexistente rechazados.');
}

main().catch((e: unknown) => {
  console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido');
  process.exitCode = 1;
}).finally(() => servicio.onModuleDestroy());
