import { Prisma, PrismaClient } from '@prisma/client';
import { ambitoModelo, type AmbitoDominio } from '../tenancy/dominio-ambitos';

type ColumnaEnum = { tabla: string; columna: string; tipo: string; esquemaTipo: string; valorPorDefecto: string | null };
type ValorEnum = { tipo: string; valor: string };

/** Contrato derivado de Prisma; `EstadoPago` puede aparecer en ambos ámbitos. */
export function contratoEnums(ambito: AmbitoDominio) {
  return Prisma.dmmf.datamodel.models
    .filter((modelo) => ambitoModelo(modelo.name) === ambito)
    .flatMap((modelo) => modelo.fields.filter((campo) => campo.kind === 'enum').map((campo) => {
      const definicion = Prisma.dmmf.datamodel.enums.find((tipo) => tipo.name === campo.type);
      if (!definicion) throw new Error(`ENUM_SIN_DEFINICION: ${campo.type}`);
      return {
        tabla: modelo.dbName ?? modelo.name,
        columna: campo.dbName ?? campo.name,
        tipo: definicion.dbName ?? definicion.name,
        valores: definicion.values.map((valor) => valor.dbName ?? valor.name),
        valorPorDefecto: typeof campo.default === 'string'
          ? (definicion.values.find((valor) => valor.name === campo.default)?.dbName ?? campo.default)
          : null,
      };
    }));
}

/** Verificación de solo lectura. El esquema lo calcula el servidor, nunca el navegador. */
export async function verificarEnumsEsquema(cliente: PrismaClient, esquema: string, ambito: AmbitoDominio) {
  if ((ambito === 'plataforma' && esquema !== 'public') ||
      (ambito === 'tienda' && !/^tienda_[0-9a-f]{32}$/.test(esquema))) throw new Error('AMBITO_ESQUEMA_INVALIDO');
  const columnas = await cliente.$queryRaw<ColumnaEnum[]>`
    SELECT table_name AS tabla, column_name AS columna, udt_name AS tipo, udt_schema AS "esquemaTipo", column_default AS "valorPorDefecto"
    FROM information_schema.columns WHERE table_schema = ${esquema} AND data_type = 'USER-DEFINED'`;
  const valores = await cliente.$queryRaw<ValorEnum[]>`
    SELECT t.typname AS tipo, e.enumlabel AS valor
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = ${esquema} ORDER BY t.typname, e.enumsortorder`;
  const errores: string[] = [];
  for (const esperado of contratoEnums(ambito)) {
    const columna = columnas.find((c) => c.tabla === esperado.tabla && c.columna === esperado.columna);
    if (!columna || columna.tipo !== esperado.tipo || columna.esquemaTipo !== esquema) {
      errores.push(`COLUMNA_ENUM_INCORRECTA: ${esperado.tabla}.${esperado.columna}`);
      continue;
    }
    const etiquetas = valores.filter((v) => v.tipo === esperado.tipo).map((v) => v.valor);
    if (JSON.stringify(etiquetas) !== JSON.stringify(esperado.valores)) errores.push(`VALORES_ENUM_DISTINTOS: ${esperado.tipo}`);
    if (esperado.valorPorDefecto && !columna.valorPorDefecto?.startsWith(`'${esperado.valorPorDefecto.replace(/'/g, "''")}'::`)) {
      errores.push(`DEFAULT_ENUM_INCORRECTO: ${esperado.tabla}.${esperado.columna}`);
    }
  }
  return { ambito, esquema, columnasComprobadas: contratoEnums(ambito).length, errores: [...new Set(errores)] };
}
