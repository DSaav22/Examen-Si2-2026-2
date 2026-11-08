/**
 * Datos sintéticos para reportes y analítica (puntos 3 y 4 del segundo parcial).
 * Uso: npm run datos:reportes   (TIENDA=vesta por defecto; DIAS=180; VENTAS=320)
 *
 * Crea clientas con dirección, ventas de los últimos meses en las sucursales de la tienda,
 * turnos de caja cerrados, ventas al crédito y abonos parciales. Es reproducible (semilla fija)
 * y se puede volver a correr: primero borra lo que generó antes (tickets "sint-…" y correos
 * "@sint.ensayar.bo"). No modifica el stock real.
 */
import { MedioPago, Prisma, PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const SLUG = process.env.TIENDA ?? 'vesta';
const DIAS = Number(process.env.DIAS ?? 180);
const VENTAS = Number(process.env.VENTAS ?? 320);
const DOMINIO = 'sint.ensayar.bo';
const HORA_UTC = 4; // Bolivia = UTC-4

let semilla = 20261108;
function azar() {
  semilla |= 0;
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entero = (a: number, b: number) => a + Math.floor(azar() * (b - a + 1));
const elegir = <T>(xs: T[]) => xs[Math.floor(azar() * xs.length)];
function ponderado<T>(opciones: [T, number][]): T {
  const total = opciones.reduce((a, [, p]) => a + p, 0);
  let r = azar() * total;
  for (const [v, p] of opciones) if ((r -= p) <= 0) return v;
  return opciones[opciones.length - 1][0];
}
const redondear = (n: number) => Math.round(n * 100) / 100;

const NOMBRES = ['María', 'Ana', 'Lucía', 'Carla', 'Valeria', 'Daniela', 'Gabriela', 'Paola', 'Fernanda', 'Camila', 'Andrea', 'Natalia', 'Sofía', 'Mariana', 'Rocío', 'Jimena', 'Patricia', 'Verónica', 'Claudia', 'Lorena', 'Silvia', 'Karen', 'Melany', 'Adriana', 'Brenda', 'Cecilia', 'Diana', 'Elena', 'Fabiola', 'Giovanna', 'Ximena', 'Wendy'];
const APELLIDOS = ['Quispe', 'Mamani', 'Flores', 'Rojas', 'Vargas', 'Gutiérrez', 'Choque', 'Fernández', 'Rodríguez', 'Mendoza', 'Suárez', 'Justiniano', 'Áñez', 'Rivero', 'Salazar', 'Torrico', 'Arce', 'Paz', 'Soliz', 'Villarroel'];
const ZONAS: Record<string, string[]> = {
  'La Paz': ['Sopocachi', 'Miraflores', 'San Miguel', 'Calacoto', 'Obrajes', 'Achumani', 'Villa Fátima', 'San Pedro'],
  'Santa Cruz': ['Equipetrol', 'Urbarí', 'Las Palmas', 'Plan 3000', 'Sirari', 'Barrio Hamacas', 'Villa 1ro de Mayo'],
  Cochabamba: ['Queru Queru', 'Cala Cala', 'Recoleta', 'Sarco'],
};
const CALLES = ['Av. 6 de Agosto', 'Calle 21', 'Av. Arce', 'Calle Jaimes Freyre', 'Av. Banzer', 'Calle Libertad', 'Av. San Martín', 'Calle Sucre', 'Av. Busch', 'Calle Murillo', 'Av. América', 'Calle Potosí'];

function sinTildes(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Fecha UTC de un instante local (Bolivia) `dias` atrás a la hora indicada. */
function instante(diasAtras: number, hora: number, minuto: number) {
  const hoy = new Date();
  const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()) - diasAtras * 86_400_000;
  return new Date(base + (hora + HORA_UTC) * 3_600_000 + minuto * 60_000);
}

async function limpiar(tiendaId: string) {
  const ventas = await db.venta.findMany({ where: { tiendaId, uuid: { startsWith: 'sint-' } }, select: { id: true, cajaTurnoId: true } });
  const ids = ventas.map((v) => v.id);
  const turnos = [...new Set(ventas.map((v) => v.cajaTurnoId).filter((x): x is string => !!x))];
  const cuentas = await db.cuentaCobrar.findMany({ where: { ventaId: { in: ids } }, select: { id: true } });
  await db.abonoCredito.deleteMany({ where: { cuentaId: { in: cuentas.map((c) => c.id) } } });
  await db.cuentaCobrar.deleteMany({ where: { ventaId: { in: ids } } });
  await db.pagoSimulado.deleteMany({ where: { ventaId: { in: ids } } });
  await db.movimientoInventario.deleteMany({ where: { ventaId: { in: ids } } });
  await db.lineaVenta.deleteMany({ where: { ventaId: { in: ids } } });
  await db.venta.deleteMany({ where: { id: { in: ids } } });
  if (turnos.length) {
    await db.cajaTurno.deleteMany({ where: { id: { in: turnos }, ventas: { none: {} } } });
  }
  const clientas = await db.usuario.findMany({ where: { tiendaId, email: { endsWith: `@${DOMINIO}` } }, select: { id: true, cuentaId: true } });
  const uids = clientas.map((c) => c.id);
  await db.cuentaCobrar.deleteMany({ where: { clientaId: { in: uids } } });
  await db.direccionCliente.deleteMany({ where: { usuarioId: { in: uids } } });
  await db.notificacion.deleteMany({ where: { usuarioId: { in: uids } } });
  await db.usuario.deleteMany({ where: { id: { in: uids } } });
  await db.cuenta.deleteMany({ where: { id: { in: clientas.map((c) => c.cuentaId) }, usuarios: { none: {} } } });
  return { ventas: ids.length, clientas: uids.length };
}

async function main() {
  const tienda = await db.tienda.findFirst({ where: { slug: SLUG } });
  if (!tienda) throw new Error(`No existe la tienda "${SLUG}"`);
  const tiendaId = tienda.id;
  const borradas = await limpiar(tiendaId);
  console.log(`Limpieza previa: ${borradas.ventas} ventas y ${borradas.clientas} clientas sintéticas.`);
  if (process.env.SOLO_LIMPIAR) return;

  const sucursales = await db.sucursal.findMany({ where: { tiendaId }, include: { almacenes: true } });
  const conAlmacen = sucursales.filter((s) => s.almacenes.length);
  if (!conAlmacen.length) throw new Error('La tienda no tiene almacenes.');
  const personal = await db.usuario.findMany({ where: { tiendaId, rol: { in: ['CAJERO', 'ENCARGADO', 'ADMIN'] }, activo: true } });
  const admin = personal.find((p) => p.rol === 'ADMIN') ?? personal[0];
  const cajeroDe = (sucursalId: string) => personal.find((p) => p.rol === 'CAJERO' && p.sucursalId === sucursalId) ?? personal.find((p) => p.sucursalId === sucursalId) ?? admin;

  const variantes = await db.variante.findMany({ where: { tiendaId }, include: { producto: true } });
  if (!variantes.length) throw new Error('La tienda no tiene productos.');
  // Popularidad desigual: unos pocos productos explican buena parte de las ventas.
  const pesoVariante = new Map(variantes.map((v, i) => [v.id, 1 + (v.producto.popularidad || 0) / 10 + (i % 7 === 0 ? 6 : i % 3 === 0 ? 2 : 0)]));

  // Clientas
  const ciudades = Object.keys(ZONAS);
  const clientas: { id: string; peso: number; mayorista: boolean }[] = [];
  const usados = new Set<string>();
  for (let i = 0; i < 34; i++) {
    let nombre = '';
    let email = '';
    do {
      nombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)}`;
      email = `${sinTildes(nombre).replace(/\s+/g, '.')}@${DOMINIO}`;
    } while (usados.has(email));
    usados.add(email);
    const ciudad = ponderado<string>([['La Paz', 5], ['Santa Cruz', 4], ['Cochabamba', 1]]);
    const mayorista = azar() < 0.12;
    const cuenta = await db.cuenta.create({
      data: { email, nombre, passwordHash: '!sintetico-sin-acceso', emailVerificado: true, creadaEn: instante(entero(DIAS, DIAS + 400), 10, 0) },
    });
    const usuario = await db.usuario.create({ data: { tiendaId, cuentaId: cuenta.id, email, nombre, rol: 'CLIENTA', mayorista } });
    if (azar() < 0.92) {
      await db.direccionCliente.create({
        data: { tiendaId, usuarioId: usuario.id, etiqueta: 'Casa', ciudad, detalle: `${elegir(CALLES)} #${entero(100, 2999)}, zona ${elegir(ZONAS[ciudad])}` },
      });
    }
    // Pareto: pocas clientas compran mucho.
    clientas.push({ id: usuario.id, peso: i < 6 ? 8 : i < 15 ? 3 : 1, mayorista });
  }
  console.log(`Clientas creadas: ${clientas.length}`);

  const turnos = new Map<string, { id: string; total: number }>();
  async function turnoDe(sucursalId: string, dia: number) {
    const clave = `${sucursalId}:${dia}`;
    const existente = turnos.get(clave);
    if (existente) return existente;
    const turno = await db.cajaTurno.create({
      data: {
        tiendaId,
        sucursalId,
        cajeroId: cajeroDe(sucursalId).id,
        fondoInicial: 200,
        abiertoEn: instante(dia, 9, 0),
        cerradoEn: instante(dia, 20, 30),
        totalSistema: 0,
        totalDeclarado: 0,
      },
    });
    const t = { id: turno.id, total: 0 };
    turnos.set(clave, t);
    return t;
  }

  let creditos = 0;
  let abonos = 0;
  const pesosSucursal: [typeof conAlmacen[number], number][] = conAlmacen.map((s, i) => [s, i === 0 ? 1.25 : 1]);
  for (let n = 0; n < VENTAS; n++) {
    // Más ventas en fechas recientes y fines de semana.
    let dia = Math.floor(Math.pow(azar(), 1.3) * DIAS);
    const dow = new Date(instante(dia, 12, 0).getTime() - HORA_UTC * 3_600_000).getUTCDay();
    if ((dow === 0 || dow === 6) === false && azar() < 0.25) dia = Math.max(0, dia - ((dow + 1) % 7));
    const hora = ponderado<number>([[9, 1], [10, 2], [11, 3], [12, 4], [13, 4], [14, 2], [15, 2], [16, 3], [17, 4], [18, 5], [19, 4], [20, 1]]);
    const creadaEn = instante(dia, hora, entero(0, 59));
    if (creadaEn.getTime() > Date.now()) continue;

    const sucursal = ponderado(pesosSucursal);
    const almacen = sucursal.almacenes[0];
    const online = azar() < 0.18;
    const clienta = online || azar() < 0.72 ? ponderado(clientas.map((c): [typeof c, number] => [c, c.peso])) : null;
    let medio: MedioPago = online
      ? ponderado<MedioPago>([['qr', 5], ['tarjeta', 3], ['contra_entrega', 2]])
      : ponderado<MedioPago>([['efectivo', 45], ['qr', 25], ['tarjeta', 9], ['transferencia', 5], ['credito', 16]]);
    if (medio === 'credito' && !clienta) medio = 'efectivo';

    const lineas = Array.from({ length: ponderado<number>([[1, 6], [2, 3], [3, 1]]) }, () => {
      const v = ponderado(variantes.map((x): [typeof x, number] => [x, pesoVariante.get(x.id)!]));
      const precio = Number(v.producto.precioBase) * (1 - Number(v.producto.descuentoPct) / 100);
      const mayorista = clienta?.mayorista && v.producto.precioMayorista ? Number(v.producto.precioMayorista) : null;
      return { varianteId: v.id, cantidad: clienta?.mayorista ? entero(2, 6) : ponderado<number>([[1, 8], [2, 2]]), precioUnitario: redondear(mayorista ?? precio) };
    });
    const unicas = [...new Map(lineas.map((l) => [l.varianteId, l])).values()];
    const total = redondear(unicas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0));
    const turno = online ? null : await turnoDe(sucursal.id, dia);

    const venta = await db.venta.create({
      data: {
        tiendaId,
        uuid: `sint-${String(n).padStart(4, '0')}-${creadaEn.getTime().toString(36)}`,
        canal: online ? 'online' : 'pos',
        estado: 'cobrada',
        medioPago: medio,
        total,
        creadaEn,
        almacenId: almacen.id,
        cajaTurnoId: turno?.id,
        clientaId: clienta?.id,
        lineas: { create: unicas.map((l) => ({ ...l, tiendaId })) },
      },
    });
    if (medio === 'qr' || medio === 'tarjeta') {
      await db.pagoSimulado.create({ data: { tiendaId, ventaId: venta.id, estado: 'aprobado', referencia: `SINT-${medio}-${venta.id.slice(0, 8)}`, actualizado: creadaEn } });
    }
    if (turno && medio !== 'credito') turno.total += total;

    if (medio === 'credito') {
      creditos++;
      const vence = new Date(creadaEn.getTime() + 30 * 86_400_000);
      // Cuanto más vieja la deuda, más probable que esté pagada; algunas quedan en mora.
      const edad = (Date.now() - creadaEn.getTime()) / 86_400_000;
      const fraccion = edad > 60 ? ponderado<number>([[1, 6], [0.5, 2], [0, 2]]) : edad > 30 ? ponderado<number>([[1, 3], [0.6, 3], [0.3, 2], [0, 2]]) : ponderado<number>([[0, 5], [0.3, 3], [0.5, 2]]);
      const pagado = redondear(total * fraccion);
      const pagos: number[] = [];
      if (pagado > 0) {
        const cuotas = Math.min(3, Math.max(1, Math.round(fraccion * 3)));
        let resto = pagado;
        for (let k = 0; k < cuotas; k++) {
          const m = k === cuotas - 1 ? resto : redondear(pagado / cuotas);
          pagos.push(m);
          resto = redondear(resto - m);
        }
      }
      const cuenta = await db.cuentaCobrar.create({
        data: { tiendaId, ventaId: venta.id, clientaId: clienta!.id, monto: total, saldo: redondear(total - pagado), venceEn: vence, creadaEn },
      });
      for (const [k, m] of pagos.entries()) {
        if (m <= 0) continue;
        const cuando = new Date(creadaEn.getTime() + ((k + 1) * Math.min(edad, 45) * 86_400_000) / (pagos.length + 1));
        await db.abonoCredito.create({
          data: { tiendaId, cuentaId: cuenta.id, monto: m, medioPago: elegir<MedioPago>(['efectivo', 'qr', 'transferencia']), usuarioId: admin?.id, creadoEn: cuando },
        });
        abonos++;
      }
    }
  }

  for (const t of turnos.values()) {
    const total = new Prisma.Decimal(redondear(t.total));
    await db.cajaTurno.update({ where: { id: t.id }, data: { totalSistema: total, totalDeclarado: total } });
  }

  const resumen = await db.venta.aggregate({ where: { tiendaId, uuid: { startsWith: 'sint-' } }, _count: true, _sum: { total: true } });
  const deuda = await db.cuentaCobrar.aggregate({ where: { tiendaId, venta: { uuid: { startsWith: 'sint-' } } }, _sum: { saldo: true } });
  console.log(`Ventas sintéticas: ${resumen._count} por Bs ${Number(resumen._sum.total ?? 0).toFixed(2)} en ${DIAS} días`);
  console.log(`Turnos cerrados: ${turnos.size} · créditos: ${creditos} · abonos: ${abonos} · deuda pendiente: Bs ${Number(deuda._sum.saldo ?? 0).toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
