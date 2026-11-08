import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../tenancy/tenant-context';
import { TiendasService } from '../tenancy/tiendas.service';

/** Sesión de tienda: fija la tienda del token como inquilino de la petición. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
    private readonly tiendas: TiendasService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException({ codigo: 'SIN_TOKEN' });
    }
    if (await this.tokens.isRevoked(token)) throw new UnauthorizedException({ codigo: 'TOKEN_REVOCADO' });
    let payload;
    try {
      payload = this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException({ codigo: 'TOKEN_INVALIDO' });
    }
    if (payload.tipo !== 'tienda' || !payload.tiendaId) throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });

    const tienda = await this.tiendas.porId(payload.tiendaId);
    if (!tienda) throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });
    if (!tienda.vigente) {
      throw new HttpException(
        { codigo: tienda.activa ? 'SUSCRIPCION_VENCIDA' : 'TIENDA_SUSPENDIDA', tienda: tienda.slug },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    TenantContext.fijar(payload.tiendaId);

    const current = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, rol: true, activo: true, cuentaId: true },
    });
    if (!current || !current.activo || current.rol !== payload.rol || current.cuentaId !== payload.cuentaId) {
      throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });
    }
    request.user = payload;
    return true;
  }
}
