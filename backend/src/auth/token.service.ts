import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { JwtPayload } from './jwt-payload';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  private secret(): string {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no está configurado');
    return secret;
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret(), { expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '12h' } as jwt.SignOptions);
  }

  private hash(token: string) { return createHash('sha256').update(token).digest('hex'); }
  async revoke(token: string) { await this.prisma.tokenRevocado.upsert({ where: { hash: this.hash(token) }, update: {}, create: { hash: this.hash(token) } }); }
  async isRevoked(token: string) { return Boolean(await this.prisma.tokenRevocado.findUnique({ where: { hash: this.hash(token) } })); }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret()) as JwtPayload;
  }
}
