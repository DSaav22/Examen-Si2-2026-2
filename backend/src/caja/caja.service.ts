import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CajaService {
  constructor(private readonly prisma: PrismaService) {}

  turnoAbierto(cajeroId: string) {
    return this.prisma.cajaTurno.findFirst({
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
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: cajeroId },
      });
      if (!u.sucursalId || u.sucursalId !== sucursalId) {
        throw new ForbiddenException({ codigo: 'CAJA_OTRA_SUCURSAL' });
      }
    }

    return this.prisma.cajaTurno.create({
      data: { sucursalId, cajeroId, fondoInicial },
      include: { sucursal: { include: { almacenes: true } } },
    });
  }

  async cerrar(cajeroId: string, totalDeclarado: number) {
    const abierto = await this.turnoAbierto(cajeroId);
    if (!abierto) {
      throw new NotFoundException({ codigo: 'SIN_TURNO' });
    }
    const cerrado = await this.prisma.cajaTurno.update({
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
