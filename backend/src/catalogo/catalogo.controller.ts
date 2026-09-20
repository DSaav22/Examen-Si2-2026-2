import {
  Body,
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
    @Query('categoria') categoria?: string,
    @Query('ocasion') ocasion?: string,
    @Query('talla') talla?: string,
    @Query('color') color?: string,
    @Query('precioMin') precioMin?: string,
    @Query('precioMax') precioMax?: string,
    @Query('temporadaId') temporadaId?: string,
    @Query('coleccionId') coleccionId?: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.catalogo.listarProductos({
      categoria,
      ocasion,
      talla,
      color,
      precioMin: precioMin ? Number(precioMin) : undefined,
      precioMax: precioMax ? Number(precioMax) : undefined,
      temporadaId,
      coleccionId,
      sucursalId,
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

  @Get('sucursales')
  sucursales() {
    return this.catalogo.sucursales();
  }

  @Get('stock')
  stock(@Query('almacenId') almacenId?: string) {
    return this.catalogo.listarStock(almacenId);
  }

  @Get('variantes/:id/overlay')
  overlay(@Param('id') id: string) {
    return this.catalogo.overlay(id);
  }

  @Post('imagenes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
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
    archivo: { filename: string; mimetype: string; originalname: string },
  ) {
    return this.imagenes.desdeDisco(archivo);
  }

  @Post('productos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crear(@Body() dto: CrearProductoDto) {
    return this.catalogo.crearProducto(dto);
  }

  @Patch('productos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProductoDto) {
    return this.catalogo.actualizarProducto(id, dto);
  }

  @Post('productos/:id/variantes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  crearVariante(@Param('id') id: string, @Body() dto: CrearVarianteDto) {
    return this.catalogo.crearVariante(id, dto);
  }

  @Patch('variantes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  actualizarVariante(
    @Param('id') id: string,
    @Body() dto: ActualizarVarianteDto,
  ) {
    return this.catalogo.actualizarVariante(id, dto);
  }

  @Put('stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.ENCARGADO)
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
