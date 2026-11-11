import {
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaEsquemasService } from '../prisma/prisma-esquemas.service';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../tenancy/tenant-context';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidosController {
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

  @Get('despacho')
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  pendientes() {
    return this.db().pedido.findMany({
      where: { estado: 'pendiente' },
      include: {
        usuario: { select: { nombre: true, email: true } },
        venta: {
          select: {
            id: true,
            canal: true,
            estado: true,
            medioPago: true,
            lineas: {
              select: {
                cantidad: true,
                variante: {
                  select: {
                    talla: true,
                    color: true,
                    sku: true,
                    producto: { select: { nombre: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { creadoEn: 'asc' },
    });
  }

  @Post(':id/despachar')
  @Roles(Rol.ENCARGADO, Rol.ADMIN, Rol.SUPERADMIN)
  async despachar(@Param('id') id: string) {
    const pedido = await this.db().pedido.findUnique({
      where: { id },
      include: { venta: true },
    });
    if (!pedido) throw new ConflictException({ codigo: 'PEDIDO_NO' });
    if (pedido.estado === 'enviado') {
      throw new ConflictException({ codigo: 'YA_ENVIADO' });
    }
    if (!pedido.venta || pedido.venta.canal !== 'online') {
      throw new ConflictException({ codigo: 'NO_ES_ONLINE' });
    }
    if (pedido.venta.estado === 'devuelta' || pedido.venta.estado === 'anulada') {
      throw new ConflictException({ codigo: 'VENTA_DEVUELTA' });
    }
    if (!pedido.direccion.trim()) {
      throw new ConflictException({ codigo: 'SIN_DIRECCION' });
    }
    const seguimiento = `VESTA-${pedido.id.slice(0, 8).toUpperCase()}`;
    return this.db().pedido.update({
      where: { id },
      data: { estado: 'enviado', seguimiento, enviadoEn: new Date() },
    });
  }
}
