/** Confirma que el bloqueo por esquemas fue eliminado y la sincronización escribe de forma aislada en el esquema de tienda. */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const secret = process.env.JWT_SECRET;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia' || secret !== 'clave-sintetica-prueba-local-no-utilizar') throw new Error('SOLO_LABORATORIO');
const clientes = new PrismaEsquemasService(new ConfigService());
async function main() {
  const tiendaId = '00000000-0000-4000-8000-000000000001';
  const local = clientes.clienteTienda(tiendaId);
  const usuario = await local.usuario.findFirstOrThrow({ where: { activo: true, rol: 'ADMIN' } });
  const token = jwt.sign({ tipo: 'tienda', tiendaId, sub: usuario.id, cuentaId: usuario.cuentaId, rol: usuario.rol, email: usuario.email }, secret as string, { expiresIn: '1m' });
  const id = randomUUID();
  const clienteId = randomUUID();
  const res = await fetch('http://127.0.0.1:3301/sync/lote', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dispositivoId: 'laboratorio',
      operaciones: [{ id, tipo: 'cliente', creadaEn: new Date().toISOString(), datos: { id: clienteId, nombre: 'Ensayo Desbloqueo', email: `desbloqueo-${randomUUID()}@example.invalid` } }],
    }),
  });
  assert.equal(res.status, 200, 'El endpoint debe responder 200 exitoso al estar desbloqueado');
  const body = (await res.json()) as any;
  assert.equal(body.resumen.aplicada, 1);
  assert.equal(await local.operacionSync.count({ where: { operationId: id } }), 1, 'Debe quedar registrado en el esquema local');
  const [publico] = await clientes.clientePlataforma().$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM public.operaciones_sync WHERE operation_id=${id}`;
  assert.equal(publico.n, 0n, 'No debe escribir en public.operaciones_sync');
  console.log('Sync por esquemas: bloqueo eliminado exitosamente; 200 OK y aislamiento verificado.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => clientes.onModuleDestroy());
