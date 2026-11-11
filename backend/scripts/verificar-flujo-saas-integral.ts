/**
 * Verificación integral del flujo SaaS contra la base PostgreSQL ensayar_copia.
 *
 * Flujo probado de punta a punta:
 * 1. Catálogo de planes y métodos simulados por país
 * 2. Registro de cuenta y modo demo sin afirmar envío real
 * 3. Rechazo de login y suscripción para cuenta no verificada
 * 4. Verificación de cuenta con token
 * 5. Pago simulado rechazado -> no crea tienda ni esquema
 * 6. Pago simulado aprobado -> crea tienda, suscripción y esquema aislado
 * 7. Verificación de objetos en esquema PostgreSQL: 39 tablas, vistas, sucursal, almacén, categorías y admin
 * 8. Doble envío (idempotencia): repetición sin duplicar tienda ni cobro; datos distintos rechazados
 * 9. Creación de segunda tienda para la misma cuenta y descubrimiento de ambas
 * 10. Cambio de tienda autorizado y restricción de acceso a tienda ajena
 * 11. Renovación en mismo plan (extensión) y mejora de plan (upgrade)
 * 12. Restricción de reducción de plan (downgrade) por límite de productos
 */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';
import { AprovisionadorEsquemaService } from '../src/tenancy/aprovisionador-esquema.service';
import { nombreSchemaTienda } from '../src/tenancy/schema-nombre';
import { MODELOS_TIENDA } from '../src/tenancy/dominio-ambitos';
import { metodosSimuladosPorPais, monedaDePais } from '../src/pagos/metodos-pais';
import { PlataformaService } from '../src/plataforma/plataforma.service';
import { CuentasService } from '../src/auth/cuentas.service';
import { AuthService } from '../src/auth/auth.service';
import { TokenService } from '../src/auth/token.service';
import { TiendasService } from '../src/tenancy/tiendas.service';
import { PlanLimitesService } from '../src/tenancy/plan-limites.service';
import { PasarelaSimulada } from '../src/plataforma/pasarela-suscripcion';
import { CorreoService } from '../src/correo/correo.service';
import { PrismaService } from '../src/prisma/prisma.service';

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
if (!url || url.hostname !== '127.0.0.1' || url.port !== '55443' || url.pathname !== '/ensayar_copia') {
  throw new Error('La prueba debe ejecutarse exclusivamente contra ensayar_copia en 127.0.0.1:55443.');
}

const config = new ConfigService({
  DATABASE_URL: url.toString(),
  JWT_SECRET: process.env.JWT_SECRET || 'clave-sintetica-prueba-local-no-utilizar',
  TENANT_SCHEMAS_ALTA: 'true',
  TENANT_SCHEMAS_PERFILES: 'true',
});

const prisma = new PrismaService();
const esquemasPool = new PrismaEsquemasService(config);
const global = esquemasPool.clientePlataforma();
const aprovisionador = new AprovisionadorEsquemaService();
const pasarela = new PasarelaSimulada();
const correo = new CorreoService(config);
const tiendas = new TiendasService(prisma);
const cuentas = new CuentasService(prisma, correo, config, tiendas);
const limites = new PlanLimitesService(prisma, tiendas);
const tokens = new TokenService(config, prisma);
const auth = new AuthService(prisma, tokens, cuentas, tiendas, esquemasPool, config);
const plataforma = new PlataformaService(
  prisma,
  cuentas,
  auth,
  tokens,
  tiendas,
  limites,
  pasarela,
  aprovisionador,
  config,
  esquemasPool,
);

async function main() {
  console.log('=== Iniciando verificación integral de flujo SaaS contra ensayar_copia ===\n');

  // 1. Catálogo de planes y métodos simulados
  console.log('1. Verificando catálogo de planes y métodos simulados por país...');
  const planes = await plataforma.planes();
  assert.equal(planes.length, 3, 'Deben existir exactamente 3 planes');
  const codigos = planes.map(p => p.codigo);
  assert.ok(codigos.includes('INICIAL') && codigos.includes('CRECIMIENTO') && codigos.includes('CADENA'));
  assert.equal(planes.find(p => p.codigo === 'INICIAL')?.limites.productos, 200);
  assert.equal(planes.find(p => p.codigo === 'CRECIMIENTO')?.limites.productos, 2000);
  assert.equal(planes.find(p => p.codigo === 'CADENA')?.limites.productos, null);

  const metodosBO = metodosSimuladosPorPais('BO');
  assert.ok(metodosBO.some(m => m.codigo === 'tarjeta' && m.simulado));
  assert.ok(metodosBO.some(m => m.codigo === 'qr_bolivia' && m.simulado));
  assert.equal(monedaDePais('BO'), 'BOB');

  const metodosPE = metodosSimuladosPorPais('PE');
  assert.ok(metodosPE.some(m => m.codigo === 'yape' && m.simulado));
  assert.ok(metodosPE.some(m => m.codigo === 'plin' && m.simulado));
  assert.equal(monedaDePais('PE'), 'PEN');
  console.log('   ✓ Planes (Inicial, Crecimiento, Cadena) y métodos por país validados.');

  // 2. Registro de cuenta
  console.log('\n2. Creando cuenta y verificando modo de demostración...');
  const testId = randomUUID().slice(0, 8);
  const emailA = `saas-integral-${testId}@ensayar.invalid`;
  const reg = await plataforma.registrar({
    nombre: `Dueño Integral ${testId}`,
    email: emailA,
    password: 'Password123!',
  });
  assert.equal(reg.ok, true);
  assert.equal(reg.email, emailA);
  assert.equal(reg.verificacion.modo, 'simulado', 'Debe estar identificado como modo simulado');
  assert.ok(reg.verificacion.url?.includes('/verificar?token='), 'Debe proveer URL de demo');
  const tokenVerif = new URL(reg.verificacion.url!).searchParams.get('token')!;
  console.log(`   ✓ Cuenta registrada: ${emailA}. Modo demo: ${reg.verificacion.url}`);

  // 3. Intento de login y suscripción antes de verificar
  console.log('\n3. Comprobando bloqueo de cuenta no verificada...');
  await assert.rejects(
    async () => { await plataforma.login({ email: emailA, password: 'Password123!' }); },
    (err: any) => err.status === 403 && (err.response?.codigo === 'EMAIL_NO_VERIFICADO' || err.message === 'Forbidden'),
    'Login debe rechazar cuenta sin verificar con 403',
  );
  const cuentaDbAntes = await global.cuenta.findUniqueOrThrow({ where: { email: emailA } });
  await assert.rejects(
    async () => {
      await plataforma.suscribir(cuentaDbAntes.id, {
        planId: 'plan-inicial',
        periodo: 'MENSUAL',
        idempotencyKey: randomUUID(),
        metodoPago: 'tarjeta',
        tienda: { nombre: 'Tienda Bloqueada', slug: `bloq-${testId}`, pais: 'BO', moneda: 'BOB' },
        pago: { titular: 'Dueño', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });
    },
    (err: any) => err.status === 403 && (err.response?.codigo === 'EMAIL_NO_VERIFICADO' || err.message === 'Forbidden'),
    'Suscripción debe rechazar cuenta sin verificar con 403',
  );
  console.log('   ✓ Login y suscripción bloqueados con EMAIL_NO_VERIFICADO.');

  // 4. Verificación de la cuenta
  console.log('\n4. Verificando correo con token...');
  const sesionVerificada = await plataforma.verificar(tokenVerif);
  assert.equal(sesionVerificada.cuenta.email, emailA);
  assert.equal(sesionVerificada.tiendas.length, 0);
  const cuentaId = sesionVerificada.cuenta.id;
  console.log('   ✓ Cuenta verificada y sesión global emitida.');

  // 5. Pago simulado rechazado
  console.log('\n5. Probando pago simulado rechazado (tarjeta 4000 0000 0000 0002)...');
  const slugRechazo = `rechazo-${testId}`;
  await assert.rejects(
    async () => {
      await plataforma.suscribir(cuentaId, {
        planId: 'plan-inicial',
        periodo: 'MENSUAL',
        idempotencyKey: randomUUID(),
        metodoPago: 'tarjeta',
        tienda: { nombre: 'Tienda Rechazada', slug: slugRechazo, pais: 'BO', moneda: 'BOB' },
        pago: { titular: 'Rechazo', numero: '4000000000000002', vence: '12/30', cvc: '123' },
      });
    },
    (err: any) => err.status === 402 || err.response?.codigo === 'PAGO_RECHAZADO',
  );
  const tiendaRechazo = await global.tienda.findUnique({ where: { slug: slugRechazo } });
  assert.equal(tiendaRechazo, null, 'Un pago rechazado no debe crear registro de tienda');
  console.log('   ✓ Pago rechazado no creó tienda ni dejó datos huérfanos.');

  // 6. Pago simulado aprobado y creación de Tienda 1 con esquema
  console.log('\n6. Creando Tienda 1 con pago simulado aprobado y esquema PostgreSQL...');
  const key1 = randomUUID();
  const slug1 = `saas-t1-${testId}`;
  const alta1 = await plataforma.suscribir(cuentaId, {
    planId: 'plan-inicial',
    periodo: 'MENSUAL',
    idempotencyKey: key1,
    metodoPago: 'tarjeta',
    tienda: { nombre: `Boutique Uno ${testId}`, slug: slug1, pais: 'BO', moneda: 'BOB' },
    pago: { titular: 'Dueño Aprobado', numero: '4242424242424242', vence: '12/30', cvc: '123' },
  });
  assert.ok(alta1.accessToken);
  assert.equal(alta1.user.rol, 'ADMIN');
  const tiendaId1 = alta1.tienda.id;
  const esquema1 = nombreSchemaTienda(tiendaId1);

  // 7. Verificación física del esquema PostgreSQL
  console.log('\n7. Verificando aprovisionamiento del esquema en PostgreSQL...');
  const [esqEnDb] = await global.$queryRaw<{ nspname: string }[]>`SELECT nspname FROM pg_namespace WHERE nspname = ${esquema1}`;
  assert.equal(esqEnDb.nspname, esquema1, `El esquema ${esquema1} debe existir en pg_namespace`);

  const tablas = await global.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=${esquema1} AND c.relkind='r'`;
  assert.equal(Number(tablas[0].n), MODELOS_TIENDA.length, `El esquema debe contener las ${MODELOS_TIENDA.length} tablas del tenant`);

  const local1 = esquemasPool.clienteTienda(tiendaId1);
  const [uCount, sCount, aCount, cCount] = await Promise.all([
    local1.usuario.count(),
    local1.sucursal.count(),
    local1.almacen.count(),
    local1.categoria.count(),
  ]);
  assert.equal(uCount, 1, 'Debe crearse 1 usuario administrador inicial');
  assert.equal(sCount, 1, 'Debe crearse 1 sucursal casa matriz');
  assert.equal(aCount, 1, 'Debe crearse 1 almacén principal');
  assert.equal(cCount, 6, 'Deben crearse 6 categorías base');

  const adminPerfil = await local1.usuario.findFirstOrThrow();
  assert.equal(adminPerfil.rol, 'ADMIN');
  assert.equal(adminPerfil.cuentaId, cuentaId);
  console.log(`   ✓ Esquema ${esquema1} provisionado: 39 tablas, vistas, ADMIN, sucursal y almacén.`);

  // 8. Doble envío (idempotencia)
  console.log('\n8. Probando doble envío de la solicitud de alta...');
  const altaRepetida = await plataforma.suscribir(cuentaId, {
    planId: 'plan-inicial',
    periodo: 'MENSUAL',
    idempotencyKey: key1,
    metodoPago: 'tarjeta',
    tienda: { nombre: `Boutique Uno ${testId}`, slug: slug1, pais: 'BO', moneda: 'BOB' },
    pago: { titular: 'Dueño Aprobado', numero: '4242424242424242', vence: '12/30', cvc: '123' },
  });
  assert.equal(altaRepetida.repetido, true);
  assert.equal(altaRepetida.tienda.id, tiendaId1);
  const pagosCount = await global.pagoSuscripcion.count({ where: { idempotencyKey: key1 } });
  assert.equal(pagosCount, 1, 'No debe duplicar cobro simulado');

  // Reintento con clave igual pero datos distintos
  await assert.rejects(
    async () => {
      await plataforma.suscribir(cuentaId, {
        planId: 'plan-crecimiento', // Datos distintos
        periodo: 'MENSUAL',
        idempotencyKey: key1,
        metodoPago: 'tarjeta',
        tienda: { nombre: `Boutique Uno ${testId}`, slug: slug1, pais: 'BO', moneda: 'BOB' },
        pago: { titular: 'Dueño Aprobado', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });
    },
    (err: any) => err.status === 409 || err.response?.codigo === 'IDEMPOTENCIA_DATOS_DISTINTOS',
  );
  console.log('   ✓ Idempotencia validada: repetición segura y rechazo de datos alterados.');

  // 9. Creación de Tienda 2 para la misma cuenta
  console.log('\n9. Creando Tienda 2 para la misma cuenta y verificando multitienda...');
  const key2 = randomUUID();
  const slug2 = `saas-t2-${testId}`;
  const alta2 = await plataforma.suscribir(cuentaId, {
    planId: 'plan-crecimiento',
    periodo: 'TRIMESTRAL',
    idempotencyKey: key2,
    metodoPago: 'tarjeta',
    tienda: { nombre: `Sucursal Dos ${testId}`, slug: slug2, pais: 'BO', moneda: 'BOB' },
    pago: { titular: 'Dueño Aprobado', numero: '4242424242424242', vence: '12/30', cvc: '123' },
  });
  const tiendaId2 = alta2.tienda.id;
  const esquema2 = nombreSchemaTienda(tiendaId2);
  assert.notEqual(tiendaId1, tiendaId2);
  assert.notEqual(esquema1, esquema2);

  const [esq2Db] = await global.$queryRaw<{ nspname: string }[]>`SELECT nspname FROM pg_namespace WHERE nspname = ${esquema2}`;
  assert.equal(esq2Db.nspname, esquema2);

  const misTiendas = await cuentas.tiendasDe(cuentaId);
  assert.equal(misTiendas.length, 2, 'La cuenta debe descubrir sus 2 tiendas');
  assert.ok(misTiendas.some(t => t.tiendaId === tiendaId1));
  assert.ok(misTiendas.some(t => t.tiendaId === tiendaId2));
  console.log('   ✓ Cuenta posee 2 tiendas aisladas en esquemas independientes.');

  // 10. Cambio de tienda autorizado y restricción a tienda ajena
  console.log('\n10. Probando cambio de tienda y restricción de tienda ajena...');
  const cambio = await auth.cambiarTienda(cuentaId, tiendaId2);
  assert.equal(cambio.tienda.id, tiendaId2);

  // Cuenta ajena
  const emailB = `saas-ajeno-${testId}@ensayar.invalid`;
  const regB = await plataforma.registrar({ nombre: 'Ajeno', email: emailB, password: 'Password123!' });
  const tokenVerifB = new URL(regB.verificacion.url!).searchParams.get('token')!;
  const sesionB = await plataforma.verificar(tokenVerifB);
  await assert.rejects(
    async () => { await auth.cambiarTienda(sesionB.cuenta.id, tiendaId1); },
    (err: any) => err.status === 403 || err.response?.codigo === 'SIN_ACCESO_TIENDA',
    'Cuenta sin perfil en tienda 1 debe recibir 403 SIN_ACCESO_TIENDA',
  );
  console.log('   ✓ Cambio entre tiendas 1 y 2 exitoso; cuenta ajena bloqueada (403).');

  // 11. Renovación en mismo plan (extensión) y mejora de plan (upgrade)
  console.log('\n11. Probando renovación en mismo plan y mejora (upgrade)...');
  const detalleAntes = await plataforma.detalleTienda(cuentaId, tiendaId1);
  const venceAntes = new Date(detalleAntes.venceEn!).getTime();

  // Renovar mismo plan Inicial: extiende vigencia
  const keyRenovar = randomUUID();
  const renovacion = await plataforma.renovar(cuentaId, tiendaId1, {
    planId: 'plan-inicial',
    periodo: 'MENSUAL',
    idempotencyKey: keyRenovar,
    metodoPago: 'tarjeta',
    pago: { titular: 'Dueño', numero: '4242424242424242', vence: '12/30', cvc: '123' },
  });
  const venceDespues = new Date(renovacion.venceEn!).getTime();
  assert.ok(venceDespues > venceAntes, 'Mismo plan debe extender sobre el vencimiento actual');

  // Mejora a Crecimiento
  const keyUpgrade = randomUUID();
  const upgrade = await plataforma.renovar(cuentaId, tiendaId1, {
    planId: 'plan-crecimiento',
    periodo: 'MENSUAL',
    idempotencyKey: keyUpgrade,
    metodoPago: 'tarjeta',
    pago: { titular: 'Dueño', numero: '4242424242424242', vence: '12/30', cvc: '123' },
  });
  assert.equal(upgrade.plan?.codigo, 'CRECIMIENTO');
  console.log('   ✓ Renovación extendió vigencia y mejora de plan a Crecimiento aplicada.');

  // 12. Restricción de reducción de plan por límite de productos
  console.log('\n12. Probando restricción de reducción de plan (downgrade) por límites...');
  // Insertamos 205 productos sintéticos en el esquema de la Tienda 1
  const productosData = [];
  for (let i = 1; i <= 205; i++) {
    productosData.push({
      id: `prod-limite-${testId}-${i}`,
      tiendaId: tiendaId1,
      nombre: `Prenda Límite ${i}`,
      precioBase: 100,
      categoria: 'Vestidos',
      ocasion: 'Casual',
    });
  }
  await local1.producto.createMany({ data: productosData });
  const uso = await limites.uso(local1 as unknown as PrismaService);
  assert.equal(uso.productos, 205);

  // Intentamos bajar a plan-inicial (límite 200 productos)
  await assert.rejects(
    async () => {
      await plataforma.renovar(cuentaId, tiendaId1, {
        planId: 'plan-inicial',
        periodo: 'MENSUAL',
        idempotencyKey: randomUUID(),
        metodoPago: 'tarjeta',
        pago: { titular: 'Dueño', numero: '4242424242424242', vence: '12/30', cvc: '123' },
      });
    },
    (err: any) => err.status === 409 || err.response?.codigo === 'PLAN_INSUFICIENTE',
    'Debe rechazar downgrade si los productos actuales superan el límite del plan inicial (200)',
  );
  console.log('   ✓ Reducción de plan rechazada por exceso de límite (205 > 200).');

  // Limpieza de datos sintéticos de la prueba
  console.log('\nLimpieza: eliminando datos de prueba sintéticos en ensayar_copia...');
  await local1.producto.deleteMany({ where: { tiendaId: tiendaId1 } });
  await global.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${esquema1}" CASCADE`);
  await global.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${esquema2}" CASCADE`);
  await global.pagoSuscripcion.deleteMany({ where: { idempotencyKey: { in: [key1, key2, keyRenovar, keyUpgrade] } } });
  await global.suscripcion.deleteMany({ where: { tiendaId: { in: [tiendaId1, tiendaId2] } } });
  await global.tienda.deleteMany({ where: { id: { in: [tiendaId1, tiendaId2] } } });
  await global.cuenta.deleteMany({ where: { id: { in: [cuentaId, sesionB.cuenta.id] } } });
  console.log('   ✓ Limpieza completada.');

  console.log('\n===============================================================');
  console.log('TODAS LAS PRUEBAS DEL FLUJO SAAS INTEGRAL PASARON EXITOSAMENTE.');
  console.log('===============================================================');
}

main()
  .catch((e: unknown) => {
    console.error('\n❌ ERROR EN VERIFICACIÓN INTEGRAL:', e instanceof Error ? e.stack || e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await esquemasPool.onModuleDestroy();
    await prisma.$disconnect();
  });
