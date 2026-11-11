/** Requiere una API de laboratorio en 127.0.0.1:3301 con el piloto de perfiles activo. */
import { strict as assert } from 'node:assert';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const secret = process.env.JWT_SECRET;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia' || secret !== 'clave-sintetica-prueba-local-no-utilizar') {
  throw new Error('La prueba solo admite la base aislada y la clave sintética del laboratorio.');
}
const idA = '00000000-0000-4000-8000-000000000001';
const idB = '33333333-3333-4333-8333-333333333333';
const esquemas = new PrismaEsquemasService(new ConfigService());

async function main() {
  const usuario = await esquemas.clienteTienda(idA).usuario.findFirstOrThrow({ where: { activo: true, tiendaId: idA } });
  assert.equal(await esquemas.clienteTienda(idB).usuario.count({ where: { id: usuario.id } }), 0);
  const payload = { tipo: 'tienda', tiendaId: idA, sub: usuario.id, cuentaId: usuario.cuentaId, rol: usuario.rol, email: usuario.email };
  const consulta = (datos: object) => fetch('http://127.0.0.1:3301/auth/me', {
    headers: { Authorization: `Bearer ${jwt.sign(datos, secret as string, { expiresIn: '1m' })}` },
  });
  const correcto = await consulta(payload);
  assert.equal(correcto.status, 200);
  const perfil = await correcto.json() as { id: string; tiendaId: string };
  assert.equal(perfil.id, usuario.id);
  assert.equal(perfil.tiendaId, idA);
  assert.equal((await consulta({ ...payload, tiendaId: idB })).status, 401);
  assert.equal((await consulta({ ...payload, cuentaId: 'cuenta-incorrecta' })).status, 401);
  assert.equal((await consulta({ ...payload, rol: usuario.rol === 'ADMIN' ? 'CAJERO' : 'ADMIN' })).status, 401);
  assert.equal((await fetch('http://127.0.0.1:3301/auth/me')).status, 401);
  console.log('HTTP autenticado: perfil correcto 200; otra tienda, otra cuenta, otro rol y ausencia de token 401.');
}
main().catch((e: unknown) => { console.error('FALLÓ:', e instanceof Error ? e.message : 'Error desconocido'); process.exitCode = 1; })
  .finally(() => esquemas.onModuleDestroy());
