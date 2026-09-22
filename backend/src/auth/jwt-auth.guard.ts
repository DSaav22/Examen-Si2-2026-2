import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from './jwt-payload';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) {
      throw new UnauthorizedException({ codigo: 'SIN_TOKEN' });
    }
    if (await this.tokens.isRevoked(token)) throw new UnauthorizedException({ codigo: 'TOKEN_REVOCADO' });
    try {
      request.user = this.tokens.verify(token);
      const current = await this.prisma.usuario.findUnique({ where: { id: request.user.sub }, select: { id: true, email: true, rol: true, activo: true } });
      if (!current || !current.activo || current.email !== request.user.email || current.rol !== request.user.rol) throw new UnauthorizedException({ codigo: 'SESION_INVALIDA' });
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({ codigo: 'TOKEN_INVALIDO' });
    }
  }
}
