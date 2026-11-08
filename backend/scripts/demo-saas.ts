/**
 * Datos demo del SaaS: tiendas de varios países hispanohablantes con historial de
 * suscripciones (altas, renovaciones y bajas) para que las métricas y la proyección
 * tengan sentido. Idempotente: borra y recrea las tiendas "demo-*".
 * Uso: npm run demo:saas
 */
import { execSync } from 'node:child_process';
import { PeriodoPlan, PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MESES, precioPeriodo, sumarMeses } from '../src/plataforma/precios';
import { crearPrismaTenant } from '../src/tenancy/prisma-tenant.extension';
import { TenantContext } from '../src/tenancy/tenant-context';
import { borrarTienda } from './lib/borrar-tienda';

const base = new PrismaClient();
const prisma = crearPrismaTenant(base);
const DIA = 86400_000;

type Demo = {
  slug: string;
  nombre: string;
  pais: string;
  moneda: string;
  ciudad: string;
  plan: 'plan-inicial' | 'plan-crecimiento' | 'plan-cadena';
  periodo: PeriodoPlan;
  haceDias: number;
  /** Días después del alta en que dejó de renovar (baja). */
  bajaTrasDias?: number;
  /** El admin de Vesta también trabaja aquí: sirve para mostrar el selector de tiendas. */
  conAdminVesta?: boolean;
  conCatalogo?: boolean;
};

const DEMOS: Demo[] = [
  { slug: 'demo-aurora', nombre: 'Aurora Boutique', pais: 'BO', moneda: 'BOB', ciudad: 'Cochabamba', plan: 'plan-inicial', periodo: 'MENSUAL', haceDias: 300, conAdminVesta: true, conCatalogo: true },
  { slug: 'demo-andes', nombre: 'Andes Moda', pais: 'PE', moneda: 'PEN', ciudad: 'Lima', plan: 'plan-crecimiento', periodo: 'ANUAL', haceDias: 240, conAdminVesta: true },
  { slug: 'demo-pacifico', nombre: 'Pacífico Store', pais: 'CL', moneda: 'CLP', ciudad: 'Santiago', plan: 'plan-crecimiento', periodo: 'TRIMESTRAL', haceDias: 210 },
  { slug: 'demo-rio', nombre: 'Río de la Plata Ropa', pais: 'AR', moneda: 'ARS', ciudad: 'Buenos Aires', plan: 'plan-cadena', periodo: 'MENSUAL', haceDias: 150 },
  { slug: 'demo-azteca', nombre: 'Azteca Fashion', pais: 'MX', moneda: 'MXN', ciudad: 'Guadalajara', plan: 'plan-inicial', periodo: 'TRIMESTRAL', haceDias: 120 },
  { slug: 'demo-caribe', nombre: 'Caribe Chic', pais: 'CO', moneda: 'COP', ciudad: 'Medellín', plan: 'plan-inicial', periodo: 'MENSUAL', haceDias: 180, bajaTrasDias: 90 },
  { slug: 'demo-sur', nombre: 'Moda Sur', pais: 'UY', moneda: 'UYU', ciudad: 'Montevideo', plan: 'plan-crecimiento', periodo: 'MENSUAL', haceDias: 75, bajaTrasDias: 62 },
  { slug: 'demo-madrid', nombre: 'Atelier Madrid', pais: 'ES', moneda: 'EUR', ciudad: 'Madrid', plan: 'plan-crecimiento', periodo: 'MENSUAL', haceDias: 35 },
  { slug: 'demo-nueva', nombre: 'Nueva Era', pais: 'EC', moneda: 'USD', ciudad: 'Quito', plan: 'plan-inicial', periodo: 'MENSUAL', haceDias: 12 },
];

async function crearDemo(d: Demo, passwordHash: string, adminVestaId: string | null) {
  const plan = await base.plan.findUniqueOrThrow({ where: { id: d.plan } });
  const email = `duena@${d.slug.replace('demo-', '')}.demo`;
  const dueno = await base.cuenta.upsert({
    where: { email },
    update: { passwordHash, emailVerificado: true },
    create: { email, nombre: `Dueña ${d.nombre}`, passwordHash, emailVerificado: true },
  });

  const alta = new Date(Date.now() - d.haceDias * DIA);
  const fin = d.bajaTrasDias ? new Date(alta.getTime() + d.bajaTrasDias * DIA) : new Date();
  const monto = precioPeriodo(Number(plan.precioMensual), d.periodo);

  const tienda = await base.tienda.create({
    data: { slug: d.slug, nombre: d.nombre, pais: d.pais, moneda: d.moneda, creadaEn: alta, duenoCuentaId: dueno.id },
  });

  // Historial: una suscripción por período hasta hoy; con baja, solo los períodos que terminan antes de ella.
  let inicio = alta;
  let n = 0;
  const sigue = (desde: Date) => (d.bajaTrasDias ? sumarMeses(desde, MESES[d.periodo]) <= fin : desde <= fin);
  while (sigue(inicio)) {
    const venceEn = sumarMeses(inicio, MESES[d.periodo]);
    const vigente = venceEn > new Date();
    await base.suscripcion.create({
      data: {
        tiendaId: tienda.id,
        planId: plan.id,
        periodo: d.periodo,
        estado: vigente ? 'activa' : 'vencida',
        inicio,
        venceEn,
        monto,
        moneda: plan.moneda,
        creadaEn: inicio,
        pagos: {
          create: {
            monto,
            moneda: plan.moneda,
            pasarela: 'simulada',
            referencia: `DEMO-${d.slug}-${++n}`,
            estado: 'aprobado',
            ultimos4: '4242',
            idempotencyKey: `demo-${d.slug}-${n}`,
            creadoEn: inicio,
          },
        },
      },
    });
    inicio = venceEn;
  }

  await TenantContext.enTienda(tienda.id, async () => {
    const sucursal = await prisma.sucursal.create({ data: { nombre: `${d.nombre} · Casa matriz`, ciudad: d.ciudad } });
    await prisma.almacen.create({ data: { nombre: 'Almacén principal', sucursalId: sucursal.id } });
    await prisma.usuario.create({
      data: { cuentaId: dueno.id, email, nombre: dueno.nombre, rol: Rol.ADMIN, sucursalId: sucursal.id },
    });
    if (d.conAdminVesta && adminVestaId) {
      await prisma.usuario.create({
        data: { cuentaId: adminVestaId, email: 'admin@ensayar.bo', nombre: 'Admin EnsayAR', rol: Rol.ADMIN },
      });
    }
    await prisma.categoria.createMany({
      data: ['Vestidos', 'Blusas', 'Pantalones', 'Faldas', 'Abrigos', 'Accesorios'].map((nombre) => ({ nombre })),
    });
  });

  if (d.conCatalogo) {
    execSync('npx ts-node scripts/seed-catalogo-demo.ts', { stdio: 'inherit', env: { ...process.env, TIENDA_ID: tienda.id } });
  }
  return { slug: d.slug, plan: plan.codigo, periodo: d.periodo, suscripciones: n, venceEn: inicio.toISOString().slice(0, 10), vigente: inicio > new Date(), email };
}

async function main() {
  const viejas = await base.tienda.findMany({ where: { slug: { startsWith: 'demo-' } }, select: { id: true } });
  for (const t of viejas) await borrarTienda(base, t.id);

  const passwordHash = await bcrypt.hash('diego', 10);
  const adminVesta = await base.cuenta.findUnique({ where: { email: 'admin@ensayar.bo' } });
  const resumen = [];
  for (const d of DEMOS) resumen.push(await crearDemo(d, passwordHash, adminVesta?.id ?? null));
  console.table(resumen);
  console.log('Cuentas de las dueñas: duena@<tienda>.demo / diego. admin@ensayar.bo entra a Vesta, Aurora y Andes.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => base.$disconnect());
