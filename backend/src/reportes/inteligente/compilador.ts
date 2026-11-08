import { AGREGACIONES, Agregacion, Campo, FUENTES, HOY, TipoCampo, campoDe, esMedida } from './catalogo';
import { Especificacion, EspecificacionInvalida, Filtro, etiquetaColumna, normalizarTexto } from './especificacion';

export interface ColumnaResultado {
  clave: string;
  campo: string;
  etiqueta: string;
  tipo: TipoCampo;
  agregacion?: Agregacion;
  totalizable: boolean;
}

export interface Compilado {
  sql: string;
  parametros: (string | number | string[])[];
  columnas: ColumnaResultado[];
  /** La especificación con los grupos implícitos que agregó el compilador. */
  especificacion: Especificacion;
}

/** Quita tildes y pasa a minúsculas en SQL, igual que normalizarTexto en JS. */
const sinTildes = (e: string) => `translate(lower(${e}), 'áéíóúüñàèìòâêîôûç', 'aeiouunaeiouaeiouc')`;
const escaparLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/**
 * Traduce una especificación ya validada a un único SELECT parametrizado.
 * Solo se concatenan expresiones del catálogo; todo valor del usuario va como $n.
 */
export function compilar(pedida: Especificacion): Compilado {
  const spec = structuredClone(pedida);
  const fuente = FUENTES[spec.fuente];
  const campo = (clave: string) => campoDe(fuente, clave)!;
  const parametros: Compilado['parametros'] = [];
  const param = (v: string | number | string[], cast: string) => {
    parametros.push(v);
    return `$${parametros.length}::${cast}`;
  };
  const joinsUsados = new Set<string>();
  const usar = (c: Campo) => c.joins?.forEach((j) => joinsUsados.add(j));

  const agrupado =
    spec.agrupar.length > 0 ||
    spec.columnas.some((c) => c.agregacion || campo(c.campo).agregado) ||
    spec.filtros.some((f) => f.agregacion || campo(f.campo).agregado);

  /** Expresión de un campo dentro del SELECT, aplicando la agregación que corresponda. */
  const expresion = (clave: string, agregacion?: Agregacion) => {
    const c = campo(clave);
    usar(c);
    if (c.agregado) return { sql: c.sql, agregacion: undefined, agregada: true };
    const efectiva = agregacion ?? (agrupado && !spec.agrupar.includes(clave) && esMedida(c) ? c.agregacionPorDefecto ?? 'suma' : undefined);
    if (efectiva) return { sql: AGREGACIONES[efectiva].sql(c.sql), agregacion: efectiva, agregada: true };
    return { sql: c.sql, agregacion: undefined, agregada: false };
  };

  const columnasPedidas: Especificacion['columnas'] = [
    ...spec.agrupar.filter((g) => !spec.columnas.some((c) => c.campo === g && !c.agregacion)).map((g) => ({ campo: g })),
    ...spec.columnas,
  ];

  const select: string[] = [];
  const grupo: number[] = [];
  const columnas: ColumnaResultado[] = [];
  for (const col of columnasPedidas) {
    const c = campo(col.campo);
    const e = expresion(col.campo, col.agregacion);
    if (agrupado && !e.agregada && !spec.agrupar.includes(c.clave)) {
      // Un dato descriptivo en un reporte con totales se vuelve grupo implícito.
      spec.agrupar.push(c.clave);
    }
    const clave = e.agregacion ? `${e.agregacion}_${c.clave}` : c.clave;
    if (columnas.some((x) => x.clave === clave)) continue;
    select.push(`${e.sql} AS "${clave}"`);
    if (agrupado && !e.agregada) grupo.push(select.length);
    const tipo: TipoCampo = e.agregacion === 'conteo' || e.agregacion === 'conteo_distinto' ? 'entero' : c.tipo;
    columnas.push({
      clave,
      campo: c.clave,
      etiqueta: etiquetaColumna(c, e.agregacion),
      tipo,
      ...(e.agregacion ? { agregacion: e.agregacion } : {}),
      totalizable:
        e.agregacion === 'suma' ||
        e.agregacion === 'conteo' ||
        (!e.agregacion && !c.agregado && esMedida(c) && c.agregacionPorDefecto === 'suma') ||
        (!!c.agregado && c.sql === 'COUNT(*)'),
    });
  }

  const donde: string[] = [fuente.dondeBase];
  const teniendo: string[] = [];
  for (const f of spec.filtros) {
    const c = campo(f.campo);
    usar(c);
    const agregada = !!(f.agregacion || c.agregado);
    const base = c.agregado ? c.sql : f.agregacion ? AGREGACIONES[f.agregacion].sql(c.sql) : c.sql;
    const tipo: TipoCampo = f.agregacion === 'conteo' || f.agregacion === 'conteo_distinto' ? 'entero' : c.tipo;
    (agregada ? teniendo : donde).push(condicion(base, tipo, f, param));
  }

  const orden: string[] = [];
  const ordenPedido: Especificacion['orden'] = spec.orden.length
    ? spec.orden
    : agrupado
      ? columnas.filter((c) => c.agregacion || campo(c.campo).agregado).slice(-1).map((c) => ({ campo: c.campo, agregacion: c.agregacion, dir: 'desc' as const }))
      : campoDe(fuente, fuente.ordenPorDefecto.campo)
        ? [fuente.ordenPorDefecto]
        : [];
  for (const o of ordenPedido) {
    const c = campo(o.campo);
    const e = expresion(o.campo, o.agregacion);
    if (agrupado && !e.agregada && !spec.agrupar.includes(c.clave)) {
      throw new EspecificacionInvalida('ORDEN_INVALIDO', `No se puede ordenar por ${c.etiqueta} en un reporte agrupado sin agruparlo también.`);
    }
    const pos = columnas.findIndex((x) => x.campo === c.clave && x.agregacion === e.agregacion);
    orden.push(`${pos >= 0 ? pos + 1 : e.sql} ${o.dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST`);
  }

  const joins = Object.entries(fuente.joins)
    .filter(([nombre]) => joinsUsados.has(nombre) || [...joinsUsados].some((j) => fuente.joinsRequieren?.[j]?.includes(nombre)))
    .map(([, sql]) => sql);

  const sql = [
    `SELECT ${select.join(',\n       ')}`,
    `FROM ${fuente.desde}`,
    ...joins,
    `WHERE ${donde.join('\n  AND ')}`,
    grupo.length ? `GROUP BY ${grupo.join(', ')}` : '',
    teniendo.length ? `HAVING ${teniendo.join('\n   AND ')}` : '',
    orden.length ? `ORDER BY ${orden.join(', ')}` : '',
    `LIMIT ${Math.trunc(spec.limite)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { sql, parametros, columnas, especificacion: spec };
}

function condicion(
  e: string,
  tipo: TipoCampo,
  f: Filtro,
  param: (v: string | number | string[], cast: string) => string,
): string {
  if (tipo === 'fecha' || tipo === 'fechahora') {
    const d = `(${e})::date`;
    switch (f.op) {
      case 'igual': return `${d} = ${param(f.valor as string, 'date')}`;
      case 'desde': return `${d} >= ${param(f.valor as string, 'date')}`;
      case 'hasta': return `${d} <= ${param(f.valor as string, 'date')}`;
      case 'entre': return `${d} BETWEEN ${param(f.valor as string, 'date')} AND ${param(f.valor2 as string, 'date')}`;
      case 'hoy': return `${d} = ${HOY}`;
      case 'ayer': return `${d} = ${HOY} - 1`;
      case 'ultimos_dias': return `${d} BETWEEN ${HOY} - (${param(f.valor as number, 'int')} - 1) AND ${HOY}`;
      case 'esta_semana': return `${d} >= date_trunc('week', ${HOY})::date`;
      case 'este_mes': return `date_trunc('month', ${d}) = date_trunc('month', ${HOY})`;
      case 'mes_anterior': return `date_trunc('month', ${d}) = date_trunc('month', ${HOY}) - interval '1 month'`;
      case 'este_anio': return `EXTRACT(YEAR FROM ${d}) = EXTRACT(YEAR FROM ${HOY})`;
      case 'anio_anterior': return `EXTRACT(YEAR FROM ${d}) = EXTRACT(YEAR FROM ${HOY}) - 1`;
      case 'vacio': return `${e} IS NULL`;
      case 'no_vacio': return `${e} IS NOT NULL`;
    }
  }
  if (tipo === 'texto' || tipo === 'logico') {
    const n = sinTildes(e);
    const v = () => normalizarTexto(String(f.valor));
    switch (f.op) {
      case 'igual': return `${n} = ${param(v(), 'text')}`;
      case 'distinto': return `(${e} IS NULL OR ${n} <> ${param(v(), 'text')})`;
      case 'contiene': return `${n} LIKE ${param(`%${escaparLike(v())}%`, 'text')}`;
      case 'no_contiene': return `(${e} IS NULL OR ${n} NOT LIKE ${param(`%${escaparLike(v())}%`, 'text')})`;
      case 'en': return `${n} = ANY(${param((f.valor as string[]).map(normalizarTexto), 'text[]')})`;
      case 'vacio': return `(${e} IS NULL OR ${e} = '')`;
      case 'no_vacio': return `(${e} IS NOT NULL AND ${e} <> '')`;
    }
  }
  const num = (v: unknown) => param(Number(v), 'numeric');
  switch (f.op) {
    case 'igual': return `${e} = ${num(f.valor)}`;
    case 'distinto': return `${e} <> ${num(f.valor)}`;
    case 'mayor': return `${e} > ${num(f.valor)}`;
    case 'mayor_igual': return `${e} >= ${num(f.valor)}`;
    case 'menor': return `${e} < ${num(f.valor)}`;
    case 'menor_igual': return `${e} <= ${num(f.valor)}`;
    case 'entre': return `${e} BETWEEN ${num(f.valor)} AND ${num(f.valor2)}`;
  }
  throw new EspecificacionInvalida('OPERADOR_INVALIDO', `Operador ${f.op} sin traducción para ${tipo}.`);
}
