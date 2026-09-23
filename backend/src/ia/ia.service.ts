import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { responderFicha } from './ficha';
import { ModeloClient } from './modelo.client';

type Turno = { rol: 'clienta' | 'asistente'; texto: string };

const SISTEMA = `Eres el asistente de la tienda Vesta, de EnsayAR. Respondes en español, en pocas frases, con el tono de una vendedora.
Solo puedes usar el JSON de contexto. No inventes stock, precios, tallas ni pedidos.
Si no está en el contexto, dilo.
Si piden un reporte de toda la empresa, ventas de otras clientas, contraseñas o SQL, responde que eso corresponde a administración.
No digas que vas a cambiar precios ni stock: esta conversación no modifica nada.`;

@Injectable()
export class IaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modelo: ModeloClient,
  ) {}

  async ficha(productoId: string, pregunta: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      include: { variantes: true },
    });
    if (!producto) {
      throw new NotFoundException({ codigo: 'PRODUCTO_NO_EXISTE' });
    }
    return responderFicha(producto, pregunta);
  }

  async bot(clientaId: string, mensaje: string, productoId?: string, historial: Turno[] = []) {
    if (pideReporteDeEmpresa(mensaje)) {
      return {
        respuesta: 'Eso corresponde a administración. Desde tu cuenta te digo tallas, disponibilidad y el estado de tus pedidos.',
        fuente: 'reglas' as const,
      };
    }

    const contexto = await this.contexto(clientaId, mensaje, productoId);
    const previa = historial.slice(-6).map((turno) => ({
      role: turno.rol === 'asistente' ? 'assistant' as const : 'user' as const,
      content: turno.texto.slice(0, 500),
    }));
    const respuesta = await this.modelo.completar([
      { role: 'system', content: SISTEMA },
      ...previa,
      { role: 'user', content: `${mensaje}\n\nContexto:\n${JSON.stringify(contexto)}` },
    ]);

    return {
      respuesta: respuesta ?? respaldo(contexto),
      fuente: respuesta ? 'modelo' as const : 'reglas' as const,
    };
  }

  private async contexto(clientaId: string, mensaje: string, productoId?: string) {
    const tokens = mensaje
      .toLowerCase()
      .split(/[^a-záéíóúñ0-9]+/i)
      .filter((token) => token.length >= 4)
      .slice(0, 4);
    const condiciones = [
      ...(productoId ? [{ id: productoId }] : []),
      ...tokens.map((token) => ({ nombre: { contains: token, mode: 'insensitive' as const } })),
    ];
    const productos = await this.prisma.producto.findMany({
      ...(condiciones.length ? { where: { OR: condiciones } } : {}),
      take: 5,
      orderBy: { popularidad: 'desc' },
      include: {
        variantes: {
          include: {
            stocks: { include: { almacen: { include: { sucursal: true } } } },
          },
        },
      },
    });
    const ventas = await this.prisma.venta.findMany({
      where: { clientaId },
      orderBy: { creadaEn: 'desc' },
      take: 6,
      include: {
        pago: { select: { estado: true } },
        lineas: { include: { variante: { include: { producto: { select: { nombre: true } } } } } },
      },
    });
    const reservas = await this.prisma.reserva.findMany({
      where: { clientaId },
      orderBy: { creadaEn: 'desc' },
      take: 4,
      include: {
        sucursal: { select: { nombre: true } },
        lineas: { include: { variante: { include: { producto: { select: { nombre: true } } } } } },
      },
    });

    return {
      prendaAbierta: productoId ?? null,
      prendas: productos.map((producto) => ({
        nombre: producto.nombre,
        categoria: producto.categoria,
        ocasion: producto.ocasion,
        precio: Number(producto.precioBase) * (1 - Number(producto.descuentoPct ?? 0) / 100),
        descripcion: producto.descripcion.slice(0, 180),
        variantes: producto.variantes.map((variante) => ({
          talla: variante.talla,
          color: variante.color,
          disponible: variante.stocks.reduce((total, stock) => total + Math.max(0, stock.cantidad - stock.reservado), 0),
          sucursales: variante.stocks
            .map((stock) => ({
              sucursal: stock.almacen.sucursal.nombre,
              disponible: Math.max(0, stock.cantidad - stock.reservado),
            }))
            .filter((stock) => stock.disponible > 0),
        })),
      })),
      pedidos: ventas.map((venta) => ({
        referencia: venta.id.slice(0, 8),
        estado: venta.estado,
        canal: venta.canal,
        total: Number(venta.total),
        pago: venta.pago?.estado ?? null,
        prendas: venta.lineas.map((linea) => `${linea.variante.producto.nombre} ${linea.variante.talla}/${linea.variante.color} ×${linea.cantidad}`),
      })),
      reservas: reservas.map((reserva) => ({
        estado: reserva.estado,
        sucursal: reserva.sucursal.nombre,
        prendas: reserva.lineas.map((linea) => `${linea.variante.producto.nombre} ${linea.variante.talla}`),
      })),
    };
  }
}

function pideReporteDeEmpresa(mensaje: string) {
  const texto = mensaje.toLowerCase();
  const pideEmpresa = /\b(empresa|todas las ventas|todos los clientes|otras clientas|reporte general|sql|contraseña)\b/.test(texto);
  const esPropio = /\b(mi|mis|mio|mío)\b/.test(texto);
  return pideEmpresa && !esPropio;
}

function respaldo(contexto: {
  prendas: { nombre: string; precio: number; variantes: { talla: string; color: string; disponible: number }[] }[];
  pedidos: { referencia: string; estado: string; total: number }[];
}) {
  const prendas = contexto.prendas.slice(0, 3).map((prenda) => {
    const stock = prenda.variantes.map((variante) => `${variante.talla}/${variante.color}: ${variante.disponible}`).join(', ');
    return `${prenda.nombre} (Bs ${prenda.precio.toFixed(2)}) ${stock}`;
  });
  const pedidos = contexto.pedidos.slice(0, 3).map((pedido) => `${pedido.referencia} ${pedido.estado} Bs ${pedido.total.toFixed(2)}`);
  return [
    prendas.length ? `Encontré esto en la tienda: ${prendas.join('. ')}.` : 'No ubiqué esa prenda en el catálogo cargado.',
    pedidos.length ? `Tus pedidos: ${pedidos.join('; ')}.` : 'Todavía no tienes pedidos a tu nombre.',
  ].join(' ');
}
