-- Solo para bases aisladas de ensayo. Todos los cambios se revierten al terminar.
-- Ensaya copiar estructura y reconstruir FKs; no es un aprovisionador de producción.
BEGIN;
DO $$
DECLARE
  esquema text;
  tabla record;
  fk record;
  definicion text;
  destino text;
  total integer;
  origen_count bigint;
  copia_count bigint;
  id_tienda text;
  ids_tienda text[];
  vista_reporte text;
  tabla_global text;
  tipo_enum record;
  columna_enum record;
  nuevo_default text;
BEGIN
  IF current_database() NOT IN ('ensayar_prueba', 'ensayar_copia') THEN
    RAISE EXCEPTION 'Este ensayo solo puede ejecutarse en una base aislada autorizada';
  END IF;
  IF current_database() = 'ensayar_copia' THEN
    INSERT INTO public.tiendas (id, slug, nombre, pais, moneda)
      VALUES ('11111111-1111-4111-8111-111111111111', 'ensayo-migracion-aislada', 'Ensayo aislado', 'BO', 'BOB');
    SELECT ARRAY[id, '11111111-1111-4111-8111-111111111111'] INTO ids_tienda
      FROM public.tiendas WHERE slug = 'vesta';
  ELSE
    SELECT array_agg(id ORDER BY creada_en DESC) INTO ids_tienda FROM
      (SELECT id, creada_en FROM public.tiendas WHERE slug LIKE 'ensayo-%' OR slug LIKE 'brasil-prueba-%' ORDER BY creada_en DESC LIMIT 2) t;
  END IF;
  IF coalesce(array_length(ids_tienda, 1), 0) < 2 THEN
    RAISE EXCEPTION 'Se necesitan dos tiendas de prueba en la base aislada';
  END IF;
  vista_reporte := pg_get_viewdef('public.v_reporte_ventas'::regclass, true);
  FOR i IN 1..2 LOOP
    esquema := CASE WHEN i = 1 THEN 'ensayo_tienda_a' ELSE 'ensayo_tienda_b' END;
    id_tienda := ids_tienda[i];
    EXECUTE format('CREATE SCHEMA %I', esquema);
    FOR tipo_enum IN
      SELECT typ.typname, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS labels
      FROM pg_type typ JOIN pg_namespace n ON n.oid = typ.typnamespace
      JOIN pg_enum e ON e.enumtypid = typ.oid
      WHERE n.nspname = 'public' GROUP BY typ.oid, typ.typname
    LOOP
      EXECUTE format('CREATE TYPE %I.%I AS ENUM (%s)', esquema, tipo_enum.typname, tipo_enum.labels);
    END LOOP;
    FOR tabla IN
      SELECT c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tienda_id' AND NOT a.attisdropped
      WHERE n.nspname = 'public' AND c.relkind = 'r'
        AND c.relname NOT IN ('tiendas', 'suscripciones')
      ORDER BY c.relname
    LOOP
      EXECUTE format('CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)', esquema, tabla.relname, tabla.relname);
    END LOOP;

    -- Vistas exploratorias de plataforma: su compatibilidad con escrituras Prisma aún debe comprobarse.
    FOREACH tabla_global IN ARRAY ARRAY['cuentas', 'tiendas', 'planes', 'suscripciones', 'pagos_suscripcion', 'tokens_revocados'] LOOP
      EXECUTE format('CREATE VIEW %I.%I AS SELECT * FROM public.%I', esquema, tabla_global, tabla_global);
    END LOOP;

    -- Copia todos los registros de esa tienda antes de instalar las claves foráneas.
    FOR tabla IN
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = esquema AND c.relkind = 'r' ORDER BY c.relname
    LOOP
      EXECUTE format('INSERT INTO %I.%I SELECT * FROM public.%I WHERE tienda_id = $1', esquema, tabla.relname, tabla.relname) USING id_tienda;
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tienda_id = $1', tabla.relname) INTO origen_count USING id_tienda;
      EXECUTE format('SELECT count(*) FROM %I.%I', esquema, tabla.relname) INTO copia_count;
      IF origen_count <> copia_count THEN RAISE EXCEPTION 'Diferencia de filas en %.%', esquema, tabla.relname; END IF;
    END LOOP;

    -- Prisma califica los enums con el esquema conectado; se convierten sin cambiar etiquetas.
    FOR columna_enum IN
      SELECT c.relname, a.attname, t.typname, pg_get_expr(d.adbin, d.adrelid) AS default_expr
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      JOIN pg_type t ON t.oid = a.atttypid AND t.typtype = 'e'
      JOIN pg_namespace tn ON tn.oid = t.typnamespace AND tn.nspname = 'public'
      LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
      WHERE n.nspname = esquema AND c.relkind = 'r'
    LOOP
      IF columna_enum.default_expr IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT', esquema, columna_enum.relname, columna_enum.attname);
      END IF;
      EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE %I.%I USING %I::text::%I.%I',
        esquema, columna_enum.relname, columna_enum.attname, esquema, columna_enum.typname,
        columna_enum.attname, esquema, columna_enum.typname);
      IF columna_enum.default_expr IS NOT NULL THEN
        nuevo_default := replace(columna_enum.default_expr, format('::%I', columna_enum.typname), format('::%I.%I', esquema, columna_enum.typname));
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s', esquema, columna_enum.relname, columna_enum.attname, nuevo_default);
      END IF;
    END LOOP;

    PERFORM set_config('search_path', format('%I, public', esquema), true);
    EXECUTE format('CREATE VIEW %I.v_reporte_ventas AS %s', esquema, vista_reporte);
    PERFORM set_config('search_path', 'public', true);

    FOR fk IN
      SELECT src.relname AS origen, dst.relname AS destino, dst_ns.nspname AS destino_schema,
             con.conname, pg_get_constraintdef(con.oid) AS definicion
      FROM pg_constraint con
      JOIN pg_class src ON src.oid = con.conrelid
      JOIN pg_namespace src_ns ON src_ns.oid = src.relnamespace
      JOIN pg_class dst ON dst.oid = con.confrelid
      JOIN pg_namespace dst_ns ON dst_ns.oid = dst.relnamespace
      WHERE con.contype = 'f' AND src_ns.nspname = 'public'
        AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = src.oid AND a.attname = 'tienda_id' AND NOT a.attisdropped)
        AND src.relname NOT IN ('tiendas', 'suscripciones')
    LOOP
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = esquema AND c.relname = fk.destino AND c.relkind = 'r'
      ) THEN esquema ELSE fk.destino_schema END INTO destino;
      definicion := regexp_replace(fk.definicion, 'REFERENCES [^ (]+', format('REFERENCES %I.%I', destino, fk.destino));
      EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s', esquema, fk.origen, fk.conname, definicion);
    END LOOP;
    SELECT count(*) INTO total FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = esquema AND c.relkind = 'r';
    IF total < 30 THEN RAISE EXCEPTION 'Faltan tablas en %: %', esquema, total; END IF;
    RAISE NOTICE 'Esquema %: % tablas y claves foráneas reconstruidas', esquema, total;
  END LOOP;

  -- Mismo nombre, datos distintos: prueba mínima de aislamiento físico de categorías.
  INSERT INTO ensayo_tienda_a.categorias (id, nombre, tienda_id) VALUES ('categoria-a', 'Prueba de aislamiento A', ids_tienda[1]);
  INSERT INTO ensayo_tienda_b.categorias (id, nombre, tienda_id) VALUES ('categoria-b', 'Prueba de aislamiento B', ids_tienda[2]);
  IF EXISTS (SELECT 1 FROM ensayo_tienda_a.categorias WHERE id = 'categoria-b') OR
     EXISTS (SELECT 1 FROM ensayo_tienda_b.categorias WHERE id = 'categoria-a') THEN
    RAISE EXCEPTION 'Aislamiento físico fallido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace sn ON sn.oid = src.relnamespace
    JOIN pg_class dst ON dst.oid = con.confrelid
    JOIN pg_namespace dn ON dn.oid = dst.relnamespace
    WHERE con.contype = 'f' AND sn.nspname = 'ensayo_tienda_a' AND src.relname = 'variantes'
      AND dn.nspname = 'ensayo_tienda_a' AND dst.relname = 'productos'
  ) THEN RAISE EXCEPTION 'La relación variante-producto no apunta al esquema de su tienda'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace sn ON sn.oid = src.relnamespace
    JOIN pg_class dst ON dst.oid = con.confrelid
    JOIN pg_namespace dn ON dn.oid = dst.relnamespace
    WHERE con.contype = 'f' AND sn.nspname = 'ensayo_tienda_a' AND src.relname = 'usuarios'
      AND dn.nspname = 'public' AND dst.relname = 'cuentas'
  ) THEN RAISE EXCEPTION 'La relación usuario-cuenta global no está conservada'; END IF;
  RAISE NOTICE 'Aislamiento de categorías: correcto';
END $$;
ROLLBACK;
