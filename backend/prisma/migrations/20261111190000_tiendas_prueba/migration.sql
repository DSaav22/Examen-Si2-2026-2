-- Las altas reales se publican automáticamente; los ensayos se identifican explícitamente.
ALTER TABLE "tiendas" ADD COLUMN "es_prueba" BOOLEAN NOT NULL DEFAULT false;
