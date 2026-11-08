import { execSync } from 'node:child_process';
import { PrismaClient, Rol } from '@prisma/client';
import { crearPrismaTenant } from '../src/tenancy/prisma-tenant.extension';
import { TenantContext, TIENDA_VESTA_ID } from '../src/tenancy/tenant-context';
import * as bcrypt from 'bcrypt';
import { SPIKE_UUIDS } from '../src/spike-ids';

const base = new PrismaClient();
/** Todo el seed corre dentro de la tienda Vesta: los deleteMany no tocan otras tiendas. */
const prisma = crearPrismaTenant(base);
const CLAVE = 'diego';

async function main() {
  await prisma.reporteEjecucion.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.devolucionLinea.deleteMany();
  await prisma.devolucion.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.pagoSimulado.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.lineaReserva.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.lineaVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.alertaProducto.deleteMany();
  await prisma.opinion.deleteMany();
  await prisma.favorito.deleteMany();
  await prisma.direccionCliente.deleteMany();
  await prisma.stockAlmacen.deleteMany();
  await prisma.cajaTurno.deleteMany();
  await prisma.variante.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.almacen.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.sucursal.deleteMany();
  await prisma.coleccion.deleteMany();
  await prisma.temporada.deleteMany();
  await prisma.proveedor.deleteMany();

  const passwordHash = await bcrypt.hash(CLAVE, 10);

  // Identidad global (una cuenta, varias tiendas): las cuentas viven fuera de la tienda.
  const personas = [
    { id: SPIKE_UUIDS.admin, email: 'admin@ensayar.bo', nombre: 'Admin EnsayAR' },
    { id: SPIKE_UUIDS.superadmin, email: 'superadmin@ensayar.bo', nombre: 'Superadmin EnsayAR' },
    { id: SPIKE_UUIDS.cajero, email: 'cajero@ensayar.bo', nombre: 'Cajero Central' },
    { id: SPIKE_UUIDS.encargado, email: 'encargado@ensayar.bo', nombre: 'Encargada SC' },
    { id: SPIKE_UUIDS.proveedorUser, email: 'proveedor@ensayar.bo', nombre: 'Proveedor Textiles' },
    { id: SPIKE_UUIDS.clienta, email: 'clienta@ensayar.bo', nombre: 'Ana Cliente' },
  ];
  const cuentaDe: Record<string, string> = {};
  for (const p of personas) {
    const datos = {
      nombre: p.nombre,
      passwordHash,
      emailVerificado: true,
      esPlataforma: p.email === 'superadmin@ensayar.bo',
    };
    const cuenta = await prisma.cuenta.upsert({
      where: { email: p.email },
      update: datos,
      create: { id: p.id, email: p.email, ...datos },
    });
    cuentaDe[p.email] = cuenta.id;
  }

  await prisma.tienda.upsert({
    where: { id: TIENDA_VESTA_ID },
    update: { estado: 'activa', duenoCuentaId: cuentaDe['admin@ensayar.bo'] },
    create: {
      id: TIENDA_VESTA_ID,
      slug: 'vesta',
      nombre: 'Vesta',
      duenoCuentaId: cuentaDe['admin@ensayar.bo'],
    },
  });
  const vigente = await prisma.suscripcion.findFirst({
    where: { tiendaId: TIENDA_VESTA_ID, estado: 'activa', venceEn: { gt: new Date() } },
  });
  if (!vigente) {
    const venceEn = new Date();
    venceEn.setFullYear(venceEn.getFullYear() + 1);
    await prisma.suscripcion.create({
      data: { tiendaId: TIENDA_VESTA_ID, planId: 'plan-cadena', periodo: 'ANUAL', venceEn, monto: 1238.4 },
    });
  }

  await prisma.proveedor.create({
    data: {
      id: SPIKE_UUIDS.proveedor,
      nombre: 'Textiles Andinos SRL',
      contacto: 'compras@textiles.bo',
    },
  });

  await prisma.temporada.create({
    data: { id: SPIKE_UUIDS.temporada, nombre: 'primavera-verano' },
  });
  await prisma.coleccion.create({
    data: { id: SPIKE_UUIDS.coleccion, nombre: 'básicos oficina' },
  });

  await prisma.sucursal.create({
    data: {
      id: SPIKE_UUIDS.sucursal,
      nombre: 'Santa Cruz Centro',
      ciudad: 'Santa Cruz',
      almacenes: {
        create: { id: SPIKE_UUIDS.almacen, nombre: 'Piso venta' },
      },
    },
  });
  await prisma.sucursal.create({
    data: {
      id: SPIKE_UUIDS.sucursalLp,
      nombre: 'La Paz Sopocachi',
      ciudad: 'La Paz',
      almacenes: {
        create: { id: SPIKE_UUIDS.almacenLp, nombre: 'Piso venta' },
      },
    },
  });

  await prisma.usuario.createMany({
    data: [
      {
        id: SPIKE_UUIDS.admin,
        email: 'admin@ensayar.bo',
        cuentaId: cuentaDe['admin@ensayar.bo'],
        nombre: 'Admin EnsayAR',
        rol: Rol.ADMIN,
      },
      {
        id: SPIKE_UUIDS.superadmin,
        email: 'superadmin@ensayar.bo',
        cuentaId: cuentaDe['superadmin@ensayar.bo'],
        nombre: 'Superadmin EnsayAR',
        rol: Rol.SUPERADMIN,
      },
      {
        id: SPIKE_UUIDS.cajero,
        email: 'cajero@ensayar.bo',
        cuentaId: cuentaDe['cajero@ensayar.bo'],
        nombre: 'Cajero Central',
        rol: Rol.CAJERO,
        sucursalId: SPIKE_UUIDS.sucursal,
      },
      {
        id: SPIKE_UUIDS.encargado,
        email: 'encargado@ensayar.bo',
        cuentaId: cuentaDe['encargado@ensayar.bo'],
        nombre: 'Encargada SC',
        rol: Rol.ENCARGADO,
        sucursalId: SPIKE_UUIDS.sucursal,
      },
      {
        id: SPIKE_UUIDS.proveedorUser,
        email: 'proveedor@ensayar.bo',
        cuentaId: cuentaDe['proveedor@ensayar.bo'],
        nombre: 'Proveedor Textiles',
        rol: Rol.PROVEEDOR,
        proveedorId: SPIKE_UUIDS.proveedor,
      },
      {
        id: SPIKE_UUIDS.clienta,
        email: 'clienta@ensayar.bo',
        cuentaId: cuentaDe['clienta@ensayar.bo'],
        nombre: 'Ana Cliente',
        rol: Rol.CLIENTA,
      },
    ],
  });

  await prisma.direccionCliente.create({
    data: {
      usuarioId: SPIKE_UUIDS.clienta,
      etiqueta: 'Trabajo',
      detalle: 'Av. San Martín 120',
      ciudad: 'Santa Cruz',
    },
  });

  await prisma.producto.create({
    data: {
      id: SPIKE_UUIDS.producto,
      nombre: 'Polera básica',
      descripcion: 'Algodón peinado, lavar a 30°.',
      categoria: 'tops',
      ocasion: 'casual',
      precioBase: 89.9,
      temporadaId: SPIKE_UUIDS.temporada,
      coleccionId: SPIKE_UUIDS.coleccion,
      proveedorId: SPIKE_UUIDS.proveedor,
      variantes: {
        create: {
          id: SPIKE_UUIDS.variante,
          talla: 'M',
          color: 'negro',
          sku: 'POL-NEG-M',
          urlFoto: '/foto-polera.svg',
          urlOverlay: '/overlay-polera.png',
        },
      },
    },
  });

  await prisma.stockAlmacen.createMany({
    data: [
      {
        varianteId: SPIKE_UUIDS.variante,
        almacenId: SPIKE_UUIDS.almacen,
        cantidad: 8,
        reservado: 0,
      },
      {
        varianteId: SPIKE_UUIDS.variante,
        almacenId: SPIKE_UUIDS.almacenLp,
        cantidad: 5,
        reservado: 0,
      },
    ],
  });

  await prisma.producto.create({
    data: {
      nombre: 'Falda midi',
      descripcion: 'Lino, planchar a temperatura media.',
      categoria: 'faldas',
      ocasion: 'trabajo',
      precioBase: 149.5,
      temporadaId: SPIKE_UUIDS.temporada,
      coleccionId: SPIKE_UUIDS.coleccion,
      proveedorId: SPIKE_UUIDS.proveedor,
      variantes: {
        create: {
          talla: 'M',
          color: 'beige',
          sku: 'FAL-BEI-M',
          urlFoto: '/foto-falda.svg',
          urlOverlay: '/overlay-polera.png',
          stocks: {
            create: [
              { almacenId: SPIKE_UUIDS.almacen, cantidad: 8 },
              { almacenId: SPIKE_UUIDS.almacenLp, cantidad: 3 },
            ],
          },
        },
      },
    },
  });

  await prisma.producto.create({
    data: {
      nombre: 'Blazer sastre',
      descripcion: 'Paño liviano, no lavar a máquina.',
      categoria: 'abrigos',
      ocasion: 'trabajo',
      precioBase: 289,
      descuentoPct: 10,
      temporadaId: SPIKE_UUIDS.temporada,
      coleccionId: SPIKE_UUIDS.coleccion,
      proveedorId: SPIKE_UUIDS.proveedor,
      variantes: {
        create: [
          {
            talla: 'S',
            color: 'vino',
            sku: 'BLA-VIN-S',
            urlFoto: '/foto-blazer.svg',
            urlOverlay: '/overlay-polera.png',
            stocks: {
              create: [
                { almacenId: SPIKE_UUIDS.almacen, cantidad: 4 },
                { almacenId: SPIKE_UUIDS.almacenLp, cantidad: 2 },
              ],
            },
          },
          {
            talla: 'M',
            color: 'negro',
            sku: 'BLA-NEG-M',
            urlFoto: '/foto-blazer.svg',
            urlOverlay: '/overlay-polera.png',
            stocks: {
              create: [
                { almacenId: SPIKE_UUIDS.almacen, cantidad: 5 },
                { almacenId: SPIKE_UUIDS.almacenLp, cantidad: 3 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.cajaTurno.create({
    data: {
      id: SPIKE_UUIDS.turno,
      sucursalId: SPIKE_UUIDS.sucursal,
      cajeroId: SPIKE_UUIDS.cajero,
      fondoInicial: 200,
    },
  });

  const ventaDemo = await prisma.venta.create({
    data: {
      uuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      canal: 'pos',
      estado: 'cobrada',
      medioPago: 'efectivo',
      total: 89.9,
      almacenId: SPIKE_UUIDS.almacen,
      clientaId: SPIKE_UUIDS.clienta,
      cajaTurnoId: SPIKE_UUIDS.turno,
      lineas: {
        create: {
          varianteId: SPIKE_UUIDS.variante,
          cantidad: 1,
          precioUnitario: 89.9,
        },
      },
    },
  });

  await prisma.venta.create({
    data: {
      uuid: 'ffffffff-ffff-ffff-ffff-ffffffffff01',
      canal: 'pos',
      estado: 'cobrada',
      medioPago: 'qr',
      total: 269.1,
      almacenId: SPIKE_UUIDS.almacen,
      clientaId: SPIKE_UUIDS.clienta,
      cajaTurnoId: SPIKE_UUIDS.turno,
      lineas: {
        create: {
          varianteId: SPIKE_UUIDS.variante,
          cantidad: 3,
          precioUnitario: 89.7,
        },
      },
    },
  });

  await prisma.venta.create({
    data: {
      uuid: 'ffffffff-ffff-ffff-ffff-ffffffffff02',
      canal: 'online',
      estado: 'cobrada',
      medioPago: 'tarjeta',
      total: 149.5,
      almacenId: SPIKE_UUIDS.almacenLp,
      clientaId: SPIKE_UUIDS.clienta,
      lineas: {
        create: {
          varianteId: SPIKE_UUIDS.variante,
          cantidad: 1,
          precioUnitario: 149.5,
        },
      },
    },
  });

  await prisma.venta.create({
    data: {
      uuid: 'ffffffff-ffff-ffff-ffff-ffffffffff03',
      canal: 'pos',
      estado: 'cobrada',
      medioPago: 'efectivo',
      total: 45,
      almacenId: SPIKE_UUIDS.almacenLp,
      lineas: {
        create: {
          varianteId: SPIKE_UUIDS.variante,
          cantidad: 1,
          precioUnitario: 45,
        },
      },
    },
  });

  await prisma.auditoria.create({
    data: {
      accion: 'venta_creada',
      recurso: ventaDemo.id,
      detalle: 'pos',
      usuarioId: SPIKE_UUIDS.cajero,
    },
  });

  await prisma.opinion.createMany({
    data: [
      {
        puntuacion: 5,
        comentario: 'La tela se siente premium y el talle M me quedó perfecto.',
        verificada: true,
        moderada: false,
        productoId: SPIKE_UUIDS.producto,
        usuarioId: SPIKE_UUIDS.clienta,
      },
    ],
  });

  // Segunda opinión pendiente (usuario distinto): usamos un id sintético vía update skip —
  // unique (producto, usuario) limita a una por clienta; dejamos también una publicada de ejemplo
  // creando opinión en otro producto tras el seed de catálogo demo.

  await prisma.cupon.upsert({
    where: { tiendaId_codigo: { tiendaId: TIENDA_VESTA_ID, codigo: 'VESTA10' } },
    update: { porcentaje: 10, activo: true, usoMaximo: 50 },
    create: { codigo: 'VESTA10', porcentaje: 10, usoMaximo: 50 },
  });

  execSync('npx ts-node scripts/seed-catalogo-demo.ts', { stdio: 'inherit' });

  const otroProducto = await prisma.producto.findFirst({
    where: { id: { not: SPIKE_UUIDS.producto } },
    select: { id: true },
  });
  if (otroProducto) {
    await prisma.opinion.create({
      data: {
        puntuacion: 4,
        comentario: 'Buen corte, pediría un color más claro la próxima.',
        verificada: false,
        moderada: false,
        productoId: otroProducto.id,
        usuarioId: SPIKE_UUIDS.clienta,
      },
    });
    await prisma.opinion.create({
      data: {
        puntuacion: 5,
        comentario: 'Ya la usé en oficina: cómoda todo el día.',
        verificada: true,
        moderada: true,
        productoId: SPIKE_UUIDS.producto,
        usuarioId: SPIKE_UUIDS.admin,
      },
    });
  }
}

TenantContext.enTienda(TIENDA_VESTA_ID, main)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
