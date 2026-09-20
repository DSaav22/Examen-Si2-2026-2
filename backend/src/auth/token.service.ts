import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  private secret(): string {
    return this.config.get<string>('JWT_SECRET') ?? 'ensayar-dev';
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret(), { expiresIn: '12h' });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret()) as JwtPayload;
  }
}
