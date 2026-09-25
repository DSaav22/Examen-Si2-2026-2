-- Redistribuir roles deprecados antes de recortar el enum.
UPDATE "usuarios" SET "rol" = 'CAJERO' WHERE "rol"::text = 'VENDEDOR';
UPDATE "usuarios" SET "rol" = 'ADMIN' WHERE "rol"::text = 'RRHH';

-- PostgreSQL no permite quitar valores de un enum in-place: recrear.
CREATE TYPE "Rol_new" AS ENUM ('CLIENTA', 'CAJERO', 'ADMIN', 'ENCARGADO', 'PROVEEDOR', 'SUPERADMIN');

ALTER TABLE "usuarios"
  ALTER COLUMN "rol" TYPE "Rol_new"
  USING ("rol"::text::"Rol_new");

DROP TYPE "Rol";
ALTER TYPE "Rol_new" RENAME TO "Rol";
