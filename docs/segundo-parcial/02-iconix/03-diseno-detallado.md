# 9.3 Diseño detallado

El diseño detallado asigna comportamiento a las clases. Hay un diagrama de secuencia por caso de uso, y sus líneas de vida son las de la robustez: el actor, la pantalla, las entidades y las interfaces externas. A ellas se suman las clases del backend que realizan el caso. Cada control de la robustez reaparece como un mensaje del servicio hacia la entidad que toca.

En NestJS, la clase que recibe la petición HTTP se llama controller, pero en términos de ICONIX es una frontera del lado del servidor: valida la entrada, toma el usuario y la tienda del token, y delega. Los controles de ICONIX quedan como operaciones del servicio. En los módulos sin servicio propio (Créditos, Pagos, Devoluciones, Pedidos, Usuarios, Cliente y Administración), el controller ejecuta los controles directamente sobre Prisma; la CDR lo registra como deuda técnica.

Los diagramas siguen la notación de secuencia de UML 2.5:

- **Mensajes síncronos con argumentos reales.** El mensaje a la API lleva la ruta y la operación del controller con sus parámetros (por ejemplo `POST /ventas: crear(user, dto)`), y el mensaje al servicio nombra la operación y sus argumentos tal como están en el código (`cobrar(dto, actor, opciones)`).
- **Mensajes de respuesta.** Se dibujan con línea punteada y flecha abierta.
- **Fragmento combinado `alt`.** ICONIX pide que la secuencia cubra el curso básico y los alternos. El fragmento se abre en el mensaje donde el sistema toma la decisión: después de validar o consultar, o después del cobro cuando el alterno es un pago rechazado (UC27, UC38, UC39, UC54). El primer operando tiene como guarda la condición del curso alterno (por ejemplo `[Sin turno abierto o sin stock (3a)]`) y devuelve el motivo hasta la pantalla. El segundo, `[else]`, sigue el curso básico. Cuando el alterno no corta el caso sino que lo resuelve de otra forma, como el respaldo por reglas si el Servicio de IA no responde (UC04, UC29, UC48), los dos operandos continúan hacia el mismo cierre. Los alternos que ocurren solo en el dispositivo (permiso de cámara o de notificaciones) se cubren en la robustez y no en la secuencia del servidor.
- **Fragmento combinado `loop`.** Se usa cuando el caso repite pasos por elemento. En UC44 el servidor procesa cada operación del lote en su propia transacción: `loop [por cada operación del lote]`.

La arquitectura técnica que la robustez omitía (el guard JWT, el contexto de tienda y la clave de idempotencia) no se repite en cada secuencia: se aplica a todas las rutas por el mismo mecanismo y se muestra una sola vez en la arquitectura (9.3.2).

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

Al dibujar cada mensaje, la operación se agregó a la clase que lo recibe. El resultado es el modelo de clases de diseño por módulo: arriba, los controllers y servicios con sus operaciones; abajo, las clases del dominio de las que dependen. Las firmas no se escribieron a mano: el generador del modelo lee el código TypeScript del backend, así que cada clase muestra lo que realmente existe.

| Elemento del diagrama | Notación UML 2.5 | Ejemplo |
|---|---|---|
| Clase con estereotipo | «controller» o «service» sobre el nombre | «service» SyncService |
| Atributo | Visibilidad, nombre, tipo y propiedad | `- sync: SyncService {readOnly}` (dependencia inyectada por el constructor) |
| Operación | Visibilidad, nombre, parámetros con tipo | `+ lote(user: JwtPayload, dto: LoteSyncDto)` |
| Asociación navegable | Línea con flecha, nombre de rol y multiplicidad en el extremo | SyncController → SyncService, rol `-sync`, multiplicidad 1 |
| Dependencia de uso | Línea punteada con flecha y «use» | SyncService ··> OperacionSync |
| Asociación del dominio | Línea con multiplicidades en ambos extremos | Venta 0..* — 0..1 Usuario (rol clienta) |

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

Las decisiones de arquitectura vienen del primer ciclo y de los capítulos de fundamentación, y entran al diseño detallado como restricciones. La aplicación es un monolito modular: un proceso NestJS con un módulo por área, una sola base PostgreSQL compartida por todas las tiendas y dos clientes (web PWA y app Expo) que guardan una cola local para operar sin red. La arquitectura se documenta con cuatro diagramas UML 2.5: despliegue, componentes del backend, componentes de los clientes y manifestación de artefactos.

### Diagrama de despliegue

![Figura 9.3.72: Despliegue de EnsayAR en Azure y en los dispositivos](../imagenes/ea/arq-despliegue.png)

El diagrama muestra dónde se ejecuta cada pieza en producción. Sigue `infra/app.bicep`, que crea toda la infraestructura con `azd up`.

| Elemento UML | Qué representa en EnsayAR |
|---|---|
| Nodo «device» | Hardware físico o un recurso que se contrata como unidad: la PC o tablet de la tienda o de la clienta, el teléfono Android, el grupo de recursos de Azure y los servicios externos (Web Push, SMTP y pasarela de pago) |
| Nodo anidado | Recurso de Azure dentro del grupo: el App Service Plan Linux, el servidor PostgreSQL Flexible (Standard_B1ms), Application Insights con Log Analytics y Azure OpenAI |
| «executionEnvironment» | Software que hospeda a los artefactos: el navegador web, el runtime React Native con Hermes, Node.js 20 LTS (uno por App Service) y PostgreSQL 16 |
| Artefacto | Archivo concreto que se despliega o se crea en el dispositivo: `dist/main.js`, el esquema y las migraciones de Prisma, `frontend/dist`, `sw.js`, `manifest.webmanifest`, la base IndexedDB `ensayar-offline`, Cache Storage, `localStorage`, el `.apk` y la base SQLite `ensayar-offline.db` |
| «deployment spec» | Configuración con la que se despliega un artefacto: `ensayar-api.env`, con las 11 variables que lee la API (sin valores, porque son secretos), y `ensayar-web.env`, con `VITE_API_URL` |
| Camino de comunicación | Enlace entre nodos con su protocolo como estereotipo y su puerto o uso como nombre: «HTTPS» REST/JSON con `Idempotency-Key` en el puerto 443, «TCP/TLS» Prisma en el 5432, «SMTP/TLS» en el 587 y «HTTPS» Web Push firmado con VAPID |

Se leen tres recorridos. El primero es la descarga de la PWA desde el App Service web y su instalación en el navegador. El segundo son las llamadas REST de ambos clientes a la API, que con red operan en línea y sin red guardan en IndexedDB o SQLite y luego reenvían por el mismo camino. El tercero es el aviso push: la API lo firma con VAPID, el servicio push del navegador lo entrega y el service worker lo muestra aunque la aplicación esté cerrada.

### Diagrama de componentes del backend

![Figura 9.3.73: Componentes del backend (monolito modular NestJS)](../imagenes/ea/arq-componentes.png)

El subsistema «subsystem» API EnsayAR expone un puerto `http :3000/api` que provee la interfaz API REST. Los dos clientes la requieren y se conectan con un conector de ensamblaje. Dentro del subsistema, cada módulo NestJS es un componente. Cada línea con el símbolo de bola y cuenca es un conector de ensamblaje: el componente de origen requiere la interfaz nombrada y el de destino la provee. Por ejemplo, Sync requiere IVentas, IInventario e INotificaciones, y Prisma requiere IContextoTienda de Tenancy para filtrar por tienda. Las dependencias con sistemas externos (Azure OpenAI, SMTP, Web Push y la pasarela) se dibujan como «use», y Prisma requiere la interfaz SQL de PostgreSQL. Para que el diagrama se lea se omiten dos dependencias que tienen todos los módulos: IAutenticacion (guards) e IAccesoDatos (Prisma).

### Diagrama de componentes de los clientes

![Figura 9.3.74: Componentes de la PWA y de la app móvil](../imagenes/ea/arq-componentes-cliente.png)

La web y la app repiten la misma estructura. Las pantallas usan la cola offline, el motor de sincronización y el cliente HTTP. La cola persiste en IndexedDB (web) o en SQLite (móvil). El motor de sincronización vacía la cola contra la API REST, la misma interfaz del diagrama anterior. En la web, el service worker guarda el app shell y los datos en Cache Storage, y es quien recibe los avisos push.

### Manifestación de artefactos

![Figura 9.3.75: Artefactos que manifiestan a cada componente](../imagenes/ea/arq-manifestacion.png)

La relación «manifest» une el diseño lógico con el físico: dice qué archivo desplegado implementa cada componente. `dist/main.js` y el esquema de Prisma manifiestan la API, `frontend/dist` la PWA, `sw.js` el service worker y el `.apk` la app móvil. Con esto, cada componente del diagrama de componentes se puede seguir hasta un nodo del diagrama de despliegue.

## 9.3.3 Máquinas de estado de la sincronización

La operación offline es el único objeto del sistema cuyo comportamiento depende de su historia: la misma venta puede estar pendiente en el teléfono, aplicada en el servidor o detenida en un conflicto. Por eso, además de las secuencias, se modela con dos máquinas de estado UML 2.5. Cada transición se escribe como `evento [guarda] / efecto`.

![Figura 9.3.76: Estados de una operación offline en el dispositivo](../imagenes/ea/est-operacion-offline.png)

En el dispositivo, la operación nace Pendiente dentro del estado compuesto *Guardada en el dispositivo*, que agrupa todo lo que está persistido en IndexedDB o SQLite. Al reconectar, o cada 30 segundos, pasa a En envío. Solo un estado definitivo del servidor (aplicada, repetida o fusionada) la saca de la cola. Si llega en_curso, error o se corta la red, vuelve a Pendiente. Un conflicto, un rechazo o un vencimiento la dejan guardada con el motivo hasta que la persona la reintenta o la descarta. Así se cumple que una operación nunca desaparece por el solo hecho de haber intentado enviarla (RN07).

![Figura 9.3.77: Estados de OperacionSync en el servidor](../imagenes/ea/est-operacion-sync.png)

En el servidor, cada operación recibida crea una fila OperacionSync En curso y abre su propia transacción. Si se confirma, termina Aplicada (o Fusionada, si la clienta ya existía). Si falta stock o el turno ya no es válido, termina en Conflicto con rollback. Un reenvío del mismo id sobre una operación Aplicada no vuelve a ejecutar nada: responde *repetida* (transición sobre sí misma). Los estados se corresponden con los que el usuario ve en la Pantalla Sincronización.

| Estado en el dispositivo | Significado para la persona | Estado en el servidor |
|---|---|---|
| Pendiente | Registrada localmente, todavía no enviada | (sin fila) |
| En envío | Enviada en un lote, esperando respuesta | En curso |
| (sale de la cola) | Confirmada | Aplicada o Fusionada |
| En conflicto | Requiere decisión: vender lo disponible o descartar | Conflicto, y luego Descartada si se descarta |
| Rechazada | Datos inválidos o sin permiso | Rechazada |
| Vencida | Fuera de la ventana offline de la tienda | Vencida |

## 9.3.4 Revisión crítica de diseño (CDR)

| Verificación | Resultado |
|---|---|
| Cada caso tiene secuencia y coincide con su texto | Sí, 54 secuencias |
| La secuencia cubre el curso básico y los alternos | Sí; el alterno que decide en el servidor queda en un fragmento `alt` ubicado en el paso donde ocurre, y el lote de sincronización en un `loop` |
| Las firmas del diseño coinciden con el código | Sí; se leen de los archivos TypeScript al regenerar el modelo |
| Cada control de robustez aparece como mensaje | Sí; los mensajes se derivan de los controles |
| Las operaciones están en la clase que tiene la información | Sí en los servicios. Créditos, Pagos y Devoluciones concentran lógica en el controller: deuda técnica aceptada para este ciclo |
| Las operaciones que cambian dinero o stock son idempotentes | Sí; la clave de idempotencia está en 11 rutas |
| Ninguna operación consulta datos sin la tienda de la sesión | Sí; la extensión de Prisma falla cerrada sin tienda y el SQL de reportes usa set_config |
| Existe un plan de pruebas por caso | Sí; ver 9.4 |
