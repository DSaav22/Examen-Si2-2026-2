import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Rol } from '@prisma/client';
import { CurrentUser } from '../auth/current-user';
import type { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogoService } from './catalogo.service';
import { ImagenService } from './imagen.service';
import { ActualizarProductoDto, CrearProductoDto } from './dto/producto.dto';
import { UpsertStockDto } from './dto/stock.dto';
import { ActualizarVarianteDto, CrearVarianteDto } from './dto/variante.dto';

@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogo: CatalogoService,
    private readonly imagenes: ImagenService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('productos')
  listar(
    @Query('q') busqueda?: string,
    @Query('sku') sku?: string,
    @Query('categoria') categoria?: string,
    @Query('ocasion') ocasion?: string,
    @Query('talla') talla?: string,
    @Query('color') color?: string,
    @Query('material') material?: string,
    @Query('estilo') estilo?: string,
    @Query('ajuste') ajuste?: string,
    @Query('precioMin') precioMin?: string,
    @Query('precioMax') precioMax?: string,
    @Query('temporadaId') temporadaId?: string,
    @Query('coleccionId') coleccionId?: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('descuento') descuento?: string,
    @Query('ordenar')
    ordenar?:
      | 'relevancia'
      | 'precio-asc'
      | 'precio-desc'
      | 'novedades'
      | 'popularidad'
      | 'descuento',
    @Query('pagina') pagina?: string,
    @Query('limite') limite?: string,
  ) {
    return this.catalogo.listarProductos({
      busqueda,
      sku,
      categoria,
      ocasion,
      talla,
      color,
      material,
      estilo,
      ajuste,
      precioMin: precioMin ? Number(precioMin) : undefined,
      precioMax: precioMax ? Number(precioMax) : undefined,
      temporadaId,
      coleccionId,
      sucursalId,
      descuento: descuento === 'true',
      ordenar,
      pagina: pagina ? Number(pagina) : undefined,
      limite: limite ? Number(limite) : undefined,
    });
  }

  @Get('disponibilidad')
  disponibilidad(@Query('sucursalId') sucursalId: string) {
    return this.catalogo.disponibilidad(sucursalId);
  }

  @Get('productos/:id')
  obtener(@Param('id') id: string) {
    return this.catalogo.obtenerProducto(id);
  }

  @Get('productos/:id/complementarios')
  async complementarios(@Param('id') id: string) {
    const producto = await this.catalogo.obtenerProducto(id);
    const items = await this.catalogo.listarProductos({ ocasion: producto.ocasion });
    const list = Array.isArray(items) ? items : items.items;
    return list.filter(item => item.id !== id && item.categoria !== producto.categoria).slice(0, 4);
  }

  @Get('productos/:id/interno')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.ENCARGADO, Rol.SUPERADMIN)
  obtenerInterno(@Param('id') id: string) {
    return this.catalogo.obtenerProducto(id, true);
  }

  @Get('sucursales')
  sucursales() {
    return this.catalogo.sucursales();
  }

  @Get('categorias')
  async categorias() {
    const categorias = await this.prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: 'asc' } });
    if (categorias.length) return categorias;
    const legacy = await this.prisma.producto.findMany({ distinct: ['categoria'], select: { categoria: true }, orderBy: { categoria: 'asc' } });
    return legacy.map(item => ({ id: item.categoria, nombre: item.categoria, activa: true, origen: 'compatibilidad' }));
  }

  @Get('productos/:id/opiniones')
  async opiniones(@Param('id') productoId: string) {
    const items = await this.prisma.opinion.findMany({ where: { productoId, moderada: true }, orderBy: { creadaEn: 'desc' }, include: { usuario: { select: { nombre: true } } } });
    const promedio = items.length ? items.reduce((sum, item) => sum + item.puntuacion, 0) / items.length : 0;
    return { promedio: Number(promedio.toFixed(2)), cantidad: items.length, items };
  }

  @Post('productos/:id/opiniones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA)
  async crearOpinion(@Param('id') productoId: string, @CurrentUser() user: JwtPayload, @Body() body: { puntuacion?: number; comentario?: string; imagenUrl?: string }) {
    const puntuacion = Number(body.puntuacion);
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) throw new BadRequestException('La puntuación debe estar entre 1 y 5');
    const compra = await this.prisma.venta.count({ where: { clientaId: user.sub, lineas: { some: { variante: { productoId } } } } });
    return this.prisma.opinion.upsert({ where: { productoId_usuarioId: { productoId, usuarioId: user.sub } }, update: { puntuacion, comentario: body.comentario ?? '', imagenUrl: body.imagenUrl ?? '', verificada: compra > 0, moderada: false }, create: { productoId, usuarioId: user.sub, puntuacion, comentario: body.comentario ?? '', imagenUrl: body.imagenUrl ?? '', verificada: compra > 0, moderada: false } });
  }

  @Post('productos/:id/alertas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.CLIENTA)
  alertar(@Param('id') productoId: string, @CurrentUser() user: JwtPayload, @Body() body: { tipo?: string }) {
    const tipo = body.tipo === 'precio' ? 'precio' : 'reposicion';
    return this.prisma.alertaProducto.upsert({ where: { productoId_usuarioId_tipo: { productoId, usuarioId: user.sub, tipo } }, update: { activa: true }, create: { productoId, usuarioId: user.sub, tipo } });
  }

  @Get('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.CAJERO, Rol.ENCARGADO, Rol.SUPERADMIN)
  stock(@Query('almacenId') almacenId?: string) {
    return this.catalogo.listarStock(almacenId);
  }

  @Get('variantes/:id/overlay')
  overlay(@Param('id') id: string) {
    return this.catalogo.overlay(id);
  }

  @Post('imagenes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor('archivo', {
      dest: (() => {
        const dir = join(process.cwd(), 'public', 'uploads');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        return dir;
      })(),
      limits: { fileSize: 2_000_000 },
    }),
  )
  subir(
    @UploadedFile()
    archivo: {
      filename: string;
      mimetype: string;
      originalname: string;
    },
  ) {
    return this.imagenes.desdeDisco(archivo);
  }

  @Post('productos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  crear(@Body() dto: CrearProductoDto) {
    return this.catalogo.crearProducto(dto);
  }

  @Patch('productos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProductoDto) {
    return this.catalogo.actualizarProducto(id, dto);
  }

  @Post('productos/:id/variantes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  crearVariante(@Param('id') id: string, @Body() dto: CrearVarianteDto) {
    return this.catalogo.crearVariante(id, dto);
  }

  @Patch('variantes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  actualizarVariante(
    @Param('id') id: string,
    @Body() dto: ActualizarVarianteDto,
  ) {
    return this.catalogo.actualizarVariante(id, dto);
  }

  @Put('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.ENCARGADO, Rol.SUPERADMIN)
  async upsertStock(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertStockDto,
  ) {
    if (user.rol === Rol.ENCARGADO) {
      const u = await this.prisma.usuario.findUniqueOrThrow({
        where: { id: user.sub },
      });
      if (!u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ENCARGADO_SIN_SUCURSAL' });
      }
      const a = await this.prisma.almacen.findUnique({
        where: { id: dto.almacenId },
      });
      if (!a || a.sucursalId !== u.sucursalId) {
        throw new ForbiddenException({ codigo: 'ALMACEN_OTRA_SUCURSAL' });
      }
    }
    return this.catalogo.upsertStock(dto);
  }
}
