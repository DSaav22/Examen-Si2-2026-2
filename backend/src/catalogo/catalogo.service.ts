import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarProductoDto, CrearProductoDto } from './dto/producto.dto';
import { ActualizarVarianteDto, CrearVarianteDto } from './dto/variante.dto';
import { UpsertStockDto } from './dto/stock.dto';

type ProductoCatalogo = Prisma.ProductoGetPayload<{
  include: {
    temporada: true;
    coleccion: true;
    proveedor: true;
    variantes: {
      include: { stocks: { include: { almacen: { include: { sucursal: true } } } } };
    };
  };
}>;

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  private productoPublico(producto: ProductoCatalogo) {
    return {
      ...producto,
      variantes: producto.variantes.map((variante) => ({
        ...variante,
        stocks: variante.stocks.map((stock) => {
          const disponible = stock.cantidad - stock.reservado;
          return {
            ...stock,
            cantidad: 0,
            reservado: 0,
            disponible: disponible > 0,
            estado: disponible <= 0 ? 'agotado' : disponible <= 2 ? 'ultimas_unidades' : 'disponible',
          };
        }),
      })),
    };
  }

  async listarProductos(filtros: {
    busqueda?: string;
    sku?: string;
    categoria?: string;
    ocasion?: string;
    talla?: string;
    color?: string;
    material?: string;
    estilo?: string;
    ajuste?: string;
    precioMin?: number;
    precioMax?: number;
    temporadaId?: string;
    coleccionId?: string;
    sucursalId?: string;
    descuento?: boolean;
    ordenar?:
      | 'relevancia'
      | 'precio-asc'
      | 'precio-desc'
      | 'novedades'
      | 'popularidad'
      | 'descuento';
    pagina?: number;
    limite?: number;
  }) {
    const paginada =
      filtros.pagina !== undefined || filtros.limite !== undefined;
    const pagina = Math.max(1, filtros.pagina ?? 1);
    const limite = Math.min(50, Math.max(1, filtros.limite ?? 8));
    const varianteWhere: Prisma.VarianteWhereInput = {
      ...(filtros.talla ? { talla: filtros.talla } : {}),
      ...(filtros.color ? { color: filtros.color } : {}),
      ...(filtros.sucursalId
        ? {
            stocks: {
              some: {
                cantidad: { gt: 0 },
                almacen: { sucursalId: filtros.sucursalId },
              },
            },
          }
        : {}),
    };
    const filtraVariante = Boolean(
      filtros.talla || filtros.color || filtros.sucursalId,
    );
    const where: Prisma.ProductoWhereInput = {
      ...(filtros.busqueda
        ? {
            OR: [
              { nombre: { contains: filtros.busqueda, mode: 'insensitive' } },
              {
                descripcion: {
                  contains: filtros.busqueda,
                  mode: 'insensitive',
                },
              },
              {
                variantes: {
                  some: {
                    sku: { contains: filtros.busqueda, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
      ...(filtros.sku
        ? {
            AND: [
              {
                variantes: {
                  some: { sku: { contains: filtros.sku, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
      ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
      ...(filtros.ocasion ? { ocasion: filtros.ocasion } : {}),
      ...(filtros.material
        ? { material: { contains: filtros.material, mode: 'insensitive' } }
        : {}),
      ...(filtros.ajuste
        ? { ajuste: { contains: filtros.ajuste, mode: 'insensitive' } }
        : {}),
      ...(filtros.estilo
        ? {
            OR: [
              { categoria: { contains: filtros.estilo, mode: 'insensitive' } },
              { ocasion: { contains: filtros.estilo, mode: 'insensitive' } },
              { descripcion: { contains: filtros.estilo, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(filtros.temporadaId ? { temporadaId: filtros.temporadaId } : {}),
      ...(filtros.coleccionId ? { coleccionId: filtros.coleccionId } : {}),
      ...(filtros.descuento ? { descuentoPct: { gt: 0 } } : {}),
      ...(filtros.precioMin !== undefined || filtros.precioMax !== undefined
        ? {
            precioBase: {
              ...(filtros.precioMin !== undefined
                ? { gte: filtros.precioMin }
                : {}),
              ...(filtros.precioMax !== undefined
                ? { lte: filtros.precioMax }
                : {}),
            },
          }
        : {}),
      ...(filtraVariante ? { variantes: { some: varianteWhere } } : {}),
    };
    const orderBy: Prisma.ProductoOrderByWithRelationInput =
      filtros.ordenar === 'precio-asc'
        ? { precioBase: 'asc' }
        : filtros.ordenar === 'precio-desc'
          ? { precioBase: 'desc' }
            : filtros.ordenar === 'descuento'
            ? { descuentoPct: 'desc' }
            : filtros.ordenar === 'popularidad'
              ? { popularidad: 'desc' }
              : filtros.ordenar === 'novedades'
                ? { creadoEn: 'desc' }
                : { nombre: 'asc' };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where,
        include: {
          temporada: true,
          coleccion: true,
          proveedor: true,
          variantes: {
            include: {
              stocks: { include: { almacen: { include: { sucursal: true } } } },
            },
          },
        },
        orderBy,
        ...(paginada ? { skip: (pagina - 1) * limite, take: limite } : {}),
      }),
    ]);
    if (!paginada) return items;
    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
      hayMas: pagina * limite < total,
    };
  }

  async obtenerProducto(id: string, interno = false) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        temporada: true,
        coleccion: true,
        proveedor: true,
        variantes: {
          include: {
            stocks: { include: { almacen: { include: { sucursal: true } } } },
          },
        },
      },
    });
    if (!producto) {
      throw new NotFoundException({ codigo: 'PRODUCTO_NO_EXISTE' });
    }
    return interno ? producto : this.productoPublico(producto);
  }

  async disponibilidad(sucursalId: string) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id: sucursalId },
      include: { almacenes: true },
    });
    if (!sucursal) throw new NotFoundException({ codigo: 'SUCURSAL_NO' });
    const almacenIds = sucursal.almacenes.map((a) => a.id);
    const stocks = await this.prisma.stockAlmacen.findMany({
      where: { almacenId: { in: almacenIds } },
      include: {
        variante: { include: { producto: true } },
        almacen: true,
      },
    });
    return stocks.map((s) => ({
      varianteId: s.varianteId,
      sku: s.variante.sku,
      talla: s.variante.talla,
      color: s.variante.color,
      producto: s.variante.producto.nombre,
      disponible: s.cantidad - s.reservado,
      cantidad: s.cantidad,
      reservado: s.reservado,
      estado:
        s.cantidad - s.reservado <= 0
          ? s.reservado > 0
            ? 'reservado'
            : 'agotado'
          : 'disponible',
      almacen: s.almacen.nombre,
      sucursal: sucursal.nombre,
    }));
  }

  crearProducto(dto: CrearProductoDto) {
    return this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion ?? '',
        categoria: dto.categoria,
        ocasion: dto.ocasion,
        precioBase: dto.precioBase,
        descuentoPct: dto.descuentoPct ?? 0,
        temporadaId: dto.temporadaId,
        coleccionId: dto.coleccionId,
        proveedorId: dto.proveedorId,
      },
    });
  }

  async actualizarProducto(id: string, dto: ActualizarProductoDto) {
    await this.obtenerProducto(id);
    return this.prisma.producto.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: dto.descripcion }
          : {}),
        ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
        ...(dto.ocasion !== undefined ? { ocasion: dto.ocasion } : {}),
        ...(dto.precioBase !== undefined ? { precioBase: dto.precioBase } : {}),
        ...(dto.descuentoPct !== undefined
          ? { descuentoPct: dto.descuentoPct }
          : {}),
        ...(dto.precioMayorista !== undefined
          ? { precioMayorista: dto.precioMayorista }
          : {}),
        ...(dto.minimoMayorista !== undefined
          ? { minimoMayorista: dto.minimoMayorista }
          : {}),
        ...(dto.temporadaId !== undefined
          ? { temporadaId: dto.temporadaId }
          : {}),
        ...(dto.coleccionId !== undefined
          ? { coleccionId: dto.coleccionId }
          : {}),
        ...(dto.proveedorId !== undefined
          ? { proveedorId: dto.proveedorId }
          : {}),
      },
    });
  }

  async crearVariante(productoId: string, dto: CrearVarianteDto) {
    await this.obtenerProducto(productoId);
    return this.prisma.variante.create({
      data: {
        productoId,
        talla: dto.talla,
        color: dto.color,
        sku: dto.sku,
        urlFoto: dto.urlFoto ?? '',
        urlOverlay: dto.urlOverlay ?? '',
      },
    });
  }

  async overlay(id: string) {
    const variante = await this.prisma.variante.findUnique({
      where: { id },
      include: { producto: true },
    });
    if (!variante) {
      throw new NotFoundException({ codigo: 'VARIANTE_NO_EXISTE' });
    }
    return {
      varianteId: variante.id,
      talla: variante.talla,
      color: variante.color,
      urlOverlay: variante.urlOverlay || '/overlay-polera.png',
      producto: variante.producto.nombre,
      urlModelo: variante.urlModelo,
    };
  }

  actualizarVariante(id: string, dto: ActualizarVarianteDto) {
    return this.prisma.variante.update({
      where: { id },
      data: dto,
    });
  }

  async upsertStock(dto: UpsertStockDto) {
    const qty = Math.max(0, dto.cantidad);
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { cantidad: number; reservado: number }[]
      >`
        SELECT cantidad, reservado FROM stock_almacen
        WHERE variante_id = ${dto.varianteId} AND almacen_id = ${dto.almacenId}
        FOR UPDATE
      `;
      if (rows[0] && qty < rows[0].reservado) {
        throw new ConflictException({
          codigo: 'STOCK_MENOR_QUE_RESERVADO',
          reservado: rows[0].reservado,
          cantidad: qty,
        });
      }
      if (!rows[0]) {
        return tx.stockAlmacen.create({
          data: {
            varianteId: dto.varianteId,
            almacenId: dto.almacenId,
            cantidad: qty,
            reservado: 0,
          },
        });
      }
      return tx.stockAlmacen.update({
        where: {
          varianteId_almacenId: {
            varianteId: dto.varianteId,
            almacenId: dto.almacenId,
          },
        },
        data: { cantidad: qty },
      });
    });
  }

  listarStock(almacenId?: string) {
    return this.prisma.stockAlmacen.findMany({
      where: almacenId ? { almacenId } : undefined,
      include: { variante: { include: { producto: true } }, almacen: true },
    });
  }

  sucursales() {
    return this.prisma.sucursal.findMany({
      include: { almacenes: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
