/** Comprueba enums y rollback en el laboratorio aislado; no modifica datos persistentes. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { verificarEnumsEsquema } from '../src/prisma/verificar-enums';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';

const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== '127.0.0.1' || new URL(url).pathname !== '/ensayar_copia' || new URL(url).port !== '55443') {
  throw new Error('La prueba solo puede conectarse al laboratorio aislado ensayar_copia del puerto 55443.');
}

const ids = ['00000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333'];
const servicio = new PrismaEsquemasService(new ConfigService());
const rollback = new Error('ROLLBACK_DE_PRUEBA');

async function main() {
  const global = servicio.clientePlataforma();
  const globalInfo = await verificarEnumsEsquema(global, 'public', 'plataforma');
  assert.deepEqual(globalInfo.errores, []);
  for (const id of ids) {
    const local = servicio.clienteTienda(id);
    const info = await verificarEnumsEsquema(local, nombreSchemaTienda(id), 'tienda');
    assert.deepEqual(info.errores, []);
    await local.usuario.count({ where: { rol: { not: 'CLIENTA' } } });
    await local.venta.count({ where: { estado: { in: ['cobrada', 'pendiente_pago'] } } });
    console.log(`Tienda ${id.slice(0, 8)}: ${info.columnasComprobadas} columnas enum correctas y filtros válidos.`);
  }

  const idPrueba = randomUUID();
  try {
    await global.$transaction(async (tx) => {
      const plan = await tx.plan.findFirstOrThrow();
      await tx.tienda.create({ data: {
        id: idPrueba, slug: `enum-${idPrueba}`, nombre: 'Prueba de enums', estado: 'activa',
        suscripciones: { create: {
          planId: plan.id, periodo: 'MENSUAL', estado: 'activa', monto: 1, moneda: 'USD',
          inicio: new Date(), venceEn: new Date(Date.now() + 86_400_000),
          pagos: { create: { monto: 1, moneda: 'USD', pasarela: 'simulada', referencia: 'ensayo', estado: 'aprobado', idempotencyKey: randomUUID() } },
        } },
      } });
      assert.equal((await tx.tienda.findUniqueOrThrow({ where: { id: idPrueba } })).estado, 'activa');
      throw rollback;
    });
  } catch (e) { if (e !== rollback) throw e; }
  assert.equal(await global.tienda.findUnique({ where: { id: idPrueba } }), null);

  const local = servicio.clienteTienda(ids[0]);
  try {
    await local.$transaction(async (tx) => {
      const usuario = await tx.usuario.findFirstOrThrow();
      await tx.usuario.update({ where: { id: usuario.id }, data: { rol: usuario.rol } });
      const venta = await tx.venta.findFirstOrThrow();
      await tx.venta.update({ where: { id: venta.id }, data: { estado: venta.estado, medioPago: venta.medioPago } });
      throw rollback;
    });
  } catch (e) { if (e !== rollback) throw e; }
  console.log(`Plataforma: ${globalInfo.columnasComprobadas} columnas enum correctas; escrituras globales y locales revertidas correctamente.`);
}

main().catch((e: unknown) => {
  console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido');
  process.exitCode = 1;
}).finally(() => servicio.onModuleDestroy());
