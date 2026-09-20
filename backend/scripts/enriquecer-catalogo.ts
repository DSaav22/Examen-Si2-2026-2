import { PrismaClient } from '@prisma/client';
import { SPIKE_UUIDS } from '../src/spike-ids';

const prisma = new PrismaClient();

async function main() {
  await prisma.variante.updateMany({
    where: { sku: 'POL-NEG-M', urlFoto: '' },
    data: { urlFoto: '/foto-polera.svg' },
  });
  await prisma.variante.updateMany({
    where: { sku: 'FAL-BEI-M' },
    data: { urlFoto: '/foto-falda.svg' },
  });

  const existe = await prisma.producto.findFirst({
    where: { nombre: 'Blazer sastre' },
  });
  if (existe) return;

  await prisma.producto.create({
    data: {
      nombre: 'Blazer sastre',
      descripcion: 'Paño liviano, no lavar a máquina.',
      categoria: 'abrigos',
      ocasion: 'trabajo',
      precioBase: 289,
      variantes: {
        create: [
          {
            talla: 'S',
            color: 'vino',
            sku: 'BLA-VIN-S',
            urlFoto: '/foto-blazer.svg',
            urlOverlay: '/overlay-polera.png',
            stocks: {
              create: { almacenId: SPIKE_UUIDS.almacen, cantidad: 4 },
            },
          },
          {
            talla: 'M',
            color: 'negro',
            sku: 'BLA-NEG-M',
            urlFoto: '/foto-blazer.svg',
            urlOverlay: '/overlay-polera.png',
            stocks: {
              create: { almacenId: SPIKE_UUIDS.almacen, cantidad: 5 },
            },
          },
        ],
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
