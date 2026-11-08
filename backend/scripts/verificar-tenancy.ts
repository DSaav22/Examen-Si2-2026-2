/**
 * Verifica el aislamiento de la extensión de Prisma contra la base real.
 * Uso: npm run verificar:tenancy
 */
import { strict as assert } from 'node:assert';
import { crearPrismaTenant, MODELOS_CON_TIENDA } from '../src/tenancy/prisma-tenant.extension';
import { TenantContext, TIENDA_VESTA_ID } from '../src/tenancy/tenant-context';

const OTRA = '22222222-2222-4222-8222-222222222222';
const prisma = crearPrismaTenant();

function ok(nombre: string) {
  console.log(`  ✔ ${nombre}`);
}

async function main() {
  assert.ok(MODELOS_CON_TIENDA.size >= 30, 'faltan modelos con tienda_id');
  ok(`${MODELOS_CON_TIENDA.size} modelos de negocio llevan tienda_id`);

  const enVesta = await TenantContext.enTienda(TIENDA_VESTA_ID, () => prisma.producto.count());
  const total = await TenantContext.sinFiltro(() => prisma.producto.count());
  const enVacia = await TenantContext.enTienda('11111111-1111-4111-8111-111111111111', () => prisma.producto.count());
  assert.equal(enVacia, 0);
  assert.ok(enVesta <= total);
  ok(`lecturas filtradas (vesta=${enVesta}, tienda vacía=0, total plataforma=${total})`);

  await assert.rejects(TenantContext.run({}, async () => await prisma.producto.count()), /TENANT_REQUERIDO/);
  ok('sin tienda en contexto la consulta falla (no devuelve datos de todas)');

  const creado = await TenantContext.enTienda(OTRA, () =>
    prisma.producto.create({
      data: {
        nombre: 'Prueba tenancy',
        categoria: 'x',
        ocasion: 'x',
        precioBase: 10,
        variantes: { create: [{ talla: 'M', color: 'Rojo', sku: `TEN-${Date.now()}` }] },
      },
      include: { variantes: true },
    }),
  );
  try {
    assert.equal(creado.tiendaId, OTRA);
    assert.ok(creado.variantes.every((v) => v.tiendaId === OTRA));
    ok('las escrituras anidadas heredan la tienda');

    const desdeVesta = await TenantContext.enTienda(TIENDA_VESTA_ID, () =>
      prisma.producto.findUnique({ where: { id: creado.id } }),
    );
    assert.equal(desdeVesta, null);
    ok('un id de otra tienda es invisible aunque se conozca');

    const editado = await TenantContext.enTienda(TIENDA_VESTA_ID, () =>
      prisma.producto.updateMany({ where: { id: creado.id }, data: { nombre: 'hackeado' } }),
    );
    assert.equal(editado.count, 0);
    await assert.rejects(
      TenantContext.enTienda(TIENDA_VESTA_ID, () =>
        prisma.producto.update({ where: { id: creado.id }, data: { tiendaId: TIENDA_VESTA_ID } }),
      ),
    );
    ok('no se puede editar ni "mudar" un registro ajeno');

    const vista = await TenantContext.enTienda(OTRA, () =>
      prisma.$transaction([
        prisma.$queryRaw`SELECT set_config('app.tienda_id', ${OTRA}, true)`,
        prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM v_reporte_ventas`,
      ]),
    );
    assert.equal(Number(vista[1][0].n), 0);
    ok('la vista de reportes solo ve la tienda fijada en la sesión');
  } finally {
    await TenantContext.enTienda(OTRA, async () => {
      await prisma.variante.deleteMany({ where: { productoId: creado.id } });
      await prisma.producto.delete({ where: { id: creado.id } });
    });
  }
  console.log('Aislamiento multi-tenant: OK');
}

main()
  .catch((e) => {
    console.error('FALLÓ:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
