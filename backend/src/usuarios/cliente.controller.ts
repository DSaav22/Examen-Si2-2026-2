import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { IsString, MinLength } from 'class-validator'
import { Rol } from '@prisma/client'
import { CurrentUser } from '../auth/current-user'
import type { JwtPayload } from '../auth/jwt-payload'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { PrismaService } from '../prisma/prisma.service'

class DireccionDto { @IsString() @MinLength(3) detalle!: string; @IsString() ciudad!: string; @IsString() etiqueta!: string }
class PerfilDto { @IsString() @MinLength(2) nombre!: string }

@Controller('cliente')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.CLIENTA)
export class ClienteController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('favoritos') favoritos(@CurrentUser() user: JwtPayload) { return this.prisma.favorito.findMany({ where: { usuarioId: user.sub }, select: { productoId: true }, orderBy: { creadoEn: 'desc' } }).then(items => items.map(item => item.productoId)) }
  @Post('favoritos/:productoId') guardar(@CurrentUser() user: JwtPayload, @Param('productoId') productoId: string) { return this.prisma.favorito.upsert({ where: { usuarioId_productoId: { usuarioId: user.sub, productoId } }, update: {}, create: { usuarioId: user.sub, productoId } }) }
  @Delete('favoritos/:productoId') quitar(@CurrentUser() user: JwtPayload, @Param('productoId') productoId: string) { return this.prisma.favorito.deleteMany({ where: { usuarioId: user.sub, productoId } }) }
  @Get('perfil') perfil(@CurrentUser() user: JwtPayload) { return this.prisma.usuario.findUniqueOrThrow({ where: { id: user.sub }, select: { id: true, email: true, nombre: true, rol: true, direcciones: true, lealtad: true } }) }
  @Patch('perfil') async renombrar(@CurrentUser() user: JwtPayload, @Body() dto: PerfilDto) { return this.prisma.usuario.update({ where: { id: user.sub }, data: { nombre: dto.nombre.trim() }, select: { id: true, nombre: true, email: true } }) }
  @Get('direcciones') direcciones(@CurrentUser() user: JwtPayload) { return this.prisma.direccionCliente.findMany({ where: { usuarioId: user.sub }, orderBy: { id: 'desc' } }) }
  @Post('direcciones') direccion(@CurrentUser() user: JwtPayload, @Body() dto: DireccionDto) { return this.prisma.direccionCliente.create({ data: { ...dto, usuarioId: user.sub } }) }
  @Patch('direcciones/:id') async editarDireccion(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: DireccionDto) {
    const propia = await this.prisma.direccionCliente.findFirst({ where: { id, usuarioId: user.sub } })
    if (!propia) throw new NotFoundException({ codigo: 'DIRECCION_NO' })
    return this.prisma.direccionCliente.update({ where: { id }, data: dto })
  }
  @Get('cupones') async cupones() {
    const items = await this.prisma.cupon.findMany({ where: { activo: true, OR: [{ venceEn: null }, { venceEn: { gt: new Date() } }] }, select: { id: true, codigo: true, porcentaje: true, venceEn: true, usoMaximo: true, usado: true }, orderBy: { creadoEn: 'desc' } })
    return items.filter(item => item.usoMaximo == null || item.usado < item.usoMaximo)
  }
}
