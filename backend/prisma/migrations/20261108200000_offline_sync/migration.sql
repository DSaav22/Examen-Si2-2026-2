-- DropIndex
DROP INDEX "operaciones_sync_operation_id_key";

-- DropIndex
DROP INDEX "operaciones_sync_tienda_id_idx";

-- DropIndex
DROP INDEX "ventas_uuid_key";

-- AlterTable
ALTER TABLE "operaciones_sync" ADD COLUMN     "hash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hecha_en" TIMESTAMP(3),
ADD COLUMN     "resultado" JSONB,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "usuario_id" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'en_curso';

-- AlterTable
ALTER TABLE "tiendas" ADD COLUMN     "ventana_offline_dias" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "push_suscripciones" (
    "id" TEXT NOT NULL,
    "tienda_id" TEXT NOT NULL DEFAULT current_setting('app.tienda_id'::text),
    "usuario_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_suscripciones_tienda_id_usuario_id_idx" ON "push_suscripciones"("tienda_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_suscripciones_tienda_id_endpoint_key" ON "push_suscripciones"("tienda_id", "endpoint");

-- CreateIndex
CREATE INDEX "operaciones_sync_tienda_id_estado_idx" ON "operaciones_sync"("tienda_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "operaciones_sync_tienda_id_operation_id_key" ON "operaciones_sync"("tienda_id", "operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_tienda_id_uuid_key" ON "ventas"("tienda_id", "uuid");
