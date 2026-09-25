import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { FluxClient } from './flux.client';
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
    private readonly flux: FluxClient,
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

  async bot(clientaId: string | null, mensaje: string, productoId?: string, historial: Turno[] = []) {
    if (pideReporteDeEmpresa(mensaje)) {
      return {
        respuesta: 'Eso corresponde a administración. Desde tu cuenta te digo tallas, disponibilidad y el estado de tus pedidos.',
        fuente: 'reglas' as const,
      };
    }

    if (!clientaId && /\b(pedido|pedidos|compra|compras|factura|env[ií]o)\b/i.test(mensaje)) {
      return {
        respuesta:
          'Para ver tus pedidos necesitás una cuenta. Mientras tanto puedo ayudarte con tallas y stock del catálogo.',
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

  /** Vista IA: edita la foto de la clienta con FLUX.2-pro (no toca stock). */
  async probar(varianteId: string, imagenPersonaBase64: string) {
    if (!this.flux.configurado()) {
      throw new ServiceUnavailableException({
        codigo: 'FLUX_NO_CONFIG',
        message:
          'Falta AZURE_AI_ENDPOINT / AZURE_AI_API_KEY. Usá el overlay 2D mientras tanto.',
      });
    }
    if (!imagenPersonaBase64 || imagenPersonaBase64.length < 80) {
      throw new BadRequestException({ codigo: 'SIN_FOTO' });
    }
    // ~4 MB base64 ≈ foto razonable
    if (imagenPersonaBase64.length > 6_000_000) {
      throw new BadRequestException({ codigo: 'FOTO_GRANDE' });
    }

    const variante = await this.prisma.variante.findUnique({
      where: { id: varianteId },
      include: { producto: true },
    });
    if (!variante) throw new NotFoundException({ codigo: 'VARIANTE_NO' });

    const prendaB64 = await this.cargarImagenComoB64(variante.urlFoto);
    const prompt = [
      'Fashion e-commerce virtual try-on preview.',
      `Put this garment on the person in the first photo: ${variante.producto.nombre},`,
      `shade ${variante.color}, size ${variante.talla}, category ${variante.producto.categoria}.`,
      prendaB64
        ? 'The second reference image is the garment product photo; match fabric color and style.'
        : 'Keep a realistic boutique fit for women apparel.',
      'Preserve the person face, body pose and scene. Soft natural lighting. No logos, no watermarks, no text overlay.',
    ].join(' ');

    const out = await this.flux.probarPrenda({
      prompt,
      imagenPersonaB64: imagenPersonaBase64,
      imagenPrendaB64: prendaB64 ?? undefined,
    });
    if (!out) {
      throw new ServiceUnavailableException({
        codigo: 'FLUX_FALLO',
        message: 'No se pudo generar la vista. Probá el overlay 2D o otra foto.',
      });
    }
    return {
      url: out.url,
      modelo: out.modelo,
      varianteId,
      producto: variante.producto.nombre,
      talla: variante.talla,
      color: variante.color,
      aviso: 'Vista aproximada generada por IA. No es prueba física ni modifica stock.',
    };
  }

  private async cargarImagenComoB64(urlFoto: string | null | undefined): Promise<string | null> {
    if (!urlFoto?.trim()) return null;
    try {
      if (/^https?:\/\//i.test(urlFoto)) {
        const res = await fetch(urlFoto, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 100 || buf.length > 4_000_000) return null;
        return buf.toString('base64');
      }
      const rel = urlFoto.replace(/^\//, '').replace(/^uploads\//, 'uploads/');
      const path = join(process.cwd(), 'public', rel.startsWith('uploads') ? rel : join('uploads', rel));
      const buf = await readFile(path);
      if (buf.length < 100 || buf.length > 4_000_000) return null;
      return buf.toString('base64');
    } catch {
      return null;
    }
  }

  private async contexto(clientaId: string | null, mensaje: string, productoId?: string) {
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
    const ventas = clientaId
      ? await this.prisma.venta.findMany({
          where: { clientaId },
          orderBy: { creadaEn: 'desc' },
          take: 6,
          include: {
            pago: { select: { estado: true } },
            lineas: {
              include: { variante: { include: { producto: { select: { nombre: true } } } } },
            },
          },
        })
      : [];
    const reservas = clientaId
      ? await this.prisma.reserva.findMany({
          where: { clientaId },
          orderBy: { creadaEn: 'desc' },
          take: 4,
          include: {
            sucursal: { select: { nombre: true } },
            lineas: {
              include: { variante: { include: { producto: { select: { nombre: true } } } } },
            },
          },
        })
      : [];

    return {
      invitada: !clientaId,
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
