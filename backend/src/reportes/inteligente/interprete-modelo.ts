import { AGREGACIONES, FUENTES } from './catalogo';
import { operadoresDe } from './especificacion';
import type { Diccionario } from './interprete-reglas';

/**
 * Prompt del intérprete con IA. El modelo no ve la base ni escribe SQL: recibe el catálogo
 * semántico y devuelve una especificación JSON que después valida y compila el backend.
 */
export function promptInterprete(hoyIso: string, dic: Diccionario): string {
  const fuentes = Object.values(FUENTES)
    .map((f) => {
      const campos = f.campos
        .map((c) => {
          const extra = [c.agregado ? 'ya es total' : '', c.valores ? `valores: ${c.valores.join('|')}` : ''].filter(Boolean).join('; ');
          return `${c.clave} (${c.tipo}${extra ? `; ${extra}` : ''})`;
        })
        .join(', ');
      return `- ${f.clave}: ${f.descripcion}\n  campos: ${campos}`;
    })
    .join('\n');

  const lista = (xs: string[], n = 40) => (xs.length ? xs.slice(0, n).join(' | ') : '(sin datos)');

  return `Eres el intérprete de reportes de una tienda de ropa en Bolivia (moneda Bs).
Conviertes lo que pide el usuario en una ESPECIFICACIÓN JSON de reporte. Nunca escribes SQL.
Hoy es ${hoyIso} (hora de Bolivia).

FUENTES (elige exactamente una):
${fuentes}

AGREGACIONES: ${Object.keys(AGREGACIONES).join(', ')}.
OPERADORES de filtro:
- texto: ${operadoresDe('texto').join(', ')}
- números: ${operadoresDe('numero').join(', ')}
- fechas: ${operadoresDe('fecha').join(', ')} (valores AAAA-MM-DD; ultimos_dias lleva un entero)

VALORES REALES DE LA TIENDA (usa estos textos tal cual en los filtros):
- sucursales: ${lista(dic.sucursal)}
- ciudades: ${lista(dic.ciudad)}
- categorías: ${lista(dic.categoria)}
- ocasiones: ${lista(dic.ocasion)}
- colores: ${lista(dic.color)}
- proveedores: ${lista(dic.proveedor)}

RESPONDE SOLO este JSON:
{"titulo": "...", "fuente": "...", "columnas": [{"campo": "...", "agregacion": "opcional"}],
 "filtros": [{"campo": "...", "op": "...", "valor": "...", "valor2": "solo en entre", "agregacion": "solo si filtra un total de grupo"}],
 "agrupar": ["campo"], "orden": [{"campo": "...", "agregacion": "opcional", "dir": "asc|desc"}],
 "limite": 200, "formato": "pantalla|pdf|excel", "avisos": ["datos pedidos que no existen"]}

REGLAS:
- Usa solo campos de la fuente elegida. Si piden un dato que no existe (teléfono, CI, costo…), no lo inventes: omítelo y explícalo en "avisos".
- Las columnas son lo que el usuario quiere ver; si no dice nada, deja "columnas" vacío y el sistema pone las habituales.
- Si agrupas, las medidas llevan agregación (suma, promedio…). Un criterio sobre el total de un grupo lleva "agregacion" en el filtro.
- "más vendidos" ordena por suma de unidades (o importe si habla de dinero) de mayor a menor. "Top N" o "los N" es el límite.
- Para nombres de sucursal, producto o clienta usa "contiene" si el usuario dio solo una parte del nombre.
- "formato" es excel o pdf solo si lo pide; si no, pantalla.

EJEMPLOS:
Usuario: sácame una lista de los clientes con su nombre, su dirección y su email, de los que me deben de 200 a 800 bolivianos por ventas al crédito
{"titulo":"Clientes con deuda entre Bs 200 y Bs 800","fuente":"clientes","columnas":[{"campo":"nombre"},{"campo":"direccion"},{"campo":"email"},{"campo":"deuda"}],"filtros":[{"campo":"deuda","op":"entre","valor":200,"valor2":800}],"agrupar":[],"orden":[{"campo":"deuda","dir":"desc"}],"limite":200,"formato":"pantalla","avisos":[]}
Usuario: los 5 productos más vendidos este mes en excel
{"titulo":"Top 5 productos del mes","fuente":"ventas","columnas":[{"campo":"producto"},{"campo":"cantidad","agregacion":"suma"},{"campo":"importe","agregacion":"suma"}],"filtros":[{"campo":"fecha","op":"este_mes"}],"agrupar":["producto"],"orden":[{"campo":"cantidad","agregacion":"suma","dir":"desc"}],"limite":5,"formato":"excel","avisos":[]}
Usuario: ventas por sucursal y medio de pago del mes pasado, solo grupos que pasen 1000 Bs, en pdf
{"titulo":"Ventas por sucursal y medio de pago (mes pasado)","fuente":"ventas","columnas":[{"campo":"tickets"},{"campo":"importe","agregacion":"suma"}],"filtros":[{"campo":"fecha","op":"mes_anterior"},{"campo":"importe","op":"mayor","valor":1000,"agregacion":"suma"}],"agrupar":["sucursal","medio_pago"],"orden":[{"campo":"importe","agregacion":"suma","dir":"desc"}],"limite":200,"formato":"pdf","avisos":[]}
Usuario: créditos vencidos con más de 15 días de mora y el teléfono de la clienta
{"titulo":"Créditos vencidos con más de 15 días de mora","fuente":"creditos","columnas":[{"campo":"clienta"},{"campo":"email"},{"campo":"saldo"},{"campo":"vence"},{"campo":"dias_mora"}],"filtros":[{"campo":"estado","op":"igual","valor":"vencido"},{"campo":"dias_mora","op":"mayor","valor":15}],"agrupar":[],"orden":[{"campo":"dias_mora","dir":"desc"}],"limite":200,"formato":"pantalla","avisos":["El teléfono de la clienta no se registra en el sistema."]}`;
}

export function leerJson(texto: string | null): Record<string, unknown> | null {
  if (!texto) return null;
  const limpio = texto.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    const data = JSON.parse(limpio) as unknown;
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
