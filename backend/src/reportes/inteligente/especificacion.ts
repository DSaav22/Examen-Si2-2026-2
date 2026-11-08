import { AGREGACIONES, Agregacion, Campo, FUENTES, Fuente, TipoCampo, campoDe, esMedida } from './catalogo';

/**
 * Especificación de un reporte: lo que el usuario pidió, en forma estructurada.
 * Es el contrato entre el intérprete (IA o reglas) y el compilador SQL.
 */
export interface Especificacion {
  titulo: string;
  fuente: string;
  columnas: { campo: string; agregacion?: Agregacion }[];
  filtros: Filtro[];
  agrupar: string[];
  orden: { campo: string; agregacion?: Agregacion; dir: 'asc' | 'desc' }[];
  limite: number;
  formato: Formato;
}

export type Formato = 'pantalla' | 'pdf' | 'excel';

export type Operador =
  | 'igual' | 'distinto' | 'contiene' | 'no_contiene' | 'en' | 'vacio' | 'no_vacio'
  | 'mayor' | 'mayor_igual' | 'menor' | 'menor_igual' | 'entre'
  | 'desde' | 'hasta' | 'hoy' | 'ayer' | 'ultimos_dias' | 'esta_semana' | 'este_mes' | 'mes_anterior' | 'este_anio' | 'anio_anterior';

export type Valor = string | number;

export interface Filtro {
  campo: string;
  op: Operador;
  valor?: Valor | Valor[];
  valor2?: Valor;
  agregacion?: Agregacion;
}

const OPS_TEXTO: Operador[] = ['igual', 'distinto', 'contiene', 'no_contiene', 'en', 'vacio', 'no_vacio'];
const OPS_NUMERO: Operador[] = ['igual', 'distinto', 'mayor', 'mayor_igual', 'menor', 'menor_igual', 'entre'];
const OPS_FECHA: Operador[] = ['igual', 'desde', 'hasta', 'entre', 'hoy', 'ayer', 'ultimos_dias', 'esta_semana', 'este_mes', 'mes_anterior', 'este_anio', 'anio_anterior', 'vacio', 'no_vacio'];
export const OPERADORES_SIN_VALOR: Operador[] = ['vacio', 'no_vacio', 'hoy', 'ayer', 'esta_semana', 'este_mes', 'mes_anterior', 'este_anio', 'anio_anterior'];

export const LIMITE_DEFECTO = 200;
export const LIMITE_MAXIMO = 2000;

export function operadoresDe(tipo: TipoCampo): Operador[] {
  if (tipo === 'fecha' || tipo === 'fechahora') return OPS_FECHA;
  if (tipo === 'texto' || tipo === 'logico') return OPS_TEXTO;
  return OPS_NUMERO;
}

export class EspecificacionInvalida extends Error {
  constructor(
    readonly codigo: string,
    readonly detalle: string,
  ) {
    super(`${codigo}: ${detalle}`);
  }
}

const invalida = (codigo: string, detalle: string) => new EspecificacionInvalida(codigo, detalle);

export function normalizarTexto(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function agregacionValida(a: unknown): Agregacion | undefined {
  if (a == null || a === '') return undefined;
  if (typeof a !== 'string' || !(a in AGREGACIONES)) throw invalida('AGREGACION_DESCONOCIDA', `La agregación "${String(a)}" no existe.`);
  return a as Agregacion;
}

function campoValido(fuente: Fuente, clave: unknown, uso: string): Campo {
  const campo = typeof clave === 'string' ? campoDe(fuente, clave) : undefined;
  if (!campo) {
    throw invalida(
      'CAMPO_NO_PERMITIDO',
      `El dato "${String(clave)}" (${uso}) no existe en ${fuente.etiqueta}. Datos disponibles: ${fuente.campos.map((c) => c.etiqueta).join(', ')}.`,
    );
  }
  return campo;
}

function revisarAgregacion(campo: Campo, agregacion: Agregacion | undefined) {
  if (!agregacion) return;
  if (campo.agregado) throw invalida('AGREGACION_DOBLE', `${campo.etiqueta} ya es un total; no se le aplica ${agregacion}.`);
  const numerico = esMedida(campo) || campo.dimension;
  if (!numerico && !['conteo', 'conteo_distinto', 'minimo', 'maximo'].includes(agregacion)) {
    throw invalida('AGREGACION_INVALIDA', `No se puede calcular ${agregacion} de ${campo.etiqueta} (no es numérico).`);
  }
}

function numero(v: unknown, campo: Campo): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  if (!Number.isFinite(n)) throw invalida('VALOR_INVALIDO', `${campo.etiqueta} necesita un número y recibió "${String(v)}".`);
  return n;
}

function fecha(v: unknown, campo: Campo): string {
  const s = typeof v === 'string' ? v.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) {
    throw invalida('VALOR_INVALIDO', `${campo.etiqueta} necesita una fecha AAAA-MM-DD y recibió "${String(v)}".`);
  }
  return s;
}

function texto(v: unknown, campo: Campo): string {
  if (typeof v !== 'string' && typeof v !== 'number') throw invalida('VALOR_INVALIDO', `${campo.etiqueta} necesita un texto.`);
  const s = String(v).trim().slice(0, 120);
  if (!s) throw invalida('VALOR_INVALIDO', `${campo.etiqueta} necesita un texto.`);
  if (campo.valores) {
    const n = normalizarTexto(s).replace(/\s+/g, '_');
    const hit = campo.valores.find((x) => normalizarTexto(x).replace(/\s+/g, '_') === n);
    if (!hit) throw invalida('VALOR_INVALIDO', `${campo.etiqueta} acepta: ${campo.valores.join(', ')}.`);
    return hit;
  }
  return s;
}

function validarFiltro(fuente: Fuente, raw: Record<string, unknown>): Filtro {
  const campo = campoValido(fuente, raw.campo, 'filtro');
  const agregacion = agregacionValida(raw.agregacion);
  revisarAgregacion(campo, agregacion);
  const op = raw.op as Operador;
  const tipoEfectivo: TipoCampo =
    agregacion === 'conteo' || agregacion === 'conteo_distinto' || campo.agregado ? (campo.agregado ? campo.tipo : 'entero') : campo.tipo;
  const permitidos = operadoresDe(tipoEfectivo);
  if (!permitidos.includes(op)) {
    throw invalida('OPERADOR_INVALIDO', `El operador "${String(raw.op)}" no aplica a ${campo.etiqueta}. Usa: ${permitidos.join(', ')}.`);
  }
  const filtro: Filtro = { campo: campo.clave, op, ...(agregacion ? { agregacion } : {}) };
  if (OPERADORES_SIN_VALOR.includes(op)) return filtro;

  const esFecha = tipoEfectivo === 'fecha' || tipoEfectivo === 'fechahora';
  const esTexto = tipoEfectivo === 'texto' || tipoEfectivo === 'logico';
  const conv = (v: unknown) => (esFecha ? fecha(v, campo) : esTexto ? texto(v, campo) : numero(v, campo));

  if (op === 'ultimos_dias') {
    const n = Math.round(numero(raw.valor, campo));
    if (n < 1 || n > 3650) throw invalida('VALOR_INVALIDO', 'Los días deben estar entre 1 y 3650.');
    filtro.valor = n;
  } else if (op === 'en') {
    const lista = Array.isArray(raw.valor) ? raw.valor : [raw.valor];
    if (!lista.length || lista.length > 30) throw invalida('VALOR_INVALIDO', 'La lista debe tener entre 1 y 30 valores.');
    filtro.valor = lista.map((v) => texto(v, campo));
  } else if (op === 'entre') {
    let a = conv(raw.valor);
    let b = conv(raw.valor2);
    if (a > b) [a, b] = [b, a];
    filtro.valor = a;
    filtro.valor2 = b;
  } else {
    filtro.valor = conv(raw.valor);
  }
  return filtro;
}

const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** Valida y normaliza una especificación que llega de la IA, de las reglas o del cliente. */
export function validarEspecificacion(raw: unknown): Especificacion {
  if (!raw || typeof raw !== 'object') throw invalida('ESPECIFICACION_VACIA', 'No llegó la especificación del reporte.');
  const r = raw as Record<string, unknown>;
  const fuente = typeof r.fuente === 'string' ? FUENTES[r.fuente] : undefined;
  if (!fuente) {
    throw invalida('FUENTE_DESCONOCIDA', `La fuente "${String(r.fuente)}" no existe. Fuentes: ${Object.keys(FUENTES).join(', ')}.`);
  }

  const agrupar: string[] = [];
  for (const g of lista(r.agrupar)) {
    const campo = campoValido(fuente, typeof g === 'object' && g ? (g as { campo?: unknown }).campo : g, 'agrupación');
    if (campo.agregado || esMedida(campo)) {
      throw invalida('AGRUPACION_INVALIDA', `No se agrupa por ${campo.etiqueta}: es una medida. Agrupa por un dato descriptivo (sucursal, mes…).`);
    }
    if (!agrupar.includes(campo.clave)) agrupar.push(campo.clave);
  }
  if (agrupar.length > 4) throw invalida('AGRUPACION_INVALIDA', 'Como máximo 4 niveles de agrupación.');

  const columnas: Especificacion['columnas'] = [];
  for (const c of lista(r.columnas)) {
    const obj = typeof c === 'string' ? { campo: c } : (c as Record<string, unknown>);
    const campo = campoValido(fuente, obj?.campo, 'columna');
    const agregacion = agregacionValida(obj?.agregacion);
    revisarAgregacion(campo, agregacion);
    if (!columnas.some((x) => x.campo === campo.clave && x.agregacion === agregacion)) {
      columnas.push({ campo: campo.clave, ...(agregacion ? { agregacion } : {}) });
    }
  }
  if (columnas.length > 20) throw invalida('DEMASIADAS_COLUMNAS', 'Como máximo 20 columnas.');
  if (!columnas.length) {
    if (agrupar.length) columnas.push(...fuente.medidasAlAgrupar.map((m) => ({ ...m })));
    else columnas.push(...fuente.columnasPorDefecto.map((campo) => ({ campo })));
  }

  const filtros = lista(r.filtros).map((f) => validarFiltro(fuente, (f ?? {}) as Record<string, unknown>));
  if (filtros.length > 15) throw invalida('DEMASIADOS_FILTROS', 'Como máximo 15 criterios.');

  const orden: Especificacion['orden'] = lista(r.orden).slice(0, 3).map((o) => {
    const obj = typeof o === 'string' ? { campo: o } : (o as Record<string, unknown>);
    const campo = campoValido(fuente, obj?.campo, 'orden');
    const agregacion = agregacionValida(obj?.agregacion);
    revisarAgregacion(campo, agregacion);
    return { campo: campo.clave, ...(agregacion ? { agregacion } : {}), dir: obj?.dir === 'asc' ? 'asc' : 'desc' };
  });

  const limiteRaw = Number(r.limite ?? LIMITE_DEFECTO);
  const limite = Number.isFinite(limiteRaw) ? Math.min(LIMITE_MAXIMO, Math.max(1, Math.round(limiteRaw))) : LIMITE_DEFECTO;
  const formato: Formato = r.formato === 'pdf' || r.formato === 'excel' ? r.formato : 'pantalla';
  const titulo = typeof r.titulo === 'string' && r.titulo.trim() ? r.titulo.trim().slice(0, 120) : '';

  const spec: Especificacion = { titulo, fuente: fuente.clave, columnas, filtros, agrupar, orden, limite, formato };
  if (!spec.titulo) spec.titulo = tituloAutomatico(spec);
  return spec;
}

/* ───────────── Descripción en lenguaje natural de lo que se entendió ───────────── */

const OPS_TEXTO_HUMANO: Partial<Record<Operador, string>> = {
  igual: 'es', distinto: 'no es', contiene: 'contiene', no_contiene: 'no contiene', en: 'es uno de',
  mayor: 'mayor a', mayor_igual: 'desde', menor: 'menor a', menor_igual: 'hasta', desde: 'desde', hasta: 'hasta',
  vacio: 'está vacío', no_vacio: 'tiene dato', hoy: 'es hoy', ayer: 'es ayer', esta_semana: 'es de esta semana',
  este_mes: 'es de este mes', mes_anterior: 'es del mes pasado', este_anio: 'es de este año', anio_anterior: 'es del año pasado',
};

export function etiquetaColumna(campo: Campo, agregacion?: Agregacion) {
  return agregacion ? AGREGACIONES[agregacion].etiqueta(campo.etiqueta) : campo.etiqueta;
}

function valorHumano(campo: Campo, v: Valor | Valor[] | undefined, agregacion?: Agregacion): string {
  if (Array.isArray(v)) return v.map((x) => valorHumano(campo, x)).join(', ');
  if (v == null) return '';
  if (campo.tipo === 'dinero' && agregacion !== 'conteo' && agregacion !== 'conteo_distinto') {
    return `Bs ${Number(v).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (campo.tipo === 'fecha' || campo.tipo === 'fechahora') {
    const [y, m, d] = String(v).split('-');
    return `${d}/${m}/${y}`;
  }
  return typeof v === 'string' && !campo.valores ? `“${v}”` : String(v);
}

export function describirFiltro(fuente: Fuente, f: Filtro): string {
  const campo = campoDe(fuente, f.campo)!;
  const nombre = etiquetaColumna(campo, f.agregacion);
  if (f.op === 'entre') return `${nombre} entre ${valorHumano(campo, f.valor, f.agregacion)} y ${valorHumano(campo, f.valor2, f.agregacion)}`;
  if (f.op === 'ultimos_dias') return `${nombre} en los últimos ${f.valor} días`;
  return `${nombre} ${OPS_TEXTO_HUMANO[f.op] ?? f.op}${OPERADORES_SIN_VALOR.includes(f.op) ? '' : ` ${valorHumano(campo, f.valor, f.agregacion)}`}`;
}

export function describir(spec: Especificacion) {
  const fuente = FUENTES[spec.fuente];
  const nombre = (campo: string, agregacion?: Agregacion) => etiquetaColumna(campoDe(fuente, campo)!, agregacion);
  return {
    fuente: fuente.etiqueta,
    columnas: spec.columnas.map((c) => nombre(c.campo, c.agregacion)),
    filtros: spec.filtros.map((f) => describirFiltro(fuente, f)),
    agrupar: spec.agrupar.map((g) => nombre(g)),
    orden: spec.orden.map((o) => `${nombre(o.campo, o.agregacion)} ${o.dir === 'desc' ? 'de mayor a menor' : 'de menor a mayor'}`),
    limite: spec.limite,
    formato: spec.formato,
  };
}

export function tituloAutomatico(spec: Especificacion) {
  const fuente = FUENTES[spec.fuente];
  const partes = [fuente.etiqueta];
  if (spec.agrupar.length) partes.push(`por ${spec.agrupar.map((g) => campoDe(fuente, g)!.etiqueta.toLowerCase()).join(' y ')}`);
  const principal = spec.filtros[0];
  if (principal) partes.push(`· ${describirFiltro(fuente, principal)}`);
  return partes.join(' ').slice(0, 120);
}
