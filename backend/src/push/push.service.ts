import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';

export type AvisoPush = { titulo: string; cuerpo: string; enlace?: string; tipo?: string };

/** Notificaciones Web Push: llegan aunque la PWA esté cerrada. */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly log = new Logger(PushService.name);
  private publica = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publica = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privada = this.config.get<string>('VAPID_PRIVATE_KEY');
    if (!publica || !privada) {
      this.log.warn('Web Push desactivado: faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
      return;
    }
    webpush.setVapidDetails(this.config.get('VAPID_SUBJECT') ?? 'mailto:soporte@ensayar.app', publica, privada);
    this.publica = publica;
  }

  clave() {
    return { activo: Boolean(this.publica), clavePublica: this.publica };
  }

  suscribir(usuarioId: string, s: { endpoint: string; p256dh: string; auth: string }) {
    return this.prisma.pushSuscripcion.upsert({
      where: { tiendaId_endpoint: { tiendaId: TenantContext.tiendaIdOrThrow(), endpoint: s.endpoint } },
      create: { usuarioId, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      update: { usuarioId, p256dh: s.p256dh, auth: s.auth },
      select: { id: true },
    });
  }

  async desuscribir(usuarioId: string, endpoint: string) {
    const { count } = await this.prisma.pushSuscripcion.deleteMany({ where: { usuarioId, endpoint } });
    return { eliminadas: count };
  }

  async enviar(usuarioId: string, aviso: AvisoPush) {
    if (!this.publica) return { enviadas: 0 };
    const subs = await this.prisma.pushSuscripcion.findMany({ where: { usuarioId } });
    const cuerpo = JSON.stringify(aviso);
    let enviadas = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, cuerpo, {
          TTL: 24 * 3600,
        });
        enviadas++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: el navegador anuló la suscripción; no tiene sentido seguir intentando.
        if (status === 404 || status === 410) {
          await this.prisma.pushSuscripcion.deleteMany({ where: { id: s.id } });
        } else {
          this.log.warn(`Push a ${usuarioId} falló (${status ?? 'red'})`);
        }
      }
    }
    return { enviadas };
  }
}
