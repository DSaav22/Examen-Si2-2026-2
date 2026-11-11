import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ModeloClient } from '../../ia/modelo.client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaEsquemasService } from '../../prisma/prisma-esquemas.service';
import { nombreSchemaTienda } from '../../tenancy/schema-nombre';
import { TenantContext } from '../../tenancy/tenant-context';
import { AGREGACIONES, FUENTES, ZONA_HORARIA, campoDe } from './catalogo';
import { ColumnaResultado, compilar } from './compilador';
import { Especificacion, EspecificacionInvalida, Formato, describir, operadoresDe, validarEspecificacion } from './especificacion';
import { Fila, aExcel, aPdf } from './exportadores';
import { promptInterprete, leerJson } from './interprete-modelo';
import { Diccionario, interpretarConReglas } from './interprete-reglas';

export type Motor = 'modelo' | 'reglas' | 'manual';

export const EJEMPLOS = [
  'Lista de los clientes con su nombre, dirección y email de los que me deben de 100 a 500 Bs por ventas al crédito',
  'Los 10 productos más vendidos de los últimos 90 días en Excel',
  'Ventas por sucursal y medio de pago de este mes',
  'Créditos vencidos ordenados por días de mora en PDF',
  'Stock bajo de vestidos por sucursal',
  'Clientes que más compraron este año con su email',
  'Ventas por mes del último semestre con más de 2000 Bs',
  'Productos sin ventas con su stock',
];

const MINUTOS_SIN_MODELO = 5;

@Injectable()
export class ReportesInteligentesService {
  private readonly log = new Logger(ReportesInteligentesService.name);
  private readonly diccionarios = new Map<string, { hasta: number; dic: Diccionario }>();
  private modeloCaidoHasta = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelo: ModeloClient,
    private readonly esquemas: PrismaEsquemasService,
  ) {}

  catalogo() {
    return {
      fuentes: Object.values(FUENTES).map((f) => ({
        clave: f.clave,
        etiqueta: f.etiqueta,
        descripcion: f.descripcion,
        campos: f.campos.map((c) => ({
          clave: c.clave,
          etiqueta: c.etiqueta,
          tipo: c.tipo,
          agregado: !!c.agregado,
          valores: c.valores ?? null,
          descripcion: c.descripcion ?? null,
          operadores: operadoresDe(c.tipo),
        })),
      })),
      agregaciones: Object.keys(AGREGACIONES),
      ejemplos: EJEMPLOS,
      modelo: { configurado: this.modelo.configurado(), disponible: this.modelo.configurado() && Date.now() > this.modeloCaidoHasta },
    };
  }

  /** Fecha de hoy en Bolivia, AAAA-MM-DD. */
  private hoy() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());
  }

  private async diccionario(): Promise<Diccionario> {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const cache = this.diccionarios.get(tiendaId);
    if (cache && cache.hasta > Date.now()) return cache.dic;
    const db = this.esquemas.clienteTienda(tiendaId);
    const [sucursales, productos, colores, proveedores, clientas] = await Promise.all([
      db.sucursal.findMany({ select: { nombre: true, ciudad: true } }),
      db.producto.findMany({ select: { nombre: true, categoria: true, ocasion: true }, take: 500 }),
      db.variante.findMany({ select: { color: true }, distinct: ['color'], take: 100 }),
      db.proveedor.findMany({ select: { nombre: true }, take: 100 }),
      db.usuario.findMany({ where: { rol: 'CLIENTA' }, select: { nombre: true }, take: 800 }),
    ]);
    const unicos = (xs: (string | null | undefined)[]) => [...new Set(xs.map((x) => x?.trim()).filter((x): x is string => !!x))];
    const dic: Diccionario = {
      sucursal: unicos(sucursales.map((s) => s.nombre)),
      ciudad: unicos(sucursales.map((s) => s.ciudad)),
      categoria: unicos(productos.map((p) => p.categoria)),
      ocasion: unicos(productos.map((p) => p.ocasion)),
      color: unicos(colores.map((c) => c.color)),
      producto: unicos(productos.map((p) => p.nombre)).filter((n) => n.length >= 5),
      proveedor: unicos(proveedores.map((p) => p.nombre)),
      clienta: unicos(clientas.map((c) => c.nombre)).filter((n) => n.includes(' ')),
    };
    this.diccionarios.set(tiendaId, { hasta: Date.now() + 60_000, dic });
    return dic;
  }

  /** Lenguaje natural → especificación. Primero la IA; si no está o se equivoca, las reglas. */
  async interpretar(pregunta: string): Promise<{ especificacion: Especificacion; motor: Motor; avisos: string[] }> {
    const [dic, hoy] = [await this.diccionario(), this.hoy()];
    const avisos: string[] = [];

    if (this.modelo.configurado() && Date.now() > this.modeloCaidoHasta) {
      const respuesta = await this.modelo.completar(
        [
          { role: 'system', content: promptInterprete(hoy, dic) },
          { role: 'user', content: pregunta.slice(0, 600) },
        ],
        true,
      );
      const raw = leerJson(respuesta);
      if (!respuesta) {
        this.modeloCaidoHasta = Date.now() + MINUTOS_SIN_MODELO * 60_000;
        avisos.push('El modelo de IA no respondió; se usó el intérprete local por reglas.');
      } else if (raw) {
        try {
          const especificacion = validarEspecificacion(raw);
          const delModelo = Array.isArray(raw.avisos) ? raw.avisos.filter((a): a is string => typeof a === 'string').slice(0, 5) : [];
          return { especificacion, motor: 'modelo', avisos: delModelo };
        } catch (e) {
          const detalle = e instanceof EspecificacionInvalida ? e.detalle : String(e);
          this.log.warn(`Especificación del modelo rechazada: ${detalle}`);
          avisos.push(`La IA propuso un reporte que no pasó la validación (${detalle}); se usó el intérprete por reglas.`);
        }
      }
    }

    const reglas = interpretarConReglas(pregunta, dic, hoy);
    try {
      return { especificacion: validarEspecificacion(reglas.especificacion), motor: 'reglas', avisos: [...avisos, ...reglas.avisos] };
    } catch (e) {
      throw this.comoBadRequest(e);
    }
  }

  async generar(pregunta: string, adminId: string) {
    const { especificacion, motor, avisos } = await this.interpretar(pregunta);
    return this.ejecutar(especificacion, { pregunta, adminId, motor, avisos });
  }

  /** Corre una especificación (recién interpretada o editada a mano en la pantalla). */
  async ejecutar(raw: unknown, meta: { pregunta?: string; adminId: string; motor: Motor; avisos?: string[] }) {
    let compilado: ReturnType<typeof compilar>;
    try {
      compilado = compilar(validarEspecificacion(raw));
    } catch (e) {
      throw this.comoBadRequest(e);
    }
    const spec = compilado.especificacion;
    const inicio = Date.now();
    const crudas = await this.consultar(compilado.sql, compilado.parametros);
    const ms = Date.now() - inicio;
    const filas = crudas.map((f) => serializar(f, compilado.columnas));
    const totales = calcularTotales(filas, compilado.columnas);

    const tiendaId = TenantContext.tiendaIdOrThrow();
    await this.esquemas.clienteTienda(tiendaId).reporteEjecucion.create({
      data: {
        tiendaId,
        pregunta: (meta.pregunta ?? spec.titulo).slice(0, 500),
        sql: compilado.sql,
        filas: filas.length,
        especificacion: spec as unknown as Prisma.InputJsonValue,
        adminId: meta.adminId,
      },
    });

    const avisos = [...(meta.avisos ?? [])];
    if (filas.length === spec.limite) avisos.push(`Se muestran las primeras ${spec.limite} filas; afiná los criterios o subí el límite para ver más.`);

    return {
      titulo: spec.titulo,
      pregunta: meta.pregunta ?? null,
      motor: meta.motor,
      modeloConfigurado: this.modelo.configurado(),
      especificacion: spec,
      interpretacion: describir(spec),
      columnas: compilado.columnas,
      filas,
      totales,
      narracion: narrar(spec, compilado.columnas, filas, totales),
      avisos,
      sql: compilado.sql,
      parametros: compilado.parametros,
      ms,
    };
  }

  async exportar(raw: unknown, formato: Exclude<Formato, 'pantalla'>, adminId: string, motor: Motor, pregunta?: string) {
    const r = await this.ejecutar(raw, { adminId, motor, pregunta });
    const tienda = await this.prisma.tienda.findUnique({ where: { id: TenantContext.tiendaIdOrThrow() }, select: { nombre: true } });
    const datos = {
      tienda: tienda?.nombre ?? 'Tienda',
      titulo: r.titulo,
      generadoEn: new Date(),
      criterios: r.interpretacion,
      columnas: r.columnas,
      filas: r.filas,
      totales: r.totales,
      sql: r.sql,
      parametros: r.parametros,
      avisos: r.avisos,
      motor: r.motor === 'modelo' ? 'IA (Google Gemini)' : r.motor === 'reglas' ? 'reglas locales' : 'edición manual',
    };
    const base = r.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'reporte';
    if (formato === 'excel') {
      return { buffer: await aExcel(datos), nombre: `${base}.xlsx`, tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return { buffer: await aPdf(datos), nombre: `${base}.pdf`, tipo: 'application/pdf' };
  }

  /** SQL de reportes: la tienda se fija en la sesión de Postgres dentro de la misma transacción. */
  private async consultar(sql: string, parametros: unknown[]) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const esquemaEsperado = nombreSchemaTienda(tiendaId);
    return this.esquemas.clienteTienda(tiendaId).$transaction(async (tx) => {
      const [contexto] = await tx.$queryRaw<{ esquema: string; tienda: string }[]>`
        SELECT current_schema() AS esquema, set_config('app.tienda_id', ${tiendaId}, true) AS tienda`;
      if (contexto?.esquema !== esquemaEsperado || contexto.tienda !== tiendaId) {
        throw new Error('CONTEXTO_TIENDA_INVALIDO');
      }
      return tx.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...parametros);
    });
  }

  private comoBadRequest(e: unknown) {
    if (e instanceof EspecificacionInvalida) {
      return new BadRequestException({ codigo: e.codigo, mensaje: e.detalle });
    }
    return e instanceof Error ? e : new Error(String(e));
  }
}

function serializar(fila: Record<string, unknown>, columnas: ColumnaResultado[]): Fila {
  const out: Fila = {};
  for (const c of columnas) {
    const v = fila[c.clave];
    if (v == null) out[c.clave] = null;
    else if (v instanceof Date) out[c.clave] = c.tipo === 'fechahora' ? v.toISOString().slice(0, 19).replace('T', ' ') : v.toISOString().slice(0, 10);
    else if (v instanceof Prisma.Decimal) out[c.clave] = Number(v);
    else if (typeof v === 'bigint') out[c.clave] = Number(v);
    else out[c.clave] = v as string | number;
  }
  return out;
}

function calcularTotales(filas: Fila[], columnas: ColumnaResultado[]): Record<string, number> | null {
  const sumables = columnas.filter((c) => c.totalizable);
  if (!sumables.length || !filas.length) return null;
  const totales: Record<string, number> = {};
  for (const c of sumables) {
    totales[c.clave] = Math.round(filas.reduce((acc, f) => acc + Number(f[c.clave] ?? 0), 0) * 100) / 100;
  }
  return totales;
}

const bs = (n: number) => `Bs ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Resumen escrito a partir de los números reales del resultado (no lo inventa un modelo). */
function narrar(spec: Especificacion, columnas: ColumnaResultado[], filas: Fila[], totales: Record<string, number> | null) {
  const fuente = FUENTES[spec.fuente];
  const d = describir(spec);
  if (!filas.length) {
    return `Ningún registro de ${fuente.etiqueta.toLowerCase()} cumple ${d.filtros.length ? `los criterios: ${d.filtros.join('; ')}` : 'lo pedido'}.`;
  }
  const partes = [`${filas.length} ${filas.length === 1 ? 'fila' : 'filas'} de ${fuente.etiqueta.toLowerCase()}`];
  const dinero = columnas.find((c) => c.totalizable && c.tipo === 'dinero');
  if (dinero && totales) partes[0] += `, con ${dinero.etiqueta.toLowerCase()} de ${bs(totales[dinero.clave])}`;
  partes[0] += '.';

  const dimension = columnas.find((c) => !c.agregacion && !campoDe(fuente, c.campo)?.agregado && c.tipo === 'texto');
  const medida = dinero ?? columnas.find((c) => c.totalizable);
  if (dimension && medida && filas.length > 1) {
    const orden = spec.orden[0];
    const primero = orden
      ? filas[0]
      : filas.reduce((max, f) => (Number(f[medida.clave] ?? 0) > Number(max[medida.clave] ?? 0) ? f : max));
    const valor = Number(primero[medida.clave] ?? 0);
    const porMedida = !orden || orden.campo === medida.campo;
    const grupos = columnas.filter((c) => !c.agregacion && spec.agrupar.includes(c.campo));
    const nombre = grupos.length ? grupos.map((g) => primero[g.clave] ?? '—').join(' · ') : primero[dimension.clave];
    if (porMedida && totales?.[medida.clave]) {
      const pct = Math.round((valor / totales[medida.clave]) * 100);
      const cifra = medida.tipo === 'dinero' ? bs(valor) : valor.toLocaleString('es-BO');
      partes.push(`${orden?.dir === 'asc' ? 'Al final queda' : 'Encabeza'} ${nombre} con ${cifra} (${pct}% del total listado).`);
    }
  }
  if (d.filtros.length) partes.push(`Criterios: ${d.filtros.join('; ')}.`);
  return partes.join(' ');
}
