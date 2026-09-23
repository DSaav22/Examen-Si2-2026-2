import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtPayload } from './jwt-payload';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async registro(dto: RegistroDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existe) {
      throw new ConflictException({ codigo: 'EMAIL_EN_USO' });
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        nombre: dto.nombre,
        passwordHash,
        rol: Rol.CLIENTA,
      },
    });
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      accessToken: this.tokens.sign(payload),
      user: this.publicUser(usuario),
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuario?.passwordHash || !usuario.activo) {
      throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    }
    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    }
    await this.prisma.auditoria.create({ data: { accion: 'login', recurso: 'auth', detalle: usuario.id } });
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };
    return {
      accessToken: this.tokens.sign(payload),
      user: this.publicUser(usuario),
    };
  }

  async me(userId: string) {
    return this.prisma.usuario.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        sucursalId: true,
        proveedorId: true,
      },
    });
  }

  async cambiarClave(userId: string, actual: string, nueva: string) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(actual, usuario.passwordHash))) throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    const passwordHash = await bcrypt.hash(nueva, 10);
    await this.prisma.usuario.update({ where: { id: userId }, data: { passwordHash } });
    await this.prisma.auditoria.create({ data: { accion: 'cambio_clave', recurso: 'auth', usuarioId: userId } });
    return { ok: true };
  }

  async logout(token: string) {
    await this.tokens.revoke(token);
    await this.prisma.auditoria.create({ data: { accion: 'logout', recurso: 'auth' } });
  }

  private publicUser(usuario: {
    id: string;
    email: string;
    nombre: string;
    rol: Rol;
    sucursalId?: string | null;
    proveedorId?: string | null;
  }) {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      sucursalId: usuario.sucursalId ?? null,
      proveedorId: usuario.proveedorId ?? null,
    };
  }
}
