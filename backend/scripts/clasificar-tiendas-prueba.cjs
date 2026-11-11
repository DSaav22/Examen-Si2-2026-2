/** Clasificación puntual de fixtures conocidos. No elimina tiendas ni modifica altas futuras. */
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') throw Error('SOLO_LABORATORIO_LOCAL');
const db = new PrismaClient();
function esFixture(t) {
  return (t.slug.startsWith('lab-ml-') && t.nombre === 'Analítica sintética') ||
    (t.slug.startsWith('lab-alta-') && t.nombre === 'Laboratorio sintético') ||
    (t.slug.startsWith('lab-') && t.nombre === 'Tienda sintética laboratorio') ||
    (t.slug.startsWith('saas-t1-') && t.nombre.startsWith('Boutique Uno ')) ||
    (t.slug.startsWith('saas-t2-') && t.nombre.startsWith('Sucursal Dos ')) ||
    (['ensayo-cliente-prisma', 'ensayo-migracion-aislada'].includes(t.slug) && t.nombre === 'Ensayo aislado') ||
    (t.slug.startsWith('prueba-luna-') && t.nombre === 'Luna') ||
    (t.slug.startsWith('prueba-sol-') && t.nombre === 'Sol') ||
    (t.slug.startsWith('prueba-offline-') && t.nombre === 'Offline') ||
    (t.slug.startsWith('prueba-vencida-') && t.nombre === 'Vencida') ||
    (t.slug === 'tienda-aprobada-1' && t.nombre === 'Tienda Aprobada Uno');
}
(async () => {
  const tiendas = await db.tienda.findMany({ select: { id: true, slug: true, nombre: true } });
  const pruebas = tiendas.filter(esFixture);
  if (pruebas.some(t => ['vesta', 'trendify'].includes(t.slug))) throw Error('TIENDA_REAL_PROTEGIDA');
  if (process.argv.includes('--apply')) {
    await db.tienda.updateMany({ where: { id: { in: pruebas.map(t => t.id) } }, data: { esPrueba: true } });
  }
  console.log(JSON.stringify({ aplicado: process.argv.includes('--apply'), pruebas: pruebas.length, conservadas: tiendas.filter(t => !esFixture(t)).map(t => ({ slug: t.slug, nombre: t.nombre })) }));
})().catch(e => { console.error(e.code || e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
