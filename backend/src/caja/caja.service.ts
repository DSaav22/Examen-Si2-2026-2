import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';

@Injectable()
export class CajaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esquemas: PrismaEsquemasService,
    private readonly config: ConfigService,
  ) {}

  private db(): PrismaService {
    const tiendaId = TenantContext.tiendaId();
    if (tiendaId && (this.config?.get<string>('TENANT_SCHEMAS_PERFILES') === 'true' || this.config?.get<string>('TENANT_SCHEMAS_VENTAS') === 'true') && this.esquemas) {
      return this.esquemas.clienteTienda(tiendaId) as unknown as PrismaService;
    }
    return this.prisma;
  }

  turnoAbierto(cajeroId: string) {
    return this.db().cajaTurno.findFirst({
      where: { cajeroId, cerradoEn: null },
      include: { sucursal: { include: { almacenes: true } } },
      orderBy: { abiertoEn: 'desc' },
    });
  }

  async abrir(
    cajeroId: string,
    sucursalId: string,
    fondoInicial: number,
    rol: Rol,
  ) {
    const abierto = await this.turnoAbierto(cajeroId);
    if (abierto) {
      throw new ConflictException({
        codigo: 'TURNO_YA_ABIERTO',
        turnoId: abierto.id,
      });
    }

    if (rol === Rol.CAJERO) {
      const u = await this.db().usuario.findUniqueOrThrow({
        where: { id: cajeroId },
      });
      if (!u.sucursalId || u.sucursalId !== sucursalId) {
        throw new ForbiddenException({ codigo: 'CAJA_OTRA_SUCURSAL' });
      }
    }

    const tiendaId = TenantContext.tiendaId();
    return this.db().cajaTurno.create({
      data: { ...(tiendaId ? { tiendaId } : {}), sucursalId, cajeroId, fondoInicial },
      include: { sucursal: { include: { almacenes: true } } },
    });
  }

  async cerrar(cajeroId: string, totalDeclarado: number) {
    const abierto = await this.turnoAbierto(cajeroId);
    if (!abierto) {
      throw new NotFoundException({ codigo: 'SIN_TURNO' });
    }
    const cerrado = await this.db().cajaTurno.update({
      where: { id: abierto.id },
      data: { cerradoEn: new Date(), totalDeclarado },
    });
    const esperado =
      Number(abierto.fondoInicial) + Number(abierto.totalSistema);
    return {
      ...cerrado,
      esperado,
      diferencia: Number(totalDeclarado) - esperado,
    };
  }
}
