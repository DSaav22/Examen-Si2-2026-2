/** Ensayo de solo lectura de la ruta del catálogo en el laboratorio aislado. */
import { strict as assert } from 'node:assert';
import { ConfigService } from '@nestjs/config';
import { CatalogoController } from '../src/catalogo/catalogo.controller';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { TenantContext } from '../src/tenancy/tenant-context';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') {
  throw new Error('La prueba solo admite el laboratorio aislado local.');
}
const a = '00000000-0000-4000-8000-000000000001';
const b = '33333333-3333-4333-8333-333333333333';
const esquemas = new PrismaEsquemasService(new ConfigService());
const config = { get: () => 'true' };
const controller = new CatalogoController({} as never, {} as never, {} as never, esquemas, config as never);

async function main() {
  const esperadas = await Promise.all([a, b].map(id => esquemas.clienteTienda(id).categoria.findMany({
    where: { activa: true }, orderBy: { nombre: 'asc' },
  })));
  assert.ok(esperadas.every(x => x.length > 0), 'El ensayo requiere categorías en ambos esquemas.');
  assert.notDeepEqual(esperadas[0].map(x => x.id), esperadas[1].map(x => x.id));
  const resultados = await Promise.all(Array.from({ length: 20 }, (_, i) =>
    TenantContext.enTienda(i % 2 ? b : a, () => controller.categorias()),
  ));
  resultados.forEach((r, i) => assert.deepEqual(r, esperadas[i % 2]));
  await assert.rejects(() => controller.categorias(), /TENANT_REQUERIDO/);
  await assert.rejects(() => TenantContext.enTienda('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', () => controller.categorias()));
  console.log('Categorías: 20 solicitudes concurrentes aislaron dos tiendas; contexto ausente y esquema inexistente rechazados.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => esquemas.onModuleDestroy());
