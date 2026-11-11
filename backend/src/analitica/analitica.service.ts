import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { TenantContext } from '../tenancy/tenant-context';
import { TiendasService } from '../tenancy/tiendas.service';
import { entrenarDemanda, entrenarSegmentos } from './modelos';

const DIA = 86_400_000;
const MAX_VENTAS = 5000;
const demanda = entrenarDemanda();
const segmentos = entrenarSegmentos();
const dos = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class AnaliticaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esquemas: PrismaEsquemasService,
    private readonly tiendas: TiendasService,
    private readonly config: ConfigService,
  ) {}

  async panel() {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const tienda = await this.tiendas.porId(tiendaId);
    if (!tienda?.vigente || !tienda.plan?.modulos.includes('analitica')) {
      throw new ForbiddenException({
        codigo: 'MODULO_NO_INCLUIDO',
        message: 'La analítica no está incluida en el plan de esta tienda.',
      });
    }

    const useEsquemas = this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true';
    const db = useEsquemas
      ? this.esquemas.clienteTienda(tiendaId)
      : this.prisma;

    const ahora = new Date();
    const ventas = await db.venta.findMany({
      where: {
        tiendaId,
        estado: 'cobrada',
        creadaEn: { gte: new Date(ahora.getTime() - 90 * DIA), lte: ahora },
      },
      select: {
        creadaEn: true,
        clientaId: true,
        total: true,
        lineas: {
          where: { tiendaId },
          select: { varianteId: true, cantidad: true, cantidadDevuelta: true },
        },
      },
      take: MAX_VENTAS + 1,
    });

    if (ventas.length > MAX_VENTAS) {
      throw new UnprocessableEntityException({
        codigo: 'DEMASIADAS_VENTAS',
        message: 'Hay más de 5000 ventas en el período; se requiere paginación antes de generar este tablero.',
      });
    }

    const unidades = new Map<string, { s7: number; s28: number }>();
    const clientes = new Map<string, { ultima: number; frecuencia: number; monto: number }>();

    for (const v of ventas) {
      const edad = (ahora.getTime() - v.creadaEn.getTime()) / DIA;
      if (v.clientaId) {
        const c = clientes.get(v.clientaId) ?? { ultima: edad, frecuencia: 0, monto: 0 };
        c.ultima = Math.min(c.ultima, edad);
        c.frecuencia++;
        c.monto += Number(v.total);
        clientes.set(v.clientaId, c);
      }
      if (edad > 28) continue;
      for (const l of v.lineas) {
        const cantidad = Math.max(0, l.cantidad - l.cantidadDevuelta);
        const u = unidades.get(l.varianteId) ?? { s7: 0, s28: 0 };
        u.s28 += cantidad;
        if (edad <= 7) u.s7 += cantidad;
        unidades.set(l.varianteId, u);
      }
    }

    const variantes = unidades.size
      ? await db.variante.findMany({
          where: { tiendaId, id: { in: [...unidades.keys()] }, producto: { tiendaId } },
          select: {
            id: true,
            talla: true,
            color: true,
            sku: true,
            producto: { select: { nombre: true } },
            stocks: { where: { tiendaId }, select: { cantidad: true, reservado: true } },
          },
        })
      : [];

    const predicciones = variantes
      .map((v) => {
        const u = unidades.get(v.id)!;
        const disponible = v.stocks.reduce((s: number, x) => s + Math.max(0, x.cantidad - x.reservado), 0);
        const estimacion = dos(demanda.predecir([u.s7, u.s28]));
        return {
          varianteId: v.id,
          producto: v.producto.nombre,
          talla: v.talla,
          color: v.color,
          sku: v.sku,
          ventas7: u.s7,
          ventas28: u.s28,
          disponible,
          estimacion7: estimacion,
        };
      })
      .sort((a, b) => b.estimacion7 - a.estimacion7)
      .slice(0, 20);

    const grupos = segmentos.centroides.map((centro, i) => ({
      id: i + 1,
      cantidad: 0,
      centroSintetico: { recenciaDias: centro[0], compras: centro[1], monto: centro[2] },
    }));

    for (const c of clientes.values()) {
      grupos[segmentos.clasificar([c.ultima, c.frecuencia, c.monto])].cantidad++;
    }

    return {
      generadoEn: ahora.toISOString(),
      tienda: { id: tiendaId, nombre: tienda.nombre, moneda: tienda.moneda },
      datos: {
        periodoDias: 90,
        ventasCobradas: ventas.length,
        clientesConCompras: clientes.size,
        variantesConVentas28Dias: unidades.size,
      },
      demanda: {
        modelo: 'Regresión lineal',
        variables: ['Unidades vendidas en 7 días', 'Unidades vendidas en 28 días'],
        evaluacionSintetica: demanda.evaluacion,
        predicciones,
      },
      segmentos: {
        modelo: 'K-means (k=3)',
        variables: ['Días desde la última compra', 'Número de compras', 'Monto acumulado'],
        evaluacionSintetica: segmentos.evaluacion,
        grupos,
      },
      aviso:
        'Modelos entrenados y evaluados con datos sintéticos. Resultados exploratorios: no están validados con ventas reales y no deben usarse solos para decisiones de compra o crédito.',
    };
  }
}
