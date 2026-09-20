-- AlterEnum
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'ENCARGADO';
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'PROVEEDOR';

ALTER TYPE "EstadoVenta" ADD VALUE IF NOT EXISTS 'pendiente_pago';

CREATE TYPE "EstadoReserva" AS ENUM ('pendiente', 'preparada', 'en_atencion', 'completada', 'cancelada');
CREATE TYPE "TipoMovimiento" AS ENUM ('venta', 'reserva', 'liberacion', 'ajuste', 'ingreso_proveedor');
CREATE TYPE "EstadoPago" AS ENUM ('pendiente', 'aprobado', 'rechazado');

CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "temporadas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    CONSTRAINT "temporadas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "temporadas_nombre_key" ON "temporadas"("nombre");

CREATE TABLE "colecciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    CONSTRAINT "colecciones_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "colecciones_nombre_key" ON "colecciones"("nombre");

ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "sucursal_id" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "proveedor_id" TEXT;

ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "descuento_pct" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "temporada_id" TEXT;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "coleccion_id" TEXT;
ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "proveedor_id" TEXT;

ALTER TABLE "stock_almacen" ADD COLUMN IF NOT EXISTS "reservado" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variante_id" TEXT NOT NULL,
    "almacen_id" TEXT NOT NULL,
    "venta_id" TEXT,
    "reserva_id" TEXT,
    "usuario_id" TEXT,
    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "movimientos_inventario_almacen_id_creado_en_idx" ON "movimientos_inventario"("almacen_id", "creado_en");

CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'pendiente',
    "horario" TIMESTAMP(3) NOT NULL,
    "nota" TEXT NOT NULL DEFAULT '',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienta_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reservas_sucursal_id_estado_idx" ON "reservas"("sucursal_id", "estado");

CREATE TABLE "lineas_reserva" (
    "id" TEXT NOT NULL,
    "reserva_id" TEXT NOT NULL,
    "variante_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    CONSTRAINT "lineas_reserva_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagos_simulados" (
    "id" TEXT NOT NULL,
    "venta_id" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'pendiente',
    "referencia" TEXT NOT NULL DEFAULT '',
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_simulados_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pagos_simulados_venta_id_key" ON "pagos_simulados"("venta_id");

CREATE INDEX IF NOT EXISTS "ventas_clienta_id_idx" ON "ventas"("clienta_id");

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_temporada_id_fkey" FOREIGN KEY ("temporada_id") REFERENCES "temporadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_coleccion_id_fkey" FOREIGN KEY ("coleccion_id") REFERENCES "colecciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_clienta_id_fkey" FOREIGN KEY ("clienta_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lineas_reserva" ADD CONSTRAINT "lineas_reserva_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lineas_reserva" ADD CONSTRAINT "lineas_reserva_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagos_simulados" ADD CONSTRAINT "pagos_simulados_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
