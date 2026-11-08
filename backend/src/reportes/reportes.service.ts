import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ModeloClient } from '../ia/modelo.client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { compilarPregunta, validarSelect } from './sql-seguro';

const DE_LA_TIENDA = "current_setting('app.tienda_id', true)";

const COLUMNAS = 'fecha_hora, sucursal_nombre, cajero_nombre, cliente_nombre, producto_nombre, talla, color, cantidad, precio_unitario, subtotal, medio_pago, variante_sku';

@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelo: ModeloClient,
  ) {}

  /**
   * SQL crudo de reportes: la extensión de Prisma no lo ve, así que la tienda se fija en la
   * sesión de Postgres (set_config local a la transacción). La vista v_reporte_ventas y los
   * filtros `tienda_id = current_setting('app.tienda_id', true)` dependen de ese valor.
   */
  private async consultar<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const [, filas] = await this.prisma.$transaction([
      this.prisma.$queryRaw`SELECT set_config('app.tienda_id', ${tiendaId}, true)`,
      this.prisma.$queryRawUnsafe<T[]>(sql),
    ]);
    return filas;
  }

  async contexto() {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const modeloOk = this.modelo.configurado();
    const [ventas, reportesHoy, stockLineas, recientes] = await Promise.all([
      this.prisma.venta.aggregate({
        where: { creadaEn: { gte: inicio }, estado: 'cobrada' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.reporteEjecucion.count({ where: { creadaEn: { gte: inicio } } }),
      this.prisma.stockAlmacen.count({ where: { cantidad: { gt: 0 } } }),
      this.prisma.reporteEjecucion.findMany({
        orderBy: { creadaEn: 'desc' },
        take: 8,
        select: { id: true, pregunta: true, filas: true, creadaEn: true },
      }),
    ]);

    return {
      modelo: {
        configurado: modeloOk,
        mensaje: modeloOk
          ? 'Azure OpenAI configurado: el compilador intentará usar el modelo y cae a reglas si falla.'
          : 'Sin AZURE_OPENAI_ENDPOINT/API_KEY: las consultas usan el compilador por reglas (sigue siendo válido para el examen).',
      },
      resumen: {
        ventasHoy: Number(ventas._sum.total ?? 0),
        operacionesHoy: ventas._count,
        stockLineas,
        reportesHoy,
      },
      recientes,
      sugerencias: [
        { label: 'Ventas por sucursal', pregunta: 'comparar ventas por sucursal' },
        { label: 'Top productos', pregunta: 'productos más vendidos por cantidad' },
      ],
      filtros: {
        periodos: [
          { id: 'hoy', label: 'Hoy' },
          { id: '7d', label: 'Últimos 7 días' },
          { id: 'todo', label: 'Todo el historial' },
        ],
        reportes: [
          { id: 'sucursales', label: 'Ranking sucursales', desc: 'Cuál vende más y cuál menos' },
          { id: 'productos', label: 'Top productos', desc: 'Prendas y montos' },
          { id: 'medios', label: 'Medios de pago', desc: 'Efectivo, QR, tarjeta…' },
          { id: 'clientes', label: 'Mejores clientas', desc: 'Quién compra más' },
          { id: 'detalle', label: 'Detalle de ventas', desc: 'Líneas cobradas del período' },
          { id: 'stock_bajo', label: 'Stock crítico', desc: 'Variantes con poca existencia' },
        ],
      },
      sucursales: await this.prisma.sucursal.findMany({
        select: { id: true, nombre: true, ciudad: true },
        orderBy: { nombre: 'asc' },
      }),
    };
  }

  /** Panel: varios rankings de una vez para la vista de negocio. */
  async panel(adminId: string, periodo?: string, sucursal?: string) {
    const p = normalizarPeriodo(periodo);
    const [sucursales, productos, medios, stockBajo, kpis] = await Promise.all([
      this.queryNegocio('sucursales', p, sucursal),
      this.queryNegocio('productos', p, sucursal),
      this.queryNegocio('medios', p, sucursal),
      this.queryStockBajo(),
      this.kpisPeriodo(p, sucursal),
    ]);
    void adminId;
    const limpio = (r: {
      titulo: string
      columnas: string[]
      filas: Record<string, string | number | null>[]
      narracion: string
      barras: { label: string; valor: number; pct?: number }[]
    }) => ({
      titulo: r.titulo,
      columnas: r.columnas,
      filas: r.filas,
      narracion: r.narracion,
      barras: r.barras,
    });
    return {
      periodo: p,
      sucursal: sucursal || null,
      kpis,
      sucursales: limpio(sucursales),
      productos: { ...limpio(productos), filas: productos.filas.slice(0, 8) },
      medios: limpio(medios),
      stockBajo: { ...limpio(stockBajo), filas: stockBajo.filas.slice(0, 8) },
      insight: armarInsight(sucursales.filas, kpis),
    };
  }

  async negocio(tipo: string, periodo: string | undefined, sucursal: string | undefined, adminId: string) {
    const p = normalizarPeriodo(periodo);
    const result =
      tipo === 'stock_bajo'
        ? await this.queryStockBajo()
        : await this.queryNegocio(tipo, p, sucursal);

    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta: result.titulo,
        sql: result.sqlInterno,
        filas: result.filas.length,
        adminId,
      },
    });

    return this.sinSql({
      titulo: result.titulo,
      columnas: result.columnas,
      filas: result.filas,
      narracion: result.narracion,
      fuente: 'reglas' as const,
      modeloConfigurado: this.modelo.configurado(),
      aviso: result.filas.length ? null : 'No hay datos para este filtro. Probá otro período o cobrá ventas en el POS.',
      tipo,
      periodo: p,
      barras: result.barras,
    });
  }

  private async kpisPeriodo(periodo: Periodo, sucursal?: string) {
    const filtroFecha = filtroFechaSql(periodo, 'v.creada_en');
    const filtroSuc = sucursal
      ? ` AND s.nombre ILIKE '%${escaparLike(sucursal)}%'`
      : '';
    const rows = await this.consultar<{ total: unknown; operaciones: unknown }>(
      `SELECT COALESCE(SUM(v.total), 0) AS total,
              COUNT(v.id)::int AS operaciones
       FROM ventas v
       JOIN almacenes a ON a.id = v.almacen_id
       JOIN sucursales s ON s.id = a.sucursal_id
       WHERE v.tienda_id = ${DE_LA_TIENDA} AND v.estado = 'cobrada'${filtroFecha}${filtroSuc}`,
    );
    const fechaVista = filtroFechaSql(periodo, 'fecha_hora');
    const sucVista = sucursal
      ? ` AND sucursal_nombre ILIKE '%${escaparLike(sucursal)}%'`
      : '';
    const unidadesRows = await this.consultar<{ unidades: unknown }>(
      `SELECT COALESCE(SUM(cantidad), 0)::int AS unidades
       FROM v_reporte_ventas WHERE TRUE${fechaVista}${sucVista}`,
    );
    const row = rows[0];
    return {
      totalBs: Number(row?.total ?? 0),
      operaciones: Number(row?.operaciones ?? 0),
      unidades: Number(unidadesRows[0]?.unidades ?? 0),
    };
  }

  private async queryNegocio(tipo: string, periodo: Periodo, sucursal?: string) {
    const fecha = filtroFechaSql(periodo, 'fecha_hora');
    const suc = sucursal
      ? ` AND sucursal_nombre ILIKE '%${escaparLike(sucursal)}%'`
      : '';
    const whereExtra = `${fecha}${suc}`;

    if (tipo === 'productos') {
      const sql = `SELECT producto_nombre AS producto, SUM(cantidad)::int AS unidades, SUM(subtotal) AS total_bs
        FROM v_reporte_ventas WHERE TRUE${whereExtra}
        GROUP BY producto_nombre ORDER BY total_bs DESC LIMIT 30`;
      const filas = this.serializar(await this.consultar(sql));
      return {
        titulo: 'Productos más vendidos',
        sqlInterno: sql,
        columnas: ['producto', 'unidades', 'total_bs'],
        filas,
        narracion: filas.length
          ? `Top ${filas.length} productos por monto en el período.`
          : 'Sin ventas de productos en este período.',
        barras: filas.slice(0, 6).map(f => ({
          label: String(f.producto ?? ''),
          valor: Number(f.total_bs ?? 0),
        })),
      };
    }

    if (tipo === 'medios') {
      const sql = `SELECT medio_pago, COUNT(*)::int AS tickets, SUM(subtotal) AS total_bs
        FROM v_reporte_ventas WHERE TRUE${whereExtra}
        GROUP BY medio_pago ORDER BY total_bs DESC LIMIT 20`;
      const filas = this.serializar(await this.consultar(sql));
      return {
        titulo: 'Medios de pago',
        sqlInterno: sql,
        columnas: ['medio_pago', 'tickets', 'total_bs'],
        filas,
        narracion: filas.length
          ? 'Distribución de cobros según medio de pago.'
          : 'Sin cobros en el período.',
        barras: filas.map(f => ({
          label: String(f.medio_pago ?? ''),
          valor: Number(f.total_bs ?? 0),
        })),
      };
    }

    if (tipo === 'clientes') {
      const sql = `SELECT COALESCE(cliente_nombre, 'Sin clienta') AS clienta,
               COUNT(DISTINCT venta_id)::int AS compras, SUM(subtotal) AS total_bs
        FROM v_reporte_ventas WHERE TRUE${whereExtra}
        GROUP BY cliente_nombre ORDER BY total_bs DESC LIMIT 30`;
      const filas = this.serializar(await this.consultar(sql));
      return {
        titulo: 'Clientas con más compras',
        sqlInterno: sql,
        columnas: ['clienta', 'compras', 'total_bs'],
        filas,
        narracion: filas.length
          ? 'Ranking de clientas por monto acumulado.'
          : 'Sin clientas asociadas a ventas cobradas.',
        barras: filas.slice(0, 6).map(f => ({
          label: String(f.clienta ?? ''),
          valor: Number(f.total_bs ?? 0),
        })),
      };
    }

    if (tipo === 'detalle') {
      const sql = `SELECT fecha_hora, sucursal_nombre AS sucursal, cliente_nombre AS clienta,
               producto_nombre AS producto, talla, color, cantidad, subtotal AS total_bs, medio_pago
        FROM v_reporte_ventas WHERE TRUE${whereExtra}
        ORDER BY fecha_hora DESC LIMIT 100`;
      const filas = this.serializar(await this.consultar(sql));
      return {
        titulo: 'Detalle de ventas',
        sqlInterno: sql,
        columnas: ['fecha_hora', 'sucursal', 'clienta', 'producto', 'talla', 'color', 'cantidad', 'total_bs', 'medio_pago'],
        filas,
        narracion: filas.length
          ? `${filas.length} líneas de venta cobrada.`
          : 'No hay ventas cobradas en este filtro.',
        barras: [] as { label: string; valor: number }[],
      };
    }

    // default: sucursales
    const sql = `SELECT sucursal_nombre AS sucursal,
             COUNT(DISTINCT venta_id)::int AS tickets,
             SUM(cantidad)::int AS unidades,
             SUM(subtotal) AS total_bs
      FROM v_reporte_ventas WHERE TRUE${whereExtra}
      GROUP BY sucursal_nombre ORDER BY total_bs DESC LIMIT 20`;
    const filas = this.serializar(await this.consultar(sql));
    const max = Math.max(...filas.map(f => Number(f.total_bs ?? 0)), 1);
    return {
      titulo: 'Ventas por sucursal',
      sqlInterno: sql,
      columnas: ['sucursal', 'tickets', 'unidades', 'total_bs'],
      filas,
      narracion: filas.length
        ? `La que más vende: ${filas[0]?.sucursal ?? '—'} (Bs ${Number(filas[0]?.total_bs ?? 0).toFixed(2)}). ${
            filas.length > 1
              ? `La que menos en el ranking: ${filas[filas.length - 1]?.sucursal} (Bs ${Number(filas[filas.length - 1]?.total_bs ?? 0).toFixed(2)}).`
              : 'Solo hay datos de una sucursal.'
          }`
        : 'Ninguna sucursal tiene ventas cobradas en este período.',
      barras: filas.map(f => ({
        label: String(f.sucursal ?? ''),
        valor: Number(f.total_bs ?? 0),
        pct: Math.round((Number(f.total_bs ?? 0) / max) * 100),
      })),
    };
  }

  private async queryStockBajo() {
    const sql = `SELECT s.nombre AS sucursal, p.nombre AS producto, v.talla, v.color, v.sku,
            sa.cantidad, sa.reservado, (sa.cantidad - sa.reservado) AS disponible
     FROM stock_almacen sa
     JOIN variantes v ON v.id = sa.variante_id
     JOIN productos p ON p.id = v.producto_id
     JOIN almacenes a ON a.id = sa.almacen_id
     JOIN sucursales s ON s.id = a.sucursal_id
     WHERE sa.tienda_id = ${DE_LA_TIENDA} AND (sa.cantidad - sa.reservado) <= 2
     ORDER BY disponible ASC, s.nombre LIMIT 50`;
    const filas = this.serializar(await this.consultar(sql));
    return {
      titulo: 'Stock crítico (≤ 2 disponibles)',
      sqlInterno: sql,
      columnas: ['sucursal', 'producto', 'talla', 'color', 'sku', 'disponible', 'reservado'],
      filas,
      narracion: filas.length
        ? `${filas.length} variantes con stock bajo. Priorizá reposición o traslado.`
        : 'No hay stock crítico: todas las variantes tienen más de 2 unidades disponibles.',
      barras: [] as { label: string; valor: number }[],
    };
  }

  private sinSql<T extends Record<string, unknown>>(payload: T) {
    return payload;
  }

  async inventario(adminId: string) {
    const filas = await this.consultar(
      `SELECT s.nombre AS sucursal, a.nombre AS almacen, p.nombre AS producto,
              v.talla, v.color, v.sku,
              sa.cantidad, sa.reservado,
              (sa.cantidad - sa.reservado) AS disponible
       FROM stock_almacen sa
       JOIN variantes v ON v.id = sa.variante_id
       JOIN productos p ON p.id = v.producto_id
       JOIN almacenes a ON a.id = sa.almacen_id
       JOIN sucursales s ON s.id = a.sucursal_id
       WHERE sa.tienda_id = ${DE_LA_TIENDA}
       ORDER BY s.nombre, p.nombre
       LIMIT 200`,
    );
    const sql =
      'SELECT stock por sucursal/almacén (vista operativa inventario) LIMIT 200';
    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta: 'Inventario global',
        sql,
        filas: filas.length,
        adminId,
      },
    });
    return this.sinSql({
      titulo: 'Inventario por sucursal',
      columnas: filas[0] ? Object.keys(filas[0]) : [],
      filas: this.serializar(filas),
      fuente: 'reglas' as const,
      modeloConfigurado: this.modelo.configurado(),
      narracion: filas.length
        ? `Hay ${filas.length} líneas de stock con cantidad disponible.`
        : 'No hay stock cargado todavía.',
      aviso: null as string | null,
    });
  }

  async delDia(sucursal: string | undefined, adminId: string) {
    const filtro = sucursal
      ? ` AND sucursal_nombre ILIKE '%${sucursal.replace(/'/g, "''").slice(0, 80)}%'`
      : '';
    const compilado = {
      titulo: sucursal
        ? `Ventas del día · ${sucursal}`
        : 'Ventas del día (todas las sucursales)',
      sql: `SELECT sucursal_nombre, cajero_nombre, producto_nombre, talla, color,
                   SUM(cantidad) AS unidades, SUM(subtotal) AS total
            FROM v_reporte_ventas
            WHERE fecha_hora::date = CURRENT_DATE${filtro}
            GROUP BY sucursal_nombre, cajero_nombre, producto_nombre, talla, color
            ORDER BY total DESC LIMIT 200`,
    };
    const sql = validarSelect(compilado.sql);
    const filas = await this.consultar(sql);
    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta: compilado.titulo,
        sql,
        filas: filas.length,
        adminId,
      },
    });
    return this.sinSql({
      titulo: compilado.titulo,
      columnas: filas[0] ? Object.keys(filas[0]) : [],
      filas: this.serializar(filas),
      fuente: 'reglas' as const,
      modeloConfigurado: this.modelo.configurado(),
      narracion: filas.length
        ? `Se encontraron ${filas.length} grupos de venta cobrada hoy.`
        : 'No hay ventas cobradas con fecha de hoy en la vista de reportes.',
      aviso: filas.length
        ? null
        : 'Tip: cobrá una venta en el POS o cambiá el período a “Todo el historial”.',
    });
  }

  async generar(pregunta: string, adminId: string) {
    const compilado = await this.compilarConModelo(pregunta);
    let sql: string;
    try {
      sql = validarSelect(compilado.sql);
    } catch (error) {
      throw new BadRequestException({
        codigo: (error as Error).message,
      });
    }

    const filas = await this.consultar(sql);
    const columnas = filas[0] ? Object.keys(filas[0]) : [];
    const serializadas = this.serializar(filas);
    const narracion = await this.narrar(
      pregunta,
      serializadas.slice(0, 12),
      compilado.fuente,
    );

    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta,
        sql,
        filas: filas.length,
        adminId,
      },
    });

    return this.sinSql({
      titulo: compilado.titulo,
      columnas,
      filas: serializadas,
      narracion,
      fuente: compilado.fuente,
      modeloConfigurado: this.modelo.configurado(),
      aviso: filas.length
        ? null
        : 'No hubo filas para esa pregunta. Probá un reporte de negocio (sucursales, productos) o ampliá el período.',
    });
  }

  private async compilarConModelo(pregunta: string) {
    const propuesto = await this.modelo.completar(
      [
        {
          role: 'system',
          content: `Eres el compilador de reportes de EnsayAR. Responde solo JSON {"titulo":"...","sql":"SELECT ..."}.
La SQL es un único SELECT sobre v_reporte_ventas. Columnas permitidas: ${COLUMNAS}.
Si filtras por sucursal, cajero o producto, usa ILIKE '%texto%' porque el nombre guardado puede ser más largo.
Siempre incluye LIMIT 200. Sin punto y coma y sin otras tablas.
Si piden contraseñas, usuarios o modificar datos, responde {"titulo":"rechazada","sql":""}.`,
        },
        { role: 'user', content: pregunta },
      ],
      true,
    );
    const leido = leerPropuesta(propuesto);
    if (leido) {
      try {
        return {
          titulo: leido.titulo,
          sql: validarSelect(leido.sql),
          fuente: 'modelo' as const,
        };
      } catch {
        /* el validador rechazó la propuesta; sigue el compilador fijo */
      }
    }
    try {
      const fijo = compilarPregunta(pregunta);
      return { ...fijo, fuente: 'reglas' as const };
    } catch {
      throw new BadRequestException({ codigo: 'PREGUNTA_ILEGAL' });
    }
  }

  private async narrar(
    pregunta: string,
    filas: Record<string, string | number | null>[],
    fuente: 'modelo' | 'reglas',
  ) {
    if (!filas.length) {
      return fuente === 'modelo'
        ? 'El modelo propuso la consulta y el validador la aceptó, pero no hay filas en la base para ese filtro.'
        : 'La consulta por reglas se ejecutó sin filas. Puede que no haya ventas cobradas que coincidan.';
    }
    const texto = await this.modelo.completar([
      {
        role: 'system',
        content:
          'Resume en español, en dos frases, el resultado de un reporte de ventas. Usa solo los números que te pasan. No inventes totales.',
      },
      { role: 'user', content: JSON.stringify({ pregunta, filas }) },
    ]);
    if (texto) return texto;
    const n = filas.length;
    return `Resumen local (${fuente}): ${n} fila${n === 1 ? '' : 's'} devueltas para “${pregunta.slice(0, 80)}”.`;
  }

  private serializar(filas: Record<string, unknown>[]) {
    return filas.map((fila) => {
      const out: Record<string, string | number | null> = {};
      for (const [k, v] of Object.entries(fila)) {
        if (v instanceof Date) out[k] = v.toISOString();
        else if (v instanceof Prisma.Decimal) out[k] = Number(v);
        else if (typeof v === 'bigint') out[k] = Number(v);
        else out[k] = v as string | number | null;
      }
      return out;
    });
  }
}

function leerPropuesta(texto: string | null) {
  if (!texto) return null;
  try {
    const data = JSON.parse(texto) as { titulo?: string; sql?: string };
    const sql = data.sql?.trim() ?? '';
    if (!/^select\s/i.test(sql)) return null;
    return { titulo: data.titulo?.slice(0, 80) || 'Ventas', sql };
  } catch {
    return null;
  }
}

type Periodo = 'hoy' | '7d' | 'todo';

function normalizarPeriodo(periodo?: string): Periodo {
  if (periodo === '7d' || periodo === 'todo' || periodo === 'hoy') return periodo;
  return 'todo';
}

function filtroFechaSql(periodo: Periodo, columna: string): string {
  if (periodo === 'hoy') return ` AND ${columna}::date = CURRENT_DATE`;
  if (periodo === '7d') return ` AND ${columna} >= (CURRENT_TIMESTAMP - INTERVAL '7 days')`;
  return '';
}

function escaparLike(valor: string): string {
  return valor.replace(/'/g, "''").slice(0, 80);
}

function armarInsight(
  sucursales: Record<string, string | number | null>[],
  kpis: { totalBs: number; operaciones: number; unidades: number },
) {
  if (!sucursales.length) {
    return 'Todavía no hay ventas cobradas para armar el ranking de sucursales.';
  }
  const top = sucursales[0];
  const low = sucursales[sucursales.length - 1];
  const partes = [
    `En el período se cobraron Bs ${kpis.totalBs.toFixed(2)} en ${kpis.operaciones} ${kpis.operaciones === 1 ? 'operación' : 'operaciones'}.`,
    `Lidera ${top.sucursal} con Bs ${Number(top.total_bs ?? 0).toFixed(2)}.`,
  ];
  if (sucursales.length > 1 && top.sucursal !== low.sucursal) {
    partes.push(
      `${low.sucursal} es la de menor venta en el ranking (Bs ${Number(low.total_bs ?? 0).toFixed(2)}).`,
    );
  }
  return partes.join(' ');
}

