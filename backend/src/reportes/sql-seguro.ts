import { Prisma } from '@prisma/client';

const PROHIBIDO =
  /\b(insert|update|delete|drop|alter|truncate|copy|grant|revoke|create|comment|execute|call|do|set_config|current_setting|set|reset|dblink|lo_\w+)\b/i;

/** Toda tabla real queda fuera: la única fuente permitida es la vista, que ya filtra por tienda. */
const TABLAS = new RegExp(
  `\\b(${Prisma.dmmf.datamodel.models.map((m) => m.dbName ?? m.name).join('|')}|_prisma_migrations)\\b`,
  'i',
);

export function validarSelect(sql: string): string {
  const limpio = sql.replace(/;+\s*$/g, '').trim();
  if (!limpio || limpio.includes(';')) {
    throw new Error('SQL_MULTIPLE');
  }
  if (!/^select\s/i.test(limpio)) {
    throw new Error('SQL_NO_SELECT');
  }
  if (PROHIBIDO.test(limpio)) {
    throw new Error('SQL_PROHIBIDO');
  }
  if (!/\bv_reporte_ventas\b/i.test(limpio)) {
    throw new Error('SQL_FUERA_DE_VISTA');
  }
  if (/\b(usuarios|password_hash|information_schema)\b|\bpg_/i.test(limpio) || TABLAS.test(limpio)) {
    throw new Error('SQL_FUERA_DE_VISTA');
  }
  if (/\blimit\b/i.test(limpio)) {
    return limpio;
  }
  return `${limpio} LIMIT 200`;
}

export function compilarPregunta(pregunta: string): { titulo: string; sql: string } {
  const q = pregunta.toLowerCase();
  if (/\b(usuario|contraseñ|password|emplead|drop|delete)\b/.test(q)) {
    throw new Error('PREGUNTA_ILEGAL');
  }

  const where: string[] = [];
  const sucursal = pregunta.match(/sucursal\s+([^,.;]+)/i);
  if (sucursal?.[1]) {
    where.push(`sucursal_nombre ILIKE '%${escapar(sucursal[1].trim())}%'`);
  }
  const cajero = pregunta.match(/cajero\s+([^,.;]+)/i);
  if (cajero?.[1]) {
    where.push(`cajero_nombre ILIKE '%${escapar(cajero[1].trim())}%'`);
  }
  const prenda = pregunta.match(/prenda\s+([^,.;]+)|producto\s+([^,.;]+)/i);
  const nombrePrenda = prenda?.[1] ?? prenda?.[2];
  if (nombrePrenda) {
    where.push(`producto_nombre ILIKE '%${escapar(nombrePrenda.trim())}%'`);
  }

  const filtro = where.length ? ` WHERE ${where.join(' AND ')}` : '';

  if (/\b(total|suma|cuánto se vend|cuanto se vend)\b/.test(q)) {
    return {
      titulo: 'Totales de ventas',
      sql: `SELECT sucursal_nombre, cajero_nombre, SUM(subtotal) AS total, SUM(cantidad) AS unidades
            FROM v_reporte_ventas${filtro}
            GROUP BY sucursal_nombre, cajero_nombre
            ORDER BY total DESC LIMIT 200`,
    };
  }

  return {
    titulo: 'Ventas',
    sql: `SELECT fecha_hora, sucursal_nombre, cajero_nombre, cliente_nombre,
                 producto_nombre, talla, color, cantidad, subtotal, medio_pago
          FROM v_reporte_ventas${filtro}
          ORDER BY fecha_hora DESC LIMIT 200`,
  };
}

function escapar(valor: string): string {
  return valor.replace(/'/g, "''").slice(0, 80);
}
