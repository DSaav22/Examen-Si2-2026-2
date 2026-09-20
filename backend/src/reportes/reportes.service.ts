import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { compilarPregunta, validarSelect } from './sql-seguro';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async inventario(adminId: string) {
    const filas = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT s.nombre AS sucursal, a.nombre AS almacen, p.nombre AS producto,
              v.talla, v.color, v.sku,
              sa.cantidad, sa.reservado,
              (sa.cantidad - sa.reservado) AS disponible
       FROM stock_almacen sa
       JOIN variantes v ON v.id = sa.variante_id
       JOIN productos p ON p.id = v.producto_id
       JOIN almacenes a ON a.id = sa.almacen_id
       JOIN sucursales s ON s.id = a.sucursal_id
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
    return {
      titulo: 'Inventario por sucursal',
      sql,
      columnas: filas[0] ? Object.keys(filas[0]) : [],
      filas: this.serializar(filas),
    };
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
    const filas = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
    );
    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta: compilado.titulo,
        sql,
        filas: filas.length,
        adminId,
      },
    });
    return {
      titulo: compilado.titulo,
      sql,
      columnas: filas[0] ? Object.keys(filas[0]) : [],
      filas: this.serializar(filas),
    };
  }

  async generar(pregunta: string, adminId: string) {
    let compilado;
    try {
      compilado = compilarPregunta(pregunta);
    } catch {
      throw new BadRequestException({ codigo: 'PREGUNTA_ILEGAL' });
    }

    let sql: string;
    try {
      sql = validarSelect(compilado.sql);
    } catch (error) {
      throw new BadRequestException({
        codigo: (error as Error).message,
      });
    }

    const filas = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
    );
    const columnas = filas[0] ? Object.keys(filas[0]) : [];

    await this.prisma.reporteEjecucion.create({
      data: {
        pregunta,
        sql,
        filas: filas.length,
        adminId,
      },
    });

    return {
      titulo: compilado.titulo,
      sql,
      columnas,
      filas: this.serializar(filas),
    };
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
