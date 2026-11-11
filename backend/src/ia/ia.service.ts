import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { TenantContext } from '../tenancy/tenant-context';
import { FluxClient } from './flux.client';
import { responderFicha } from './ficha';
import { ModeloClient } from './modelo.client';

type Turno = { rol: 'clienta' | 'asistente'; texto: string };

const SISTEMA = `Sos la asistente virtual de la tienda indicada en el JSON de contexto, de la plataforma EnsayAR. Respondé en español, en pocas frases (1 a 3 frases) y con el tono cálido y profesional de una asesora de ventas de la tienda.
Tu conocimiento proviene directamente de la base de datos de la tienda reflejada en el JSON de contexto (tienda, prendas, carrito, pedidos, reservas).
Usá siempre el nombre y la moneda de esa tienda. El historial es conversación previa, no una fuente de datos verificados. No inventes stock, precios, tallas ni pedidos ajenos al contexto.
Reglas clave:
1. Si la clienta pregunta por "esta prenda", "la prenda" o tallas sin especificar un nombre y no hay una prenda abierta (prendaAbierta es null):
   - Si en el contexto hay prendas en el "carrito", asumí amablemente que se refiere a las prendas del carrito y dale sus tallas y stock disponibles.
   - Si no hay carrito pero hay prendas destacadas en "prendas", indícale qué prendas tenemos en la tienda con sus tallas disponibles (por ejemplo: "Tenemos disponibles el Pantalón palazzo en tallas S, M, L o el Cardigan en tallas S, M, L... ¿sobre cuál te gustaría consultar?").
   - NUNCA digas que no tienes información de tallas o del sistema cuando haya prendas listadas en el contexto. El catálogo de la base de datos está cargado en el contexto.
2. Si la clienta pregunta por stock en una ciudad o sucursal (ej. Santa Cruz, La Paz), revisá el campo sucursales de cada variante en el contexto e informale las unidades reales disponibles por sucursal.
3. Si piden un reporte de toda la empresa, ventas de otras clientas, contraseñas o SQL, respondé que eso corresponde a administración.
4. No digas que vas a cambiar precios ni stock: esta conversación no modifica nada.`;

@Injectable()
export class IaService {
  constructor(
    private readonly esquemas: PrismaEsquemasService,
    private readonly modelo: ModeloClient,
    private readonly flux: FluxClient,
  ) {}

  private db() {
    return this.esquemas.clienteTienda(TenantContext.tiendaIdOrThrow());
  }

  async ficha(productoId: string, pregunta: string) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const producto = await this.db().producto.findFirst({
      where: { id: productoId, tiendaId },
      include: { variantes: { where: { tiendaId } } },
    });
    if (!producto) {
      throw new NotFoundException({ codigo: 'PRODUCTO_NO_EXISTE' });
    }
    return responderFicha(producto, pregunta);
  }

  async bot(
    clientaId: string | null,
    mensaje: string,
    productoId?: string,
    historial: Turno[] = [],
    carritoIds: string[] = [],
  ) {
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

    const resolvedProductoId = productoId || (carritoIds.length === 1 ? carritoIds[0] : undefined);
    const contexto = await this.contexto(clientaId, mensaje, resolvedProductoId, carritoIds);
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

    const variante = await this.db().variante.findFirst({
      where: { id: varianteId, tiendaId: TenantContext.tiendaIdOrThrow(), producto: { tiendaId: TenantContext.tiendaIdOrThrow() } },
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

  private async contexto(
    clientaId: string | null,
    mensaje: string,
    productoId?: string,
    carritoIds: string[] = [],
  ) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    const db = this.db();
    const tienda = await this.esquemas.clientePlataforma().tienda.findUniqueOrThrow({
      where: { id: tiendaId }, select: { nombre: true, moneda: true, pais: true },
    });
    if (clientaId && !await db.usuario.findFirst({ where: { id: clientaId, tiendaId, activo: true, rol: 'CLIENTA' }, select: { id: true } })) {
      throw new ForbiddenException({ codigo: 'SESION_INVALIDA' });
    }
    const comunes = new Set(['hola', 'buenas', 'buenos', 'dias', 'tardes', 'quiero', 'quisiera', 'busco', 'buscar', 'tienen', 'tienes', 'tengo', 'puedo', 'puedes', 'podes', 'podria', 'ayuda', 'ayudarme', 'favor', 'gracias', 'stock', 'disponible', 'disponibles', 'prenda', 'prendas', 'producto', 'productos', 'precio', 'precios', 'talla', 'tallas', 'color', 'colores', 'cuanto', 'cuesta', 'esta', 'este', 'esta', 'para', 'como', 'cuales', 'decime', 'dime', 'sobre', 'pedido', 'pedidos', 'reserva', 'reservas']);
    for (const palabra of ['que', 'hay', 'son', 'las', 'los', 'del', 'una', 'uno', 'con', 'por', 'ese', 'esa', 'algo', 'saber', 'cual', 'mis', 'ver', 'catalogo', 'mostrar', 'mostrame', 'sucursal', 'sucursales', 'tienda', 'tiendas']) comunes.add(palabra);
    const tokens = mensaje.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9-]+/i).filter(t => t.length >= 3 && !comunes.has(t)).slice(0, 8);
    const condiciones = tokens.flatMap(token => [
      { nombre: { contains: token, mode: 'insensitive' as const } },
      { categoria: { contains: token, mode: 'insensitive' as const } },
      { descripcion: { contains: token, mode: 'insensitive' as const } },
      { variantes: { some: { tiendaId, OR: [{ sku: { contains: token, mode: 'insensitive' as const } }, { color: { contains: token, mode: 'insensitive' as const } }] } } },
    ]);
    let productos = await db.producto.findMany({
      where: { tiendaId, ...(productoId ? { id: productoId } : condiciones.length ? { OR: condiciones } : {}) },
      take: productoId ? 1 : 8,
      orderBy: { popularidad: 'desc' },
      include: {
        variantes: {
          where: { tiendaId },
          include: {
            stocks: { where: { tiendaId, almacen: { tiendaId, sucursal: { tiendaId } } }, include: { almacen: { include: { sucursal: true } } } },
          },
        },
      },
    });

    if (!productos.length && !productoId) {
      productos = await db.producto.findMany({
        where: { tiendaId },
        take: 8,
        orderBy: { popularidad: 'desc' },
        include: {
          variantes: {
            where: { tiendaId },
            include: {
              stocks: { where: { tiendaId, almacen: { tiendaId, sucursal: { tiendaId } } }, include: { almacen: { include: { sucursal: true } } } },
            },
          },
        },
      });
    }

    if (productoId && !productos.length) throw new NotFoundException({ codigo: 'PRODUCTO_NO_EXISTE' });

    const carritoProductos = carritoIds.length
      ? await db.producto.findMany({
          where: { tiendaId, id: { in: carritoIds } },
          include: {
            variantes: {
              where: { tiendaId },
              include: {
                stocks: { where: { tiendaId, almacen: { tiendaId, sucursal: { tiendaId } } }, include: { almacen: { include: { sucursal: true } } } },
              },
            },
          },
        })
      : [];

    const ventas = clientaId
      ? await db.venta.findMany({
          where: { clientaId, tiendaId },
          orderBy: { creadaEn: 'desc' },
          take: 6,
          include: {
            pago: { select: { estado: true } },
            lineas: {
              where: { tiendaId, variante: { tiendaId, producto: { tiendaId } } },
              include: { variante: { include: { producto: { select: { nombre: true } } } } },
            },
          },
        })
      : [];
    const reservas = clientaId
      ? await db.reserva.findMany({
          where: { clientaId, tiendaId },
          orderBy: { creadaEn: 'desc' },
          take: 4,
          include: {
            sucursal: { select: { nombre: true } },
            lineas: {
              where: { tiendaId, variante: { tiendaId, producto: { tiendaId } } },
              include: { variante: { include: { producto: { select: { nombre: true } } } } },
            },
          },
        })
      : [];

    return {
      tienda,
      invitada: !clientaId,
      prendaAbierta: productoId ?? null,
      carrito: carritoProductos.map((producto) => ({
        nombre: producto.nombre,
        categoria: producto.categoria,
        precio: Number(producto.precioBase) * (1 - Number(producto.descuentoPct ?? 0) / 100),
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
  tienda: { moneda: string };
  invitada: boolean;
  prendas: { nombre: string; precio: number; variantes: { talla: string; color: string; disponible: number }[] }[];
  pedidos: { referencia: string; estado: string; total: number }[];
  carrito?: { nombre: string; precio: number; variantes: { talla: string; color: string; disponible: number }[] }[];
}) {
  const lista = (contexto.carrito?.length ? contexto.carrito : contexto.prendas).slice(0, 3);
  const prendas = lista.map((prenda) => {
    const stock = prenda.variantes.map((variante) => `${variante.talla}/${variante.color}: ${variante.disponible}`).join(', ');
    return `${prenda.nombre} (${contexto.tienda.moneda} ${prenda.precio.toFixed(2)}) [${stock}]`;
  });
  const pedidos = contexto.pedidos.slice(0, 3).map((pedido) => `${pedido.referencia} ${pedido.estado} ${contexto.tienda.moneda} ${pedido.total.toFixed(2)}`);
  return [
    prendas.length ? `Prendas disponibles en tienda: ${prendas.join('. ')}.` : 'No ubiqué esa prenda en el catálogo cargado.',
    pedidos.length ? `Tus pedidos: ${pedidos.join('; ')}.` : contexto.invitada ? 'Para consultar pedidos, iniciá sesión.' : 'Todavía no tenés pedidos a tu nombre.',
  ].join(' ');
}
