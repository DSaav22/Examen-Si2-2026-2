/** Prueba de integración: ejecutar únicamente sobre la copia desechable indicada. */
import { strict as assert } from 'node:assert';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReportesInteligentesService } from '../src/reportes/inteligente/reportes-inteligentes.service';
import { ModeloClient } from '../src/ia/modelo.client';
import { TenantContext } from '../src/tenancy/tenant-context';

const url = new URL(process.env.DATABASE_URL ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_prueba_reportes_20261111') {
  throw new Error('SOLO_BASE_AISLADA_DE_PRUEBAS');
}
const ids = ['00000000-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333'];
const plataforma = new PrismaClient();
const esquemas = new PrismaEsquemasService(new ConfigService({ DATABASE_URL: url.toString() }));
const modelo = { configurado: () => false } as ModeloClient;
const servicio = new ReportesInteligentesService(plataforma as PrismaService, modelo, esquemas);
const spec = { titulo: 'Productos de prueba', fuente: 'productos', columnas: [{ campo: 'producto' }], filtros: [], agrupar: [], orden: [], limite: 2000, formato: 'pantalla' };

async function main() {
  const publicAntes = await plataforma.reporteEjecucion.count();
  for (const id of ids) {
    const db = esquemas.clienteTienda(id);
    const admin = await db.usuario.findFirstOrThrow({ where: { rol: 'ADMIN' } });
    const productos = await db.producto.findMany({ select: { nombre: true } });
    const antes = await db.reporteEjecucion.count();
    const resultado = await TenantContext.enTienda(id, () => servicio.ejecutar(spec, { adminId: admin.id, motor: 'manual' }));
    assert.deepEqual(resultado.filas.map(f => f.producto).sort(), productos.map(p => p.nombre).sort());
    assert.equal(await db.reporteEjecucion.count(), antes + 1);
    const dic = await TenantContext.enTienda(id, () => (servicio as any).diccionario());
    assert.deepEqual([...dic.producto].sort(), [...new Set(productos.map(p => p.nombre.trim()).filter(n => n.length >= 5))].sort());
    const excel = await TenantContext.enTienda(id, () => servicio.exportar(spec, 'excel', admin.id, 'manual'));
    assert.ok(excel.buffer.length > 0);
    const pdf = await TenantContext.enTienda(id, () => servicio.exportar(spec, 'pdf', admin.id, 'manual'));
    assert.equal(pdf.buffer.subarray(0, 4).toString(), '%PDF');
    const clientas = { ...spec, titulo: 'Clientas', fuente: 'clientes', columnas: [{ campo: 'nombre' }] };
    await TenantContext.enTienda(id, () => servicio.ejecutar(clientas, { adminId: admin.id, motor: 'manual' }));
  }
  assert.equal(await plataforma.reporteEjecucion.count(), publicAntes, 'El reporte no debe guardarse en public');
  await assert.rejects(() => TenantContext.enTienda('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', () => servicio.ejecutar(spec, { adminId: 'ninguno', motor: 'manual' })));
  console.log('Reportes: datos, diccionario y registros aislados por tienda; Excel generado y esquema inexistente rechazado.');
}
main().catch((err: unknown) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await esquemas.onModuleDestroy(); await plataforma.$disconnect(); });
