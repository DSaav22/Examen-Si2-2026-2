import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { PrismaClient, Rol } from '@prisma/client';

const prisma = new PrismaClient();
const repositoryRoot = resolve(__dirname, '../..');
const sourceDir = join(repositoryRoot, 'Fotos para catalogo de ropa');
const frontendAssetsDir = join(repositoryRoot, 'frontend', 'public', 'catalogo', 'ropa');
const backendAssetsDir = join(repositoryRoot, 'backend', 'public', 'catalogo', 'ropa');

type ProductProfile = {
  name: string;
  category: string;
  occasion: string;
  price: number;
  discount: number;
  color: string;
  material: string;
  fit: string;
};

const profiles: ProductProfile[] = ([
  ['Pantalon palazzo borgona', 'pantalones', 'fiesta', 369, 10, 'Borgona', 'viscosa y elastano', 'wide leg'],
  ['Cardigan tejido camel', 'sueteres', 'diario', 289, 0, 'Camel', 'punto suave', 'regular'],
  ['Cardigan corto negro', 'sueteres', 'diario', 279, 0, 'Negro', 'punto de algodon', 'corto'],
  ['Cardigan rayas marino y rojo', 'sueteres', 'casual', 319, 15, 'Multicolor', 'punto de algodon', 'regular'],
  ['Cardigan lila de punto', 'sueteres', 'diario', 299, 10, 'Lila', 'punto suave', 'regular'],
  ['Cardigan crema botonado', 'sueteres', 'diario', 299, 0, 'Crema', 'punto suave', 'regular'],
  ['Pantalon palazzo animal print', 'pantalones', 'casual', 389, 15, 'Animal print', 'viscosa', 'wide leg'],
  ['Sueter rosa cuello redondo', 'sueteres', 'diario', 269, 0, 'Rosa palo', 'punto suave', 'relajado'],
  ['Sueter rayas blanco y negro', 'sueteres', 'casual', 299, 10, 'Blanco y negro', 'algodon tejido', 'regular'],
  ['Sudadera oversized negra', 'sudaderas', 'casual', 329, 0, 'Negro', 'algodon afelpado', 'oversized'],
  ['Sueter tejido amarillo', 'sueteres', 'diario', 289, 10, 'Amarillo', 'punto suave', 'regular'],
  ['Falda mini cuadros beige', 'faldas', 'casual', 319, 15, 'Beige y negro', 'poliester tejido', 'entallado'],
  ['Falda mini cuadros beige II', 'faldas', 'casual', 319, 15, 'Beige y negro', 'poliester tejido', 'entallado'],
  ['Pantalon fluido rosa', 'pantalones', 'casual', 379, 10, 'Rosa', 'viscosa', 'wide leg'],
  ['Top boatneck marfil', 'tops', 'trabajo', 239, 0, 'Marfil', 'algodon y elastano', 'regular'],
  ['Top tejido amarillo claro', 'tops', 'diario', 229, 0, 'Amarillo claro', 'punto suave', 'regular'],
  ['Top tejido gris carbon', 'tops', 'diario', 229, 10, 'Gris carbon', 'punto suave', 'regular'],
  ['Pantalon sastre azul noche', 'pantalones', 'trabajo', 429, 0, 'Azul noche', 'sastreria', 'recto'],
  ['Short tejido marfil', 'shorts', 'casual', 249, 0, 'Marfil', 'punto suave', 'relajado'],
  ['Falda wrap cuadros azul', 'faldas', 'casual', 329, 10, 'Azul marino', 'mezcla de lana', 'wrap'],
  ['Pantalon sastre gris', 'pantalones', 'trabajo', 419, 15, 'Gris', 'sastreria', 'recto'],
  ['Sueter rayas marfil y negro', 'sueteres', 'casual', 299, 0, 'Marfil y negro', 'algodon tejido', 'regular'],
  ['Sueter cuello redondo azul', 'sueteres', 'diario', 289, 10, 'Azul marino', 'punto suave', 'regular'],
  ['Bota alta ante chocolate', 'calzado', 'temporada', 599, 10, 'Chocolate', 'cuero vegano', 'regular'],
  ['Bota alta ante chocolate II', 'calzado', 'temporada', 599, 10, 'Chocolate', 'cuero vegano', 'regular'],
  ['Cardigan rayas rosa y vino', 'sueteres', 'casual', 319, 15, 'Rosa y vino', 'punto de algodon', 'regular'],
  ['Sudadera borgona', 'sudaderas', 'casual', 329, 10, 'Borgona', 'algodon afelpado', 'regular'],
  ['Sueter rosa oversize', 'sueteres', 'diario', 299, 0, 'Rosa palo', 'punto suave', 'oversized'],
  ['Cardigan chocolate botonado', 'sueteres', 'diario', 309, 0, 'Chocolate', 'punto suave', 'regular'],
  ['Pantalon jogger rosa empolvado', 'pantalones', 'casual', 349, 10, 'Rosa empolvado', 'algodon y viscosa', 'relajado'],
  ['Camiseta tejida marfil', 'tops', 'diario', 219, 0, 'Marfil', 'punto de algodon', 'regular'],
  ['Sueter azul marino clasico', 'sueteres', 'diario', 289, 0, 'Azul marino', 'punto suave', 'regular'],
  ['Bota alta ante chocolate III', 'calzado', 'temporada', 599, 10, 'Chocolate', 'cuero vegano', 'regular'],
  ['Bota alta ante chocolate IV', 'calzado', 'temporada', 599, 10, 'Chocolate', 'cuero vegano', 'regular'],
  ['Cardigan rayado rosa vino II', 'sueteres', 'casual', 319, 15, 'Rosa y vino', 'punto de algodon', 'regular'],
  ['Sudadera borgona II', 'sudaderas', 'casual', 329, 10, 'Borgona', 'algodon afelpado', 'regular'],
  ['Sueter rosa oversize II', 'sueteres', 'diario', 299, 0, 'Rosa palo', 'punto suave', 'oversized'],
  ['Cardigan chocolate botonado II', 'sueteres', 'diario', 309, 0, 'Chocolate', 'punto suave', 'regular'],
  ['Pantalon jogger rosa empolvado II', 'pantalones', 'casual', 349, 10, 'Rosa empolvado', 'algodon y viscosa', 'relajado'],
  ['Blusa marfil de punto', 'blusas', 'trabajo', 249, 0, 'Marfil', 'punto de algodon', 'regular'],
  ['Sueter azul marino clasico II', 'sueteres', 'diario', 289, 0, 'Azul marino', 'punto suave', 'regular'],
  ['Bota alta ante chocolate V', 'calzado', 'temporada', 599, 10, 'Chocolate', 'cuero vegano', 'regular'],
  ['Cardigan rayado rosa vino III', 'sueteres', 'casual', 319, 15, 'Rosa y vino', 'punto de algodon', 'regular'],
  ['Sudadera borgona III', 'sudaderas', 'casual', 329, 10, 'Borgona', 'algodon afelpado', 'regular'],
] as [string, string, string, number, number, string, string, string][]).map(([name, category, occasion, price, discount, color, material, fit]) => ({ name, category, occasion, price, discount, color, material, fit }));

const stableId = (value: string) => {
  const hex = createHash('sha1').update(value).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

async function main() {
  const photos = readdirSync(sourceDir).filter((file) => file.toLowerCase().endsWith('.jpg')).sort();
  if (photos.length !== profiles.length) {
    throw new Error(`Se esperaban ${profiles.length} fotos y se encontraron ${photos.length}.`);
  }

  mkdirSync(frontendAssetsDir, { recursive: true });
  mkdirSync(backendAssetsDir, { recursive: true });
  photos.forEach((photo, index) => {
    const publicName = `producto-${String(index + 1).padStart(3, '0')}.jpg`;
    copyFileSync(join(sourceDir, photo), join(frontendAssetsDir, publicName));
    copyFileSync(join(sourceDir, photo), join(backendAssetsDir, publicName));
  });

  const warehouses = await prisma.almacen.findMany({ orderBy: { nombre: 'asc' } });
  if (warehouses.length === 0) throw new Error('No hay almacenes disponibles para asignar stock.');
  const currentProducts = await prisma.producto.findMany({ select: { id: true } });
  const productIds = currentProducts.map(({ id }) => id);
  const variantRows = await prisma.variante.findMany({ where: { productoId: { in: productIds } }, select: { id: true } });
  const variantIds = variantRows.map(({ id }) => id);
  const saleLines = await prisma.lineaVenta.findMany({ where: { varianteId: { in: variantIds } }, select: { ventaId: true } });
  const saleIds = [...new Set(saleLines.map(({ ventaId }) => ventaId))];
  const admin = await prisma.usuario.findFirst({ where: { rol: { in: [Rol.ADMIN, Rol.SUPERADMIN] } }, select: { id: true } });

  await prisma.$transaction(async (tx) => {
    if (variantIds.length > 0) {
      await tx.pagoSimulado.deleteMany({ where: { ventaId: { in: saleIds } } });
      await tx.lineaVenta.deleteMany({ where: { varianteId: { in: variantIds } } });
      await tx.movimientoInventario.deleteMany({ where: { varianteId: { in: variantIds } } });
      if (saleIds.length > 0) await tx.venta.deleteMany({ where: { id: { in: saleIds } } });
      await tx.lineaReserva.deleteMany({ where: { varianteId: { in: variantIds } } });
      await tx.stockAlmacen.deleteMany({ where: { varianteId: { in: variantIds } } });
      await tx.variante.deleteMany({ where: { id: { in: variantIds } } });
    }
    if (productIds.length > 0) {
      await tx.alertaProducto.deleteMany({ where: { productoId: { in: productIds } } });
      await tx.opinion.deleteMany({ where: { productoId: { in: productIds } } });
      await tx.favorito.deleteMany({ where: { productoId: { in: productIds } } });
      await tx.productoCategoria.deleteMany({ where: { productoId: { in: productIds } } });
      await tx.producto.deleteMany({ where: { id: { in: productIds } } });
    }

    const temporada = await tx.temporada.upsert({ where: { nombre: 'catalogo-fotos-2026' }, update: {}, create: { nombre: 'catalogo-fotos-2026' } });
    const coleccion = await tx.coleccion.upsert({ where: { nombre: 'Vesta · Fotos para catalogo' }, update: {}, create: { nombre: 'Vesta · Fotos para catalogo' } });
    const proveedor = await tx.proveedor.upsert({ where: { id: stableId('proveedor-fotos-catalogo') }, update: { nombre: 'Catalogo cargado por administracion' }, create: { id: stableId('proveedor-fotos-catalogo'), nombre: 'Catalogo cargado por administracion', contacto: 'admin@vesta.local' } });

    for (let index = 0; index < profiles.length; index += 1) {
      const item = profiles[index];
      const productId = stableId(`producto-foto-catalogo-${index + 1}`);
      const imageUrl = `/catalogo/ropa/producto-${String(index + 1).padStart(3, '0')}.jpg`;
      const product = await tx.producto.create({ data: {
        id: productId, nombre: item.name, descripcion: `${item.name}, prenda femenina seleccionada del catalogo fotografico. Ideal para ${item.occasion}.`, categoria: item.category, ocasion: item.occasion,
        precioBase: item.price, descuentoPct: item.discount, temporadaId: temporada.id, coleccionId: coleccion.id, proveedorId: proveedor.id,
        material: item.material, ajuste: item.fit, composicion: item.material, cuidados: 'Lavar segun etiqueta y conservar en lugar seco.', origen: 'Catalogo fotografico local', modelo: 'Vesta seleccion editorial', popularidad: profiles.length - index,
      } });
      for (const size of ['S', 'M', 'L']) {
        const variant = await tx.variante.create({ data: { productoId: product.id, talla: size, color: item.color, sku: `VESTA-FOTO-${String(index + 1).padStart(3, '0')}-${size}`, urlFoto: imageUrl, urlOverlay: '' } });
        for (const warehouse of warehouses) await tx.stockAlmacen.create({ data: { varianteId: variant.id, almacenId: warehouse.id, cantidad: 8, reservado: 0 } });
      }
    }
    if (admin) await tx.auditoria.create({ data: { accion: 'catalogo_reemplazado', recurso: 'productos', detalle: `Se eliminaron ${productIds.length} productos anteriores y se cargaron ${profiles.length} productos desde Fotos para catalogo de ropa.`, usuarioId: admin.id } });
  });

  console.log(`Catalogo reemplazado correctamente: ${profiles.length} productos, ${profiles.length * 3} variantes, ${photos.length} fotos utilizadas.`);
  console.log(`Ventas demo eliminadas por dependencia de productos anteriores: ${saleIds.length}.`);
  console.log(`Imagenes copiadas a: ${basename(dirname(frontendAssetsDir))}/ropa y backend/public/catalogo/ropa.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
