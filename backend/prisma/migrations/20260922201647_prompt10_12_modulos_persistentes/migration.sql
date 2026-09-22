-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_categorias" (
    "producto_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,

    CONSTRAINT "productos_categorias_pkey" PRIMARY KEY ("producto_id","categoria_id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "inicia_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vence_en" TIMESTAMP(3),

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "puesto" TEXT NOT NULL,
    "contrato" TEXT NOT NULL DEFAULT '',
    "salario" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ingreso_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_empleado" (
    "id" TEXT NOT NULL,
    "empleado_id" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'programado',

    CONSTRAINT "turnos_empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_analitica" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL DEFAULT '',
    "datos" JSONB NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT,

    CONSTRAINT "eventos_analitica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_uso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operaciones_sync" (
    "id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "dispositivo_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pending',
    "payload" JSONB NOT NULL,
    "error" TEXT NOT NULL DEFAULT '',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operaciones_sync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "empleados_usuario_id_key" ON "empleados"("usuario_id");

-- CreateIndex
CREATE INDEX "turnos_empleado_empleado_id_inicio_idx" ON "turnos_empleado"("empleado_id", "inicio");

-- CreateIndex
CREATE INDEX "eventos_analitica_tipo_creado_en_idx" ON "eventos_analitica"("tipo", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "operaciones_sync_operation_id_key" ON "operaciones_sync"("operation_id");

-- CreateIndex
CREATE INDEX "operaciones_sync_dispositivo_id_estado_idx" ON "operaciones_sync"("dispositivo_id", "estado");

-- AddForeignKey
ALTER TABLE "productos_categorias" ADD CONSTRAINT "productos_categorias_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_categorias" ADD CONSTRAINT "productos_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_empleado" ADD CONSTRAINT "turnos_empleado_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
