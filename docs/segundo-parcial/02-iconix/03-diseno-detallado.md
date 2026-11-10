# 9.3 Diseño detallado

El diseño detallado asigna comportamiento a las clases. Hay un diagrama de secuencia por caso de uso, y sus líneas de vida son las de la robustez: el actor, la pantalla, las entidades y las interfaces externas. A ellas se suman las clases del backend que realizan el caso. Cada control de la robustez reaparece como un mensaje del servicio hacia la entidad que toca.

En NestJS, la clase que recibe la petición HTTP se llama controller, pero en términos de ICONIX es una frontera del lado del servidor: valida la entrada, toma el usuario y la tienda del token, y delega. Los controles de ICONIX quedan como operaciones del servicio. En los módulos sin servicio propio (Créditos, Pagos, Devoluciones, Pedidos, Usuarios, Cliente y Administración), el controller ejecuta los controles directamente sobre Prisma; la CDR lo registra como deuda técnica.

Los mensajes de retorno se dibujan punteados. La arquitectura técnica que la robustez omitía (el guard JWT, el contexto de tienda y la clave de idempotencia) no se repite en cada secuencia: se aplica a todas las rutas por el mismo mecanismo y se muestra una sola vez en la arquitectura.

## Lote 0: Casos heredados del primer ciclo, revisados con robustez y secuencia

### Secuencia UC01 Consultar catálogo

![Figura 9.3.1: Secuencia de UC01 Consultar catálogo](../imagenes/ea/seq-uc01.png)

Ruta `GET /catalogo/productos`, realizada por `CatalogoService.listarProductos`.

### Secuencia UC02 Ver ficha y variantes

![Figura 9.3.2: Secuencia de UC02 Ver ficha y variantes](../imagenes/ea/seq-uc02.png)

Ruta `GET /catalogo/productos/:id`, realizada por `CatalogoService.obtenerProducto`.

### Secuencia UC03 Usar el probador virtual

![Figura 9.3.3: Secuencia de UC03 Usar el probador virtual](../imagenes/ea/seq-uc03.png)

Ruta `GET /catalogo/variantes/:id/overlay`, realizada por `CatalogoService.overlay`.

### Secuencia UC04 Consultar la ficha con el asistente

![Figura 9.3.4: Secuencia de UC04 Consultar la ficha con el asistente](../imagenes/ea/seq-uc04.png)

Ruta `POST /ia/ficha`, realizada por `IaService.ficha`.

### Secuencia UC05 Comprar en línea

![Figura 9.3.5: Secuencia de UC05 Comprar en línea](../imagenes/ea/seq-uc05.png)

Ruta `POST /ventas`, realizada por `VentasService.cobrar`.

### Secuencia UC06 Abrir caja

![Figura 9.3.6: Secuencia de UC06 Abrir caja](../imagenes/ea/seq-uc06.png)

Ruta `POST /caja/abrir`, realizada por `CajaService.abrir`.

### Secuencia UC07 Registrar venta en el punto de venta

![Figura 9.3.7: Secuencia de UC07 Registrar venta en el punto de venta](../imagenes/ea/seq-uc07.png)

Ruta `POST /ventas`, realizada por `VentasService.cobrar`.

### Secuencia UC08 Cerrar caja

![Figura 9.3.8: Secuencia de UC08 Cerrar caja](../imagenes/ea/seq-uc08.png)

Ruta `POST /caja/cerrar`, realizada por `CajaService.cerrar`.

### Secuencia UC09 Administrar catálogo

![Figura 9.3.9: Secuencia de UC09 Administrar catálogo](../imagenes/ea/seq-uc09.png)

Ruta `POST /catalogo/productos`, realizada por `CatalogoService.crearProducto`.

### Secuencia UC10 Pedir reporte predefinido

![Figura 9.3.10: Secuencia de UC10 Pedir reporte predefinido](../imagenes/ea/seq-uc10.png)

Ruta `GET /reportes/negocio`, realizada por `ReportesService.negocio`.

### Secuencia UC11 Reservar una prenda

![Figura 9.3.11: Secuencia de UC11 Reservar una prenda](../imagenes/ea/seq-uc11.png)

Ruta `POST /reservas`, realizada por `ReservasService.crear`.

### Secuencia UC12 Atender reservas

![Figura 9.3.12: Secuencia de UC12 Atender reservas](../imagenes/ea/seq-uc12.png)

Ruta `PATCH /reservas/:id/estado`, realizada por `ReservasService.cambiarEstado`.

### Secuencia UC13 Ingresar mercadería

![Figura 9.3.13: Secuencia de UC13 Ingresar mercadería](../imagenes/ea/seq-uc13.png)

Ruta `POST /inventario/ingreso`, realizada por `InventarioService.ingresoProveedor`.

### Secuencia UC14 Registrarse como clienta

![Figura 9.3.14: Secuencia de UC14 Registrarse como clienta](../imagenes/ea/seq-uc14.png)

Ruta `POST /auth/registro`, realizada por `AuthService.registro`.

### Secuencia UC15 Iniciar y cerrar sesión

![Figura 9.3.15: Secuencia de UC15 Iniciar y cerrar sesión](../imagenes/ea/seq-uc15.png)

Ruta `POST /auth/login`, realizada por `AuthService.login`.

### Secuencia UC16 Cambiar clave

![Figura 9.3.16: Secuencia de UC16 Cambiar clave](../imagenes/ea/seq-uc16.png)

Ruta `POST /auth/cambiar-clave`, realizada por `AuthService.cambiarClave`.

### Secuencia UC17 Gestionar favoritos

![Figura 9.3.17: Secuencia de UC17 Gestionar favoritos](../imagenes/ea/seq-uc17.png)

Ruta `POST /cliente/favoritos/:productoId`, realizada por `ClienteController.guardar`.

### Secuencia UC18 Gestionar perfil y direcciones

![Figura 9.3.18: Secuencia de UC18 Gestionar perfil y direcciones](../imagenes/ea/seq-uc18.png)

Ruta `POST /cliente/direcciones`, realizada por `ClienteController.direccion`.

### Secuencia UC19 Ver historial de compras

![Figura 9.3.19: Secuencia de UC19 Ver historial de compras](../imagenes/ea/seq-uc19.png)

Ruta `GET /ventas/historial`, realizada por `VentasService.historialClienta`.

### Secuencia UC20 Opinar un producto

![Figura 9.3.20: Secuencia de UC20 Opinar un producto](../imagenes/ea/seq-uc20.png)

Ruta `POST /catalogo/productos/:id/opiniones`, realizada por `CatalogoController.crearOpinion`.

### Secuencia UC21 Pedir alerta de producto

![Figura 9.3.21: Secuencia de UC21 Pedir alerta de producto](../imagenes/ea/seq-uc21.png)

Ruta `POST /catalogo/productos/:id/alertas`, realizada por `CatalogoController.alertar`.

### Secuencia UC22 Aplicar cupón

![Figura 9.3.22: Secuencia de UC22 Aplicar cupón](../imagenes/ea/seq-uc22.png)

Ruta `POST /ventas`, realizada por `VentasService.cobrar`.

### Secuencia UC23 Gestionar usuarios

![Figura 9.3.23: Secuencia de UC23 Gestionar usuarios](../imagenes/ea/seq-uc23.png)

Ruta `POST /usuarios`, realizada por `UsuariosController.crear`.

### Secuencia UC24 Gestionar sucursales, temporadas y colecciones

![Figura 9.3.24: Secuencia de UC24 Gestionar sucursales, temporadas y colecciones](../imagenes/ea/seq-uc24.png)

Ruta `POST /sucursales`, realizada por `MetaController.crearSucursal`.

### Secuencia UC25 Ajustar inventario y ver el kardex

![Figura 9.3.25: Secuencia de UC25 Ajustar inventario y ver el kardex](../imagenes/ea/seq-uc25.png)

Ruta `POST /inventario/ajuste`, realizada por `InventarioService.ajustar`.

### Secuencia UC26 Moderar opiniones y ver auditoría

![Figura 9.3.26: Secuencia de UC26 Moderar opiniones y ver auditoría](../imagenes/ea/seq-uc26.png)

Ruta `PATCH /admin/opiniones/:id/moderacion`, realizada por `AdminController.moderarOpinion`.

### Secuencia UC27 Simular un pago

![Figura 9.3.27: Secuencia de UC27 Simular un pago](../imagenes/ea/seq-uc27.png)

Ruta `POST /pagos/:id/simular`, realizada por `PagosController.simular`.

### Secuencia UC28 Usar el probador 3D

![Figura 9.3.28: Secuencia de UC28 Usar el probador 3D](../imagenes/ea/seq-uc28.png)

Ruta `GET /catalogo/variantes/:id/overlay`, realizada por `CatalogoService.overlay`.

### Secuencia UC29 Hablar con el bot

![Figura 9.3.29: Secuencia de UC29 Hablar con el bot](../imagenes/ea/seq-uc29.png)

Ruta `POST /ia/bot`, realizada por `IaService.bot`.

### Secuencia UC30 Aplicar precio mayorista

![Figura 9.3.30: Secuencia de UC30 Aplicar precio mayorista](../imagenes/ea/seq-uc30.png)

Ruta `POST /ventas`, realizada por `VentasService.cobrar`.

### Secuencia UC31 Transferir stock entre almacenes

![Figura 9.3.31: Secuencia de UC31 Transferir stock entre almacenes](../imagenes/ea/seq-uc31.png)

Ruta `POST /inventario/transferencias`, realizada por `InventarioService.transferir`.

### Secuencia UC32 Despachar un pedido

![Figura 9.3.32: Secuencia de UC32 Despachar un pedido](../imagenes/ea/seq-uc32.png)

Ruta `POST /pedidos/:id/despachar`, realizada por `PedidosController.despachar`.

### Secuencia UC33 Devolver una venta

![Figura 9.3.33: Secuencia de UC33 Devolver una venta](../imagenes/ea/seq-uc33.png)

Ruta `POST /devoluciones`, realizada por `DevolucionesController.crear`.

### Secuencia UC34 Emitir comprobante simulado

![Figura 9.3.34: Secuencia de UC34 Emitir comprobante simulado](../imagenes/ea/seq-uc34.png)

Ruta `POST /ventas/:id/enviar-factura`, realizada por `NotificacionesService.enviarFacturaVenta`.

### Secuencia UC35 Instalar la tienda como PWA

![Figura 9.3.35: Secuencia de UC35 Instalar la tienda como PWA](../imagenes/ea/seq-uc35.png)

El caso se realiza en el cliente, sin pasar por la API hasta la sincronización.

## Lote 1: SaaS multi-tienda

### Secuencia UC36 Registrar cuenta en la plataforma

![Figura 9.3.36: Secuencia de UC36 Registrar cuenta en la plataforma](../imagenes/ea/seq-uc36.png)

Ruta `POST /plataforma/registro`, realizada por `PlataformaService.registrar`.

### Secuencia UC37 Verificar correo

![Figura 9.3.37: Secuencia de UC37 Verificar correo](../imagenes/ea/seq-uc37.png)

Ruta `POST /plataforma/verificar`, realizada por `PlataformaService.verificar`.

### Secuencia UC38 Suscribirse y crear tienda

![Figura 9.3.38: Secuencia de UC38 Suscribirse y crear tienda](../imagenes/ea/seq-uc38.png)

Ruta `POST /plataforma/suscribir`, realizada por `PlataformaService.suscribir`.

### Secuencia UC39 Renovar o cambiar de plan

![Figura 9.3.39: Secuencia de UC39 Renovar o cambiar de plan](../imagenes/ea/seq-uc39.png)

Ruta `POST /plataforma/tiendas/:id/renovar`, realizada por `PlataformaService.renovar`.

### Secuencia UC40 Cambiar de tienda

![Figura 9.3.40: Secuencia de UC40 Cambiar de tienda](../imagenes/ea/seq-uc40.png)

Ruta `POST /auth/cambiar-tienda`, realizada por `AuthService.cambiarTienda`.

### Secuencia UC41 Ver métricas de suscripciones

![Figura 9.3.41: Secuencia de UC41 Ver métricas de suscripciones](../imagenes/ea/seq-uc41.png)

Ruta `GET /plataforma/admin/metricas`, realizada por `PlataformaService.metricas`.

## Lote 2: Operación sin conexión y sincronización

### Secuencia UC42 Vender sin conexión

![Figura 9.3.42: Secuencia de UC42 Vender sin conexión](../imagenes/ea/seq-uc42.png)

El caso se realiza en el cliente, sin pasar por la API hasta la sincronización.

### Secuencia UC43 Registrar clienta o producto sin conexión

![Figura 9.3.43: Secuencia de UC43 Registrar clienta o producto sin conexión](../imagenes/ea/seq-uc43.png)

El caso se realiza en el cliente, sin pasar por la API hasta la sincronización.

### Secuencia UC44 Sincronizar operaciones pendientes

![Figura 9.3.44: Secuencia de UC44 Sincronizar operaciones pendientes](../imagenes/ea/seq-uc44.png)

Ruta `POST /sync/lote`, realizada por `SyncService.lote`.

### Secuencia UC45 Resolver conflicto de stock

![Figura 9.3.45: Secuencia de UC45 Resolver conflicto de stock](../imagenes/ea/seq-uc45.png)

Ruta `POST /sync/operaciones/:id/descartar`, realizada por `SyncService.descartar`.

### Secuencia UC46 Configurar ventana offline

![Figura 9.3.46: Secuencia de UC46 Configurar ventana offline](../imagenes/ea/seq-uc46.png)

Ruta `PATCH /sync/politica`, realizada por `SyncService.fijarVentana`.

### Secuencia UC47 Activar notificaciones push

![Figura 9.3.47: Secuencia de UC47 Activar notificaciones push](../imagenes/ea/seq-uc47.png)

Ruta `POST /push/suscribir`, realizada por `PushService.suscribir`.

## Lote 3: Reportes generativos y ventas al crédito

### Secuencia UC48 Generar reporte por texto o voz

![Figura 9.3.48: Secuencia de UC48 Generar reporte por texto o voz](../imagenes/ea/seq-uc48.png)

Ruta `POST /reportes/inteligente`, realizada por `ReportesInteligentesService.generar`.

### Secuencia UC49 Ajustar y exportar reporte

![Figura 9.3.49: Secuencia de UC49 Ajustar y exportar reporte](../imagenes/ea/seq-uc49.png)

Ruta `POST /reportes/inteligente/exportar`, realizada por `ReportesInteligentesService.exportar`.

### Secuencia UC50 Vender al crédito

![Figura 9.3.50: Secuencia de UC50 Vender al crédito](../imagenes/ea/seq-uc50.png)

Ruta `POST /ventas`, realizada por `VentasService.cobrar`.

### Secuencia UC51 Registrar abono de crédito

![Figura 9.3.51: Secuencia de UC51 Registrar abono de crédito](../imagenes/ea/seq-uc51.png)

Ruta `POST /creditos/:id/abonos`, realizada por `CreditosController.abonar`.

## Lote 4: Analítica con aprendizaje automático

### Secuencia UC52 Ver dashboard predictivo

![Figura 9.3.52: Secuencia de UC52 Ver dashboard predictivo](../imagenes/ea/seq-uc52.png)

Ruta `GET /analitica/prediccion`, realizada por `AnaliticaService.prediccion`.

### Secuencia UC53 Ver segmentación de clientas

![Figura 9.3.53: Secuencia de UC53 Ver segmentación de clientas](../imagenes/ea/seq-uc53.png)

Ruta `GET /analitica/segmentos`, realizada por `AnaliticaService.segmentos`.

## Lote 5: Pagos para países hispanohablantes

### Secuencia UC54 Pagar con pasarela internacional

![Figura 9.3.54: Secuencia de UC54 Pagar con pasarela internacional](../imagenes/ea/seq-uc54.png)

Ruta `POST /pagos/pasarela`, realizada por `PagosService.cobrarPasarela`.

## 9.3.1 Modelo estático de diseño

Al dibujar cada mensaje, la operación se agregó a la clase que lo recibe. El resultado es el modelo de clases de diseño por módulo: arriba, los controllers y servicios con sus operaciones; abajo, las clases del dominio de las que dependen.

![Figura 9.3.55: Clases de diseño del módulo Catálogo](../imagenes/ea/dis-catalogo.png)

![Figura 9.3.56: Clases de diseño del módulo Bot](../imagenes/ea/dis-bot.png)

![Figura 9.3.57: Clases de diseño del módulo Ventas](../imagenes/ea/dis-ventas.png)

![Figura 9.3.58: Clases de diseño del módulo Caja](../imagenes/ea/dis-caja.png)

![Figura 9.3.59: Clases de diseño del módulo Reportes](../imagenes/ea/dis-reportes.png)

![Figura 9.3.60: Clases de diseño del módulo Reservas](../imagenes/ea/dis-reservas.png)

![Figura 9.3.61: Clases de diseño del módulo Proveedores](../imagenes/ea/dis-proveedores.png)

![Figura 9.3.62: Clases de diseño del módulo Auth](../imagenes/ea/dis-auth.png)

![Figura 9.3.63: Clases de diseño del módulo Cliente](../imagenes/ea/dis-cliente.png)

![Figura 9.3.64: Clases de diseño del módulo Administración](../imagenes/ea/dis-administracion.png)

![Figura 9.3.65: Clases de diseño del módulo Pagos](../imagenes/ea/dis-pagos.png)

![Figura 9.3.66: Clases de diseño del módulo Cliente offline](../imagenes/ea/dis-cliente-offline.png)

![Figura 9.3.67: Clases de diseño del módulo Plataforma](../imagenes/ea/dis-plataforma.png)

![Figura 9.3.68: Clases de diseño del módulo Sincronización](../imagenes/ea/dis-sincronizacion.png)

![Figura 9.3.69: Clases de diseño del módulo Notificaciones](../imagenes/ea/dis-notificaciones.png)

![Figura 9.3.70: Clases de diseño del módulo Créditos](../imagenes/ea/dis-creditos.png)

![Figura 9.3.71: Clases de diseño del módulo Analítica](../imagenes/ea/dis-analitica.png)

## 9.3.2 Arquitectura

Las decisiones de arquitectura vienen del primer ciclo y de los capítulos de fundamentación, y entran al diseño detallado como restricciones. La aplicación es un monolito modular: un proceso NestJS con un módulo por área, una sola base PostgreSQL compartida por todas las tiendas y dos clientes (web PWA y app Expo) que guardan una cola local para operar sin red.

![Figura 9.3.72: Componentes del monolito modular](../imagenes/ea/arq-componentes.png)

![Figura 9.3.73: Despliegue](../imagenes/ea/arq-despliegue.png)

## 9.3.3 Revisión crítica de diseño (CDR)

| Verificación | Resultado |
|---|---|
| Cada caso tiene secuencia y coincide con su texto | Sí, 54 secuencias |
| Cada control de robustez aparece como mensaje | Sí; los mensajes se derivan de los controles |
| Las operaciones están en la clase que tiene la información | Sí en los servicios. Créditos, Pagos y Devoluciones concentran lógica en el controller: deuda técnica aceptada para este ciclo |
| Las operaciones que cambian dinero o stock son idempotentes | Sí; la clave de idempotencia está en 11 rutas |
| Ninguna operación consulta datos sin la tienda de la sesión | Sí; la extensión de Prisma falla cerrada sin tienda y el SQL de reportes usa set_config |
| Existe un plan de pruebas por caso | Sí; ver 9.4 |
