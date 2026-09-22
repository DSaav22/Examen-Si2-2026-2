-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Rol" ADD VALUE 'VENDEDOR';
ALTER TYPE "Rol" ADD VALUE 'RRHH';
ALTER TYPE "Rol" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "tokens_revocados" (
    "hash" TEXT NOT NULL,
    "revocado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3),

    CONSTRAINT "tokens_revocados_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL DEFAULT '',
    "detalle" TEXT NOT NULL DEFAULT '',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_id" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_creado_en_idx" ON "auditoria"("usuario_id", "creado_en");
