import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Cuenta } from '@prisma/client';
import { CorreoService } from '../correo/correo.service';
import { PrismaService } from '../prisma/prisma.service';
import { TiendasService } from '../tenancy/tiendas.service';
import { nombreSchemaTienda } from '../tenancy/schema-nombre';

const HORAS_VERIFICACION = 48;

export type TiendaDeCuenta = {
  tiendaId: string;
  slug: string;
  nombre: string;
  rol: string;
  vigente: boolean;
  plan: string | null;
  esDueno: boolean;
};

/** Identidad global: una cuenta, varias tiendas. */
@Injectable()
export class CuentasService {
  private readonly log = new Logger(CuentasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
    private readonly config: ConfigService,
    private readonly tiendas: TiendasService,
  ) {}

  normalizar(email: string) {
    return email.trim().toLowerCase();
  }

  buscar(email: string) {
    return this.prisma.cuenta.findUnique({ where: { email: this.normalizar(email) } });
  }

  async validarClave(email: string, password: string): Promise<Cuenta | null> {
    const cuenta = await this.buscar(email);
    if (!cuenta) return null;
    return (await bcrypt.compare(password, cuenta.passwordHash)) ? cuenta : null;
  }

  async crear(datos: { email: string; nombre: string; password: string }) {
    const email = this.normalizar(datos.email);
    if (await this.buscar(email)) throw new ConflictException({ codigo: 'EMAIL_EN_USO' });
    return this.prisma.cuenta.create({
      data: {
        email,
        nombre: datos.nombre,
        passwordHash: await bcrypt.hash(datos.password, 10),
        ...this.nuevoToken(),
      },
    });
  }

  /**
   * Para altas dentro de una tienda (clienta que se registra, admin que crea un empleado).
   * Si la cuenta ya existe, se reutiliza; si trae clave, debe coincidir.
   */
  async obtenerOCrear(datos: { email: string; nombre: string; password?: string; exigirClave: boolean }) {
    const existente = await this.buscar(datos.email);
    if (existente) {
      if (datos.exigirClave && !(datos.password && (await bcrypt.compare(datos.password, existente.passwordHash)))) {
        throw new ConflictException({
          codigo: 'EMAIL_EN_USO',
          message: 'Ese correo ya tiene una cuenta. Usá la misma clave para unirte a esta tienda.',
        });
      }
      return { cuenta: existente, nueva: false };
    }
    const cuenta = await this.crear({
      email: datos.email,
      nombre: datos.nombre,
      password: datos.password ?? randomBytes(12).toString('base64url'),
    });
    await this.enviarVerificacion(cuenta).catch((e) => this.log.warn(`Verificación no enviada: ${e}`));
    return { cuenta, nueva: true };
  }

  async cambiarClave(cuentaId: string, nueva: string) {
    await this.prisma.cuenta.update({ where: { id: cuentaId }, data: { passwordHash: await bcrypt.hash(nueva, 10) } });
  }

  private nuevoToken() {
    return {
      verificacionToken: randomBytes(24).toString('base64url'),
      verificacionExpira: new Date(Date.now() + HORAS_VERIFICACION * 3600_000),
    };
  }

  /** Envía el enlace de verificación. En modo simulado (sin SMTP) devuelve la URL para la demo. */
  async enviarVerificacion(cuenta: Cuenta) {
    let actual = cuenta;
    if (!actual.verificacionToken || !actual.verificacionExpira || actual.verificacionExpira < new Date()) {
      actual = await this.prisma.cuenta.update({ where: { id: cuenta.id }, data: this.nuevoToken() });
    }
    const base = this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') || 'http://localhost:5173';
    const url = `${base}/verificar?token=${actual.verificacionToken}`;
    const envio = await this.correo.enviar({
      para: actual.email,
      asunto: 'EnsayAR · Confirmá tu correo',
      html: `<p>Hola ${actual.nombre || ''},</p>
<p>Confirmá que este correo es tuyo para activar tu cuenta de EnsayAR:</p>
<p><a href="${url}">Confirmar mi correo</a></p>
<p>El enlace vence en ${HORAS_VERIFICACION} horas.</p>`,
      texto: `Confirmá tu correo: ${url}`,
    });
    if (envio.modo === 'simulado') this.log.log(`[verificación simulada] ${actual.email} → ${url}`);
    return { modo: envio.modo, url: envio.modo === 'simulado' ? url : undefined };
  }

  async verificar(token: string) {
    const cuenta = await this.prisma.cuenta.findUnique({ where: { verificacionToken: token } });
    if (!cuenta) return null;
    if (cuenta.verificacionExpira && cuenta.verificacionExpira < new Date() && !cuenta.emailVerificado) return null;
    return this.prisma.cuenta.update({
      where: { id: cuenta.id },
      data: { emailVerificado: true, verificacionToken: null, verificacionExpira: null },
    });
  }

  /** Todas las tiendas donde la cuenta tiene un perfil activo. */
  async tiendasDe(cuentaId: string): Promise<TiendaDeCuenta[]> {
    const perfiles = await this.perfilesEnEsquemas(cuentaId);
    const out: TiendaDeCuenta[] = [];
    for (const p of perfiles) {
      const t = await this.tiendas.porId(p.tiendaId);
      if (!t) continue;
      const tienda = await this.prisma.tienda.findUnique({ where: { id: t.id }, select: { duenoCuentaId: true } });
      out.push({
        tiendaId: t.id,
        slug: t.slug,
        nombre: t.nombre,
        rol: p.rol,
        vigente: t.vigente,
        plan: t.plan?.nombre ?? null,
        esDueno: tienda?.duenoCuentaId === cuentaId,
      });
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /** Descubre perfiles únicamente en esquemas derivados de tiendas registradas. */
  private async perfilesEnEsquemas(cuentaId: string): Promise<{ tiendaId: string; rol: string }[]> {
    const tiendas = await this.prisma.tienda.findMany({ select: { id: true } });
    if (!tiendas.length) return [];
    const mapaEsquemas = new Map(tiendas.map(t => [nombreSchemaTienda(t.id), t.id]));
    const nombres = [...mapaEsquemas.keys()];
    const existentes = await this.prisma.$queryRaw<{ nspname: string }[]>`
      SELECT nspname FROM pg_namespace WHERE nspname = ANY(${nombres}::text[])`;
    const disponibles = new Set(existentes.map(e => e.nspname));
    if (nombres.some(e => !disponibles.has(e))) throw new Error('ESQUEMA_TIENDA_INEXISTENTE');
    const esquemasActivos = nombres.filter(e => disponibles.has(e));

    const perfiles: { tiendaId: string; rol: string }[] = [];
    if (esquemasActivos.length > 0) {
      // Todos los identificadores proceden de UUID validados de la plataforma; la cuenta se parametriza.
      const sql = esquemasActivos.map((e) => {
        const tiendaId = mapaEsquemas.get(e);
        return `SELECT tienda_id AS "tiendaId", '${tiendaId}' AS "esquemaTiendaId", rol::text AS rol FROM "${e}".usuarios WHERE cuenta_id=$1 AND activo=true`;
      }).join(' UNION ALL ');
      const deEsquemas = await this.prisma.$queryRawUnsafe<{ tiendaId: string; esquemaTiendaId: string; rol: string }[]>(sql, cuentaId);
      // Un esquema corrupto no puede anunciar una membresía de otra tienda.
      const ids = new Set(tiendas.map(t => t.id));
      if (deEsquemas.some(p => !ids.has(p.tiendaId) || p.tiendaId !== p.esquemaTiendaId)) throw new Error('PERFIL_TIENDA_INCONSISTENTE');
      for (const p of deEsquemas) perfiles.push({ tiendaId: p.tiendaId, rol: p.rol });
    }

    return perfiles;
  }
}
