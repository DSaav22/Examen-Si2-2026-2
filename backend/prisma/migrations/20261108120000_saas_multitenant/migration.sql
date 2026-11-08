-- SaaS multi-tenant: base compartida con tienda_id.
-- Los datos existentes pasan a la tienda "vesta" (00000000-0000-4000-8000-000000000001).

-- Enums
CREATE TYPE "PeriodoPlan" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'ANUAL');
CREATE TYPE "EstadoSuscripcion" AS ENUM ('activa', 'vencida', 'cancelada');
CREATE TYPE "EstadoTienda" AS ENUM ('activa', 'suspendida');

-- Tablas de plataforma
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "password_hash" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "verificacion_token" TEXT,
    "verificacion_expira" TIMESTAMP(3),
    "es_plataforma" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tiendas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'BO',
    "moneda" TEXT NOT NULL DEFAULT 'BOB',
    "estado" "EstadoTienda" NOT NULL DEFAULT 'activa',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueno_cuenta_id" TEXT,
    CONSTRAINT "tiendas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "precio_mensual" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "max_usuarios" INTEGER NOT NULL,
    "max_sucursales" INTEGER NOT NULL,
    "max_productos" INTEGER,
    "modulos" TEXT[],
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "tienda_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "periodo" "PeriodoPlan" NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'activa',
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMP(3) NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pagos_suscripcion" (
    "id" TEXT NOT NULL,
    "suscripcion_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "pasarela" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "estado" "EstadoPago" NOT NULL,
    "ultimos4" TEXT NOT NULL DEFAULT '',
    "idempotency_key" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- Catálogo de planes
INSERT INTO "planes" ("id", "codigo", "nombre", "descripcion", "precio_mensual", "moneda", "max_usuarios", "max_sucursales", "max_productos", "modulos", "destacado", "orden") VALUES
  ('plan-inicial', 'INICIAL', 'Inicial', 'Una tienda que empieza a vender en línea y en caja.', 19.00, 'USD', 3, 1, 200,
   ARRAY['catalogo', 'tienda_online', 'pos', 'inventario', 'reservas'], false, 1),
  ('plan-crecimiento', 'CRECIMIENTO', 'Crecimiento', 'Varias sucursales, probador virtual y reportes con IA.', 49.00, 'USD', 10, 3, 2000,
   ARRAY['catalogo', 'tienda_online', 'pos', 'inventario', 'reservas', 'probador', 'reportes_ia', 'asistente_ia'], true, 2),
  ('plan-cadena', 'CADENA', 'Cadena', 'Cadenas con muchas sucursales y analítica avanzada.', 129.00, 'USD', 50, 20, NULL,
   ARRAY['catalogo', 'tienda_online', 'pos', 'inventario', 'reservas', 'probador', 'reportes_ia', 'asistente_ia', 'analitica', 'mayorista'], false, 3);

-- Cada usuario existente obtiene su cuenta global (mismo id, ya verificada).
INSERT INTO "cuentas" ("id", "email", "nombre", "password_hash", "email_verificado", "es_plataforma")
SELECT u."id", lower(u."email"), u."nombre", u."password_hash", true, (u."rol" = 'SUPERADMIN')
FROM "usuarios" u;

-- Tienda original
INSERT INTO "tiendas" ("id", "slug", "nombre", "pais", "moneda", "dueno_cuenta_id")
VALUES ('00000000-0000-4000-8000-000000000001', 'vesta', 'Vesta', 'BO', 'BOB',
        (SELECT "id" FROM "usuarios" WHERE "rol" IN ('SUPERADMIN', 'ADMIN') ORDER BY "rol" DESC LIMIT 1));

INSERT INTO "suscripciones" ("id", "tienda_id", "plan_id", "periodo", "estado", "inicio", "vence_en", "monto", "moneda")
VALUES ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'plan-cadena', 'ANUAL', 'activa',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', 1238.40, 'USD');

-- Unicidad global → unicidad por tienda
DROP INDEX "categorias_nombre_key";
DROP INDEX "colecciones_nombre_key";
DROP INDEX "cupones_codigo_key";
DROP INDEX "temporadas_nombre_key";
DROP INDEX "usuarios_email_key";
DROP INDEX "variantes_sku_key";

-- tienda_id en todas las tablas de negocio
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'alertas_producto', 'almacenes', 'auditoria', 'caja_turnos', 'categorias', 'colecciones',
    'cuentas_lealtad', 'cupones', 'devolucion_lineas', 'devoluciones', 'direcciones_cliente',
    'dispositivos', 'empleados', 'eventos_analitica', 'favoritos', 'lineas_reserva', 'lineas_venta',
    'movimientos_inventario', 'notificaciones', 'operaciones_sync', 'opiniones', 'pagos_simulados',
    'pedidos', 'productos', 'productos_categorias', 'promociones', 'proveedores', 'reporte_ejecuciones',
    'reservas', 'stock_almacen', 'sucursales', 'temporadas', 'turnos_empleado', 'usuarios',
    'variantes', 'ventas'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN "tienda_id" TEXT NOT NULL DEFAULT %L', t, '00000000-0000-4000-8000-000000000001');
    EXECUTE format('ALTER TABLE %I ALTER COLUMN "tienda_id" DROP DEFAULT', t);
    EXECUTE format('CREATE INDEX %I ON %I ("tienda_id")', t || '_tienda_id_idx', t);
  END LOOP;
END $$;

-- usuarios: la clave pasa a la cuenta
ALTER TABLE "usuarios" ADD COLUMN "cuenta_id" TEXT;
UPDATE "usuarios" SET "cuenta_id" = "id";
ALTER TABLE "usuarios" ALTER COLUMN "cuenta_id" SET NOT NULL;
ALTER TABLE "usuarios" DROP COLUMN "password_hash";

-- Índices
CREATE UNIQUE INDEX "cuentas_email_key" ON "cuentas"("email");
CREATE UNIQUE INDEX "cuentas_verificacion_token_key" ON "cuentas"("verificacion_token");
CREATE UNIQUE INDEX "tiendas_slug_key" ON "tiendas"("slug");
CREATE UNIQUE INDEX "planes_codigo_key" ON "planes"("codigo");
CREATE INDEX "suscripciones_tienda_id_estado_idx" ON "suscripciones"("tienda_id", "estado");
CREATE UNIQUE INDEX "pagos_suscripcion_idempotency_key_key" ON "pagos_suscripcion"("idempotency_key");
CREATE UNIQUE INDEX "categorias_tienda_id_nombre_key" ON "categorias"("tienda_id", "nombre");
CREATE UNIQUE INDEX "colecciones_tienda_id_nombre_key" ON "colecciones"("tienda_id", "nombre");
CREATE UNIQUE INDEX "cupones_tienda_id_codigo_key" ON "cupones"("tienda_id", "codigo");
CREATE UNIQUE INDEX "temporadas_tienda_id_nombre_key" ON "temporadas"("tienda_id", "nombre");
CREATE UNIQUE INDEX "usuarios_tienda_id_email_key" ON "usuarios"("tienda_id", "email");
CREATE UNIQUE INDEX "usuarios_cuenta_id_tienda_id_key" ON "usuarios"("cuenta_id", "tienda_id");
CREATE UNIQUE INDEX "variantes_tienda_id_sku_key" ON "variantes"("tienda_id", "sku");

-- Claves foráneas
ALTER TABLE "tiendas" ADD CONSTRAINT "tiendas_dueno_cuenta_id_fkey" FOREIGN KEY ("dueno_cuenta_id") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_tienda_id_fkey" FOREIGN KEY ("tienda_id") REFERENCES "tiendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pagos_suscripcion" ADD CONSTRAINT "pagos_suscripcion_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- La vista de reportes solo devuelve filas de la tienda fijada en la sesión
-- (SET LOCAL app.tienda_id). Sin tienda fijada, no devuelve nada.
DROP VIEW IF EXISTS v_reporte_ventas;
CREATE VIEW v_reporte_ventas AS
SELECT
  v.creada_en AS fecha_hora,
  s.nombre AS sucursal_nombre,
  v.almacen_id,
  v.caja_turno_id,
  u.nombre AS cajero_nombre,
  v.id AS venta_id,
  cli.nombre AS cliente_nombre,
  va.sku AS variante_sku,
  p.nombre AS producto_nombre,
  va.talla,
  va.color,
  lv.cantidad,
  lv.precio_unitario,
  (lv.cantidad * lv.precio_unitario) AS subtotal,
  v.medio_pago::text AS medio_pago,
  v.tienda_id
FROM ventas v
JOIN lineas_venta lv ON lv.venta_id = v.id
JOIN variantes va ON va.id = lv.variante_id
JOIN productos p ON p.id = va.producto_id
JOIN almacenes a ON a.id = v.almacen_id
JOIN sucursales s ON s.id = a.sucursal_id
LEFT JOIN caja_turnos t ON t.id = v.caja_turno_id
LEFT JOIN usuarios u ON u.id = t.cajero_id
LEFT JOIN usuarios cli ON cli.id = v.clienta_id
WHERE v.estado = 'cobrada'
  AND v.tienda_id = current_setting('app.tienda_id', true);
