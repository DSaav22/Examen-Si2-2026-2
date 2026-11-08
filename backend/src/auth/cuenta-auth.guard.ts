import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

export type CuentaSesion = { cuentaId: string; email: string; plataforma: boolean };

/**
 * Sesión de cuenta global. Acepta el token de cuenta y también el de tienda
 * (para cambiar de tienda sin volver a iniciar sesión).
 */
@Injectable()
export class CuentaAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException({ codigo: 'SIN_TOKEN' });
    if (await this.tokens.isRevoked(token)) throw new UnauthorizedException({ codigo: 'TOKEN_REVOCADO' });
    let payload;
    try {
      payload = this.tokens.verify(token);
    } catch {
      throw new UnauthorizedException({ codigo: 'TOKEN_INVALIDO' });
    }
    const cuentaId = payload.tipo === 'cuenta' ? payload.sub : payload.tipo === 'tienda' ? payload.cuentaId : undefined;
    if (!cuentaId) throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });
    const cuenta = await this.prisma.cuenta.findUnique({
      where: { id: cuentaId },
      select: { id: true, email: true, esPlataforma: true, emailVerificado: true },
    });
    if (!cuenta) throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });
    request.cuenta = { cuentaId: cuenta.id, email: cuenta.email, plataforma: cuenta.esPlataforma } satisfies CuentaSesion;
    return true;
  }
}

/** Solo el dueño de la plataforma (métricas SaaS). */
@Injectable()
export class PlataformaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const cuenta = context.switchToHttp().getRequest().cuenta as CuentaSesion | undefined;
    if (!cuenta?.plataforma) throw new ForbiddenException({ codigo: 'SOLO_PLATAFORMA' });
    return true;
  }
}

export const CurrentCuenta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CuentaSesion => ctx.switchToHttp().getRequest().cuenta,
);
