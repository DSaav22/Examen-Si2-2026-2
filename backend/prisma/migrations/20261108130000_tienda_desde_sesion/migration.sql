-- AlterTable
ALTER TABLE "alertas_producto" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "almacenes" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "auditoria" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "caja_turnos" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "categorias" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "colecciones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "cuentas_lealtad" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "cupones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "devolucion_lineas" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "devoluciones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "direcciones_cliente" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "dispositivos" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "empleados" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "eventos_analitica" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "favoritos" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "lineas_reserva" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "lineas_venta" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "movimientos_inventario" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "notificaciones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "operaciones_sync" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "opiniones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "pagos_simulados" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "pedidos" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "productos" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "productos_categorias" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "promociones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "proveedores" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "reporte_ejecuciones" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "reservas" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "stock_almacen" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "sucursales" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "temporadas" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "turnos_empleado" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "usuarios" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "variantes" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);

-- AlterTable
ALTER TABLE "ventas" ALTER COLUMN "tienda_id" SET DEFAULT current_setting('app.tienda_id'::text);
