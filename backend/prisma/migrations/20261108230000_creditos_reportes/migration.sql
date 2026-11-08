-- AlterEnum
ALTER TYPE "MedioPago" ADD VALUE 'credito';

-- AlterTable
ALTER TABLE "reporte_ejecuciones" ADD COLUMN     "especificacion" JSONB;

-- CreateTable
CREATE TABLE "cuentas_cobrar" (
    "id" TEXT NOT NULL,
    "tienda_id" TEXT NOT NULL DEFAULT current_setting('app.tienda_id'::text),
    "venta_id" TEXT NOT NULL,
    "clienta_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "vence_en" TIMESTAMP(3) NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_cobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonos_credito" (
    "id" TEXT NOT NULL,
    "tienda_id" TEXT NOT NULL DEFAULT current_setting('app.tienda_id'::text),
    "cuenta_id" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "medio_pago" "MedioPago" NOT NULL,
    "usuario_id" TEXT,
    "caja_turno_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonos_credito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_cobrar_venta_id_key" ON "cuentas_cobrar"("venta_id");

-- CreateIndex
CREATE INDEX "cuentas_cobrar_tienda_id_clienta_id_idx" ON "cuentas_cobrar"("tienda_id", "clienta_id");

-- CreateIndex
CREATE INDEX "abonos_credito_tienda_id_cuenta_id_idx" ON "abonos_credito"("tienda_id", "cuenta_id");

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_clienta_id_fkey" FOREIGN KEY ("clienta_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonos_credito" ADD CONSTRAINT "abonos_credito_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "cuentas_cobrar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integridad del saldo
ALTER TABLE "cuentas_cobrar" ADD CONSTRAINT "cuentas_cobrar_saldo_check" CHECK ("saldo" >= 0 AND "saldo" <= "monto");
ALTER TABLE "abonos_credito" ADD CONSTRAINT "abonos_credito_monto_check" CHECK ("monto" > 0);

