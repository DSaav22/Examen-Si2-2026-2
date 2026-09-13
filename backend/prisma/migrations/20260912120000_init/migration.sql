CREATE TYPE "Rol" AS ENUM ('CLIENTA', 'CAJERO', 'ADMIN');
CREATE TYPE "Canal" AS ENUM ('online', 'pos');
CREATE TYPE "EstadoVenta" AS ENUM ('cobrada', 'anulada');
CREATE TYPE "MedioPago" AS ENUM ('efectivo', 'qr', 'contra_entrega');

CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sucursales" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "almacenes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    CONSTRAINT "almacenes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL,
    "ocasion" TEXT NOT NULL,
    "precio_base" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "variantes" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "talla" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "url_foto" TEXT NOT NULL DEFAULT '',
    "url_overlay" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "variantes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_almacen" (
    "variante_id" TEXT NOT NULL,
    "almacen_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    CONSTRAINT "stock_almacen_pkey" PRIMARY KEY ("variante_id","almacen_id")
);

CREATE TABLE "caja_turnos" (
    "id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "cajero_id" TEXT NOT NULL,
    "fondo_inicial" DECIMAL(12,2) NOT NULL,
    "abierto_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_en" TIMESTAMP(3),
    "total_sistema" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_declarado" DECIMAL(12,2),
    CONSTRAINT "caja_turnos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "estado" "EstadoVenta" NOT NULL,
    "medio_pago" "MedioPago" NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "almacen_id" TEXT NOT NULL,
    "caja_turno_id" TEXT,
    "clienta_id" TEXT,
    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lineas_venta" (
    "id" TEXT NOT NULL,
    "venta_id" TEXT NOT NULL,
    "variante_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    CONSTRAINT "lineas_venta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reporte_ejecuciones" (
    "id" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "filas" INTEGER NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin_id" TEXT NOT NULL,
    CONSTRAINT "reporte_ejecuciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");
CREATE UNIQUE INDEX "variantes_sku_key" ON "variantes"("sku");
CREATE UNIQUE INDEX "variantes_producto_id_talla_color_key" ON "variantes"("producto_id", "talla", "color");
CREATE UNIQUE INDEX "ventas_uuid_key" ON "ventas"("uuid");
CREATE INDEX "ventas_creada_en_idx" ON "ventas"("creada_en");
CREATE INDEX "ventas_caja_turno_id_idx" ON "ventas"("caja_turno_id");
CREATE INDEX "stock_almacen_almacen_id_idx" ON "stock_almacen"("almacen_id");
CREATE INDEX "variantes_producto_id_idx" ON "variantes"("producto_id");

ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variantes" ADD CONSTRAINT "variantes_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_almacen" ADD CONSTRAINT "stock_almacen_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_almacen" ADD CONSTRAINT "stock_almacen_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caja_turnos" ADD CONSTRAINT "caja_turnos_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caja_turnos" ADD CONSTRAINT "caja_turnos_cajero_id_fkey" FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "almacenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_caja_turno_id_fkey" FOREIGN KEY ("caja_turno_id") REFERENCES "caja_turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienta_id_fkey" FOREIGN KEY ("clienta_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lineas_venta" ADD CONSTRAINT "lineas_venta_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lineas_venta" ADD CONSTRAINT "lineas_venta_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "variantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reporte_ejecuciones" ADD CONSTRAINT "reporte_ejecuciones_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
