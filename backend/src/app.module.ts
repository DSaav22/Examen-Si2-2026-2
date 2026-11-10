import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';
import { PlataformaModule } from './plataforma/plataforma.module';
import { PushModule } from './push/push.module';
import { SyncModule } from './sync/sync.module';
import { CreditosModule } from './creditos/creditos.module';

/**
 * Composición de la API de EnsayAR.
 *
 * Este archivo no contiene reglas de negocio: es el índice para ubicar el
 * módulo dueño de cada dominio. Las reglas viven en los services y los
 * controladores sólo exponen sus endpoints HTTP con guards de JWT/rol.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenancyModule,
    AuthModule,
    PlataformaModule,
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
    PushModule,
    SyncModule,
    CreditosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
