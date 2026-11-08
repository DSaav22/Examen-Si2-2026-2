import type { PrismaClient } from '@prisma/client';

/** Borra una tienda y todos sus datos (solo para scripts de demo y pruebas). */
export async function borrarTienda(db: PrismaClient, tiendaId: string) {
  const tablas = (
    await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND column_name = 'tienda_id'
        AND table_name NOT IN ('suscripciones', 'v_reporte_ventas')`
  ).map((t) => t.table_name);
  // Sin orden explícito de FK: se repite hasta que todas las tablas queden vacías.
  for (let ronda = 0; ronda < 8; ronda++) {
    let pendientes = 0;
    for (const t of tablas) {
      try {
        await db.$executeRawUnsafe(`DELETE FROM "${t}" WHERE tienda_id = $1`, tiendaId);
      } catch {
        pendientes++;
      }
    }
    if (!pendientes) break;
  }
  await db.pagoSuscripcion.deleteMany({ where: { suscripcion: { tiendaId } } });
  await db.suscripcion.deleteMany({ where: { tiendaId } });
  await db.tienda.delete({ where: { id: tiendaId } }).catch(() => undefined);
}
