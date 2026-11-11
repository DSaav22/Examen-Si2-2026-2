import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MODELOS_TIENDA } from './dominio-ambitos';
import { nombreSchemaTienda } from './schema-nombre';
import { migrarEsquema } from './migraciones-esquema';

const CATEGORIAS = ['Vestidos', 'Blusas', 'Pantalones', 'Faldas', 'Abrigos', 'Accesorios'];
const TABLAS = MODELOS_TIENDA.map((nombre) => {
  const modelo = Prisma.dmmf.datamodel.models.find((m) => m.name === nombre);
  if (!modelo || !/^[a-z_][a-z0-9_]*$/.test(modelo.dbName ?? modelo.name)) throw new Error('MODELO_TIENDA_INVALIDO');
  return modelo.dbName ?? modelo.name;
});

/** DDL transaccional. La plantilla actual es public y debe estar migrada antes de usarla. */
@Injectable()
export class AprovisionadorEsquemaService {
  async crear(tx: Prisma.TransactionClient, tiendaId: string, cuenta: { id: string; email: string; nombre: string }, nombre: string) {
    const esquema = await this.crearEstructura(tx, tiendaId);
    const sucursal = randomUUID();
    // Solo se interpola el identificador derivado del UUID; los datos son parámetros.
    await tx.$executeRawUnsafe(`INSERT INTO "${esquema}".sucursales (id, tienda_id, nombre, ciudad) VALUES ($1,$2,$3,$4)`, sucursal, tiendaId, `${nombre} · Casa matriz`, 'Por definir');
    await tx.$executeRawUnsafe(`INSERT INTO "${esquema}".almacenes (id, tienda_id, nombre, sucursal_id) VALUES ($1,$2,$3,$4)`, randomUUID(), tiendaId, 'Almacén principal', sucursal);
    await tx.$executeRawUnsafe(`INSERT INTO "${esquema}".usuarios (id, tienda_id, cuenta_id, email, nombre, rol, sucursal_id) VALUES ($1,$2,$3,$4,$5,'ADMIN'::"${esquema}"."Rol",$6)`, randomUUID(), tiendaId, cuenta.id, cuenta.email, cuenta.nombre, sucursal);
    for (const categoria of CATEGORIAS) await tx.$executeRawUnsafe(`INSERT INTO "${esquema}".categorias (id, tienda_id, nombre) VALUES ($1,$2,$3)`, randomUUID(), tiendaId, categoria);
    return esquema;
  }

  /** Solo estructura; para importar datos existentes en la misma transacción. */
  async crearEstructura(tx: Prisma.TransactionClient, tiendaId: string) {
    const esquema = nombreSchemaTienda(tiendaId); // UUID validado: no aceptar identificadores SQL externos.
    const nombres = TABLAS.map((t) => `'${t}'`).join(',');
    const ddl = `DO $aprovisionar$
DECLARE e text := '${esquema}'; t text; tipo record; col record; fk record; def text; destino text; vista text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = e) THEN RAISE EXCEPTION 'ESQUEMA_YA_EXISTE'; END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger tr JOIN pg_class c ON c.oid=tr.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname=ANY(ARRAY[${nombres}]) AND NOT tr.tgisinternal) THEN
    RAISE EXCEPTION 'PLANTILLA_CONTIENE_TRIGGERS_NO_SOPORTADOS';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname=ANY(ARRAY[${nombres}]) AND pg_get_expr(d.adbin,d.adrelid) LIKE '%nextval(%') THEN
    RAISE EXCEPTION 'PLANTILLA_CONTIENE_SECUENCIAS_NO_SOPORTADAS';
  END IF;
  EXECUTE format('CREATE SCHEMA %I', e);
  FOR tipo IN SELECT typ.typname, string_agg(quote_literal(en.enumlabel), ', ' ORDER BY en.enumsortorder) labels
    FROM pg_type typ JOIN pg_namespace n ON n.oid=typ.typnamespace JOIN pg_enum en ON en.enumtypid=typ.oid
    WHERE n.nspname='public' GROUP BY typ.oid,typ.typname
  LOOP EXECUTE format('CREATE TYPE %I.%I AS ENUM (%s)',e,tipo.typname,tipo.labels); END LOOP;
  FOREACH t IN ARRAY ARRAY[${nombres}] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relkind='r') THEN
      RAISE EXCEPTION 'TABLA_PLANTILLA_FALTANTE: %',t;
    END IF;
    EXECUTE format('CREATE TABLE %I.%I (LIKE public.%I INCLUDING ALL)',e,t,t);
  END LOOP;
  FOR col IN SELECT c.relname,a.attname,typ.typname,pg_get_expr(d.adbin,d.adrelid) defecto
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
    JOIN pg_type typ ON typ.oid=a.atttypid AND typ.typtype='e'
    JOIN pg_namespace tn ON tn.oid=typ.typnamespace AND tn.nspname='public'
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname=e AND c.relkind='r'
  LOOP
    IF col.defecto IS NOT NULL THEN EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT',e,col.relname,col.attname); END IF;
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE %I.%I USING %I::text::%I.%I',e,col.relname,col.attname,e,col.typname,col.attname,e,col.typname);
    IF col.defecto IS NOT NULL THEN
      def := replace(col.defecto,format('::%I',col.typname),format('::%I.%I',e,col.typname));
      EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s',e,col.relname,col.attname,def);
    END IF;
  END LOOP;
  FOR fk IN SELECT src.relname origen,dst.relname destino,dn.nspname destino_schema,con.conname,pg_get_constraintdef(con.oid) definicion
    FROM pg_constraint con JOIN pg_class src ON src.oid=con.conrelid JOIN pg_namespace sn ON sn.oid=src.relnamespace
    JOIN pg_class dst ON dst.oid=con.confrelid JOIN pg_namespace dn ON dn.oid=dst.relnamespace
    WHERE con.contype='f' AND sn.nspname='public' AND src.relname=ANY(ARRAY[${nombres}])
  LOOP
    destino := CASE WHEN fk.destino=ANY(ARRAY[${nombres}]) AND fk.destino_schema='public' THEN e ELSE fk.destino_schema END;
    def := regexp_replace(fk.definicion,'REFERENCES [^ (]+',format('REFERENCES %I.%I',destino,fk.destino));
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',e,fk.origen,fk.conname,def);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['cuentas','tiendas','planes','suscripciones','pagos_suscripcion','tokens_revocados'] LOOP
    EXECUTE format('CREATE VIEW %I.%I AS SELECT * FROM public.%I',e,t,t);
  END LOOP;
  SELECT pg_get_viewdef('public.v_reporte_ventas'::regclass,true) INTO vista;
  PERFORM set_config('search_path',format('%I, public',e),true);
  EXECUTE format('CREATE VIEW %I.v_reporte_ventas AS %s',e,vista);
  PERFORM set_config('search_path','public',true);
END $aprovisionar$`;
    await tx.$executeRawUnsafe(ddl);
    await migrarEsquema(tx, tiendaId);
    return esquema;
  }
}
