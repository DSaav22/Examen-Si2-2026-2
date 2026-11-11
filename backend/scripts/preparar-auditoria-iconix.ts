import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { borrarTienda } from './lib/borrar-tienda';
const u = new URL(process.env.DATABASE_URL ?? '');
if (u.hostname !== '127.0.0.1' || u.port !== '55442' || u.pathname !== '/ensayar_iconix_audit_20261111') throw Error('SOLO_COPIA_AUDITORIA');
const db = new PrismaClient();
async function main() {
  // El ensayo previo dejó membresías que invalidan la premisa de dos tiendas del script.
  const previas = await db.tienda.findMany({ where: { slug: { startsWith: 'prueba-' } }, select: { id: true } });
  for (const t of previas) await borrarTienda(db, t.id);
  const passwordHash = await bcrypt.hash('diego', 10);
  await db.cuenta.upsert({ where: { email: 'superadmin@ensayar.bo' },
    create: { email: 'superadmin@ensayar.bo', nombre: 'Plataforma sintética auditoría', passwordHash, emailVerificado: true, esPlataforma: true },
    update: { passwordHash, emailVerificado: true, esPlataforma: true } });
  console.log(`Copia preparada: ${previas.length} tiendas de ensayos anteriores retiradas; cuenta sintética de plataforma disponible.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
