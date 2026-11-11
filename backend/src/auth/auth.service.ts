import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { Rol, Usuario } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { crearPrismaTenant } from '../tenancy/prisma-tenant.extension';
import { TenantContext } from '../tenancy/tenant-context';
import { TiendaInfo, TiendasService } from '../tenancy/tiendas.service';
import { CuentasService } from './cuentas.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import { JwtPayload } from './jwt-payload';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly cuentas: CuentasService,
    private readonly tiendas: TiendasService,
    private readonly esquemas: PrismaEsquemasService,
    private readonly config: ConfigService,
  ) {}

  private esquemasActivos(): boolean {
    return this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true' || this.config.get<string>('TENANT_SCHEMAS_ALTA') === 'true';
  }

  private clientePerfiles(): PrismaService {
    if (!this.esquemasActivos()) return this.prisma;
    return crearPrismaTenant(this.esquemas.clienteTienda(TenantContext.tiendaIdOrThrow())) as unknown as PrismaService;
  }

  /** Clienta que se registra en la tienda activa (cabecera X-Tienda). */
  async registro(dto: RegistroDto) {
    const tienda = await this.tiendaActual();
    const { cuenta } = await this.cuentas.obtenerOCrear({
      email: dto.email,
      nombre: dto.nombre,
      password: dto.password,
      exigirClave: true,
    });
    const prisma = this.clientePerfiles();
    const ya = await prisma.usuario.findFirst({ where: { cuentaId: cuenta.id } });
    if (ya) throw new ConflictException({ codigo: 'EMAIL_EN_USO' });
    const usuario = await prisma.usuario.create({
      data: { cuentaId: cuenta.id, email: cuenta.email, nombre: dto.nombre, rol: Rol.CLIENTA },
    });
    return this.sesion(usuario, tienda);
  }

  /** Login en la tienda activa: valida la cuenta global y busca su perfil en esta tienda. */
  async login(dto: LoginDto) {
    const tienda = await this.tiendaActual();
    const cuenta = await this.cuentas.validarClave(dto.email, dto.password);
    if (!cuenta) throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    const prisma = this.clientePerfiles();
    const usuario = await prisma.usuario.findFirst({ where: { cuentaId: cuenta.id } });
    if (!usuario) {
      throw new ForbiddenException({
        codigo: 'SIN_ACCESO_TIENDA',
        message: `Tu cuenta no está registrada en ${tienda.nombre}. Creá tu cuenta en esta tienda con la misma clave.`,
      });
    }
    if (!usuario.activo) throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    await prisma.auditoria.create({
      data: { accion: 'login', recurso: 'auth', detalle: usuario.email, usuarioId: usuario.id },
    });
    return this.sesion(usuario, tienda);
  }

  /** Cambia de tienda sin volver a pedir la clave. */
  async cambiarTienda(cuentaId: string, tiendaId: string) {
    const tienda = await this.tiendas.porId(tiendaId);
    if (!tienda) throw new ForbiddenException({ codigo: 'SIN_ACCESO_TIENDA' });
    if (!tienda.vigente) {
      throw new HttpException(
        { codigo: tienda.activa ? 'SUSCRIPCION_VENCIDA' : 'TIENDA_SUSPENDIDA', tienda: tienda.slug },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    const usuario = await TenantContext.enTienda(tiendaId, () =>
      (this.esquemasActivos()
        ? this.esquemas.clienteTienda(tiendaId)
        : this.prisma).usuario.findFirst({ where: { cuentaId, activo: true, tiendaId } }),
    );
    if (!usuario) throw new ForbiddenException({ codigo: 'SIN_ACCESO_TIENDA' });
    return this.sesion(usuario, tienda);
  }

  async misTiendas(cuentaId: string) {
    return this.cuentas.tiendasDe(cuentaId);
  }

  async me(userId: string) {
    const cliente = this.esquemasActivos()
      ? this.esquemas.clienteTienda(TenantContext.tiendaIdOrThrow())
      : this.prisma;
    return cliente.usuario.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        sucursalId: true,
        proveedorId: true,
        avatarUrl: true,
        tiendaId: true,
      },
    });
  }

  async cambiarClave(userId: string, actual: string, nueva: string) {
    const prisma = this.clientePerfiles();
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: userId } });
    const cuenta = await this.prisma.cuenta.findUniqueOrThrow({ where: { id: usuario.cuentaId } });
    if (!(await this.cuentas.validarClave(cuenta.email, actual))) throw new UnauthorizedException({ codigo: 'CREDENCIALES' });
    await this.cuentas.cambiarClave(cuenta.id, nueva);
    await prisma.auditoria.create({ data: { accion: 'cambio_clave', recurso: 'auth', usuarioId: userId } });
    return { ok: true };
  }

  async logout(token: string) {
    await this.tokens.revoke(token);
    await this.clientePerfiles().auditoria.create({ data: { accion: 'logout', recurso: 'auth' } });
  }

  private async tiendaActual(): Promise<TiendaInfo> {
    const id = TenantContext.tiendaId();
    const tienda = id ? await this.tiendas.porId(id) : null;
    if (!tienda) throw new ForbiddenException({ codigo: 'TIENDA_NO_EXISTE' });
    return tienda;
  }

  /** Emite el token de tienda y la info que el frontend necesita para el selector. */
  async sesion(usuario: Usuario, tienda: TiendaInfo) {
    const payload: JwtPayload = {
      tipo: 'tienda',
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      tiendaId: tienda.id,
      cuentaId: usuario.cuentaId,
    };
    const tiendas = await this.cuentas.tiendasDe(usuario.cuentaId);
    if (this.esquemasActivos() && !tiendas.some((t) => t.tiendaId === tienda.id)) {
      const global = await this.prisma.tienda.findUnique({ where: { id: tienda.id }, select: { duenoCuentaId: true } });
      tiendas.push({ tiendaId: tienda.id, slug: tienda.slug, nombre: tienda.nombre, rol: usuario.rol,
        vigente: tienda.vigente, plan: tienda.plan?.nombre ?? null, esDueno: global?.duenoCuentaId === usuario.cuentaId });
    }
    return {
      accessToken: this.tokens.sign(payload),
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
        sucursalId: usuario.sucursalId ?? null,
        proveedorId: usuario.proveedorId ?? null,
        mayorista: usuario.mayorista ?? false,
        avatarUrl: usuario.avatarUrl ?? '',
      },
      tienda: { id: tienda.id, slug: tienda.slug, nombre: tienda.nombre, plan: tienda.plan?.nombre ?? null },
      tiendas,
    };
  }
}
