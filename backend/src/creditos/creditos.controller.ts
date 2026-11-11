import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Idempotente } from '../sync/idempotencia.interceptor';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';

const MEDIOS_ABONO = ['efectivo', 'qr', 'transferencia', 'tarjeta'] as const;

class AbonoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto!: number;

  @IsIn(MEDIOS_ABONO)
  medioPago!: (typeof MEDIOS_ABONO)[number];

  @IsOptional()
  @IsString()
  cajaTurnoId?: string;
}

const DIA = 86_400_000;

@Controller('creditos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.ENCARGADO, Rol.CAJERO, Rol.SUPERADMIN)
export class CreditosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esquemas: PrismaEsquemasService,
    private readonly config: ConfigService,
  ) {}

  private db(): PrismaService {
    const tiendaId = TenantContext.tiendaId();
    if (tiendaId && this.config.get<string>('TENANT_SCHEMAS_PERFILES') === 'true') {
      return this.esquemas.clienteTienda(tiendaId) as unknown as PrismaService;
    }
    return this.prisma;
  }

  @Get()
  async listar(@Query('estado') estado?: string, @Query('clientaId') clientaId?: string) {
    const cuentas = await this.db().cuentaCobrar.findMany({
      where: {
        ...(estado === 'pagados' ? { saldo: 0 } : estado === 'todos' ? {} : { saldo: { gt: 0 } }),
        ...(clientaId ? { clientaId } : {}),
      },
      include: {
        clienta: { select: { id: true, nombre: true, email: true } },
        venta: { select: { uuid: true, almacen: { select: { sucursal: { select: { nombre: true } } } } } },
        abonos: { orderBy: { creadoEn: 'desc' } },
      },
      orderBy: { venceEn: 'asc' },
      take: 300,
    });
    const hoy = Date.now();
    return cuentas.map((c) => ({
      id: c.id,
      clienta: c.clienta,
      sucursal: c.venta.almacen.sucursal.nombre,
      venta: c.venta.uuid,
      monto: Number(c.monto),
      saldo: Number(c.saldo),
      pagado: Number(c.monto) - Number(c.saldo),
      creadaEn: c.creadaEn,
      venceEn: c.venceEn,
      diasMora: Number(c.saldo) > 0 ? Math.max(0, Math.floor((hoy - c.venceEn.getTime()) / DIA)) : 0,
      abonos: c.abonos.map((a) => ({ id: a.id, monto: Number(a.monto), medioPago: a.medioPago, creadoEn: a.creadoEn })),
    }));
  }

  @Post(':id/abonos')
  @Idempotente()
  abonar(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: AbonoDto) {
    const tiendaId = TenantContext.tiendaIdOrThrow();
    return this.db().$transaction(async (tx) => {
      if (dto.cajaTurnoId) {
        const turno = await tx.cajaTurno.findUnique({ where: { id: dto.cajaTurnoId } });
        if (!turno || turno.cerradoEn || (user.rol === Rol.CAJERO && turno.cajeroId !== user.sub)) {
          throw new ConflictException({ codigo: 'TURNO_INVALIDO' });
        }
      }
      // Descuento condicional: dos abonos simultáneos nunca dejan el saldo negativo.
      const filas = await tx.$executeRaw`
        UPDATE cuentas_cobrar SET saldo = saldo - ${dto.monto}::numeric
        WHERE id = ${id} AND tienda_id = ${tiendaId} AND saldo >= ${dto.monto}::numeric`;
      if (filas === 0) {
        const cuenta = await tx.cuentaCobrar.findUnique({ where: { id } });
        if (!cuenta) throw new ConflictException({ codigo: 'CREDITO_NO' });
        throw new ConflictException({
          codigo: 'ABONO_EXCEDE_SALDO',
          mensaje: `El saldo pendiente es Bs ${Number(cuenta.saldo).toFixed(2)}.`,
          saldo: Number(cuenta.saldo),
        });
      }
      const abono = await tx.abonoCredito.create({
        data: {
          cuentaId: id,
          monto: dto.monto,
          medioPago: dto.medioPago,
          usuarioId: user.sub,
          cajaTurnoId: dto.cajaTurnoId,
        },
      });
      if (dto.cajaTurnoId) {
        await tx.cajaTurno.update({
          where: { id: dto.cajaTurnoId },
          data: { totalSistema: { increment: dto.monto } },
        });
      }
      await tx.auditoria.create({
        data: { accion: 'abono_credito', recurso: id, detalle: `${dto.monto}`, usuarioId: user.sub },
      });
      const cuenta = await tx.cuentaCobrar.findUniqueOrThrow({ where: { id } });
      return { abonoId: abono.id, saldo: Number(cuenta.saldo) };
    });
  }
}
