import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CajaModule } from './caja/caja.module';
import { CatalogoModule } from './catalogo/catalogo.module';
import { InventarioModule } from './inventario/inventario.module';
import { MetaModule } from './meta/meta.module';
import { PagosModule } from './pagos/pagos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { IaModule } from './ia/ia.module';
import { ReportesModule } from './reportes/reportes.module';
import { ReservasModule } from './reservas/reservas.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { VentasModule } from './ventas/ventas.module';
import { AdminModule } from './admin/admin.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { CorreoModule } from './correo/correo.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogoModule,
    CajaModule,
    VentasModule,
    ReportesModule,
    IaModule,
    InventarioModule,
    ReservasModule,
    UsuariosModule,
    ProveedoresModule,
    PagosModule,
    MetaModule,
    AdminModule,
    PedidosModule,
    DevolucionesModule,
    CorreoModule,
    NotificacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
