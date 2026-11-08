/**
 * Prueba de punta a punta del punto 2 (modo offline y sincronización) contra el backend levantado.
 * Uso: npm run verificar:offline   (API_URL=http://localhost:3000 por defecto)
 *
 * Crea una tienda de prueba con dos cajeros y la borra al terminar (CONSERVAR=1 para dejarla).
 */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { borrarTienda } from './lib/borrar-tienda';

const API = process.env.API_URL ?? 'http://localhost:3000';
const db = new PrismaClient();
const sufijo = Date.now().toString(36);
const creadas: string[] = [];
const correo = (n: string) => `${n}-${sufijo}@prueba.ensayar.bo`;

type Resp = { status: number; body: any; headers: Headers };

async function api(
  metodo: string,
  ruta: string,
  opts: { token?: string; tienda?: string; body?: unknown; clave?: string } = {},
): Promise<Resp> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.tienda) headers['X-Tienda'] = opts.tienda;
  if (opts.clave) headers['Idempotency-Key'] = opts.clave;
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
  return { status: r.status, body, headers: r.headers };
}

const ok = (nombre: string) => console.log(`  ✔ ${nombre}`);

function esperar(r: Resp, status: number, contexto: string) {
  assert.equal(r.status, status, `${contexto}: esperaba ${status}, llegó ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

const haceDias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const ahora = () => new Date().toISOString();

async function stock(varianteId: string) {
  const s = await db.stockAlmacen.findFirst({ where: { varianteId } });
  return s?.cantidad ?? 0;
}

async function crearTienda() {
  const email = correo('duena');
  const reg = esperar(
    await api('POST', '/plataforma/registro', { body: { nombre: 'Dueña offline', email, password: 'clave-segura-1' } }),
    201,
    'registro',
  );
  const cuenta = await db.cuenta.findUniqueOrThrow({ where: { email } });
  const token = reg.verificacion?.url ? new URL(reg.verificacion.url).searchParams.get('token') : cuenta.verificacionToken;
  const tokenCuenta = esperar(await api('POST', '/plataforma/verificar', { body: { token } }), 201, 'verificar').accessToken;
  const planes = esperar(await api('GET', '/plataforma/planes'), 200, 'planes');
  const plan = planes.find((p: any) => p.codigo === 'CRECIMIENTO');
  const slug = `prueba-offline-${sufijo}`;
  const alta = esperar(
    await api('POST', '/plataforma/suscribir', {
      token: tokenCuenta,
      body: {
        planId: plan.id,
        periodo: 'MENSUAL',
        tienda: { nombre: 'Offline', slug },
        pago: { titular: 'Prueba', numero: '4242 4242 4242 4242', vence: '12/30', cvc: '123' },
        idempotencyKey: randomUUID(),
      },
    }),
    201,
    'suscribir',
  );
  creadas.push(alta.tienda.id);
  return { tiendaId: alta.tienda.id as string, slug, admin: alta.accessToken as string };
}

async function crearCajero(admin: string, slug: string, nombre: string, sucursalId: string) {
  esperar(
    await api('POST', '/usuarios', {
      token: admin,
      body: { email: correo(nombre), password: 'clave-cajero-1', nombre, rol: 'CAJERO', sucursalId },
    }),
    201,
    `crear ${nombre}`,
  );
  const login = esperar(
    await api('POST', '/auth/login', { tienda: slug, body: { email: correo(nombre), password: 'clave-cajero-1' } }),
    201,
    `login ${nombre}`,
  );
  const turno = esperar(
    await api('POST', '/caja/abrir', { token: login.accessToken, body: { sucursalId, fondoInicial: 100 } }),
    201,
    `abrir caja ${nombre}`,
  );
  return { token: login.accessToken as string, turnoId: turno.id as string };
}

function lote(dispositivoId: string, operaciones: unknown[]) {
  return { dispositivoId: `${dispositivoId}-${sufijo}`, nombreDispositivo: `Prueba ${dispositivoId}`, operaciones };
}

async function main() {
  console.log(`Verificando modo offline contra ${API}`);
  const t = await crearTienda();
  const sucursales = esperar(await api('GET', '/sucursales', { token: t.admin }), 200, 'sucursales');
  const sucursalId: string = sucursales[0].id;
  const almacenId: string = sucursales[0].almacenes[0].id;
  const caja1 = await crearCajero(t.admin, t.slug, 'cajera-a', sucursalId);
  const caja2 = await crearCajero(t.admin, t.slug, 'cajero-b', sucursalId);

  // O8 · Política: qué funciona sin red y la ventana configurable
  const politica = esperar(await api('GET', '/sync/politica', { token: caja1.token }), 200, 'política');
  assert.equal(politica.ventanaOfflineDias, 7);
  assert.ok(politica.disponibles.some((a: any) => a.accion === 'venta_efectivo'));
  assert.ok(politica.soloEnLinea.some((a: any) => a.accion === 'pago_qr_tarjeta'));
  ok(
    `política: ${politica.disponibles.length} acciones sin red, ${politica.soloEnLinea.length} solo en línea; ventana de ${politica.ventanaOfflineDias} días`,
  );

  // O3/O4 · Producto creado sin red con UUIDs del dispositivo
  // Ids ordenados para que la variante con stock se descuente primero en la prueba de rollback.
  const [idConStock, idUltima, idSinStock] = [randomUUID(), randomUUID(), randomUUID()].sort();
  const productoId = randomUUID();
  const opProducto = {
    id: randomUUID(),
    tipo: 'producto',
    creadaEn: haceDias(1),
    datos: {
      id: productoId,
      nombre: 'Blusa offline',
      categoria: 'blusas',
      ocasion: 'casual',
      precioBase: 120,
      almacenId,
      variantes: [
        { id: idConStock, talla: 'M', color: 'azul', sku: `OFF-AZ-M-${sufijo}`, stock: 10 },
        { id: idUltima, talla: 'S', color: 'rojo', sku: `OFF-RO-S-${sufijo}`, stock: 1 },
        { id: idSinStock, talla: 'L', color: 'negro', sku: `OFF-NE-L-${sufijo}`, stock: 0 },
      ],
    },
  };
  const rProd = esperar(await api('POST', '/sync/lote', { token: t.admin, body: lote('admin-pc', [opProducto]) }), 200, 'lote producto');
  assert.equal(rProd.resultados[0].estado, 'aplicada', JSON.stringify(rProd.resultados[0]));
  assert.equal(rProd.resultados[0].recursoId, productoId);
  assert.equal(await stock(idConStock), 10);
  assert.equal(await stock(idUltima), 1);
  ok('producto y 3 variantes creados sin red conservan los UUID del dispositivo y su stock inicial');

  const opSkuRepetido = {
    ...opProducto,
    id: randomUUID(),
    datos: { ...opProducto.datos, id: randomUUID(), variantes: [{ ...opProducto.datos.variantes[0], id: randomUUID() }] },
  };
  const rSku = esperar(await api('POST', '/sync/lote', { token: t.admin, body: lote('admin-pc', [opSkuRepetido]) }), 200, 'sku');
  assert.equal(rSku.resultados[0].estado, 'conflicto');
  assert.equal(rSku.resultados[0].codigo, 'SKU_EN_USO');
  ok('otro producto offline con el mismo SKU → conflicto SKU_EN_USO');

  const venta = (turnoId: string, lineas: { varianteId: string; cantidad: number }[], extra: object = {}) => ({
    id: randomUUID(),
    tipo: 'venta',
    creadaEn: ahora(),
    datos: { almacenId, cajaTurnoId: turnoId, medioPago: 'efectivo', lineas, ...extra },
  });

  // O5 · Dos cajas sin red venden la última unidad; sincronizan a la vez
  const [r1, r2] = await Promise.all([
    api('POST', '/sync/lote', {
      token: caja1.token,
      body: lote('caja-1', [venta(caja1.turnoId, [{ varianteId: idUltima, cantidad: 1 }])]),
    }),
    api('POST', '/sync/lote', {
      token: caja2.token,
      body: lote('caja-2', [venta(caja2.turnoId, [{ varianteId: idUltima, cantidad: 1 }])]),
    }),
  ]);
  const estados = [esperar(r1, 200, 'caja 1').resultados[0], esperar(r2, 200, 'caja 2').resultados[0]];
  const aplicada = estados.filter((e) => e.estado === 'aplicada');
  const enConflicto = estados.filter((e) => e.estado === 'conflicto');
  assert.equal(aplicada.length, 1, JSON.stringify(estados));
  assert.equal(enConflicto.length, 1, JSON.stringify(estados));
  assert.equal(enConflicto[0].codigo, 'STOCK_INSUFICIENTE');
  assert.equal(enConflicto[0].detalle.disponible, 0);
  assert.equal(await stock(idUltima), 0);
  assert.equal(await db.operacionSync.count({ where: { tiendaId: t.tiendaId, estado: 'conflicto', tipo: 'venta' } }), 1);
  await new Promise((r) => setTimeout(r, 300));
  const avisos = await db.notificacion.count({ where: { tiendaId: t.tiendaId, tipo: 'sync_conflicto' } });
  assert.ok(avisos >= 1, 'el admin debe recibir el aviso de conflicto');
  const lista = esperar(await api('GET', '/sync/operaciones?estado=conflicto', { token: t.admin }), 200, 'operaciones');
  assert.deepEqual(lista.map((o: any) => o.tipo).sort(), ['producto', 'venta']);
  ok('última unidad: una caja aplica, la otra queda en conflicto (disponible 0), el stock no baja de 0 y el admin es avisado');

  // O7 · Rollback: una venta de dos líneas donde la segunda no alcanza no descuenta la primera
  const antes = await stock(idConStock);
  const rRollback = esperar(
    await api('POST', '/sync/lote', {
      token: caja1.token,
      body: lote('caja-1', [
        venta(caja1.turnoId, [
          { varianteId: idConStock, cantidad: 2 },
          { varianteId: idSinStock, cantidad: 1 },
        ]),
      ]),
    }),
    200,
    'rollback',
  );
  assert.equal(rRollback.resultados[0].estado, 'conflicto');
  assert.equal(await stock(idConStock), antes);
  ok(`rollback: la línea con stock (${antes}) no se descuenta si otra línea de la misma venta falla`);

  // O3/O4 · Cliente nuevo + venta que lo referencia, en el mismo lote; luego reenvío del lote
  const clienteId = randomUUID();
  const opCliente = {
    id: randomUUID(),
    tipo: 'cliente',
    creadaEn: ahora(),
    datos: { id: clienteId, nombre: 'Clienta sin red', email: correo('clienta') },
  };
  const opVentaCliente = venta(caja1.turnoId, [{ varianteId: idConStock, cantidad: 1 }], { clientaId: clienteId });
  const cuerpo = lote('caja-1', [opCliente, opVentaCliente]);
  const rCliente = esperar(await api('POST', '/sync/lote', { token: caja1.token, body: cuerpo }), 200, 'cliente + venta');
  assert.deepEqual(
    rCliente.resultados.map((r: any) => r.estado),
    ['aplicada', 'aplicada'],
    JSON.stringify(rCliente.resultados),
  );
  const ventaCliente = await db.venta.findFirstOrThrow({ where: { tiendaId: t.tiendaId, uuid: opVentaCliente.id } });
  assert.equal(ventaCliente.clientaId, clienteId);
  const stockTrasVenta = await stock(idConStock);
  const rReenvio = esperar(await api('POST', '/sync/lote', { token: caja1.token, body: cuerpo }), 200, 'reenvío');
  assert.deepEqual(
    rReenvio.resultados.map((r: any) => r.estado),
    ['repetida', 'repetida'],
  );
  assert.equal(await db.venta.count({ where: { tiendaId: t.tiendaId, uuid: opVentaCliente.id } }), 1);
  assert.equal(await db.usuario.count({ where: { tiendaId: t.tiendaId, email: correo('clienta') } }), 1);
  assert.equal(await stock(idConStock), stockTrasVenta);
  ok('cliente y venta creados sin red en un mismo lote; reenviar el lote devuelve "repetida" sin duplicar nada');

  // Cliente registrado en dos dispositivos con el mismo correo → se fusiona
  const otroLocal = randomUUID();
  const rFusion = esperar(
    await api('POST', '/sync/lote', {
      token: caja2.token,
      body: lote('caja-2', [
        { id: randomUUID(), tipo: 'cliente', creadaEn: ahora(), datos: { id: otroLocal, nombre: 'Misma clienta', email: correo('clienta') } },
        venta(caja2.turnoId, [{ varianteId: idConStock, cantidad: 1 }], { clientaId: otroLocal }),
      ]),
    }),
    200,
    'fusión',
  );
  assert.equal(rFusion.resultados[0].estado, 'fusionada');
  assert.equal(rFusion.resultados[0].recursoId, clienteId);
  assert.equal(rFusion.resultados[1].estado, 'aplicada');
  assert.equal(rFusion.resultados[1].detalle.clientaId, clienteId);
  ok('mismo correo registrado sin red en otra caja → cliente fusionado y su venta queda con el cliente existente');

  // O6 · Doble/triple "guardar" con la misma Idempotency-Key
  const clave = randomUUID();
  const ventaHttp = {
    uuid: randomUUID(),
    canal: 'pos',
    medioPago: 'efectivo',
    almacenId,
    cajaTurnoId: caja1.turnoId,
    lineas: [{ varianteId: idConStock, cantidad: 1 }],
  };
  const previo = await stock(idConStock);
  const respuestas = await Promise.all(
    [1, 2, 3, 4].map(() => api('POST', '/ventas', { token: caja1.token, body: ventaHttp, clave })),
  );
  respuestas.forEach((r, i) => esperar(r, 201, `envío ${i + 1}`));
  const ids = new Set(respuestas.map((r) => r.body.id));
  assert.equal(ids.size, 1);
  assert.equal(await db.venta.count({ where: { tiendaId: t.tiendaId, uuid: ventaHttp.uuid } }), 1);
  assert.equal(await stock(idConStock), previo - 1);
  const repetidas = respuestas.filter((r) => r.headers.get('idempotent-replayed') === 'true').length;
  assert.ok(repetidas >= 1);
  const otroContenido = await api('POST', '/ventas', {
    token: caja1.token,
    body: { ...ventaHttp, lineas: [{ varianteId: idConStock, cantidad: 2 }] },
    clave,
  });
  assert.equal(esperar(otroContenido, 422, 'misma clave, otro contenido').codigo, 'IDEMPOTENCIA_CONFLICTO');
  ok(`4 envíos simultáneos de la misma venta → 1 venta, stock −1 (${repetidas} respuestas repetidas); misma clave con otro contenido → 422`);

  const claveIngreso = randomUUID();
  const antesIngreso = await stock(idConStock);
  for (let i = 0; i < 3; i++) {
    esperar(
      await api('POST', '/inventario/ingreso', {
        token: t.admin,
        clave: claveIngreso,
        body: { varianteId: idConStock, almacenId, cantidad: 5, nota: 'ingreso idempotente' },
      }),
      201,
      `ingreso ${i + 1}`,
    );
  }
  assert.equal(await stock(idConStock), antesIngreso + 5);
  ok('triple "guardar" de un ingreso de inventario con la misma clave suma una sola vez (+5)');

  // O8 · Un pago QR/tarjeta no se acepta como operación offline
  const rQr = esperar(
    await api('POST', '/sync/lote', {
      token: caja1.token,
      body: lote('caja-1', [venta(caja1.turnoId, [{ varianteId: idConStock, cantidad: 1 }], { medioPago: 'qr' })]),
    }),
    200,
    'qr offline',
  );
  assert.equal(rQr.resultados[0].estado, 'rechazada');
  assert.equal(rQr.resultados[0].codigo, 'PAGO_REQUIERE_RED');
  ok('venta QR hecha sin red → rechazada PAGO_REQUIERE_RED');

  // O9 · Ventana offline configurable
  const vieja = { ...venta(caja1.turnoId, [{ varianteId: idConStock, cantidad: 1 }]), creadaEn: haceDias(8) };
  const rVieja = esperar(await api('POST', '/sync/lote', { token: caja1.token, body: lote('caja-1', [vieja]) }), 200, 'vieja');
  assert.equal(rVieja.resultados[0].estado, 'vencida');
  esperar(await api('PATCH', '/sync/politica', { token: caja1.token, body: { ventanaOfflineDias: 10 } }), 403, 'cajero no cambia ventana');
  esperar(await api('PATCH', '/sync/politica', { token: t.admin, body: { ventanaOfflineDias: 31 } }), 400, 'ventana > 30');
  esperar(await api('PATCH', '/sync/politica', { token: t.admin, body: { ventanaOfflineDias: 10 } }), 200, 'ventana 10');
  const vieja2 = { ...venta(caja1.turnoId, [{ varianteId: idConStock, cantidad: 1 }]), creadaEn: haceDias(8) };
  const rVieja2 = esperar(await api('POST', '/sync/lote', { token: caja1.token, body: lote('caja-1', [vieja2]) }), 200, 'vieja 2');
  assert.equal(rVieja2.resultados[0].estado, 'aplicada', JSON.stringify(rVieja2.resultados[0]));
  const ventaVieja = await db.venta.findFirstOrThrow({ where: { tiendaId: t.tiendaId, uuid: vieja2.id } });
  const dias = (Date.now() - ventaVieja.creadaEn.getTime()) / 86_400_000;
  assert.ok(dias > 7.9 && dias < 8.1, `fecha de la venta: hace ${dias} días`);
  ok('venta de hace 8 días → vencida con ventana 7; el admin la sube a 10 y entra con su fecha real (hace 8 días)');

  // Aislamiento: una operación offline con una variante de otra tienda se rechaza
  const vesta = await db.variante.findFirstOrThrow({ where: { tiendaId: { not: t.tiendaId } } });
  const rAjena = esperar(
    await api('POST', '/sync/lote', {
      token: caja1.token,
      body: lote('caja-1', [venta(caja1.turnoId, [{ varianteId: vesta.id, cantidad: 1 }])]),
    }),
    200,
    'variante ajena',
  );
  assert.equal(rAjena.resultados[0].estado, 'rechazada');
  assert.equal(rAjena.resultados[0].codigo, 'REFERENCIA_NO_EXISTE');
  ok('venta offline con una variante de otra tienda → rechazada REFERENCIA_NO_EXISTE');

  const mismoId = { ...opVentaCliente, datos: { ...opVentaCliente.datos, lineas: [{ varianteId: idConStock, cantidad: 3 }] } };
  const rMismoId = esperar(await api('POST', '/sync/lote', { token: caja1.token, body: lote('caja-1', [mismoId]) }), 200, 'mismo id');
  assert.equal(rMismoId.resultados[0].codigo, 'IDEMPOTENCIA_CONFLICTO');
  ok('mismo id de operación con otro contenido → rechazada IDEMPOTENCIA_CONFLICTO');

  const dispositivos = await db.dispositivo.count({ where: { tiendaId: t.tiendaId } });
  assert.ok(dispositivos >= 3);
  ok(`${dispositivos} dispositivos registrados con su último uso`);

  console.log('Modo offline: OK');
}

async function limpiar() {
  for (const id of creadas) await borrarTienda(db, id);
  await db.cuenta.deleteMany({ where: { email: { contains: sufijo } } }).catch(() => undefined);
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
