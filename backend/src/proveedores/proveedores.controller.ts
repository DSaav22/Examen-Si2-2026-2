import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Rol, TipoMovimiento } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

class ProveedorDto {
  @IsString()
  @MinLength(2)
  nombre!: string;
  @IsOptional()
  @IsString()
  contacto?: string;
}

class ProductoProveedorDto {
  @IsString()
  nombre!: string;
  @IsString()
  categoria!: string;
  @IsString()
  ocasion!: string;
  @IsOptional()
  @IsString()
  descripcion?: string;
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioBase!: number;
  @IsOptional()
  @IsString()
  temporadaId?: string;
  @IsOptional()
  @IsString()
  coleccionId?: string;
  @IsOptional()
  @IsString()
  talla?: string;
  @IsOptional()
  @IsString()
  color?: string;
  @IsOptional()
  @IsString()
  sku?: string;
}

@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mis-productos')
  @Roles(Rol.PROVEEDOR)
  async misProductos(@CurrentUser() user: JwtPayload) {
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    if (!u.proveedorId) return [];
    return this.prisma.producto.findMany({
      where: { proveedorId: u.proveedorId },
      include: {
        variantes: { include: { stocks: true } },
        temporada: true,
        coleccion: true,
      },
    });
  }

  @Post('mis-productos')
  @Roles(Rol.PROVEEDOR)
  async crearProducto(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProductoProveedorDto,
  ) {
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
    });
    const talla = dto.talla?.trim() || 'M';
    const color = dto.color?.trim() || 'unico';
    const skuBase =
      dto.sku?.trim() ||
      `${dto.nombre.slice(0, 3).toUpperCase()}-${color.slice(0, 3).toUpperCase()}-${talla}-${Date.now().toString(36).slice(-4)}`;
    return this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        categoria: dto.categoria,
        ocasion: dto.ocasion,
        descripcion: dto.descripcion ?? '',
        precioBase: Number(dto.precioBase),
        temporadaId: dto.temporadaId,
        coleccionId: dto.coleccionId,
        proveedorId: u.proveedorId,
        variantes: {
          create: {
            talla,
            color,
            sku: skuBase,
            urlFoto:
              dto.categoria === 'faldas' ? '/foto-falda.svg' : '/foto-polera.svg',
            urlOverlay: '/overlay-polera.png',
          },
        },
      },
      include: { variantes: true },
    });
  }

  @Get('mis-ingresos')
  @Roles(Rol.PROVEEDOR)
  async misIngresos(
    @CurrentUser() user: JwtPayload,
    @Query('pagina') paginaRaw?: string,
    @Query('limite') limiteRaw?: string,
  ) {
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: user.sub },
      select: { proveedorId: true },
    });
    const pagina = Math.max(1, Number.parseInt(paginaRaw ?? '1', 10) || 1);
    const limite = Math.min(50, Math.max(1, Number.parseInt(limiteRaw ?? '8', 10) || 8));
    if (!u.proveedorId) return { items: [], total: 0, pagina, limite };

    const where = {
      tipo: TipoMovimiento.ingreso_proveedor,
      variante: { producto: { proveedorId: u.proveedorId } },
    };
    const [total, movimientos] = await this.prisma.$transaction([
      this.prisma.movimientoInventario.count({ where }),
      this.prisma.movimientoInventario.findMany({
        where,
        include: {
          variante: { include: { producto: { select: { nombre: true } } } },
          almacen: { include: { sucursal: { select: { nombre: true, ciudad: true } } } },
        },
        orderBy: { creadoEn: 'desc' },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
    ]);
    const actorIds = [...new Set(movimientos.map(item => item.usuarioId).filter(Boolean))] as string[];
    const actores = actorIds.length
      ? await this.prisma.usuario.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, nombre: true, email: true },
        })
      : [];
    const porId = new Map(actores.map(actor => [actor.id, actor]));
    return {
      total,
      pagina,
      limite,
      items: movimientos.map(item => ({
        ...item,
        usuario: item.usuarioId ? porId.get(item.usuarioId) ?? null : null,
      })),
    };
  }

  @Get()
  @Roles(Rol.ADMIN, Rol.PROVEEDOR, Rol.SUPERADMIN)
  listar() {
    return this.prisma.proveedor.findMany({
      include: { productos: true },
      orderBy: { nombre: 'asc' },
    });
  }

  @Post()
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  crear(@Body() dto: ProveedorDto) {
    return this.prisma.proveedor.create({
      data: { nombre: dto.nombre, contacto: dto.contacto ?? '' },
    });
  }

  @Patch(':id')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ProveedorDto) {
    return this.prisma.proveedor.update({
      where: { id },
      data: { nombre: dto.nombre, contacto: dto.contacto ?? '' },
    });
  }
}
