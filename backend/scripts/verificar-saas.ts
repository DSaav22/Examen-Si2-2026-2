/**
 * Prueba de punta a punta del punto 1 (SaaS multi-tienda) contra el backend levantado.
 * Uso: npm run verificar:saas   (API_URL=http://localhost:3000 por defecto)
 *
 * Crea tiendas y cuentas de prueba (slug "prueba-*") y las borra al terminar.
 */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { borrarTienda } from './lib/borrar-tienda';

const API = process.env.API_URL ?? 'http://localhost:3000';
const db = new PrismaClient();
const sufijo = Date.now().toString(36);
const creadas: string[] = [];
const cuentasCreadas: string[] = [];

type Resp = { status: number; body: any };

async function api(metodo: string, ruta: string, opts: { token?: string; tienda?: string; body?: unknown } = {}): Promise<Resp> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.tienda) headers['X-Tienda'] = opts.tienda;
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const texto = await r.text();
  let body: any = texto;
  try {
    body = JSON.parse(texto);
  } catch {
    /* texto plano */
  }
  return { status: r.status, body };
}

function ok(nombre: string) {
  console.log(`  ✔ ${nombre}`);
}

function esperar(r: Resp, status: number, contexto: string) {
  assert.equal(r.status, status, `${contexto}: esperaba ${status}, llegó ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

const TARJETA_OK = { titular: 'Prueba SaaS', numero: '4242 4242 4242 4242', vence: '12/30', cvc: '123' };
const TARJETA_RECHAZADA = { ...TARJETA_OK, numero: '4000 0000 0000 0002' };

async function crearCuentaVerificada(nombre: string) {
  const email = `${nombre}-${sufijo}@prueba.ensayar.bo`;
  const reg = esperar(await api('POST', '/plataforma/registro', { body: { nombre, email, password: 'clave-segura-1' } }), 201, 'registro');
  const cuenta = await db.cuenta.findUniqueOrThrow({ where: { email } });
  cuentasCreadas.push(cuenta.id);
  const token = reg.verificacion?.url ? new URL(reg.verificacion.url).searchParams.get('token') : cuenta.verificacionToken;
  return { email, token: token! };
}

async function main() {
  console.log(`Verificando SaaS contra ${API}`);

  // S2/S3 · Planes por período y nivel
  const planes = esperar(await api('GET', '/plataforma/planes'), 200, 'planes');
  assert.equal(planes.length, 3);
  const inicial = planes.find((p: any) => p.codigo === 'INICIAL');
  const crecimiento = planes.find((p: any) => p.codigo === 'CRECIMIENTO');
  assert.equal(inicial.precios.TRIMESTRAL, Math.round(19 * 3 * 0.9 * 100) / 100);
  assert.equal(inicial.precios.ANUAL, Math.round(19 * 12 * 0.8 * 100) / 100);
  ok(`3 planes con precios mensual/trimestral/anual (Inicial: ${inicial.precios.MENSUAL}/${inicial.precios.TRIMESTRAL}/${inicial.precios.ANUAL} USD)`);

  // S6 · Registro y verificación de correo
  const dueno = await crearCuentaVerificada('duena');
  const sinVerificar = await api('POST', '/plataforma/login', { body: { email: dueno.email, password: 'clave-segura-1' } });
  assert.equal(esperar(sinVerificar, 403, 'login sin verificar').codigo, 'EMAIL_NO_VERIFICADO');
  const verificado = esperar(await api('POST', '/plataforma/verificar', { body: { token: dueno.token } }), 201, 'verificar');
  const tokenCuenta: string = verificado.accessToken;
  assert.equal(verificado.tiendas.length, 0);
  ok('la cuenta no entra hasta confirmar el correo; el enlace la activa');

  assert.equal(esperar(await api('GET', '/plataforma/slug-disponible?slug=vesta'), 200, 'slug').disponible, false);
  ok('el slug de una tienda existente no está disponible');

  // S4/S5 · Pago y alta automática
  const slugA = `prueba-luna-${sufijo}`;
  const rechazo = await api('POST', '/plataforma/suscribir', {
    token: tokenCuenta,
    body: { planId: inicial.id, periodo: 'MENSUAL', tienda: { nombre: 'Luna', slug: slugA }, pago: TARJETA_RECHAZADA, idempotencyKey: randomUUID() },
  });
  assert.equal(esperar(rechazo, 402, 'tarjeta rechazada').codigo, 'PAGO_RECHAZADO');
  assert.equal(await db.tienda.count({ where: { slug: slugA } }), 0);
  ok('tarjeta rechazada → 402 y no se crea la tienda');

  const clave = randomUUID();
  const alta = esperar(
    await api('POST', '/plataforma/suscribir', {
      token: tokenCuenta,
      body: { planId: inicial.id, periodo: 'MENSUAL', tienda: { nombre: 'Luna', slug: slugA }, pago: TARJETA_OK, idempotencyKey: clave },
    }),
    201,
    'suscribir',
  );
  creadas.push(alta.tienda.id);
  const tokenLuna: string = alta.accessToken;
  assert.equal(alta.tienda.slug, slugA);
  assert.equal(alta.user.rol, 'ADMIN');
  const repetido = esperar(
    await api('POST', '/plataforma/suscribir', {
      token: tokenCuenta,
      body: { planId: inicial.id, periodo: 'MENSUAL', tienda: { nombre: 'Luna', slug: slugA }, pago: TARJETA_OK, idempotencyKey: clave },
    }),
    201,
    'reintento',
  );
  assert.equal(repetido.repetido, true);
  assert.equal(repetido.tienda.id, alta.tienda.id);
  assert.equal(await db.pagoSuscripcion.count({ where: { idempotencyKey: clave } }), 1);
  ok('pago aprobado → tienda creada con sucursal, almacén y admin; el reintento no cobra dos veces');

  const sucursalesLuna = esperar(await api('GET', '/sucursales', { token: tokenLuna }), 200, 'sucursales luna');
  assert.equal(sucursalesLuna.length, 1, `sucursales de Luna: ${JSON.stringify(sucursalesLuna.map((s: any) => s.nombre))}`);
  assert.equal(sucursalesLuna[0].almacenes.length, 1);

  // S8 · Aislamiento
  const prodLuna = esperar(await api('GET', '/catalogo/productos', { token: tokenLuna }), 200, 'catálogo luna');
  const prodVesta = esperar(await api('GET', '/catalogo/productos', { tienda: 'vesta' }), 200, 'catálogo vesta');
  const n = (x: any) => (Array.isArray(x) ? x.length : x.total);
  assert.equal(n(prodLuna), 0);
  assert.ok(n(prodVesta) > 0);
  const prodLunaConHeaderAjeno = esperar(await api('GET', '/catalogo/productos', { token: tokenLuna, tienda: 'vesta' }), 200, 'header ajeno');
  assert.equal(n(prodLunaConHeaderAjeno), 0);
  ok(`catálogos aislados (Luna=0, Vesta=${n(prodVesta)}); con sesión de Luna el header X-Tienda no cambia de tienda`);

  const unProductoVesta = Array.isArray(prodVesta) ? prodVesta[0] : prodVesta.items[0];
  esperar(await api('GET', `/catalogo/productos/${unProductoVesta.id}`, { token: tokenLuna }), 404, 'producto ajeno');
  ok('un producto de Vesta pedido por id desde Luna → 404');

  const adminVesta = esperar(
    await api('POST', '/auth/login', { tienda: 'vesta', body: { email: 'admin@ensayar.bo', password: 'diego' } }),
    201,
    'login admin vesta',
  );
  const panelVesta = esperar(await api('GET', '/reportes/panel', { token: adminVesta.accessToken }), 200, 'panel vesta');
  const panelLuna = esperar(await api('GET', '/reportes/panel', { token: tokenLuna }), 200, 'panel luna');
  assert.ok(panelVesta.kpis.totalBs > 0);
  assert.equal(panelLuna.kpis.totalBs, 0);
  assert.equal(panelLuna.sucursales.filas.length, 0);
  const inventarioLuna = esperar(await api('GET', '/reportes/inventario', { token: tokenLuna }), 200, 'inventario luna');
  assert.equal(inventarioLuna.filas.length, 0);
  ok(`reportes SQL aislados (Vesta Bs ${panelVesta.kpis.totalBs}, Luna Bs 0)`);

  esperar(await api('POST', '/auth/login', { tienda: slugA, body: { email: 'admin@ensayar.bo', password: 'diego' } }), 403, 'admin vesta en luna');
  ok('el admin de Vesta no tiene acceso a Luna');

  // Límites del plan Inicial (3 usuarios, 1 sucursal)
  const lim = esperar(await api('POST', '/sucursales', { token: tokenLuna, body: { nombre: 'Segunda', ciudad: 'Cochabamba' } }), 403, 'límite sucursales');
  assert.equal(lim.codigo, 'LIMITE_PLAN');
  const empleado = esperar(
    await api('POST', '/usuarios', {
      token: tokenLuna,
      body: { email: 'cajero@ensayar.bo', password: 'otra-clave', nombre: 'Cajero compartido', rol: 'CAJERO' },
    }),
    201,
    'empleado con cuenta existente',
  );
  assert.equal(empleado.cuentaExistente, true);
  esperar(
    await api('POST', '/usuarios', {
      token: tokenLuna,
      body: { email: `cajera2-${sufijo}@prueba.ensayar.bo`, password: 'clave-1234', nombre: 'Cajera 2', rol: 'CAJERO' },
    }),
    201,
    'tercer usuario',
  );
  const nuevaCuenta = await db.cuenta.findUnique({ where: { email: `cajera2-${sufijo}@prueba.ensayar.bo` } });
  if (nuevaCuenta) cuentasCreadas.push(nuevaCuenta.id);
  const limU = esperar(
    await api('POST', '/usuarios', {
      token: tokenLuna,
      body: { email: `cajera3-${sufijo}@prueba.ensayar.bo`, password: 'clave-1234', nombre: 'Cajera 3', rol: 'CAJERO' },
    }),
    403,
    'límite usuarios',
  );
  assert.equal(limU.codigo, 'LIMITE_PLAN');
  ok('plan Inicial: la 2.ª sucursal y el 4.º usuario se bloquean con LIMITE_PLAN');

  // S7 · Un login, varias tiendas
  const cajeroEnLuna = esperar(
    await api('POST', '/auth/login', { tienda: slugA, body: { email: 'cajero@ensayar.bo', password: 'diego' } }),
    201,
    'cajero en luna',
  );
  assert.equal(cajeroEnLuna.tienda.slug, slugA);
  const slugsCajero = cajeroEnLuna.tiendas.map((t: any) => t.slug).sort();
  assert.deepEqual(slugsCajero, [slugA, 'vesta'].sort());
  const aVesta = esperar(
    await api('POST', '/auth/cambiar-tienda', { token: cajeroEnLuna.accessToken, body: { tiendaId: adminVesta.tienda.id } }),
    201,
    'cambiar a vesta',
  );
  assert.equal(aVesta.tienda.slug, 'vesta');
  assert.equal(aVesta.user.rol, 'CAJERO');
  ok('la misma cuenta (cajero@ensayar.bo, misma clave) entra a Vesta y a Luna y cambia de tienda sin re-login');

  const slugB = `prueba-sol-${sufijo}`;
  const altaB = esperar(
    await api('POST', '/plataforma/suscribir', {
      token: tokenCuenta,
      body: { planId: crecimiento.id, periodo: 'ANUAL', tienda: { nombre: 'Sol', slug: slugB }, pago: TARJETA_OK, idempotencyKey: randomUUID() },
    }),
    201,
    'segunda tienda',
  );
  creadas.push(altaB.tienda.id);
  const miCuenta = esperar(await api('GET', '/plataforma/cuenta', { token: tokenCuenta }), 200, 'mi cuenta');
  assert.deepEqual(miCuenta.tiendas.map((t: any) => t.slug).sort(), [slugA, slugB].sort());
  assert.ok(miCuenta.tiendas.every((t: any) => t.esDueno));
  ok('la dueña ve sus 2 tiendas en el panel de la plataforma');

  // Renovación / cambio de plan
  const renov = esperar(
    await api('POST', `/plataforma/tiendas/${alta.tienda.id}/renovar`, {
      token: tokenCuenta,
      body: { planId: crecimiento.id, periodo: 'TRIMESTRAL', pago: TARJETA_OK, idempotencyKey: randomUUID() },
    }),
    201,
    'cambio de plan',
  );
  assert.equal(renov.plan.codigo, 'CRECIMIENTO');
  esperar(await api('POST', '/sucursales', { token: tokenLuna, body: { nombre: 'Segunda', ciudad: 'Cochabamba' } }), 201, 'sucursal tras upgrade');
  ok('upgrade a Crecimiento: el límite de sucursales se levanta al instante');

  // Suscripción vencida
  const slugV = `prueba-vencida-${sufijo}`;
  const vencida = await db.tienda.create({
    data: {
      slug: slugV,
      nombre: 'Vencida',
      suscripciones: {
        create: {
          planId: inicial.id,
          periodo: 'MENSUAL',
          inicio: new Date(Date.now() - 40 * 86400_000),
          venceEn: new Date(Date.now() - 10 * 86400_000),
          monto: 19,
        },
      },
    },
  });
  creadas.push(vencida.id);
  assert.equal(esperar(await api('GET', '/catalogo/productos', { tienda: slugV }), 402, 'tienda vencida').codigo, 'SUSCRIPCION_VENCIDA');
  esperar(await api('GET', '/catalogo/productos', { tienda: 'no-existe-' + sufijo }), 404, 'tienda inexistente');
  ok('tienda vencida → 402 SUSCRIPCION_VENCIDA; tienda inexistente → 404');

  // S9 · Métricas solo para la plataforma
  esperar(await api('GET', '/plataforma/admin/metricas', { token: tokenCuenta }), 403, 'métricas sin permiso');
  const sa = esperar(await api('POST', '/plataforma/login', { body: { email: 'superadmin@ensayar.bo', password: 'diego' } }), 201, 'login plataforma');
  const m = esperar(await api('GET', '/plataforma/admin/metricas', { token: sa.accessToken }), 200, 'métricas');
  assert.ok(m.resumen.mrr > 0 && m.resumen.arr === Math.round(m.resumen.mrr * 12 * 100) / 100);
  assert.equal(m.proyeccion.length, 6);
  ok(`métricas: ${m.resumen.tiendasVigentes} tiendas vigentes, MRR ${m.resumen.mrr} USD, ARR ${m.resumen.arr} USD, proyección a 6 meses`);

  console.log('SaaS multi-tienda: OK');
}

async function limpiar() {
  for (const id of creadas) await borrarTienda(db, id);
  await db.cuenta.deleteMany({ where: { id: { in: cuentasCreadas } } }).catch(() => undefined);
}

main()
  .catch((e) => {
    console.error('FALLÓ:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (!process.env.CONSERVAR) await limpiar();
    await db.$disconnect();
  });
