import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

const schema = [
  ['usuarios', 'Identidad y acceso', 'existente', ['id PK', 'email UNIQUE', 'nombre', 'rol', 'sucursal_id FK', 'proveedor_id FK']],
  ['sucursales', 'Sucursales', 'existente', ['id PK', 'nombre', 'ciudad']],
  ['almacenes', 'Sucursales', 'existente', ['id PK', 'nombre', 'sucursal_id FK']],
  ['proveedores', 'Inventario', 'existente', ['id PK', 'nombre', 'contacto']],
  ['temporadas', 'Catálogo', 'existente', ['id PK', 'nombre UNIQUE']],
  ['colecciones', 'Catálogo', 'existente', ['id PK', 'nombre UNIQUE']],
  ['productos', 'Catálogo', 'existente', ['id PK', 'nombre', 'categoria', 'ocasion', 'precio_base', 'descuento_pct', 'temporada_id FK', 'coleccion_id FK', 'proveedor_id FK']],
  ['variantes', 'Catálogo', 'existente', ['id PK', 'producto_id FK', 'talla', 'color', 'sku UNIQUE', 'url_foto']],
  ['stock_almacen', 'Inventario', 'existente', ['variante_id PK/FK', 'almacen_id PK/FK', 'cantidad', 'reservado']],
  ['movimientos_inventario', 'Inventario', 'existente', ['id PK', 'tipo', 'cantidad', 'variante_id FK', 'almacen_id FK', 'venta_id FK', 'reserva_id FK']],
  ['reservas', 'Ventas y pedidos', 'existente', ['id PK', 'estado', 'horario', 'clienta_id FK', 'sucursal_id FK']],
  ['lineas_reserva', 'Ventas y pedidos', 'existente', ['id PK', 'reserva_id FK', 'variante_id FK', 'cantidad']],
  ['caja_turnos', 'Ventas y pedidos', 'existente', ['id PK', 'sucursal_id FK', 'cajero_id FK', 'fondo_inicial', 'cerrado_en', 'total_sistema']],
  ['ventas', 'Ventas y pedidos', 'existente', ['id PK', 'uuid UNIQUE', 'canal', 'estado', 'medio_pago', 'total', 'almacen_id FK', 'clienta_id FK']],
  ['lineas_venta', 'Ventas y pedidos', 'existente', ['id PK', 'venta_id FK', 'variante_id FK', 'cantidad', 'precio_unitario']],
  ['pagos_simulados', 'Ventas y pedidos', 'existente', ['id PK', 'venta_id UNIQUE/FK', 'estado', 'referencia']],
  ['reportes_ejecuciones', 'Sincronización y auditoría', 'existente', ['id PK', 'pregunta', 'sql', 'filas', 'admin_id FK']],
  ['favorites', 'Clientes y CRM', 'conceptual', ['pendiente de modelo']],
  ['reviews', 'Clientes y CRM', 'conceptual', ['pendiente de modelo']],
  ['promotions', 'Promociones', 'conceptual', ['pendiente de modelo']],
  ['audit_logs', 'Sincronización y auditoría', 'propuesta', ['requiere aprobación de migración']],
  ['employees', 'Recursos humanos', 'propuesta', ['requiere aprobación de migración']],
  ['contracts', 'Recursos humanos', 'propuesta', ['requiere aprobación de migración']],
  ['salaries', 'Recursos humanos', 'propuesta', ['requiere aprobación de migración']],
  ['sync_operations', 'Sincronización y auditoría', 'propuesta', ['requiere aprobación de migración']],
] as const;

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.SUPERADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('esquema') esquema() { return schema.map(([nombre, dominio, estado, campos]) => ({ nombre, dominio, estado, campos, relaciones: campos.filter(campo => campo.includes('FK')) })); }

  @Get('resumen')
  async resumen() {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const [ventas, ventasOnline, ventasPos, productos, variantes, sucursales, usuarios, turnos, stockBajo] = await Promise.all([
      this.prisma.venta.aggregate({ where: { creadaEn: { gte: inicio }, estado: { in: ['cobrada', 'pendiente_pago'] } }, _sum: { total: true }, _count: true }),
      this.prisma.venta.count({ where: { creadaEn: { gte: inicio }, canal: 'online' } }),
      this.prisma.venta.count({ where: { creadaEn: { gte: inicio }, canal: 'pos' } }),
      this.prisma.producto.count(), this.prisma.variante.count(), this.prisma.sucursal.count(), this.prisma.usuario.count(),
      this.prisma.cajaTurno.count({ where: { cerradoEn: null } }), this.prisma.stockAlmacen.count({ where: { cantidad: { gt: 0, lte: 2 } } }),
    ]);
    return { periodo: inicio.toISOString(), ventas: { total: Number(ventas._sum.total ?? 0), operaciones: ventas._count, online: ventasOnline, pos: ventasPos }, catalogo: { productos, variantes }, sucursales, usuarios, turnosAbiertos: turnos, inventarioBajo: stockBajo, alertas: stockBajo + turnos };
  }
  @Get('auditoria')
  auditoria() { return this.prisma.auditoria.findMany({ orderBy: { creadoEn: 'desc' }, take: 100 }); }

  @Get('modulos')
  async modulos() {
    const [pedidos, cupones, opiniones, empleados, eventos, sync] = await Promise.all([
      this.prisma.pedido.count(), this.prisma.cupon.count(), this.prisma.opinion.count(),
      this.prisma.empleado.count(), this.prisma.eventoAnalitica.count(), this.prisma.operacionSync.count(),
    ]);
    return { pedidos, cupones, opiniones, empleados, eventos, sync };
  }

  @Get('opiniones/pendientes')
  opinionesPendientes() { return this.prisma.opinion.findMany({ where: { moderada: false }, include: { producto: { select: { nombre: true } }, usuario: { select: { nombre: true, email: true } } }, orderBy: { creadaEn: 'asc' } }); }

  @Patch('opiniones/:id/moderacion')
  async moderarOpinion(@Param('id') id: string, @Body() body: { aprobar?: boolean }) {
    const aprobar = body.aprobar === true
    const opinion = aprobar
      ? await this.prisma.opinion.update({ where: { id }, data: { moderada: true } })
      : await this.prisma.opinion.delete({ where: { id } })
    await this.prisma.auditoria.create({ data: { accion: aprobar ? 'opinion_publicada' : 'opinion_rechazada', recurso: id, detalle: 'moderacion' } })
    return opinion
  }
}
