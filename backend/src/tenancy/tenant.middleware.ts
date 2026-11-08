import { HttpException, HttpStatus, Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { TokenService } from '../auth/token.service';
import { TenantContext, TenantStore } from './tenant-context';
import { TiendaInfo, TiendasService } from './tiendas.service';

/**
 * Abre el contexto de tenancy de cada petición.
 * Con un token de tienda válido manda la tienda del token (también en endpoints públicos);
 * si no, la cabecera `X-Tienda` (slug) o la tienda por defecto.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tiendas: TiendasService,
    private readonly config: ConfigService,
    private readonly tokens: TokenService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const store: TenantStore = {};
    TenantContext.run(store, () => {
      this.resolver(req, store).then(() => next(), next);
    });
  }

  private tiendaDelToken(req: Request) {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) return null;
    try {
      const payload = this.tokens.verify(header.slice(7));
      return payload.tipo === 'tienda' ? payload.tiendaId : null;
    } catch {
      return null;
    }
  }

  private async resolver(req: Request, store: TenantStore) {
    if (req.path.startsWith('/plataforma')) return;
    let tienda: TiendaInfo | null = null;
    const delToken = this.tiendaDelToken(req);
    if (delToken) tienda = await this.tiendas.porId(delToken);
    const cabecera = req.header('x-tienda')?.trim();
    if (!tienda) {
      const slug = cabecera || this.config.get<string>('TIENDA_POR_DEFECTO') || 'vesta';
      tienda = await this.tiendas.porSlug(slug);
      if (!tienda) {
        if (cabecera) throw new NotFoundException({ codigo: 'TIENDA_NO_EXISTE' });
        return;
      }
    }
    if (!tienda.vigente) {
      throw new HttpException(
        { codigo: tienda.activa ? 'SUSCRIPCION_VENCIDA' : 'TIENDA_SUSPENDIDA', tienda: tienda.slug },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    store.tiendaId = tienda.id;
  }
}
