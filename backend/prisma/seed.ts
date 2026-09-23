import { execSync } from 'node:child_process';
import { PrismaClient, Rol } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SPIKE_UUIDS } from '../src/spike-ids';

const prisma = new PrismaClient();
const CLAVE = 'diego';

async function main() {
  await prisma.reporteEjecucion.deleteMany();
  await prisma.pagoSimulado.deleteMany();
  await prisma.movimientoInventario.deleteMany();
  await prisma.lineaReserva.deleteMany();
  await prisma.reserva.deleteMany();
  await prisma.lineaVenta.deleteMany();
  await prisma.venta.deleteMany();
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
        nombre: 'Admin EnsayAR',
        rol: Rol.ADMIN,
        passwordHash,
      },
      {
        id: SPIKE_UUIDS.cajero,
        email: 'cajero@ensayar.bo',
        nombre: 'Cajero Central',
        rol: Rol.CAJERO,
        passwordHash,
        sucursalId: SPIKE_UUIDS.sucursal,
      },
      {
        id: SPIKE_UUIDS.encargado,
        email: 'encargado@ensayar.bo',
        nombre: 'Encargada SC',
        rol: Rol.ENCARGADO,
        passwordHash,
        sucursalId: SPIKE_UUIDS.sucursal,
      },
      {
        id: SPIKE_UUIDS.proveedorUser,
        email: 'proveedor@ensayar.bo',
        nombre: 'Proveedor Textiles',
        rol: Rol.PROVEEDOR,
        passwordHash,
        proveedorId: SPIKE_UUIDS.proveedor,
      },
      {
        id: SPIKE_UUIDS.clienta,
        email: 'clienta@ensayar.bo',
        nombre: 'Ana Cliente',
        rol: Rol.CLIENTA,
        passwordHash,
      },
    ],
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

  await prisma.cupon.upsert({
    where: { codigo: 'VESTA10' },
    update: { porcentaje: 10, activo: true, usoMaximo: 50 },
    create: { codigo: 'VESTA10', porcentaje: 10, usoMaximo: 50 },
  });

  execSync('npx ts-node scripts/seed-catalogo-demo.ts', { stdio: 'inherit' });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
