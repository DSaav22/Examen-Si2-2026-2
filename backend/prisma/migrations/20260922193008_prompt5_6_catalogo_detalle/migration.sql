-- DropForeignKey
ALTER TABLE "lineas_reserva" DROP CONSTRAINT "lineas_reserva_reserva_id_fkey";

-- DropForeignKey
ALTER TABLE "pagos_simulados" DROP CONSTRAINT "pagos_simulados_venta_id_fkey";

-- AlterTable
ALTER TABLE "productos" ADD COLUMN     "ajuste" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "composicion" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cuidados" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "material" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "modelo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "popularidad" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "password_hash" DROP DEFAULT;

-- CreateTable
CREATE TABLE "opiniones" (
    "id" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL DEFAULT '',
    "imagen_url" TEXT NOT NULL DEFAULT '',
    "verificada" BOOLEAN NOT NULL DEFAULT false,
    "moderada" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "producto_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "opiniones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_producto" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "producto_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "alertas_producto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opiniones_producto_id_moderada_idx" ON "opiniones"("producto_id", "moderada");

-- CreateIndex
CREATE UNIQUE INDEX "opiniones_producto_id_usuario_id_key" ON "opiniones"("producto_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_producto_producto_id_usuario_id_tipo_key" ON "alertas_producto"("producto_id", "usuario_id", "tipo");

-- AddForeignKey
ALTER TABLE "lineas_reserva" ADD CONSTRAINT "lineas_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_simulados" ADD CONSTRAINT "pagos_simulados_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opiniones" ADD CONSTRAINT "opiniones_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opiniones" ADD CONSTRAINT "opiniones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_producto" ADD CONSTRAINT "alertas_producto_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_producto" ADD CONSTRAINT "alertas_producto_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
