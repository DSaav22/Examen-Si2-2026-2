import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CorreoService } from '../correo/correo.service';
import { numeroFactura, plantillaFacturaHtml } from './factura-html';
import { NotificacionesGateway } from './notificaciones.gateway';

@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
    private readonly gateway: NotificacionesGateway,
  ) {}

  listar(usuarioId: string, limit = 30) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { creadaEn: 'desc' },
      take: Math.min(50, Math.max(1, limit)),
    });
  }

  async noLeidas(usuarioId: string) {
    return this.prisma.notificacion.count({ where: { usuarioId, leida: false } });
  }

  async marcarLeida(usuarioId: string, id: string) {
    const n = await this.prisma.notificacion.findFirst({ where: { id, usuarioId } });
    if (!n) throw new NotFoundException({ codigo: 'NOTIF_NO' });
    const updated = await this.prisma.notificacion.update({ where: { id }, data: { leida: true } });
    const count = await this.noLeidas(usuarioId);
    this.gateway.emitConteo(usuarioId, count);
    return updated;
  }

  async marcarTodas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    this.gateway.emitConteo(usuarioId, 0);
    return { ok: true };
  }

  async crear(data: {
    usuarioId: string;
    tipo: string;
    titulo: string;
    cuerpo: string;
    enlace?: string;
  }) {
    const n = await this.prisma.notificacion.create({
      data: {
        usuarioId: data.usuarioId,
        tipo: data.tipo,
        titulo: data.titulo,
        cuerpo: data.cuerpo,
        enlace: data.enlace ?? '',
      },
    });
    this.gateway.emitNueva(data.usuarioId, n);
    const count = await this.noLeidas(data.usuarioId);
    this.gateway.emitConteo(data.usuarioId, count);
    return n;
  }

  /**
   * Tras cobro confirmado (estilo BioFarm: in-app siempre; correo según canal).
   * - online → database/ws + email automático
   * - pos → solo in-app; email manual con enviarFacturaVenta
   */
  async notificarTrasCobro(
    ventaId: string,
    opts: { enviarCorreo: boolean; emailOverride?: string },
  ) {
    if (opts.enviarCorreo) {
      return this.enviarFacturaVenta(ventaId, opts.emailOverride);
    }
    return this.avisarVentaCobrada(ventaId);
  }

  async enviarFacturaVenta(ventaId: string, emailOverride?: string) {
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        clienta: { select: { id: true, nombre: true, email: true } },
        almacen: { include: { sucursal: true } },
        lineas: {
          include: {
            variante: { include: { producto: true } },
          },
        },
      },
    });
    if (!venta) throw new NotFoundException({ codigo: 'VENTA_NO' });

    const destino =
      emailOverride?.trim().toLowerCase() ||
      venta.clienta?.email?.trim().toLowerCase() ||
      '';
    if (!destino || !destino.includes('@')) {
      throw new NotFoundException({ codigo: 'CLIENTA_SIN_CORREO' });
    }

    let destinatario = venta.clienta;
    if (!destinatario || destinatario.email.toLowerCase() !== destino) {
      destinatario = await this.prisma.usuario.findFirst({
        where: { email: { equals: destino, mode: 'insensitive' } },
        select: { id: true, nombre: true, email: true },
      });
    }

    const lineas = venta.lineas.map((l) => {
      const pu = Number(l.precioUnitario);
      return {
        nombre: l.variante.producto.nombre,
        detalle: `${l.variante.talla}/${l.variante.color}`,
        cantidad: l.cantidad,
        precioUnitario: pu,
        subtotal: pu * l.cantidad,
      };
    });
    const total = Number(venta.total);
    const nro = numeroFactura(venta.id);
    const html = plantillaFacturaHtml({
      id: venta.id,
      total,
      medio: venta.medioPago,
      canal: venta.canal,
      fecha: venta.creadaEn.toLocaleString('es-BO'),
      nit: '990000000',
      sucursal: venta.almacen.sucursal.nombre,
      clientaNombre: destinatario?.nombre || venta.clienta?.nombre || 'Clienta',
      clientaEmail: destino,
      lineas,
    });

    const envio = await this.correo.enviar({
      para: destino,
      asunto: `Tu factura EnsayAR ${nro}`,
      html,
      texto: `Factura ${nro} · Total Bs ${total.toFixed(2)}`,
    });

    const notifUserId = destinatario?.id ?? venta.clientaId;
    if (notifUserId) {
      await this.crear({
        usuarioId: notifUserId,
        tipo: 'factura',
        titulo: `Factura ${nro}`,
        cuerpo:
          envio.modo === 'smtp'
            ? `Compra por Bs ${total.toFixed(2)}. Te enviamos la factura a ${destino}.`
            : `Compra por Bs ${total.toFixed(2)}. Tu factura está lista en Mis compras.`,
        enlace: `/historial?venta=${venta.id}`,
      });
    }

    await this.prisma.auditoria.create({
      data: {
        accion: 'factura_correo',
        recurso: venta.id,
        detalle: `${envio.modo}:${destino}`,
        usuarioId: notifUserId ?? undefined,
      },
    });

    return envio;
  }

  /** Aviso in-app al cobrar en caja (sin correo). */
  async avisarVentaCobrada(ventaId: string) {
    const venta = await this.prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        clienta: { select: { id: true, email: true, nombre: true } },
        almacen: { include: { sucursal: true } },
      },
    });
    if (!venta?.clientaId || !venta.clienta) return null;
    const nro = numeroFactura(venta.id);
    const total = Number(venta.total).toFixed(2);
    return this.crear({
      usuarioId: venta.clientaId,
      tipo: 'venta',
      titulo: `Compra en tienda · ${nro}`,
      cuerpo: `Compra de Bs ${total} en ${venta.almacen.sucursal.nombre}. Revisá el detalle en Mis compras.`,
      enlace: `/historial?venta=${venta.id}`,
    });
  }
}
