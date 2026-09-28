/* Asocia el GLB riggeado piloto a todas las variantes del cardigan indicado.
   Es reversible: conserva y muestra las rutas anteriores antes de actualizar. */
const fs = require('node:fs')
const path = require('node:path')
const { PrismaClient } = require('@prisma/client')

// Los scripts Node directos no cargan ConfigModule de Nest. Tomamos sólo la
// variable requerida desde el .env local, sin mostrarla en consola.
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '..', '.env')
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    .find(value => value.startsWith('DATABASE_URL='))
  if (line) process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')
}

const prisma = new PrismaClient()
const nombre = 'Cardigan rayado rosa vino III'
const usarPiloto = !process.argv.includes('--revertir')
const urlModelo = usarPiloto
  ? '/models/candidatos/opensew-cardigan-rayado-texturizado.glb'
  : '/models/catalogo/producto-043.glb'

async function main() {
  const producto = await prisma.producto.findFirst({
    where: { nombre },
    include: { variantes: { select: { id: true, sku: true, urlModelo: true } } },
  })
  if (!producto) throw new Error(`No se encontró el producto: ${nombre}`)
  console.log(JSON.stringify({ producto: producto.nombre, antes: producto.variantes }, null, 2))
  await prisma.variante.updateMany({ where: { productoId: producto.id }, data: { urlModelo } })
  console.log(JSON.stringify({ actualizado: producto.variantes.length, urlModelo, modo: usarPiloto ? 'piloto' : 'revertido' }, null, 2))
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
