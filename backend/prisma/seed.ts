import { PrismaClient, Rol } from '@prisma/client';
import { SPIKE_UUIDS } from '../src/spike-ids';

const prisma = new PrismaClient();

async function main() {
  await prisma.lineaVenta.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.stockAlmacen.deleteMany();
  await prisma.cajaTurno.deleteMany();
  await prisma.variante.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.almacen.deleteMany();
  await prisma.sucursal.deleteMany();
  await prisma.usuario.deleteMany();

  await prisma.usuario.create({
    data: {
      id: SPIKE_UUIDS.cajero,
      email: 'cajero@ensayar.bo',
      rol: Rol.CAJERO,
    },
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

  await prisma.producto.create({
    data: {
      id: SPIKE_UUIDS.producto,
      nombre: 'Polera básica',
      categoria: 'tops',
      ocasion: 'casual',
      precioBase: 89.9,
      variantes: {
        create: {
          id: SPIKE_UUIDS.variante,
          talla: 'M',
          color: 'negro',
          sku: 'POL-NEG-M',
        },
      },
    },
  });

  await prisma.stockAlmacen.create({
    data: {
      varianteId: SPIKE_UUIDS.variante,
      almacenId: SPIKE_UUIDS.almacen,
      cantidad: 1,
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
