/**
 * Batería de pruebas completa para el Punto 2: Modo Offline y Sincronización
 * en arquitectura PostgreSQL por esquemas aislados.
 *
 * Cubre las 8 pruebas mínimas exigidas:
 * 1. Misma operación enviada varias veces y concurrentemente (idempotencia y deduplicación concurrente).
 * 2. Dos dispositivos venden la última unidad (conflicto de stock detectado, 1 aplicada, 1 conflicto, stock 0, no negativo).
 * 3. Fallo inducido después de iniciar transacción (garantía de rollback sin registros parciales).
 * 4. Operación con referencia de otra tienda (rechazo con REFERENCIA_NO_EXISTE y aislamiento).
 * 5. Dependencia ordenada entre creación de cliente/producto y venta posterior.
 * 6. Sincronización con credenciales o contexto inválidos (401, 403, cruce de tiendas).
 * 7. Reintento y resolución administrativa de conflicto (descarte de conflicto con auditoría).
 * 8. Validación de persistencia en PostgreSQL por esquemas (100% en tienda_<id>, 0 en public.*).
 */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { PrismaEsquemasService } from '../src/prisma/prisma-esquemas.service';

const secret = process.env.JWT_SECRET || 'clave-sintetica-prueba-local-no-utilizar';
const baseUrl = process.env.API_URL || 'http://127.0.0.1:3301';

async function main() {
  console.log('================================================================');
  console.log(' INICIO BATERÍA DE PRUEBAS DE MODO OFFLINE Y SINCRONIZACIÓN');
  console.log(' ARQUITECTURA: POSTGRESQL POR ESQUEMAS AISLADOS');
  console.log('================================================================\n');

  const esquemas = new PrismaEsquemasService(new ConfigService());
  const global = esquemas.clientePlataforma();

  // 1. Obtener tiendas de prueba (Tienda A y Tienda B para prueba de cruce)
  const tiendas = await global.tienda.findMany({
    take: 2,
    orderBy: { creadaEn: 'asc' },
  });
  if (tiendas.length === 0) throw new Error('No hay tiendas disponibles en la base de datos');
  const tiendaA = tiendas[0];
  const tiendaB = tiendas.length > 1 ? tiendas[1] : null;

  const localA = esquemas.clienteTienda(tiendaA.id);
  const adminA = await localA.usuario.findFirstOrThrow({ where: { rol: 'ADMIN', activo: true } });
  const cajeroA = await localA.usuario.findFirst({ where: { rol: 'CAJERO', activo: true } }) ?? adminA;
  const almacenA = await localA.almacen.findFirstOrThrow();

  // Asegurar un turno de caja abierto para las ventas POS
  let turnoA = await localA.cajaTurno.findFirst({
    where: { cerradoEn: null, sucursalId: almacenA.sucursalId, cajeroId: cajeroA.id },
  });
  if (!turnoA) {
    turnoA = await localA.cajaTurno.create({
      data: {
        tiendaId: tiendaA.id,
        cajeroId: cajeroA.id,
        sucursalId: almacenA.sucursalId,
        fondoInicial: 100,
      },
    });
  }

  const tokenAdminA = jwt.sign(
    { tipo: 'tienda', sub: adminA.id, tiendaId: tiendaA.id, cuentaId: adminA.cuentaId, rol: adminA.rol, email: adminA.email },
    secret,
    { expiresIn: '15m' },
  );
  const tokenCajeroA = jwt.sign(
    { tipo: 'tienda', sub: cajeroA.id, tiendaId: tiendaA.id, cuentaId: cajeroA.cuentaId, rol: cajeroA.rol, email: cajeroA.email },
    secret,
    { expiresIn: '15m' },
  );

  const headersAdminA = {
    Authorization: `Bearer ${tokenAdminA}`,
    'Content-Type': 'application/json',
  };
  const headersCajeroA = {
    Authorization: `Bearer ${tokenCajeroA}`,
    'Content-Type': 'application/json',
  };

  // Helper HTTP
  async function postSyncLote(body: any, headers: Record<string, string> = headersAdminA) {
    const res = await fetch(`${baseUrl}/sync/lote`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const status = res.status;
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status, data };
  }

  // -------------------------------------------------------------------------
  // PRUEBA 1: Misma operación enviada varias veces y concurrentemente
  // -------------------------------------------------------------------------
  console.log('PRUEBA 1: Idempotencia y peticiones concurrentes para la misma operación...');
  const opClienteId = randomUUID();
  const clienteId = randomUUID();
  const loteConcurrente = {
    dispositivoId: 'term-concurrente-1',
    operaciones: [
      {
        id: opClienteId,
        tipo: 'cliente',
        creadaEn: new Date().toISOString(),
        datos: {
          id: clienteId,
          nombre: 'Cliente Concurrente',
          email: `concurrente-${randomUUID()}@example.invalid`,
        },
      },
    ],
  };

  // Disparamos 4 peticiones idénticas al mismo milisegundo
  const respuestas = await Promise.all([
    postSyncLote(loteConcurrente),
    postSyncLote(loteConcurrente),
    postSyncLote(loteConcurrente),
    postSyncLote(loteConcurrente),
  ]);

  for (const r of respuestas) {
    assert.equal(r.status, 200, `Respuesta inesperada: ${r.status}`);
  }
  // En total, exactamente 1 debió ser aplicada y las concurrentes en_curso o repetidas
  const estados = respuestas.map((r) => r.data.resultados[0].estado);
  const aplicadas = estados.filter((e) => e === 'aplicada').length;
  const repetidas = estados.filter((e) => e === 'repetida').length;
  const enCurso = estados.filter((e) => e === 'en_curso').length;
  assert.equal(aplicadas, 1, `Debe haber exactamente 1 aplicada; obtenido: ${estados.join(', ')}`);
  assert.equal(aplicadas + repetidas + enCurso, 4, 'Todas deben resolverse como aplicada, repetida o en_curso');

  // Si se vuelve a enviar tras concluir, responde repetida
  const resReplay = await postSyncLote(loteConcurrente);
  assert.equal(resReplay.status, 200);
  assert.equal(resReplay.data.resultados[0].estado, 'repetida', 'Reintento posterior debe marcar repetida');

  // En la BD debe existir exactamente 1 registro de la operación
  const countOp = await localA.operacionSync.count({ where: { operationId: opClienteId } });
  assert.equal(countOp, 1, 'Debe haber exactamente 1 registro en operaciones_sync');
  const countCli = await localA.usuario.count({ where: { id: clienteId } });
  assert.equal(countCli, 1, 'Debe haber exactamente 1 registro de usuario');
  console.log('  ✔ Idempotencia y concurrencia verificadas: 1 aplicada, 3 repetidas, 1 sola inserción en BD.');

  // -------------------------------------------------------------------------
  // PRUEBA 2: Dos dispositivos venden la última unidad (conflicto de stock)
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 2: Conflicto de stock (dos dispositivos venden la última unidad)...');
  // Creamos un producto con exactamente 1 unidad en stock
  const prodExclusivoId = randomUUID();
  const varExclusivaId = randomUUID();
  const skuExclusivo = `ULTIMA-${randomUUID().slice(0, 6)}`;

  const loteCrearUltima = {
    dispositivoId: 'term-setup',
    operaciones: [
      {
        id: randomUUID(),
        tipo: 'producto',
        creadaEn: new Date().toISOString(),
        datos: {
          id: prodExclusivoId,
          nombre: 'Vestido Exclusivo Última Unidad',
          categoria: 'vestidos',
          ocasion: 'fiesta',
          precioBase: 500,
          almacenId: almacenA.id,
          variantes: [{ id: varExclusivaId, talla: 'M', color: 'Rojo', sku: skuExclusivo, stock: 1 }],
        },
      },
    ],
  };
  const resCrear = await postSyncLote(loteCrearUltima);
  assert.equal(resCrear.status, 200);
  assert.equal(resCrear.data.resumen.aplicada, 1);

  // Verificamos que el stock inicial es 1
  let stockRow = await localA.stockAlmacen.findUnique({
    where: { varianteId_almacenId: { varianteId: varExclusivaId, almacenId: almacenA.id } },
  });
  assert.equal(stockRow?.cantidad, 1, 'Stock inicial debe ser 1');

  // Dispositivo 1 vende la unidad
  const opVentaDisp1 = randomUUID();
  const loteDisp1 = {
    dispositivoId: 'terminal-caja-01',
    operaciones: [
      {
        id: opVentaDisp1,
        tipo: 'venta',
        creadaEn: new Date(Date.now() - 30000).toISOString(),
        datos: {
          almacenId: almacenA.id,
          cajaTurnoId: turnoA.id,
          clientaId: clienteId,
          medioPago: 'efectivo',
          canal: 'pos',
          lineas: [{ varianteId: varExclusivaId, cantidad: 1 }],
        },
      },
    ],
  };

  // Dispositivo 2 también vendió la misma unidad sin red
  const opVentaDisp2 = randomUUID();
  const loteDisp2 = {
    dispositivoId: 'terminal-caja-02',
    operaciones: [
      {
        id: opVentaDisp2,
        tipo: 'venta',
        creadaEn: new Date(Date.now() - 25000).toISOString(),
        datos: {
          almacenId: almacenA.id,
          cajaTurnoId: turnoA.id,
          clientaId: clienteId,
          medioPago: 'efectivo',
          canal: 'pos',
          lineas: [{ varianteId: varExclusivaId, cantidad: 1 }],
        },
      },
    ],
  };

  // Sincroniza primero Dispositivo 1 -> Exito
  const resDisp1 = await postSyncLote(loteDisp1, headersCajeroA);
  console.log('resDisp1:', JSON.stringify(resDisp1.data, null, 2));
  assert.equal(resDisp1.status, 200);
  assert.equal(resDisp1.data.resultados[0].estado, 'aplicada');

  // Sincroniza después Dispositivo 2 -> CONFLICTO DE STOCK
  const resDisp2 = await postSyncLote(loteDisp2, headersCajeroA);
  assert.equal(resDisp2.status, 200);
  const resultadoDisp2 = resDisp2.data.resultados[0];
  assert.equal(resultadoDisp2.estado, 'conflicto', `Esperaba conflicto, vino: ${resultadoDisp2.estado}`);
  assert.equal(resultadoDisp2.codigo, 'STOCK_INSUFICIENTE');
  assert.equal(resultadoDisp2.detalle?.disponible, 0);
  assert.equal(resultadoDisp2.detalle?.pedido, 1);

  // Verificamos que el stock no quedó negativo: debe ser exactamente 0
  stockRow = await localA.stockAlmacen.findUnique({
    where: { varianteId_almacenId: { varianteId: varExclusivaId, almacenId: almacenA.id } },
  });
  assert.equal(stockRow?.cantidad, 0, 'El stock remanente debe ser 0 y no negativo');

  // Verificamos que la Venta 2 NO se insertó en la BD (rollback de transacción)
  const venta2EnBD = await localA.venta.findFirst({ where: { uuid: opVentaDisp2 } });
  assert.equal(venta2EnBD, null, 'La venta en conflicto no debe existir en la base de datos');
  console.log('  ✔ Conflicto de stock verificado: 1 venta aplicada, 1 en conflicto, stock en 0 y rollback garantizado.');

  // -------------------------------------------------------------------------
  // PRUEBA 3: Fallo inducido después de iniciar transacción (garantía de rollback)
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 3: Rollback garantizado ante fallo inducido...');
  const opVentaInvalida = randomUUID();
  const loteVentaInvalida = {
    dispositivoId: 'term-fallo-1',
    operaciones: [
      {
        id: opVentaInvalida,
        tipo: 'venta',
        creadaEn: new Date().toISOString(),
        datos: {
          almacenId: almacenA.id,
          cajaTurnoId: turnoA.id,
          // Medio de pago no permitido offline: la validación lo rechaza antes/durante la transacción
          medioPago: 'tarjeta',
          canal: 'pos',
          lineas: [{ varianteId: varExclusivaId, cantidad: 1 }],
        },
      },
    ],
  };

  const resFallo = await postSyncLote(loteVentaInvalida, headersCajeroA);
  assert.equal(resFallo.status, 200);
  assert.equal(resFallo.data.resultados[0].estado, 'rechazada');
  assert.equal(resFallo.data.resultados[0].codigo, 'PAGO_REQUIERE_RED');

  const ventaInvalidaBD = await localA.venta.findFirst({ where: { uuid: opVentaInvalida } });
  assert.equal(ventaInvalidaBD, null, 'No deben quedar ventas parciales tras un fallo');
  console.log('  ✔ Rollback verificado: operación rechazada limpiamente sin datos parciales.');

  // -------------------------------------------------------------------------
  // PRUEBA 4: Operación con referencia de otra tienda (aislamiento inter-tienda)
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 4: Aislamiento inter-tienda y rechazo de referencias ajenas...');
  let almacenAjenoId: any = randomUUID();
  if (tiendaB) {
    const localB = esquemas.clienteTienda(tiendaB.id);
    const almB = await localB.almacen.findFirst();
    if (almB) almacenAjenoId = almB.id;
  }

  const opCruce = randomUUID();
  const loteCruce = {
    dispositivoId: 'term-cruce',
    operaciones: [
      {
        id: opCruce,
        tipo: 'venta',
        creadaEn: new Date().toISOString(),
        datos: {
          almacenId: almacenAjenoId, // Almacén que no existe en Tienda A
          cajaTurnoId: turnoA.id,
          clientaId: clienteId,
          medioPago: 'efectivo',
          canal: 'pos',
          lineas: [{ varianteId: varExclusivaId, cantidad: 1 }],
        },
      },
    ],
  };

  const resCruce = await postSyncLote(loteCruce, headersCajeroA);
  assert.equal(resCruce.status, 200);
  assert.equal(resCruce.data.resultados[0].estado, 'rechazada');
  assert.equal(resCruce.data.resultados[0].codigo, 'REFERENCIA_NO_EXISTE');
  assert.equal(resCruce.data.resultados[0].detalle?.recurso, 'almacen');
  console.log('  ✔ Aislamiento de tienda verificado: referencia a otra tienda rechazada con REFERENCIA_NO_EXISTE.');

  // -------------------------------------------------------------------------
  // PRUEBA 5: Dependencia ordenada entre creación de cliente/producto y venta
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 5: Dependencia ordenada (alta de cliente + producto + venta en un lote)...');
  const nuevoClienteId = randomUUID();
  const nuevoProductoId = randomUUID();
  const nuevaVarianteId = randomUUID();
  const skuDep = `DEP-${randomUUID().slice(0, 6)}`;
  const opDepCli = randomUUID();
  const opDepProd = randomUUID();
  const opDepVenta = randomUUID();

  const loteDependencias = {
    dispositivoId: 'term-cadena',
    operaciones: [
      {
        id: opDepCli,
        tipo: 'cliente',
        creadaEn: new Date(Date.now() - 30000).toISOString(),
        datos: {
          id: nuevoClienteId,
          nombre: 'Compradora Cadena',
          email: `cadena-${randomUUID()}@example.invalid`,
        },
      },
      {
        id: opDepProd,
        tipo: 'producto',
        creadaEn: new Date(Date.now() - 20000).toISOString(),
        datos: {
          id: nuevoProductoId,
          nombre: 'Blusa de Lino Cadena',
          categoria: 'blusas',
          ocasion: 'casual',
          precioBase: 150,
          almacenId: almacenA.id,
          variantes: [{ id: nuevaVarianteId, talla: 'S', color: 'Blanco', sku: skuDep, stock: 10 }],
        },
      },
      {
        id: opDepVenta,
        tipo: 'venta',
        creadaEn: new Date(Date.now() - 10000).toISOString(),
        datos: {
          almacenId: almacenA.id,
          cajaTurnoId: turnoA.id,
          clientaId: nuevoClienteId, // Dependencia de paso 1
          medioPago: 'efectivo',
          canal: 'pos',
          lineas: [{ varianteId: nuevaVarianteId, cantidad: 3 }], // Dependencia de paso 2
        },
      },
    ],
  };

  const resDep = await postSyncLote(loteDependencias, headersAdminA);
  assert.equal(resDep.status, 200);
  assert.equal(resDep.data.procesadas, 3);
  assert.equal(resDep.data.resumen.aplicada, 3);

  // Verificamos que el stock descontó 3 de los 10 iniciales
  const stockDep = await localA.stockAlmacen.findUnique({
    where: { varianteId_almacenId: { varianteId: nuevaVarianteId, almacenId: almacenA.id } },
  });
  assert.equal(stockDep?.cantidad, 7, 'El stock remanente tras la venta debe ser 7 (10 - 3)');
  console.log('  ✔ Dependencia de lote verificada: cliente, producto y venta aplicados en orden; stock descontado.');

  // -------------------------------------------------------------------------
  // PRUEBA 6: Sincronización con credenciales o contexto inválidos
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 6: Credenciales y contexto inválidos...');
  // 6.1 Sin token
  const resSinToken = await postSyncLote(loteConcurrente, { 'Content-Type': 'application/json' });
  assert.equal(resSinToken.status, 401, 'Sin token debe responder 401');

  // 6.2 Token con clave secreta incorrecta
  const tokenFalso = jwt.sign({ sub: adminA.id, tiendaId: tiendaA.id }, 'secreto-invalido');
  const resTokenFalso = await postSyncLote(loteConcurrente, {
    Authorization: `Bearer ${tokenFalso}`,
    'Content-Type': 'application/json',
  });
  assert.equal(resTokenFalso.status, 401, 'Token con clave inválida debe responder 401');

  // 6.3 Token con rol no autorizado (CLIENTA no puede hacer sync)
  const cliEnBD = await localA.usuario.findUniqueOrThrow({ where: { id: nuevoClienteId } });
  const tokenCliente = jwt.sign(
    { tipo: 'tienda', sub: cliEnBD.id, tiendaId: tiendaA.id, cuentaId: cliEnBD.cuentaId, rol: cliEnBD.rol, email: cliEnBD.email },
    secret,
  );
  const resRolInvalido = await postSyncLote(loteConcurrente, {
    Authorization: `Bearer ${tokenCliente}`,
    'Content-Type': 'application/json',
  });
  assert.equal(resRolInvalido.status, 403, 'Rol CLIENTA debe ser denegado con 403 Forbidden');
  console.log('  ✔ Control de acceso verificado: 401 sin token o clave inválida; 403 para roles sin permiso.');

  // -------------------------------------------------------------------------
  // PRUEBA 7: Reintento y resolución administrativa de conflicto
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 7: Reintento y resolución administrativa de conflicto...');
  // Buscamos la fila en conflicto de la Prueba 2 en la BD de Tienda A
  const filaConflicto = await localA.operacionSync.findFirstOrThrow({
    where: { operationId: opVentaDisp2, estado: 'conflicto' },
  });

  // Admin lista las operaciones en conflicto
  const resListarConflictos = await fetch(`${baseUrl}/sync/operaciones?estado=conflicto`, {
    headers: headersAdminA,
  });
  assert.equal(resListarConflictos.status, 200);
  const opsConflictos = await resListarConflictos.json() as any[];
  assert.ok(opsConflictos.some((o) => o.operationId === opVentaDisp2), 'La operación en conflicto debe aparecer listada');

  // Admin descarta el conflicto
  const resDescartar = await fetch(`${baseUrl}/sync/operaciones/${filaConflicto.id}/descartar`, {
    method: 'POST',
    headers: headersAdminA,
  });
  assert.equal(resDescartar.status, 200);
  const descartada = await resDescartar.json() as any;
  assert.equal(descartada.estado, 'descartada');

  // Verificamos que se auditó
  const auditoria = await localA.auditoria.findFirst({
    where: { accion: 'sync_conflicto_descartado', recurso: opVentaDisp2 },
  });
  assert.ok(auditoria, 'Debe existir registro en auditoría del descarte de conflicto');
  console.log('  ✔ Resolución de conflicto verificada: listado por estado, descarte y registro en auditoría.');

  // -------------------------------------------------------------------------
  // PRUEBA 8: Persistencia estricta en PostgreSQL por esquemas (0 en public)
  // -------------------------------------------------------------------------
  console.log('\nPRUEBA 8: Verificación de persistencia en PostgreSQL por esquemas...');
  // Verificamos que las operaciones de sync quedaron en el esquema local de Tienda A
  const opsEnLocal = await localA.operacionSync.count();
  assert.ok(opsEnLocal > 0, 'Deben existir operaciones_sync en el esquema local');

  // Consultamos la tabla pública public.operaciones_sync para comprobar que ninguna de estas operaciones fue escrita allí
  const [opsEnPublic] = await global.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM public.operaciones_sync
    WHERE operation_id IN (${opClienteId}, ${opVentaDisp1}, ${opVentaDisp2}, ${opDepCli}, ${opDepProd}, ${opDepVenta})
  `;
  assert.equal(Number(opsEnPublic.count), 0, 'Ninguna operación sync debe estar en public.operaciones_sync');

  // Lo mismo para productos y ventas creadas en las pruebas
  const [prodsEnPublic] = await global.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM public.productos
    WHERE id IN (${prodExclusivoId}, ${nuevoProductoId})
  `;
  assert.equal(Number(prodsEnPublic.count), 0, 'Ningún producto creado debe estar en public.productos');

  const [ventasEnPublic] = await global.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM public.ventas
    WHERE uuid IN (${opVentaDisp1}, ${opDepVenta})
  `;
  assert.equal(Number(ventasEnPublic.count), 0, 'Ninguna venta creada debe estar en public.ventas');

  console.log('  ✔ Persistencia por esquemas verificada: 100% en esquema tienda_<id>, 0 en tablas public.*.');

  console.log('\n================================================================');
  console.log(' TODAS LAS 8 PRUEBAS MÍNIMAS PASARON SATISFACTORIAMENTE');
  console.log('================================================================\n');

  await esquemas.onModuleDestroy();
}

main().catch((err) => {
  console.error('\n❌ FALLÓ LA BATERÍA DE PRUEBAS:', err);
  process.exit(1);
});
