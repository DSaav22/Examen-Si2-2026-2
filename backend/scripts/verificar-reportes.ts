/**
 * Verificación del punto 3 (reportes inteligentes) y de las ventas al crédito.
 * Uso: npm run verificar:reportes   (API_URL=http://localhost:3000, TIENDA=vesta)
 * Requiere el backend levantado y los datos de `npm run datos:reportes`.
 */
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { PrismaClient } from '@prisma/client';
import { FUENTES } from '../src/reportes/inteligente/catalogo';
import { compilar } from '../src/reportes/inteligente/compilador';
import { Especificacion, validarEspecificacion } from '../src/reportes/inteligente/especificacion';
import { Diccionario, interpretarConReglas } from '../src/reportes/inteligente/interprete-reglas';

const API = process.env.API_URL ?? 'http://localhost:3000';
const SLUG = process.env.TIENDA ?? 'vesta';
const db = new PrismaClient();
const ok = (n: string) => console.log(`  ✔ ${n}`);

type Resp = { status: number; body: any; headers: Headers; bytes: Buffer };
async function api(metodo: string, ruta: string, opts: { token?: string; body?: unknown; clave?: string } = {}): Promise<Resp> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Tienda': SLUG };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.clave) headers['Idempotency-Key'] = opts.clave;
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const bytes = Buffer.from(await r.arrayBuffer());
  let body: any = bytes.toString('utf8');
  try {
    body = JSON.parse(body);
  } catch {
    /* binario o texto */
  }
  return { status: r.status, body, headers: r.headers, bytes };
}
function esperar(r: Resp, status: number, ctx: string) {
  assert.equal(r.status, status, `${ctx}: esperaba ${status}, llegó ${r.status} ${typeof r.body === 'string' ? r.body.slice(0, 200) : JSON.stringify(r.body)}`);
  return r.body;
}

const hoyIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());

async function diccionario(tiendaId: string): Promise<Diccionario> {
  const [suc, prod, col, prov, cli] = await Promise.all([
    db.sucursal.findMany({ where: { tiendaId } }),
    db.producto.findMany({ where: { tiendaId } }),
    db.variante.findMany({ where: { tiendaId }, distinct: ['color'], select: { color: true } }),
    db.proveedor.findMany({ where: { tiendaId } }),
    db.usuario.findMany({ where: { tiendaId, rol: 'CLIENTA' } }),
  ]);
  const u = (xs: string[]) => [...new Set(xs.filter(Boolean))];
  return {
    sucursal: u(suc.map((s) => s.nombre)),
    ciudad: u(suc.map((s) => s.ciudad)),
    categoria: u(prod.map((p) => p.categoria)),
    ocasion: u(prod.map((p) => p.ocasion)),
    color: u(col.map((c) => c.color)),
    producto: u(prod.map((p) => p.nombre)).filter((n) => n.length >= 5),
    proveedor: u(prov.map((p) => p.nombre)),
    clienta: u(cli.map((c) => c.nombre)).filter((n) => n.includes(' ')),
  };
}

async function correr(tiendaId: string, spec: Especificacion) {
  const c = compilar(spec);
  const [, filas] = await db.$transaction([
    db.$queryRaw`SELECT set_config('app.tienda_id', ${tiendaId}, true)`,
    db.$queryRawUnsafe<Record<string, unknown>[]>(c.sql, ...c.parametros),
  ]);
  return { ...c, filas };
}

const interpretar = (dic: Diccionario, pregunta: string) => validarEspecificacion(interpretarConReglas(pregunta, dic, hoyIso()).especificacion);
const filtro = (s: Especificacion, campo: string) => s.filtros.find((f) => f.campo === campo);

async function main() {
  const tienda = await db.tienda.findFirstOrThrow({ where: { slug: SLUG } });
  const dic = await diccionario(tienda.id);

  console.log('\n1. Intérprete por reglas (sin IA)');
  const profe = interpretar(dic, 'Sácame una lista de los clientes que me muestre su nombre, su dirección, su email, de todos aquellos clientes que me deben de 100 a 500 bolivianos por ventas al crédito');
  assert.equal(profe.fuente, 'clientes');
  assert.deepEqual(profe.columnas.map((c) => c.campo), ['nombre', 'direccion', 'email', 'deuda']);
  assert.deepEqual(filtro(profe, 'deuda'), { campo: 'deuda', op: 'entre', valor: 100, valor2: 500 });
  assert.equal(profe.orden[0]?.campo, 'deuda');
  ok('ejemplo del docente → clientes · nombre, dirección, email, deuda · deuda entre 100 y 500');

  const voz = interpretar(dic, 'dame los clientes que me deben de cien a mil quinientos bolivianos con su correo');
  assert.deepEqual(filtro(voz, 'deuda'), { campo: 'deuda', op: 'entre', valor: 100, valor2: 1500 });
  ok('números dictados por voz (“cien a mil quinientos”) → 100 y 1500');

  const top = interpretar(dic, 'los 10 productos más vendidos de los últimos 90 días en excel');
  assert.equal(top.fuente, 'ventas');
  assert.deepEqual(top.agrupar, ['producto']);
  assert.equal(top.limite, 10);
  assert.equal(top.formato, 'excel');
  assert.deepEqual(filtro(top, 'fecha'), { campo: 'fecha', op: 'ultimos_dias', valor: 90 });
  assert.equal(top.orden[0].campo, 'cantidad');
  ok('top 10 + período relativo + agrupación + orden + formato Excel');

  const cruce = interpretar(dic, 'ventas por sucursal y medio de pago de este mes');
  assert.deepEqual(cruce.agrupar, ['sucursal', 'medio_pago']);
  assert.equal(filtro(cruce, 'fecha')?.op, 'este_mes');
  assert.deepEqual(cruce.orden[0], { campo: 'importe', agregacion: 'suma', dir: 'desc' });
  ok('agrupación por dos niveles (sucursal × medio de pago), ordenada por el total');

  const vencidos = interpretar(dic, 'créditos vencidos ordenados por días de mora en pdf');
  assert.equal(vencidos.fuente, 'creditos');
  assert.equal(filtro(vencidos, 'estado')?.valor, 'vencido');
  assert.deepEqual(vencidos.orden[0], { campo: 'dias_mora', dir: 'desc' });
  assert.equal(vencidos.formato, 'pdf');
  ok('créditos vencidos ordenados por mora en PDF');

  const mensual = interpretar(dic, 'ventas por mes del último semestre con más de 2000 bs');
  assert.deepEqual(mensual.agrupar, ['mes']);
  assert.deepEqual(filtro(mensual, 'importe'), { campo: 'importe', op: 'mayor', valor: 2000, agregacion: 'suma' });
  assert.equal(filtro(mensual, 'fecha')?.valor, 180);
  assert.deepEqual(mensual.orden[0], { campo: 'mes', dir: 'asc' });
  ok('criterio sobre el total del grupo (HAVING SUM(importe) > 2000) y meses en orden cronológico');

  const montos = interpretar(dic, 'clientes con deuda de 2000 a 5000');
  assert.deepEqual(filtro(montos, 'deuda'), { campo: 'deuda', op: 'entre', valor: 2000, valor2: 5000 });
  assert.ok(!filtro(montos, 'ultima_compra'), 'un monto 2000 no debe leerse como año');
  ok('“de 2000 a 5000” es un rango de montos, no el año 2000');

  const suc = dic.sucursal.find((s) => /sopocachi/i.test(s));
  if (suc) {
    const efectivo = interpretar(dic, 'ventas en efectivo de sopocachi de ayer');
    assert.equal(filtro(efectivo, 'medio_pago')?.valor, 'efectivo');
    assert.equal(filtro(efectivo, 'sucursal')?.op, 'contiene');
    assert.equal(filtro(efectivo, 'fecha')?.op, 'ayer');
    ok('valores reales de la tienda: “sopocachi” → sucursal, “efectivo” → medio de pago');
  }

  const telefono = interpretarConReglas('clientes que me deben con su teléfono', dic, hoyIso());
  assert.ok(telefono.avisos.some((a) => a.includes('teléfono')));
  ok('dato inexistente (teléfono) → aviso en vez de inventarlo');

  console.log('\n2. Compilador y ejecución');
  for (const [nombre, spec] of Object.entries({ profe, voz, top, cruce, vencidos, mensual, montos })) {
    const r = await correr(tienda.id, spec);
    assert.ok(Array.isArray(r.filas), nombre);
  }
  ok('las 7 especificaciones compilan y corren en PostgreSQL');

  const r = await correr(tienda.id, profe);
  assert.ok(r.filas.length > 0, 'el ejemplo del docente debería traer clientas (corré npm run datos:reportes)');
  assert.ok(r.filas.every((f) => Number(f.deuda) >= 100 && Number(f.deuda) <= 500));
  const esperado = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM (
      SELECT c.clienta_id FROM cuentas_cobrar c WHERE c.tienda_id = ${tienda.id}
      GROUP BY c.clienta_id HAVING SUM(c.saldo) BETWEEN 100 AND 500) x`;
  assert.equal(r.filas.length, esperado[0].n);
  ok(`resultado del ejemplo del docente coincide con un cálculo independiente (${r.filas.length} clientas)`);
  assert.ok(!/\b100\b|\b500\b/.test(r.sql), 'los montos van como parámetros, no en el texto SQL');
  ok('los valores del usuario viajan como parámetros ($1, $2), nunca dentro del SQL');

  const ajena = await correr(randomUUID(), profe);
  assert.equal(ajena.filas.length, 0);
  for (const f of Object.values(FUENTES)) assert.ok(f.dondeBase.includes("current_setting('app.tienda_id', true)"), f.clave);
  ok('aislamiento: toda fuente filtra por la tienda de la sesión; con otra tienda no ve nada');

  assert.throws(() => validarEspecificacion({ fuente: 'clientes', columnas: [{ campo: 'password_hash' }] }), /CAMPO_NO_PERMITIDO/);
  assert.throws(() => validarEspecificacion({ fuente: 'usuarios' }), /FUENTE_DESCONOCIDA/);
  assert.throws(() => validarEspecificacion({ fuente: 'ventas', filtros: [{ campo: 'importe', op: 'contiene', valor: 'x' }] }), /OPERADOR_INVALIDO/);
  ok('se rechazan campos fuera del catálogo, fuentes inexistentes y operadores incoherentes');

  console.log('\n3. API, exportación y permisos');
  const admin = esperar(await api('POST', '/auth/login', { body: { email: 'admin@ensayar.bo', password: 'diego' } }), 201, 'login admin').accessToken;
  const cajero = esperar(await api('POST', '/auth/login', { body: { email: 'cajero@ensayar.bo', password: 'diego' } }), 201, 'login cajero').accessToken;
  const pregunta = 'Sácame una lista de los clientes que me muestre su nombre, su dirección, su email, de todos aquellos clientes que me deben de 100 a 500 bolivianos por ventas al crédito';
  const rep = esperar(await api('POST', '/reportes/inteligente', { token: admin, body: { pregunta } }), 201, 'reporte');
  assert.equal(rep.especificacion.fuente, 'clientes');
  assert.ok(rep.filas.length > 0 && rep.columnas.some((c: any) => c.clave === 'direccion'));
  assert.ok(typeof rep.totales?.deuda === 'number');
  ok(`POST /reportes/inteligente (${rep.motor}) → ${rep.filas.length} filas, total deuda Bs ${rep.totales.deuda}`);

  const xls = await api('POST', '/reportes/inteligente/exportar', { token: admin, body: { formato: 'excel', especificacion: rep.especificacion } });
  esperar(xls, 201, 'excel');
  assert.match(xls.headers.get('content-type') ?? '', /spreadsheetml/);
  assert.equal(xls.bytes.subarray(0, 2).toString(), 'PK');
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(xls.bytes as unknown as ArrayBuffer);
  const hoja = libro.getWorksheet('Reporte')!;
  let filasDatos = 0;
  hoja.eachRow((row) => {
    if (row.getCell(2).value && String(row.getCell(3).value ?? '').includes('@')) filasDatos++;
  });
  assert.equal(filasDatos, rep.filas.length);
  assert.ok(libro.getWorksheet('Cómo se generó'));
  ok(`Excel válido: ${filasDatos} filas de datos + hoja “Cómo se generó” con el SQL`);

  const pdf = await api('POST', '/reportes/inteligente/exportar', { token: admin, body: { formato: 'pdf', pregunta: 'ventas por sucursal y medio de pago de los últimos 180 días' } });
  esperar(pdf, 201, 'pdf');
  assert.equal(pdf.bytes.subarray(0, 4).toString(), '%PDF');
  const paginasPdf = (b: Buffer) => (b.toString('latin1').match(/\/Type \/Page[^s]/g) ?? []).length;
  assert.equal(paginasPdf(pdf.bytes), 1, 'un reporte corto ocupa una sola página');
  const largo = await api('POST', '/reportes/inteligente/exportar', { token: admin, body: { formato: 'pdf', pregunta: 'detalle de ventas de los últimos 180 días' } });
  esperar(largo, 201, 'pdf largo');
  const n = paginasPdf(largo.bytes);
  assert.ok(n > 1 && n <= 12, `200 filas deberían ocupar entre 2 y 12 páginas, salieron ${n}`);
  ok(`PDF válido: reporte corto en 1 página; 200 filas paginadas en ${n} páginas sin hojas en blanco`);

  const inyeccion = esperar(
    await api('POST', '/reportes/inteligente/ejecutar', { token: admin, body: { especificacion: { fuente: 'clientes', filtros: [{ campo: 'nombre', op: 'contiene', valor: "x'; DROP TABLE ventas; --" }] } } }),
    201,
    'inyección',
  );
  assert.equal(inyeccion.filas.length, 0);
  assert.ok((await db.venta.count()) > 0);
  ok('un intento de inyección SQL en un valor se trata como texto: 0 filas y la tabla sigue ahí');

  const malo = await api('POST', '/reportes/inteligente/ejecutar', { token: admin, body: { especificacion: { fuente: 'clientes', columnas: ['password_hash'] } } });
  esperar(malo, 400, 'campo prohibido');
  assert.equal(malo.body.codigo, 'CAMPO_NO_PERMITIDO');
  esperar(await api('POST', '/reportes/inteligente', { token: cajero, body: { pregunta } }), 403, 'cajero');
  ok('campo fuera del catálogo → 400; rol cajero → 403');

  console.log('\n4. Venta al crédito y abonos');
  let turno = (await api('GET', '/caja/turno-abierto', { token: admin })).body;
  const sopocachi = await db.sucursal.findFirstOrThrow({ where: { tiendaId: tienda.id }, include: { almacenes: true }, orderBy: { nombre: 'asc' } });
  if (!turno?.id) turno = esperar(await api('POST', '/caja/abrir', { token: admin, body: { sucursalId: sopocachi.id, fondoInicial: 100 } }), 201, 'abrir caja');
  const turnoDb = await db.cajaTurno.findUniqueOrThrow({ where: { id: turno.id }, include: { sucursal: { include: { almacenes: true } } } });
  const almacenId = turnoDb.sucursal.almacenes[0].id;
  const stock = await db.stockAlmacen.findFirstOrThrow({ where: { almacenId, cantidad: { gte: 3 } }, orderBy: { cantidad: 'desc' } });
  const clienta = await db.usuario.findFirstOrThrow({ where: { tiendaId: tienda.id, rol: 'CLIENTA', email: { endsWith: '@sint.ensayar.bo' } } });
  const totalAntes = Number(turnoDb.totalSistema);
  const venta = { canal: 'pos', medioPago: 'credito', almacenId, cajaTurnoId: turno.id, lineas: [{ varianteId: stock.varianteId, cantidad: 1 }] };

  const sinClienta = await api('POST', '/ventas', { token: admin, body: { ...venta, uuid: randomUUID() } });
  esperar(sinClienta, 409, 'crédito sin clienta');
  assert.equal(sinClienta.body.codigo, 'CREDITO_REQUIERE_CLIENTA');
  ok('venta al crédito sin clienta → 409 CREDITO_REQUIERE_CLIENTA');

  const v = esperar(await api('POST', '/ventas', { token: admin, body: { ...venta, uuid: randomUUID(), clientaId: clienta.id } }), 201, 'venta crédito');
  const cuenta = await db.cuentaCobrar.findUniqueOrThrow({ where: { ventaId: v.id } });
  assert.equal(Number(cuenta.saldo), Number(v.total));
  assert.equal(Number((await db.cajaTurno.findUniqueOrThrow({ where: { id: turno.id } })).totalSistema), totalAntes);
  ok(`venta al crédito Bs ${Number(v.total).toFixed(2)} → cuenta por cobrar con saldo completo; la caja no suma dinero`);

  const exceso = await api('POST', `/creditos/${cuenta.id}/abonos`, { token: admin, body: { monto: Number(v.total) + 1, medioPago: 'efectivo' } });
  esperar(exceso, 409, 'abono excesivo');
  assert.equal(exceso.body.codigo, 'ABONO_EXCEDE_SALDO');
  const clave = randomUUID();
  const abono = esperar(await api('POST', `/creditos/${cuenta.id}/abonos`, { token: admin, clave, body: { monto: 10, medioPago: 'efectivo', cajaTurnoId: turno.id } }), 201, 'abono');
  const repetido = esperar(await api('POST', `/creditos/${cuenta.id}/abonos`, { token: admin, clave, body: { monto: 10, medioPago: 'efectivo', cajaTurnoId: turno.id } }), 201, 'abono repetido');
  assert.equal(repetido.abonoId, abono.abonoId);
  assert.equal(await db.abonoCredito.count({ where: { cuentaId: cuenta.id } }), 1);
  assert.equal(Number((await db.cajaTurno.findUniqueOrThrow({ where: { id: turno.id } })).totalSistema), totalAntes + 10);
  ok('abono de Bs 10: baja el saldo y entra a caja; repetirlo con la misma Idempotency-Key no cobra dos veces');

  const resto = Number(v.total) - 10;
  const [a, b] = await Promise.all([
    api('POST', `/creditos/${cuenta.id}/abonos`, { token: admin, body: { monto: resto, medioPago: 'qr' } }),
    api('POST', `/creditos/${cuenta.id}/abonos`, { token: admin, body: { monto: resto, medioPago: 'qr' } }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  assert.equal(Number((await db.cuentaCobrar.findUniqueOrThrow({ where: { id: cuenta.id } })).saldo), 0);
  ok('dos abonos simultáneos por el saldo total: uno pasa y el otro 409; el saldo nunca queda negativo');

  const lista = esperar(await api('GET', '/creditos?estado=todos', { token: admin }), 200, 'lista créditos');
  assert.ok(lista.some((c: any) => c.id === cuenta.id && c.saldo === 0));
  ok('GET /creditos lista la cuenta saldada');

  const v2 = esperar(await api('POST', '/ventas', { token: admin, body: { ...venta, uuid: randomUUID(), clientaId: clienta.id } }), 201, 'venta crédito 2');
  const linea = v2.lineas[0];
  esperar(await api('POST', '/devoluciones', { token: admin, body: { ventaId: v2.id, lineas: [{ lineaId: linea.id, cantidad: 1 }] } }), 201, 'devolución');
  const cuenta2 = await db.cuentaCobrar.findUniqueOrThrow({ where: { ventaId: v2.id } });
  assert.equal(Number(cuenta2.saldo), 0);
  assert.equal(Number((await db.cajaTurno.findUniqueOrThrow({ where: { id: turno.id } })).totalSistema), totalAntes + 10);
  ok('devolver una venta al crédito sin abonos cancela la deuda y no saca efectivo de la caja');

  console.log('\nTodo verificado.');
}

main()
  .catch((e) => {
    console.error('\n✘', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
