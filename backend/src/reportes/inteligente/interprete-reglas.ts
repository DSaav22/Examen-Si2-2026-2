import { Agregacion, Campo, FUENTES, Fuente, campoDe, esMedida } from './catalogo';
import { Filtro, Formato, Operador, normalizarTexto } from './especificacion';

/** Valores reales de la tienda, para reconocer “Sopocachi”, “vestidos” o “negro” en la frase. */
export interface Diccionario {
  sucursal: string[];
  ciudad: string[];
  categoria: string[];
  ocasion: string[];
  color: string[];
  producto: string[];
  clienta: string[];
  proveedor: string[];
}

export interface Interpretacion {
  especificacion: Record<string, unknown>;
  avisos: string[];
}

type Mencion = { campo: string; ini: number; fin: number; texto: string };
type Rango = { a: string; b: string };

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MES_RE = `(${MESES.join('|')}|setiembre)`;
const NUM = '(\\d+(?:\\.\\d+)?)';

const DATOS_INEXISTENTES: [RegExp, string][] = [
  [/\b(telefonos?|celular(es)?|whatsapp|numero de contacto)\b/, 'teléfono'],
  [/\b(carnet|cedula|ci|nit)\b/, 'documento de identidad / NIT'],
  [/\b(edad(es)?|cumpleanos|fecha de nacimiento)\b/, 'edad o cumpleaños'],
  [/\b(costo|costos|margen|ganancia|utilidad)\b/, 'costo y margen (no se registra el costo de compra)'],
];

/* ───────────── utilidades de texto ───────────── */

const UNIDADES: Record<string, number> = {
  dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21,
  veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
};
const DECENAS = new Set([30, 40, 50, 60, 70, 80, 90]);

/** “mil quinientos” → 1500; “treinta y cinco” → 35. Para frases dictadas por voz. */
function palabrasANumeros(t: string) {
  const palabras = t.split(' ');
  const out: string[] = [];
  for (let i = 0; i < palabras.length; ) {
    const w = palabras[i];
    if (!(w in UNIDADES) && w !== 'mil') {
      out.push(w);
      i++;
      continue;
    }
    let total = 0;
    let actual = 0;
    let j = i;
    while (j < palabras.length) {
      const p = palabras[j];
      if (p === 'mil') {
        total += (actual || 1) * 1000;
        actual = 0;
      } else if (p in UNIDADES) {
        actual += UNIDADES[p];
      } else if (p === 'y' && DECENAS.has(actual % 100) && UNIDADES[palabras[j + 1]] < 10) {
        /* “treinta y cinco” */
      } else break;
      j++;
    }
    out.push(String(total + actual));
    i = j;
  }
  return out.join(' ');
}

function limpiar(pregunta: string) {
  let t = normalizarTexto(pregunta)
    .replace(/[¿?¡!;:()"“”'«»]/g, ' ')
    .replace(/(\d)\s*(?:bs\.?|bolivianos?)\b/g, '$1')
    .replace(/\b(?:bs\.?|bolivianos?)\s*(\d)/g, '$1')
    .replace(/\b(\d{1,3})(?:\.(\d{3}))+\b(?!\.\d)/g, (m) => m.replace(/\./g, ''))
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/,/g, ' , ')
    .replace(/\s+/g, ' ')
    .trim();
  t = palabrasANumeros(t);
  return ` ${t} `;
}

/** Borra un tramo sin mover los índices del resto (se reemplaza por espacios). */
const tapar = (t: string, ini: number, fin: number) => t.slice(0, ini) + ' '.repeat(fin - ini) + t.slice(fin);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function iso(y: number, m: number, d: number) {
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toISOString().slice(0, 10);
}
const finDeMes = (y: number, m: number) => iso(y, m + 1, 0);

/* ───────────── intérprete ───────────── */

export function interpretarConReglas(pregunta: string, dic: Diccionario, hoyIso: string): Interpretacion {
  const avisos: string[] = [];
  let t = limpiar(pregunta);
  const [anioHoy, mesHoy] = hoyIso.split('-').map(Number);

  for (const [re, nombre] of DATOS_INEXISTENTES) {
    if (re.test(t)) avisos.push(`El dato “${nombre}” no se registra en el sistema; se omitió del reporte.`);
  }

  // 1. Formato de salida
  let formato: Formato = 'pantalla';
  t = t.replace(/\b(?:en |a |como )?(?:un |una )?(?:excel|xlsx|hoja de calculo|planilla)\b/g, () => ((formato = 'excel'), ' '));
  t = t.replace(/\b(?:en |a |como )?(?:un )?(?:pdf|documento imprimible|para imprimir)\b/g, () => ((formato = 'pdf'), ' '));

  // 2. Fechas (antes que los números, para que “2025” o “30 días” no se lean como montos)
  const fechas: { op: Operador; valor?: string | number; valor2?: string; vence: boolean }[] = [];
  const marcas: (Rango & { mes?: boolean })[] = [];
  const marca = (r: Rango & { mes?: boolean }) => ` «${marcas.push(r) - 1}» `;
  const anioDe = (mes: number, y?: string) => (y ? Number(y) : mes > mesHoy ? anioHoy - 1 : anioHoy);
  const mesNum = (m: string) => (m === 'setiembre' ? 9 : MESES.indexOf(m) + 1);

  t = t.replace(new RegExp(`\\b(?:del? )?(\\d{1,2}) al (\\d{1,2}) de ${MES_RE}(?: (?:de|del) (\\d{4}))?`, 'g'), (_m, d1, d2, mes, y) => {
    const m = mesNum(mes);
    const a = anioDe(m, y);
    return ` entre ${marca({ a: iso(a, m, +d1), b: iso(a, m, +d1) })} y ${marca({ a: iso(a, m, +d2), b: iso(a, m, +d2) })} `;
  });
  t = t.replace(new RegExp(`\\b(\\d{1,2}) de ${MES_RE}(?: (?:de|del) (\\d{4}))?`, 'g'), (_m, d, mes, y) => {
    const m = mesNum(mes);
    const a = anioDe(m, y);
    return marca({ a: iso(a, m, +d), b: iso(a, m, +d) });
  });
  t = t.replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (_m, y, m, d) => marca({ a: iso(+y, +m, +d), b: iso(+y, +m, +d) }));
  t = t.replace(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/g, (_m, d, m, y) => {
    const a = y ? (y.length === 2 ? 2000 + +y : +y) : anioDe(+m);
    return marca({ a: iso(a, +m, +d), b: iso(a, +m, +d) });
  });
  t = t.replace(new RegExp(`\\b(?:el mes de |mes de )?${MES_RE}(?: (?:de|del) (?:ano |la gestion )?(\\d{4}))?\\b`, 'g'), (_m, mes, y) => {
    const m = mesNum(mes);
    const a = anioDe(m, y);
    return marca({ a: iso(a, m, 1), b: finDeMes(a, m), mes: true });
  });
  t = t.replace(/\b(?:(?:en |del |de )?(?:el )?(?:ano|anio|gestion) |en (?:el )?|del )(20\d{2})\b(?! (?:a|al|y|hasta) \d)/g, (_m, y) =>
    marca({ a: iso(+y, 1, 1), b: iso(+y, 12, 31) }),
  );

  const venceCtx = /\b(vence|vencen|vencimiento|vencera|venceran|por vencer)\b/.test(t);
  const usar = (op: Operador, valor?: string | number, valor2?: string) => fechas.push({ op, valor, valor2, vence: venceCtx });

  t = t.replace(/\b(?:del?|desde|entre) «(\d+)» (?:al?|hasta|y) «(\d+)»/g, (_m, i, j) => (usar('entre', marcas[+i].a, marcas[+j].b), ' '));
  t = t.replace(/\b(?:desde|a partir del?|despues del?) «(\d+)»/g, (_m, i) => (usar('desde', marcas[+i].a), ' '));
  t = t.replace(/\b(?:hasta|antes del?) «(\d+)»/g, (_m, i) => (usar('hasta', marcas[+i].b), ' '));
  t = t.replace(/«(\d+)»/g, (_m, i) => {
    const r = marcas[+i];
    usar(r.a === r.b ? 'igual' : 'entre', r.a, r.a === r.b ? undefined : r.b);
    return ' ';
  });

  const relativas: [RegExp, () => void][] = [
    [/\bhoy\b/, () => usar('hoy')],
    [/\bayer\b/, () => usar('ayer')],
    [/\besta semana\b/, () => usar('esta_semana')],
    [/\b(?:la )?ultima semana\b/, () => usar('ultimos_dias', 7)],
    [/\beste mes\b/, () => usar('este_mes')],
    [/\b(?:el )?mes (?:pasado|anterior)\b/, () => usar('mes_anterior')],
    [/\b(?:el )?ultimo mes\b/, () => usar('ultimos_dias', 30)],
    [/\b(?:el )?ultimo trimestre\b/, () => usar('ultimos_dias', 90)],
    [/\b(?:el )?ultimo semestre\b/, () => usar('ultimos_dias', 180)],
    [/\b(?:este ano|este anio|esta gestion|el ano actual)\b/, () => usar('este_anio')],
    [/\b(?:el )?ano (?:pasado|anterior)|la gestion (?:pasada|anterior)\b/, () => usar('anio_anterior')],
    [/\b(?:el )?ultimo ano\b/, () => usar('ultimos_dias', 365)],
  ];
  const ultimos = t.match(/\b(?:en )?(?:los |las )?ultim[oa]s (\d+) (dias|semanas|meses|anos)\b/);
  if (ultimos) {
    const factor = { dias: 1, semanas: 7, meses: 30, anos: 365 }[ultimos[2] as 'dias'];
    usar('ultimos_dias', Math.min(3650, +ultimos[1] * factor));
    t = t.replace(ultimos[0], ' ');
  }
  for (const [re, fn] of relativas) {
    if (re.test(t)) {
      fn();
      t = t.replace(re, ' ');
    }
  }

  // 3. Límite (top N)
  let limite: number | undefined;
  t = t.replace(/\b(?:top|los|las|primer[oa]s|mejores|peores|principales)\s+(\d{1,4})\b(?! ?(?:dias|semanas|meses|anos|unidades|piezas|prendas))/g, (m, n) => {
    if (limite) return m;
    limite = Math.min(2000, Math.max(1, +n));
    return ' ';
  });

  // 4. Fuente: el primer sustantivo que identifica una fuente decide de qué se habla
  const sinVentas = /\b(sin ventas|no se (?:han )?vendid[oa]s?|nunca se vendi\w*|no (?:se )?vendieron|sin movimiento)\b/.test(t);
  let fuente: Fuente = FUENTES.ventas;
  if (sinVentas) fuente = FUENTES.productos;
  else {
    let mejor = Infinity;
    const prioridad = ['creditos', 'clientes', 'inventario', 'movimientos', 'productos', 'ventas'];
    for (const clave of prioridad) {
      for (const s of FUENTES[clave].sinonimos) {
        const m = new RegExp(`\\b${escRe(s)}\\b`).exec(t);
        if (m && m.index < mejor) {
          mejor = m.index;
          fuente = FUENTES[clave];
        }
      }
    }
  }
  const campo = (clave: string) => campoDe(fuente, clave);

  // 5. Menciones de campos (sinónimo más largo primero, sin solaparse)
  const menciones: Mencion[] = [];
  const ocupado = new Array<boolean>(t.length).fill(false);
  const sinonimos = fuente.campos
    .flatMap((c) => c.sinonimos.map((s) => ({ campo: c.clave, s })))
    .sort((a, b) => b.s.length - a.s.length);
  for (const { campo: c, s } of sinonimos) {
    const re = new RegExp(`\\b${escRe(s)}\\b`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const ini = m.index;
      const fin = ini + m[0].length;
      if (ocupado.slice(ini, fin).some(Boolean)) continue;
      ocupado.fill(true, ini, fin);
      menciones.push({ campo: c, ini, fin, texto: s });
    }
  }
  menciones.sort((a, b) => a.ini - b.ini);
  const esDimension = (c?: Campo) => !!c && !c.agregado && !esMedida(c);
  const mencionEn = (pos: number) => menciones.find((m) => m.ini >= pos && m.ini <= pos + 12);

  // 6. Orden explícito (“ordenado por deuda de mayor a menor”)
  const orden: { campo: string; agregacion?: Agregacion; dir: 'asc' | 'desc' }[] = [];
  let dirGlobal: 'asc' | 'desc' | undefined;
  if (/\bde mayor a menor\b|\bdescendente\b|\bdesc\b/.test(t)) dirGlobal = 'desc';
  if (/\bde menor a mayor\b|\bascendente\b|\basc\b|\balfabetic\w*/.test(t)) dirGlobal = 'asc';
  const ordenRe = /\b(?:ordenad[oa]s?|ordenar|ordena|ordenalo|ordenalos|ordenalas|clasificad[oa]s?)\s+(?:de forma \w+ )?(?:por|segun)\s+(?:el |la |los |las |su |sus )?/g;
  let om: RegExpExecArray | null;
  while ((om = ordenRe.exec(t))) {
    const men = mencionEn(om.index + om[0].length);
    if (men) {
      orden.push({ campo: men.campo, dir: dirGlobal ?? (esDimension(campo(men.campo)) ? 'asc' : 'desc') });
      t = tapar(t, om.index, men.fin);
    }
  }

  // 7. Agrupación (“por sucursal”, “de cada categoría”, “agrupado por mes”)
  const agrupar: string[] = [];
  const grupoRe = /\b(?:agrupad[oa]s?|agrupar|desglosad[oa]s?|separad[oa]s?|dividid[oa]s?|totalizad[oa]s?)?\s*(?:por|de cada|por cada|para cada|segun|cada)\s+(?:el |la |los |las |su |sus )?/g;
  let gm: RegExpExecArray | null;
  while ((gm = grupoRe.exec(t))) {
    let men = menciones.find((m) => m.ini === gm!.index + gm![0].length);
    // “por sucursal y medio de pago”, “por mes, categoría y talla”
    while (men && esDimension(campo(men.campo))) {
      if (!agrupar.includes(men.campo)) agrupar.push(men.campo);
      const resto = t.slice(men.fin);
      const enlace = /^\s*(?:,|y|e)\s+(?:por\s+)?(?:el |la |los |las |su |sus )?/.exec(resto);
      const desde = men.fin + (enlace?.[0].length ?? 0);
      men = enlace ? menciones.find((m) => m.ini === desde) : undefined;
    }
  }
  const rankingRe = /\b(?:ranking|comparar|comparativo|comparacion|compara)\s+(?:de |entre )?(?:las |los |la |el )?/g;
  let rm: RegExpExecArray | null;
  while ((rm = rankingRe.exec(t))) {
    const men = mencionEn(rm.index + rm[0].length);
    if (men && esDimension(campo(men.campo)) && !agrupar.includes(men.campo)) agrupar.push(men.campo);
  }
  const superlativo = /\b(?:mas|menos|mejor|mejores|peor|peores)\s+(?:vendid[oa]s?|venden|vende|vendio|vendieron|ingresos|facturan|factura|dinero|unidades|rentables|exitos[oa]s|populares|pedid[oa]s)\b/.exec(t);
  const queX = /\b(?:que|cual|cuales|en que)\s+(?:la |el |las |los )?/g;
  let qm: RegExpExecArray | null;
  while ((qm = queX.exec(t))) {
    const men = menciones.find((m) => m.ini === qm!.index + qm![0].length);
    if (men && esDimension(campo(men.campo)) && superlativo && !agrupar.includes(men.campo) && fuente.clave === 'ventas') agrupar.push(men.campo);
  }
  const porLinea = ['ventas', 'inventario', 'movimientos'].includes(fuente.clave);
  if (porLinea && !agrupar.length && (superlativo || limite)) {
    const dim = menciones.find((m) => esDimension(campo(m.campo)) && !['fecha', 'fecha_hora', 'ticket'].includes(m.campo));
    if (dim && (superlativo || /\b(top|ranking)\b/.test(pregunta.toLowerCase()))) agrupar.push(dim.campo);
  }

  // 8. Criterios numéricos
  const filtros: Filtro[] = [];
  const medidaPorContexto = (): string => {
    switch (fuente.clave) {
      case 'clientes': return /\b(deb\w*|deud\w*|moros\w*|saldo|adeud\w*|credito)\b/.test(t) ? 'deuda' : 'total_comprado';
      case 'productos': return /\bvend\w*\b/.test(t) ? 'unidades_vendidas' : /\bstock|disponib\w*\b/.test(t) ? 'stock' : 'precio';
      case 'ventas': return /\b(unidades|piezas|prendas|cantidad)\b/.test(t) ? 'cantidad' : 'importe';
      default: return fuente.medidaPrincipal;
    }
  };
  const medidaCerca = (ini: number, fin: number) => {
    const cand = menciones.filter((m) => {
      const c = campo(m.campo);
      return c && esMedida(c) && !c.agregado && m.ini >= ini - 50 && m.ini <= fin + 25;
    });
    cand.sort((a, b) => Math.abs(a.ini - ini) - Math.abs(b.ini - ini));
    return cand[0]?.campo ?? medidaPorContexto();
  };
  const agregar = (clave: string, op: Operador, valor: number, valor2?: number) => {
    const agregacion = agrupar.length && !agrupar.includes(clave) ? campo(clave)?.agregacionPorDefecto ?? 'suma' : undefined;
    filtros.push({ campo: clave, op, valor, ...(valor2 != null ? { valor2 } : {}), ...(agregacion ? { agregacion } : {}) });
  };
  const patrones: [RegExp, Operador][] = [
    [new RegExp(`\\b(?:entre|de|desde)\\s+${NUM}\\s+(?:a|y|hasta|al)\\s+${NUM}\\b`, 'g'), 'entre'],
    [new RegExp(`\\b(?:mas de|mayor(?:es)? (?:a|que|de)|superior(?:es)? a|arriba de|por encima de|sobre|que superen|superen|supera|superan|pasan de|exceden)\\s+${NUM}`, 'g'), 'mayor'],
    [new RegExp(`\\b(?:al menos|como minimo|minimo|desde|a partir de|mayor o igual a|igual o mayor a)\\s+${NUM}`, 'g'), 'mayor_igual'],
    [new RegExp(`\\b(?:menos de|menor(?:es)? (?:a|que|de)|inferior(?:es)? a|por debajo de|debajo de|bajo)\\s+${NUM}`, 'g'), 'menor'],
    [new RegExp(`\\b(?:hasta|como maximo|maximo|no mas de|menor o igual a|igual o menor a)\\s+${NUM}`, 'g'), 'menor_igual'],
    [new RegExp(`\\b(?:igual a|exactamente|justo)\\s+${NUM}`, 'g'), 'igual'],
  ];
  for (const [re, op] of patrones) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const clave = medidaCerca(m.index, m.index + m[0].length);
      agregar(clave, op, +m[1], op === 'entre' ? +m[2] : undefined);
      t = tapar(t, m.index, m.index + m[0].length);
      re.lastIndex = 0;
    }
  }

  // 9. Criterios por palabras clave de cada fuente
  const tiene = (re: RegExp) => re.test(t);
  const filtroDe = (clave: string) => filtros.some((f) => f.campo === clave);
  if (fuente.clave === 'ventas') {
    const medios: [RegExp, string][] = [
      [/\befectivo\b/, 'efectivo'], [/\b(qr|codigo qr)\b/, 'qr'], [/\btarjetas?\b/, 'tarjeta'],
      [/\btransferencias?\b/, 'transferencia'], [/\bcontra ?entrega\b/, 'contra_entrega'],
      [/\b(credito|a credito|al credito|fiad[oa]s?)\b/, 'credito'],
    ];
    const elegidos = medios.filter(([re]) => tiene(re)).map(([, v]) => v);
    if (elegidos.length === 1) filtros.push({ campo: 'medio_pago', op: 'igual', valor: elegidos[0] });
    if (elegidos.length > 1) filtros.push({ campo: 'medio_pago', op: 'en', valor: elegidos });
    if (tiene(/\b(online|en linea|web|tienda virtual|internet|app)\b/)) filtros.push({ campo: 'canal', op: 'igual', valor: 'online' });
    else if (tiene(/\b(en caja|pos|presencial(es)?|tienda fisica|mostrador)\b/)) filtros.push({ campo: 'canal', op: 'igual', valor: 'pos' });
  }
  if (fuente.clave === 'clientes') {
    if (tiene(/\b(mayoristas?)\b/)) filtros.push({ campo: 'tipo_cliente', op: 'igual', valor: 'mayorista' });
    else if (tiene(/\b(minoristas?)\b/)) filtros.push({ campo: 'tipo_cliente', op: 'igual', valor: 'minorista' });
    if (tiene(/\b(deb\w*|deud\w*|adeud\w*|con saldo|moros\w*)\b/) && !filtroDe('deuda')) filtros.push({ campo: 'deuda', op: 'mayor', valor: 0 });
    if (tiene(/\b(moros[oa]s?|en mora|vencid[oa]s?|atrasad[oa]s?|con atraso)\b/)) filtros.push({ campo: 'dias_mora', op: 'mayor', valor: 0 });
    if (tiene(/\b(sin compras|nunca (?:han )?comprado|no (?:han )?comprado)\b/)) filtros.push({ campo: 'compras', op: 'igual', valor: 0 });
  }
  if (fuente.clave === 'creditos') {
    if (tiene(/\b(vencid[oa]s?|en mora|atrasad[oa]s?|moros[oa]s?)\b/)) filtros.push({ campo: 'estado', op: 'igual', valor: 'vencido' });
    else if (tiene(/\b(pagad[oa]s?|cancelad[oa]s?|saldad[oa]s?|liquidad[oa]s?)\b/)) filtros.push({ campo: 'estado', op: 'igual', valor: 'pagado' });
    else if (tiene(/\b(al dia|vigentes?)\b/)) filtros.push({ campo: 'estado', op: 'igual', valor: 'al dia' });
    else if (tiene(/\b(pendientes?|por cobrar|abiert[oa]s|activ[oa]s|con saldo)\b/) && !filtroDe('saldo')) filtros.push({ campo: 'saldo', op: 'mayor', valor: 0 });
  }
  if (fuente.clave === 'inventario' && !filtroDe('disponible')) {
    if (tiene(/\b(sin stock|agotad[oa]s?|sin existencias?)\b/)) filtros.push({ campo: 'disponible', op: 'menor_igual', valor: 0 });
    else if (tiene(/\b(stock bajo|poco stock|bajo stock|critico|por agotarse|reponer|reposicion)\b/)) filtros.push({ campo: 'disponible', op: 'menor_igual', valor: 3 });
  }
  if (fuente.clave === 'productos') {
    if (sinVentas) filtros.push({ campo: 'unidades_vendidas', op: 'igual', valor: 0 });
    if (tiene(/\b(sin stock|agotad[oa]s?)\b/)) filtros.push({ campo: 'stock', op: 'menor_igual', valor: 0 });
    if (tiene(/\b(en oferta|con descuento|rebajad[oa]s?)\b/)) filtros.push({ campo: 'descuento', op: 'mayor', valor: 0 });
  }
  if (fuente.clave === 'movimientos') {
    const tipos: [RegExp, string[]][] = [
      [/\b(ingresos? de proveedor\w*|compras? a proveedor\w*|reposiciones)\b/, ['ingreso_proveedor']],
      [/\bajustes?\b/, ['ajuste']], [/\b(traslados?|transferencias?)\b/, ['transferencia_salida', 'transferencia_entrada']],
      [/\bdevoluciones\b/, ['devolucion']], [/\breservas\b/, ['reserva']],
    ];
    const elegidos = tipos.filter(([re]) => tiene(re)).flatMap(([, v]) => v);
    if (elegidos.length) filtros.push({ campo: 'tipo', op: elegidos.length > 1 ? 'en' : 'igual', valor: elegidos.length > 1 ? elegidos : elegidos[0] });
  }

  // 10. Valores reales de la tienda (sucursal, categoría, color, clienta…)
  const tallas = /\btallas?\s+((?:x{0,3}[sml]|\d{2})(?:\s*(?:,|y|o)\s*(?:x{0,3}[sml]|\d{2}))*)\b/.exec(t);
  if (tallas && campo('talla')) {
    const lista = tallas[1].split(/\s*(?:,|y|o)\s*/).filter(Boolean).map((x) => x.toUpperCase());
    filtros.push({ campo: 'talla', op: lista.length > 1 ? 'en' : 'igual', valor: lista.length > 1 ? lista : lista[0] });
    t = tapar(t, tallas.index, tallas.index + tallas[0].length);
  }
  const destinos: [keyof Diccionario, string][] = [
    ['sucursal', 'sucursal'], ['ciudad', 'ciudad'], ['categoria', 'categoria'], ['ocasion', 'ocasion'],
    ['color', 'color'], ['producto', 'producto'], ['proveedor', 'proveedor'],
    ['clienta', fuente.clave === 'clientes' ? 'nombre' : 'clienta'],
  ];
  type Acierto = { campo: string; valor: string; ini: number; fin: number; puntos: number; completo: boolean };
  const aciertos: Acierto[] = [];
  for (const [dicClave, campoClave] of destinos) {
    const c = campo(campoClave);
    if (!c) continue;
    for (const valor of dic[dicClave]) {
      const n = normalizarTexto(valor);
      if (n.length < 3) continue;
      const raiz = n.length > 4 ? n.replace(/(?:es|s)$/, '') : n;
      const frases = [{ f: raiz, completo: true }];
      if (dicClave === 'sucursal') {
        for (const tok of n.split(/\s+/)) if (tok.length >= 5 && !['santa', 'centro', 'norte', 'sur'].includes(tok)) frases.push({ f: tok, completo: false });
      }
      for (const { f, completo } of frases) {
        const m = new RegExp(`\\b${escRe(f)}(?:s|es)?\\b`).exec(t);
        if (!m) continue;
        const antes = t.slice(Math.max(0, m.index - 22), m.index);
        const conNombre = c.sinonimos.some((s) => antes.includes(s));
        aciertos.push({ campo: campoClave, valor: completo ? valor : f, ini: m.index, fin: m.index + m[0].length, puntos: f.length + (completo ? 4 : 0) + (conNombre ? 10 : 0), completo });
      }
    }
  }
  aciertos.sort((a, b) => b.puntos - a.puntos);
  const tomados: Acierto[] = [];
  for (const a of aciertos) {
    if (tomados.some((x) => a.ini < x.fin && x.ini < a.fin)) continue;
    tomados.push(a);
  }
  const porCampo = new Map<string, Acierto[]>();
  for (const a of tomados) porCampo.set(a.campo, [...(porCampo.get(a.campo) ?? []), a]);
  for (const [clave, lista] of porCampo) {
    if (lista.length > 1 && lista.every((x) => x.completo)) filtros.push({ campo: clave, op: 'en', valor: lista.map((x) => x.valor) });
    else for (const x of lista) filtros.push({ campo: clave, op: x.completo ? 'igual' : 'contiene', valor: x.valor });
    for (const x of lista) t = tapar(t, x.ini, x.fin);
  }

  // 11. Filtros de fecha sobre el campo de fecha de la fuente
  const campoFecha = fuente.clave === 'creditos' && fechas.some((f) => f.vence) ? 'vence' : fuente.campoFecha;
  if (fechas.length && !campoFecha) avisos.push(`${fuente.etiqueta} no tiene fecha: se ignoró el período pedido.`);
  for (const f of campoFecha ? fechas : []) {
    filtros.push({ campo: campoFecha!, op: f.op, ...(f.valor != null ? { valor: f.valor } : {}), ...(f.valor2 ? { valor2: f.valor2 } : {}) });
  }

  // 12. Orden implícito (“los que más deben”, “más vendidos”, “más recientes”)
  if (!orden.length) {
    const mas = /\b(?:mas|mayor(?:es)?|mejor(?:es)?)\b/.test(t);
    const menos = /\b(?:menos|menor(?:es)?|peor(?:es)?)\b/.test(t);
    let medida: string | undefined;
    if (/\b(deb\w*|deud\w*|adeud\w*)\b/.test(t) && (mas || menos)) medida = fuente.clave === 'clientes' ? 'deuda' : 'saldo';
    else if (/\bcompr\w*\b/.test(t) && fuente.clave === 'clientes' && (mas || menos)) medida = 'total_comprado';
    else if (superlativo) medida = /\b(dinero|ingresos|facturan|factura|monto|importe|bs)\b/.test(superlativo[0] + t) ? 'importe' : /\b(unidades|piezas|prendas|vendid[oa]s)\b/.test(superlativo[0]) ? 'cantidad' : 'importe';
    else if (/\b(car[oa]s)\b/.test(t)) medida = fuente.clave === 'ventas' ? 'precio_unitario' : 'precio';
    if (medida && fuente.clave === 'productos' && medida === 'cantidad') medida = 'unidades_vendidas';
    if (medida && fuente.clave === 'productos' && medida === 'importe') medida = 'ingresos';
    if (medida && campo(medida)) orden.push({ campo: medida, dir: dirGlobal ?? (menos && !mas ? 'asc' : 'desc') });
    else if (/\b(mas recientes?|ultim[oa]s|recientes)\b/.test(t) && campoFecha) orden.push({ campo: campoFecha, dir: 'desc' });
    else if (/\b(mas antigu[oa]s|primer[oa]s)\b/.test(t) && campoFecha) orden.push({ campo: campoFecha, dir: 'asc' });
    else if (agrupar.some((g) => ['fecha', 'mes', 'anio', 'hora', 'fecha_venta'].includes(g)) && !limite) {
      orden.push({ campo: agrupar.find((g) => ['fecha', 'mes', 'anio', 'hora', 'fecha_venta'].includes(g))!, dir: dirGlobal ?? 'asc' });
    } else {
      const medidaFiltrada = filtros.find((f) => esMedida(campo(f.campo)!));
      if (medidaFiltrada) orden.push({ campo: medidaFiltrada.campo, ...(medidaFiltrada.agregacion ? { agregacion: medidaFiltrada.agregacion } : {}), dir: dirGlobal ?? 'desc' });
      else if (agrupar.length) {
        const principal = fuente.medidasAlAgrupar.find((m) => m.campo === fuente.medidaPrincipal);
        orden.push({ campo: fuente.medidaPrincipal, ...(principal?.agregacion ? { agregacion: principal.agregacion } : {}), dir: dirGlobal ?? 'desc' });
      }
    }
  }

  // 13. Columnas
  const sujeto = new Set(fuente.sinonimos);
  const explicitas = menciones.filter((m) => !sujeto.has(m.texto) && campo(m.campo) && !campo(m.campo)!.agregado);
  const medidasFiltro = filtros.filter((f) => esMedida(campo(f.campo)!)).map((f) => f.campo);
  let columnas: { campo: string; agregacion?: Agregacion }[];
  if (agrupar.length) {
    const medidas = [
      ...menciones.filter((m) => campo(m.campo)?.agregado).map((m) => m.campo),
      ...explicitas.filter((m) => esMedida(campo(m.campo)!)).map((m) => m.campo),
      ...orden.map((o) => o.campo).filter((c) => esMedida(campo(c)!) || campo(c)?.agregado),
      ...medidasFiltro,
    ];
    const unicas = [...new Set(medidas)].filter((c) => !agrupar.includes(c));
    columnas = unicas.length ? unicas.map((c) => ({ campo: c })) : fuente.medidasAlAgrupar.map((m) => ({ ...m }));
    if (unicas.length === 1 && fuente.medidasAlAgrupar[0] && campo(fuente.medidasAlAgrupar[0].campo)?.agregado && fuente.medidasAlAgrupar[0].campo !== unicas[0]) {
      columnas.unshift({ campo: fuente.medidasAlAgrupar[0].campo });
    }
  } else {
    const pedidas = [...new Set(explicitas.map((m) => m.campo))];
    const base = pedidas.length >= 2 ? pedidas : [...fuente.columnasPorDefecto, ...pedidas];
    columnas = [...new Set([...base, ...medidasFiltro, ...orden.map((o) => o.campo)])]
      .filter((c) => campo(c) && !campo(c)!.agregado)
      .map((c) => ({ campo: c }));
  }

  return {
    especificacion: {
      fuente: fuente.clave,
      columnas,
      filtros,
      agrupar,
      orden,
      limite: limite ?? 200,
      formato,
    },
    avisos,
  };
}
