ALTER TYPE "EstadoVenta" ADD VALUE IF NOT EXISTS 'devuelta';
ALTER TYPE "EstadoVenta" ADD VALUE IF NOT EXISTS 'devuelta_parcial';
ALTER TYPE "EstadoPago" ADD VALUE IF NOT EXISTS 'reembolsado';
ALTER TYPE "TipoMovimiento" ADD VALUE IF NOT EXISTS 'transferencia_salida';
ALTER TYPE "TipoMovimiento" ADD VALUE IF NOT EXISTS 'transferencia_entrada';
ALTER TYPE "TipoMovimiento" ADD VALUE IF NOT EXISTS 'devolucion';

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "mayorista" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "precio_mayorista" DECIMAL(12,2);
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "minimo_mayorista" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "variantes" ADD COLUMN IF NOT EXISTS "url_modelo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "lineas_venta" ADD COLUMN IF NOT EXISTS "cantidad_devuelta" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "direccion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "seguimiento" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "enviado_en" TIMESTAMP(3);
ALTER TABLE "pedidos" ADD COLUMN IF NOT EXISTS "venta_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "pedidos_venta_id_key" ON "pedidos"("venta_id");
CREATE INDEX IF NOT EXISTS "pedidos_estado_idx" ON "pedidos"("estado");

DO $$ BEGIN
  ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "devoluciones" (
  "id" TEXT NOT NULL,
  "nota" TEXT NOT NULL DEFAULT '',
  "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "venta_id" TEXT NOT NULL,
  "usuario_id" TEXT,
  CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "devolucion_lineas" (
  "id" TEXT NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "devolucion_id" TEXT NOT NULL,
  "linea_venta_id" TEXT NOT NULL,
  CONSTRAINT "devolucion_lineas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "devoluciones_venta_id_idx" ON "devoluciones"("venta_id");

DO $$ BEGIN
  ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "devolucion_lineas" ADD CONSTRAINT "devolucion_lineas_devolucion_id_fkey" FOREIGN KEY ("devolucion_id") REFERENCES "devoluciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE "variantes" SET "url_modelo" = 'vesta-volumen'
WHERE "sku" LIKE 'VESTA-DEMO-001-%' AND "url_modelo" = '';
