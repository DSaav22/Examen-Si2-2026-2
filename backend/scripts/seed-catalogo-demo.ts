import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type DemoProduct = {
  name: string;
  category: string;
  occasion: string;
  price: number;
  discount: number;
  color: string;
  image: string;
};

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`;

const products: DemoProduct[] = ([
  ['Blazer sastre marfil', 'blazers', 'trabajo', 629, 15, 'Marfil', 'photo-1490481651871-ab68de25d43d'], ['Blazer cruzado negro', 'blazers', 'trabajo', 699, 0, 'Negro', 'photo-1529139574466-a303027c1d8b'], ['Blazer terciopelo borgoña', 'blazers', 'fiesta', 759, 20, 'Borgoña', 'photo-1515886657613-9f3515b0c78f'], ['Abrigo oversized carbón', 'abrigos', 'temporada', 849, 15, 'Carbón', 'photo-1485968579580-b6d095142e6e'], ['Trench largo beige', 'abrigos', 'trabajo', 899, 0, 'Beige', 'photo-1445205170230-053b83016050'], ['Chaqueta biker de cuero', 'chaquetas', 'casual', 779, 10, 'Negro', 'photo-1523398002811-999ca8dec234'], ['Chaqueta denim clara', 'chaquetas', 'casual', 429, 0, 'Azul claro', 'photo-1551488831-00ddcb6c6bd3'], ['Vestido midi borgoña', 'vestidos', 'fiesta', 389, 0, 'Borgoña', 'photo-1515886657613-9f3515b0c78f'], ['Vestido satén negro', 'vestidos', 'noche', 529, 12, 'Negro', 'photo-1490481651871-ab68de25d43d'], ['Vestido camisero estampado', 'vestidos', 'casual', 359, 0, 'Multicolor', 'photo-1529139574466-a303027c1d8b'], ['Vestido punto crema', 'vestidos', 'diario', 449, 10, 'Crema', 'photo-1483985988355-763728e1935b'], ['Blusa fluida blanca', 'blusas', 'trabajo', 249, 0, 'Blanco', 'photo-1525507119028-ed4c629a60a3'], ['Blusa lazo rosa empolvado', 'blusas', 'casual', 279, 15, 'Rosa', 'photo-1483985988355-763728e1935b'], ['Camisa popelina azul', 'camisas', 'trabajo', 289, 0, 'Azul', 'photo-1551488831-00ddcb6c6bd3'], ['Camisa satinada champagne', 'camisas', 'noche', 319, 10, 'Champagne', 'photo-1445205170230-053b83016050'], ['Top asimétrico negro', 'tops', 'noche', 199, 0, 'Negro', 'photo-1515886657613-9f3515b0c78f'], ['Top tejido vino', 'tops', 'casual', 219, 8, 'Vino', 'photo-1523398002811-999ca8dec234'], ['Camiseta básica marfil', 'tops', 'diario', 129, 0, 'Marfil', 'photo-1483985988355-763728e1935b'], ['Camiseta manga larga gris', 'tops', 'diario', 159, 0, 'Gris', 'photo-1525507119028-ed4c629a60a3'], ['Falda midi plisada', 'faldas', 'trabajo', 329, 15, 'Beige', 'photo-1490481651871-ab68de25d43d'], ['Falda satinada chocolate', 'faldas', 'noche', 349, 0, 'Chocolate', 'photo-1529139574466-a303027c1d8b'], ['Falda mini sastre', 'faldas', 'casual', 279, 10, 'Negro', 'photo-1551488831-00ddcb6c6bd3'], ['Pantalón sastre crema', 'pantalones', 'trabajo', 389, 0, 'Crema', 'photo-1485968579580-b6d095142e6e'], ['Pantalón wide leg negro', 'pantalones', 'trabajo', 369, 12, 'Negro', 'photo-1445205170230-053b83016050'], ['Pantalón cargo oliva', 'pantalones', 'casual', 339, 0, 'Oliva', 'photo-1523398002811-999ca8dec234'], ['Jean recto azul medio', 'jeans', 'casual', 299, 0, 'Azul', 'photo-1551488831-00ddcb6c6bd3'], ['Jean wide leg negro', 'jeans', 'diario', 329, 10, 'Negro', 'photo-1483985988355-763728e1935b'], ['Short sastre arena', 'shorts', 'casual', 229, 0, 'Arena', 'photo-1525507119028-ed4c629a60a3'], ['Suéter cuello alto camel', 'sueteres', 'temporada', 299, 15, 'Camel', 'photo-1490481651871-ab68de25d43d'], ['Cárdigan punto borgoña', 'sueteres', 'diario', 319, 0, 'Borgoña', 'photo-1515886657613-9f3515b0c78f'], ['Cinturón cuero negro', 'accesorios', 'diario', 119, 0, 'Negro', 'photo-1566150905458-1bf539c55dd2'], ['Bolso shopper negro', 'bolsos', 'trabajo', 389, 10, 'Negro', 'photo-1566150905458-1bf539c55dd2'], ['Bolso bandolera marfil', 'bolsos', 'casual', 329, 0, 'Marfil', 'photo-1569313717948-f797bcbf00db'], ['Cartera mini borgoña', 'bolsos', 'noche', 249, 15, 'Borgoña', 'photo-1569313717948-f797bcbf00db'], ['Zapatilla urbana blanca', 'calzado', 'casual', 359, 0, 'Blanco', 'photo-1542291026-7eec264c27ff'], ['Bota tacón chocolate', 'calzado', 'noche', 529, 10, 'Chocolate', 'photo-1543163521-1bf539c55dd2'], ['Mocasín cuero negro', 'calzado', 'trabajo', 429, 0, 'Negro', 'photo-1542291026-7eec264c27ff'], ['Sandalia tiras dorada', 'calzado', 'fiesta', 319, 20, 'Dorado', 'photo-1543163521-1bf539c55dd2'], ['Pañuelo estampado seda', 'accesorios', 'diario', 99, 0, 'Multicolor', 'photo-1525507119028-ed4c629a60a3'], ['Gafas de sol carey', 'accesorios', 'casual', 179, 0, 'Carey', 'photo-1529139574466-a303027c1d8b'],
] as [string, string, string, number, number, string, string][]).map(([name, category, occasion, price, discount, color, photo]) => ({ name, category, occasion, price, discount, color, image: image(photo) }));

const stableId = (value: string) => { const hex = createHash('sha1').update(value).digest('hex'); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`; };

async function main() {
  const temporada = await prisma.temporada.upsert({ where: { nombre: 'primavera-verano' }, update: {}, create: { nombre: 'primavera-verano' } });
  const coleccion = await prisma.coleccion.upsert({ where: { nombre: 'Vesta mujer · catálogo demo' }, update: {}, create: { nombre: 'Vesta mujer · catálogo demo' } });
  const proveedor = await prisma.proveedor.upsert({ where: { id: stableId('proveedor-vesta-demo') }, update: { nombre: 'Vesta Demo Imports' }, create: { id: stableId('proveedor-vesta-demo'), nombre: 'Vesta Demo Imports', contacto: 'demo@vesta.local' } });
  const almacenes = await prisma.almacen.findMany({ take: 2, orderBy: { nombre: 'asc' } });
  if (almacenes.length === 0) throw new Error('No hay almacenes. Ejecuta primero las migraciones y el seed base.');

  for (let index = 0; index < products.length; index += 1) {
    const item = products[index]; const productoId = stableId(`producto-vesta-demo-${index + 1}`);
    const material = ['accesorios', 'bolsos', 'calzado'].includes(item.category) ? 'cuero vegano' : item.category === 'jeans' ? 'denim de algodón' : item.category === 'sueteres' ? 'punto suave' : 'mezcla de algodón y viscosa';
    const ajuste = ['blazers', 'abrigos', 'chaquetas'].includes(item.category) ? 'estructurado' : item.category === 'pantalones' ? 'wide leg' : 'regular';
    const modelo = item.category === 'accesorios' ? 'Línea Vesta accesorios' : 'Editorial Vesta temporada';
    await prisma.producto.upsert({ where: { id: productoId }, update: { nombre: item.name, descripcion: `Producto demo femenino Vesta: ${item.name}. Imagen editorial de referencia.`, categoria: item.category, ocasion: item.occasion, precioBase: item.price, descuentoPct: item.discount, material, ajuste, composicion: material, cuidados: 'Lavar según etiqueta; conservar en lugar seco.', origen: 'Bolivia', modelo, popularidad: products.length - index, temporadaId: temporada.id, coleccionId: coleccion.id, proveedorId: proveedor.id }, create: { id: productoId, nombre: item.name, descripcion: `Producto demo femenino Vesta: ${item.name}. Imagen editorial de referencia.`, categoria: item.category, ocasion: item.occasion, precioBase: item.price, descuentoPct: item.discount, material, ajuste, composicion: material, cuidados: 'Lavar según etiqueta; conservar en lugar seco.', origen: 'Bolivia', modelo, popularidad: products.length - index, temporadaId: temporada.id, coleccionId: coleccion.id, proveedorId: proveedor.id } });
    for (const size of ['S', 'M']) {
      const sku = `VESTA-DEMO-${String(index + 1).padStart(3, '0')}-${size}`;
      const variante = await prisma.variante.upsert({ where: { sku }, update: { productoId, talla: size, color: item.color, urlFoto: item.image, urlOverlay: '' }, create: { productoId, talla: size, color: item.color, sku, urlFoto: item.image, urlOverlay: '' } });
      for (const almacen of almacenes) await prisma.stockAlmacen.upsert({ where: { varianteId_almacenId: { varianteId: variante.id, almacenId: almacen.id } }, update: { cantidad: 6 + ((index + almacen.id.length) % 8), reservado: 0 }, create: { varianteId: variante.id, almacenId: almacen.id, cantidad: 6 + ((index + almacen.id.length) % 8), reservado: 0 } });
    }
  }
  await prisma.producto.update({
    where: { id: stableId('producto-vesta-demo-1') },
    data: { precioMayorista: 480, minimoMayorista: 3 },
  });
  await prisma.variante.updateMany({
    where: { sku: { startsWith: 'VESTA-DEMO-001-' } },
    data: { urlModelo: 'vesta-volumen' },
  });
  await prisma.cupon.upsert({
    where: { codigo: 'VESTA10' },
    update: { porcentaje: 10, activo: true, usoMaximo: 50 },
    create: { codigo: 'VESTA10', porcentaje: 10, usoMaximo: 50 },
  });
  console.log(`Catálogo demo cargado: ${products.length} productos femeninos, ${products.length * 2} variantes.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
