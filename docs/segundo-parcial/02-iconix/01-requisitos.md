# 9.1 Requisitos

La etapa de requisitos de ICONIX produce cuatro artefactos que se revisan juntos: la lista de requisitos, el modelo de dominio, los prototipos de interfaz y los casos de uso. Para el segundo ciclo se partió de la consigna de la cátedra, de las fichas UC01 a UC35 del primer parcial y de las pantallas ya construidas en la web y en la app móvil.

## 9.1.1 Requisitos del segundo ciclo

Los requisitos se mantienen como una lista separada del texto de los casos de uso, como pide ICONIX. Cada código se asigna a uno o más casos de uso en el modelo de Enterprise Architect mediante una relación de realización, y esa asignación es la que permite trazar el requisito hasta la prueba.

| Código | Área | Requisito | Casos de uso que lo realizan |
|---|---|---|---|
| B1 | Base | Todo lo del primer parcial sigue funcionando: catálogo, punto de venta, probador, reportes, bot y pagos. | UC01 a UC35 |
| S1 | SaaS | Muchas tiendas operan en una sola aplicación (multi-tenant). | UC10, UC15, UC19, UC48 |
| S2 | SaaS | Página comercial pública con módulos, planes y precios. | UC36 |
| S3 | SaaS | Planes con duraciones de 1, 3 y 12 meses y niveles por cantidad de usuarios y sucursales. | UC23, UC24, UC36, UC38, UC39 |
| S4 | SaaS | Autoservicio: registro, suscripción y pago sin intervención humana. | UC36, UC38, UC39 |
| S5 | SaaS | Al suscribirse se crea automáticamente el espacio de la tienda. | UC38 |
| S6 | SaaS | Se verifica que el correo del suscriptor exista. | UC37 |
| S7 | SaaS | Una persona con varias tiendas usa un solo login y cambia de tienda. | UC14, UC40 |
| S8 | SaaS | Estrategia de aislamiento de datos justificada: base compartida con identificador de tienda. | Decisión de arquitectura (capítulo 4); se verifica en todos los casos |
| S9 | SaaS | Reportes de suscripciones y proyecciones para el dueño de la plataforma. | UC41 |
| O1 | Offline | La web funciona como PWA y sigue vendiendo y registrando clientas y productos sin internet. | UC08, UC09, UC35, UC42, UC43 |
| O2 | Offline | La app móvil guarda en una base local (SQLite) y tiene la misma capacidad. | UC42, UC43 |
| O3 | Offline | Sincronización completa y predecible al volver la red. | UC44 |
| O4 | Offline | Identificadores generados en el cliente (UUID) sin choque entre dispositivos. | UC42, UC43, UC44 |
| O5 | Offline | El conflicto de la última unidad se resuelve con una actualización condicional en la base. | UC05, UC07, UC45 |
| O6 | Offline | Idempotencia: guardar dos o tres veces con red inestable no duplica registros. | UC05, UC06, UC07, UC25, UC38, UC44, UC51 |
| O7 | Offline | Transacciones con rollback; con microservicios se explica el patrón saga. | UC07, UC31, UC44 |
| O8 | Offline | Se decide y justifica qué funciona sin red y qué no (un pago en línea no). | UC27, UC42, UC46, UC50 |
| O9 | Offline | Ventana offline configurable por tienda (1 a 30 días, 7 por defecto). | UC42, UC46 |
| O10 | Offline | La PWA es instalable y envía notificaciones push. | UC35, UC47 |
| R1 | Reportes | Reporte pedido en lenguaje natural por texto o por voz. | UC48 |
| R2 | Reportes | Pedidos complejos: varios filtros, cálculos, agrupación, orden y varias tablas. | UC33, UC48, UC49, UC50, UC51 |
| R3 | Reportes | Salida en pantalla, PDF o Excel según lo pedido. | UC49 |
| A1 | Analítica | Analítica con modelos supervisados y no supervisados. | UC52, UC53 |
| A2 | Analítica | Entrenamiento con datos sintéticos generados a medida. | UC52, UC53 |
| A3 | Analítica | Resultados presentados en dashboards. | UC52, UC53 |
| P1 | Pagos | Pagos que funcionen en todos los países de habla hispana. | UC54 |
| P2 | Pagos | Estudio de costos para elegir la opción que menos cobra al cliente. | Estudio del capítulo 5 |
| P3 | Pagos | Simulación con una pasarela real en modo sandbox. | UC54 |
| P4 | Pagos | Límites locales explicados: QR en Bolivia, PayPal fácil para pagar y difícil para cobrar. | Estudio del capítulo 5 |

Además de los requisitos funcionales rigen restricciones que no son diálogos con un actor y que ICONIX trata como requisitos transversales: toda consulta se ejecuta con la tienda de la sesión fijada (S8), toda operación que cambia dinero o stock acepta una clave de idempotencia (O6), ninguna operación deja stock negativo (O5) y el reporte generativo solo ejecuta SQL compilado desde una especificación validada (R2).

![Figura 9.1.1: Asignación de los requisitos de SaaS a casos de uso](../imagenes/ea/req-saas.png)

![Figura 9.1.2: Asignación de los requisitos de Offline a casos de uso](../imagenes/ea/req-offline.png)

![Figura 9.1.3: Asignación de los requisitos de Reportes a casos de uso](../imagenes/ea/req-reportes.png)

![Figura 9.1.4: Asignación de los requisitos de Analítica a casos de uso](../imagenes/ea/req-analitica.png)

![Figura 9.1.5: Asignación de los requisitos de Pagos a casos de uso](../imagenes/ea/req-pagos.png)

### Requisitos no funcionales

Los requisitos no funcionales no son diálogos con un actor, pero condicionan a todos los casos. Cada uno se expresa como una propiedad verificable, junto con el mecanismo que la cumple en EnsayAR y la evidencia que la comprueba.

| Código | Requisito | Cómo se cumple en EnsayAR | Evidencia |
|---|---|---|---|
| RNF01 | Seguridad: solo usuarios autenticados y con el rol adecuado operan, y las credenciales nunca se guardan en claro | Contraseñas con bcrypt; token JWT con expiración y revocación al cerrar sesión (TokenRevocado); guards de rol en cada ruta; validación estricta de la entrada (los campos no declarados se rechazan); los secretos solo en variables de entorno | Pruebas de roles en `verificar:saas`; auditoría de login, logout y cambio de clave |
| RNF02 | Aislamiento: ninguna tienda lee ni modifica datos de otra | Base compartida con `tiendaId`; la extensión de Prisma filtra y completa la tienda desde el contexto de la petición y falla cerrada si no la hay; el SQL de reportes fija `app.tienda_id` con `set_config` dentro de la transacción | `verificar:tenancy`; capítulo 4 |
| RNF03 | Persistencia offline: lo registrado sin red sobrevive al cierre de la aplicación y al reinicio del equipo | Cola en IndexedDB (web) y SQLite (móvil); una operación solo se borra cuando el servidor responde un estado definitivo | Recorrido manual con la red cortada y recarga del navegador; máquina de estados de 9.3 |
| RNF04 | Integridad transaccional: una venta se guarda completa o no se guarda | Venta, líneas, movimiento de inventario y suma al turno en una sola transacción; descuento condicional de stock (nunca negativo) | `ventas.spike-b.spec.ts`; reversión en `verificar:offline` |
| RNF05 | Idempotencia: repetir un envío no duplica ventas, cobros ni abonos | Clave `Idempotency-Key` en 11 rutas que cambian dinero o stock; en la sincronización el id de la operación es la clave (OperacionSync) | Reenvío sin duplicados en `verificar:offline`; doble pago en `verificar:saas`; abonos repetidos en `verificar:reportes` |
| RNF06 | Recuperación ante fallos: un corte a mitad del envío no pierde ni duplica operaciones | El cliente reintenta con la misma clave; las respuestas `en_curso` y `error` dejan la operación pendiente; una operación en curso abandonada por más de un minuto se retoma | Envíos simultáneos y reintentos en `verificar:offline` |
| RNF07 | Mantenibilidad: cada área se puede cambiar sin tocar las demás | Monolito modular NestJS con un módulo por área y dependencias explícitas por interfaz; TypeScript en los tres proyectos | Diagrama de componentes (9.3.2) |
| RNF08 | Compatibilidad: funciona en los navegadores y teléfonos que usan las tiendas | PWA instalable en Chrome, Edge y Safari; app Android con Expo; interfaz adaptable a celular, tablet y PC | Diagrama de despliegue (9.3.2); guías del capítulo 10 |
| RNF09 | Rendimiento: el punto de venta responde aunque la red sea lenta | Catálogo, stock y política offline en caché local; la sincronización envía lotes de hasta 50 operaciones en segundo plano | Recorridos del capítulo 10 |
| RNF10 | Observabilidad: se puede saber qué pasó con cada operación | Application Insights y Log Analytics en Azure; tabla Auditoria para acciones sensibles; estado de cada operación offline visible en la Pantalla Sincronización | Pantalla Sincronización (9.1.3); diagrama de despliegue |
| RNF11 | Calidad: el comportamiento crítico se verifica de forma automática | Pruebas unitarias y cuatro guiones de verificación de integración contra la API y una base real | 9.4 |
| RNF12 | Coherencia documental: los diagramas representan la solución construida | El modelo de Enterprise Architect se regenera desde `casos.py`, `schema.prisma` y las firmas del código TypeScript | 9.4.6; anexo 14.6 |

### Reglas de negocio

Las reglas de negocio son políticas de la tienda que el sistema hace cumplir siempre, con o sin red. Se aplican en el backend, de modo que un cliente modificado no puede saltarlas. Las que dependen del dispositivo se validan dos veces: en el cliente para avisar a tiempo y en el servidor al sincronizar.

| Código | Regla | Dónde se aplica | Casos de uso |
|---|---|---|---|
| RN01 | La tienda y la sucursal de una operación salen de la sesión, nunca de los datos que envía el cliente | Contexto de tienda y extensión de Prisma | Todos |
| RN02 | No se cobra sin un turno de caja abierto en la sucursal | VentasService, también al sincronizar | UC06, UC07, UC42 |
| RN03 | El stock nunca queda negativo: si dos cajas venden la última unidad, solo una venta se aplica | Actualización condicional de StockAlmacen | UC07, UC44, UC45 |
| RN04 | Sin red solo se cobra en efectivo y sin cupón; QR, tarjeta y crédito requieren conexión | Pantalla Punto de venta y validación del lote | UC42 |
| RN05 | Una operación offline solo se acepta si se creó dentro de la ventana de la tienda (1 a 30 días, 7 por defecto) | SyncService; política en la Pantalla Sincronización | UC44, UC46 |
| RN06 | Cada operación tiene un id único generado en el dispositivo y se aplica una sola vez | uuid() en el cliente; OperacionSync en el servidor | UC42, UC43, UC44 |
| RN07 | Una operación no desaparece del dispositivo por haber intentado enviarla: solo sale de la cola con un estado definitivo | Motor de sincronización del cliente | UC44 |
| RN08 | Un conflicto lo resuelve una persona, vendiendo lo disponible o descartando; descartar en el servidor exige rol Encargado o Admin | Pantalla Sincronización y SyncService | UC45 |
| RN09 | No se cierra la caja con operaciones offline pendientes o en conflicto | Pantalla Punto de venta | UC08 |
| RN10 | Cada plan limita usuarios, sucursales y productos (Inicial: 3, 1 y 200) | PlanLimitesService | UC09, UC23, UC24 |
| RN11 | La tienda se crea solo con el pago de la suscripción aprobado, y en una sola transacción | PlataformaService | UC38 |
| RN12 | El correo del suscriptor se verifica antes de activar la cuenta | AuthService y CorreoService | UC36, UC37 |
| RN13 | Un abono nunca deja el saldo de la cuenta por cobrar en negativo | Descuento condicional de CuentaCobrar | UC51 |
| RN14 | No se devuelven más unidades que las vendidas; devolver una venta al crédito reduce la deuda y no saca efectivo | Devoluciones | UC33 |
| RN15 | El modelo de lenguaje no accede a la base: solo propone una especificación que se valida contra la capa semántica y se compila a SQL parametrizado con la tienda fijada | ReportesService | UC48, UC49 |

## 9.1.2 Modelo de dominio

El modelo de dominio fija el vocabulario: cada sustantivo que aparece en un caso de uso con mayúscula inicial (Venta, StockAlmacen, CuentaCobrar) es una clase de este modelo, escrita igual. Se construyó en dos pasos. Primero, por inspección gramatical de la consigna y de las fichas del primer ciclo; después, durante la robustez, se agregaron las clases que los casos nuevos necesitaban (Cuenta, Plan, Suscripcion, PagoSuscripcion, Dispositivo, OperacionSync, PushSuscripcion, CuentaCobrar, AbonoCredito). Los atributos y las multiplicidades se toman del esquema de Prisma, de modo que el dominio y la base no pueden divergir.

Toda clase de negocio pertenece a una Tienda. En el esquema eso es un campo tiendaId que la base completa desde la sesión, sin relación declarada; en el dominio se muestra como la asociación «pertenece a» para Usuario, Sucursal, Producto y Venta, que son las raíces de cada agregado.

![Figura 9.1.6: Dominio, plataforma SaaS](../imagenes/ea/dom-plataforma-saas.png)

![Figura 9.1.7: Dominio, catálogo e inventario](../imagenes/ea/dom-catalogo-e-inventario.png)

![Figura 9.1.8: Dominio, ventas, caja y crédito](../imagenes/ea/dom-ventas-caja-y-credito.png)

![Figura 9.1.9: Dominio, sincronización, reportes y avisos](../imagenes/ea/dom-sincronizacion-reportes-y-avisos.png)

![Figura 9.1.10: Dominio, analítica y pagos (por confirmar)](../imagenes/ea/dom-analitica-y-pagos.png)

![Figura 9.1.11: Dominio, modelo de dominio completo](../imagenes/ea/dom-modelo-de-dominio-completo.png)

| Clase | Significado |
|---|---|
| Tienda | Inquilino de la plataforma: slug, nombre, estado y ventana offline. |
| Cuenta | Identidad global de una persona; una cuenta puede pertenecer a varias tiendas. |
| Plan | Oferta comercial con precio por duración y límites de usuarios y sucursales. |
| Suscripcion | Contrato vigente de una tienda con un plan y su fecha de vencimiento. |
| PagoSuscripcion | Cobro de un período de suscripción con su clave de idempotencia. |
| Usuario | Membresía de una cuenta en una tienda, con rol y sucursal. |
| Sucursal | Punto de venta físico de la tienda. |
| Almacen | Depósito de una sucursal donde vive el stock. |
| Proveedor | Empresa que abastece productos a la tienda. |
| Producto | Prenda del catálogo con precio, categorías, temporada y colección. |
| Variante | Combinación de talla y color de un producto con su SKU. |
| Categoria | Clasificación del catálogo (vestidos, blusas, accesorios...). |
| Temporada | Agrupación comercial por temporada. |
| Coleccion | Agrupación comercial por colección. |
| StockAlmacen | Cantidad física y reservada de una variante en un almacén. |
| MovimientoInventario | Kardex: ingreso, venta, ajuste, transferencia o devolución. |
| Reserva | Apartado de prendas para retirar en sucursal. |
| CajaTurno | Turno de caja con fondo inicial, total del sistema y arqueo. |
| Venta | Venta de mostrador o en línea con su uuid generado en el cliente. |
| LineaVenta | Prenda vendida con cantidad, precio y devoluciones. |
| PagoSimulado | Autorización de pago en modo prueba asociada a una venta. |
| Cupon | Código de descuento con vigencia y usos. |
| Pedido | Envío de una venta en línea con su estado de despacho. |
| Devolucion | Devolución total o parcial de una venta. |
| DireccionCliente | Dirección de entrega de una clienta. |
| Favorito | Producto marcado por una clienta. |
| Opinion | Valoración y comentario de un producto, sujeta a moderación. |
| AlertaProducto | Pedido de aviso por disponibilidad o precio. |
| Auditoria | Bitácora de accesos y cambios. |
| Notificacion | Aviso dentro de la aplicación. |
| TokenRevocado | Token JWT invalidado al cerrar sesión. |
| ReporteEjecucion | Registro de cada reporte ejecutado con su especificación. |
| CuentaCobrar | Deuda generada por una venta al crédito, con saldo y vencimiento. |
| AbonoCredito | Pago parcial o total de una cuenta por cobrar. |
| Dispositivo | Navegador o teléfono que sincroniza operaciones. |
| OperacionSync | Operación offline recibida con su estado (aplicada, duplicada, conflicto...). |
| PushSuscripcion | Suscripción Web Push (endpoint y claves) de un usuario. |
| EventoAnalitica | Evento de comportamiento usado para analítica. |
| ModeloPredictivo | Modelo supervisado entrenado y sus métricas (lote 4, a confirmar con el código de analítica). |
| SegmentoCliente | Grupo de clientas obtenido por clustering (lote 4, a confirmar con el código de analítica). |
| TransaccionPasarela | Transacción en la pasarela externa en modo sandbox (lote 5, a confirmar con el código de pagos). |

## 9.1.3 Prototipos de interfaz

En ICONIX los casos de uso describen el diálogo con pantallas concretas, por lo que cada caso nombra su frontera. En el segundo ciclo los prototipos son las pantallas ya implementadas: se diseñaron como bocetos antes de programar y hoy funcionan como prototipos validados. Las fronteras usadas en los casos de uso son:

| Frontera | Casos de uso |
|---|---|
| Archivo PDF o Excel | UC49 |
| Cola local | UC42, UC43, UC44 |
| Cámara del dispositivo | UC03 |
| Dashboard de analítica | UC52, UC53 |
| Interfaz Azure OpenAI | UC04, UC29, UC48 |
| Interfaz pasarela | UC38, UC39, UC54 |
| Micrófono | UC48 |
| Navegador | UC35, UC47 |
| Panel Mis tiendas | UC39 |
| Panel de plataforma | UC41 |
| Pantalla Administración de catálogo | UC09, UC30, UC43 |
| Pantalla Bitácora | UC26 |
| Pantalla Bot | UC29 |
| Pantalla Carrito | UC05, UC22, UC30 |
| Pantalla Catálogo | UC01 |
| Pantalla Comprobante | UC05, UC34 |
| Pantalla Configuración | UC24 |
| Pantalla Cuenta | UC16, UC18 |
| Pantalla Cuentas por cobrar | UC51 |
| Pantalla Despacho | UC32 |
| Pantalla Empezar | UC36 |
| Pantalla Encargado | UC12 |
| Pantalla Favoritos | UC17 |
| Pantalla Ficha de producto | UC02, UC04, UC11, UC20, UC21 |
| Pantalla Historial | UC19, UC33 |
| Pantalla Inventario | UC25, UC31 |
| Pantalla Login | UC15 |
| Pantalla Moderación | UC26 |
| Pantalla Nueva tienda | UC38 |
| Pantalla Pago | UC27, UC54 |
| Pantalla Planes | UC36 |
| Pantalla Probador | UC03, UC28 |
| Pantalla Proveedor | UC13 |
| Pantalla Punto de venta | UC06, UC07, UC08, UC22, UC42, UC43, UC50 |
| Pantalla Registro | UC14 |
| Pantalla Reporte inteligente | UC48, UC49 |
| Pantalla Reportes | UC10 |
| Pantalla Reservas | UC11 |
| Pantalla Sincronización | UC44, UC45, UC46 |
| Pantalla Usuarios | UC23 |
| Pantalla Verificar | UC37 |
| Selector de tienda | UC40 |
| Service Worker | UC35, UC47 |

Las pantallas principales del incremento, tomadas del sistema en funcionamiento con los datos de demostración, sirven como prototipo de GUI: cada texto de caso de uso nombra estos elementos tal como aparecen.

![Figura 9.1.12: Pantalla Planes: módulos, planes y precios por período (UC36)](../imagenes/gui/gui-planes.png)

![Figura 9.1.13: Pantalla Empezar: registro de la cuenta, paso 1 de 3 (UC36)](../imagenes/gui/gui-empezar.png)

![Figura 9.1.14: Panel de plataforma: MRR, ARR, ARPU, churn y proyección (UC41)](../imagenes/gui/gui-plataforma.png)

![Figura 9.1.15: Pantalla Punto de venta sin conexión (UC42)](../imagenes/gui/gui-pos-offline.png)

![Figura 9.1.16: Pantalla Sincronización: estado del dispositivo y política offline (UC44 a UC46)](../imagenes/gui/gui-sincronizacion.png)

![Figura 9.1.17: Pantalla Reportes: reporte inteligente desde lenguaje natural (UC48)](../imagenes/gui/gui-reporte.png)

## 9.1.4 Actores

| Actor | Descripción |
|---|---|
| Clienta | Compra en línea, prueba prendas, reserva y consulta su historial desde la web, la PWA o la app móvil. |
| Cajero | Opera el punto de venta de una sucursal: abre y cierra caja, cobra, fía y recibe abonos. |
| Encargado | Atiende reservas, despacho, inventario y reportes de su sucursal. |
| Administrador | Dueña o administradora de una tienda: catálogo, usuarios, reportes, configuración y analítica. |
| Proveedor | Registra el ingreso de su mercadería a la tienda. |
| Suscriptor | Persona o empresa que se registra en la plataforma, contrata un plan y crea su tienda. |
| Dueño de plataforma | Superadministrador de EnsayAR como SaaS: ve suscripciones, ingresos y proyecciones. |
| Servicio de IA | Azure OpenAI: interpreta preguntas y responde al bot; puede no estar disponible. |
| Pasarela de pago | Sistema externo que autoriza cobros con tarjeta, QR o billetera en modo sandbox. |
| Dispositivo sin red | Navegador (PWA) o teléfono que guarda operaciones mientras no hay conexión. |

Servicio de IA, Pasarela de pago y Dispositivo sin red son actores secundarios: no inician casos de uso, pero el sistema dialoga con ellos a través de una frontera propia (Interfaz Azure OpenAI, Interfaz pasarela y Cola local).

## 9.1.5 Diagramas de casos de uso

Los casos se agrupan por lote. El lote 0 reúne los 35 casos heredados, divididos por paquete funcional; los lotes 1 a 5 son los nuevos del segundo ciclo. Cada diagrama dibuja el sujeto UML 2.5 (el rectángulo "EnsayAR: …"), que marca el límite del sistema: los casos de uso quedan dentro y los actores fuera. Los actores que inician casos van a la izquierda y los secundarios (Servicio de IA, Pasarela de pago y Dispositivo sin red) a la derecha. Las relaciones «include» y «extend» son las siguientes:

| Caso | Relación | Caso base |
|---|---|---|
| UC03 Usar el probador virtual | «extend» | UC02 Ver ficha y variantes |
| UC04 Consultar la ficha con el asistente | «extend» | UC02 Ver ficha y variantes |
| UC11 Reservar una prenda | «extend» | UC02 Ver ficha y variantes |
| UC20 Opinar un producto | «extend» | UC02 Ver ficha y variantes |
| UC21 Pedir alerta de producto | «extend» | UC02 Ver ficha y variantes |
| UC28 Usar el probador 3D | «extend» | UC03 Usar el probador virtual |
| UC22 Aplicar cupón | «extend» | UC05 Comprar en línea |
| UC22 Aplicar cupón | «extend» | UC07 Registrar venta en el punto de venta |
| UC05 Comprar en línea | «include» | UC27 Simular un pago |
| UC05 Comprar en línea | «include» | UC34 Emitir comprobante simulado |
| UC07 Registrar venta en el punto de venta | «include» | UC34 Emitir comprobante simulado |
| UC42 Vender sin conexión | «extend» | UC07 Registrar venta en el punto de venta |
| UC50 Vender al crédito | «extend» | UC07 Registrar venta en el punto de venta |
| UC45 Resolver conflicto de stock | «extend» | UC44 Sincronizar operaciones pendientes |
| UC49 Ajustar y exportar reporte | «extend» | UC48 Generar reporte por texto o voz |
| UC36 Registrar cuenta en la plataforma | «include» | UC37 Verificar correo |
| UC38 Suscribirse y crear tienda | «include» | UC37 Verificar correo |
| UC54 Pagar con pasarela internacional | «extend» | UC27 Simular un pago |
| UC43 Registrar clienta o producto sin conexión | «extend» | UC09 Administrar catálogo |

![Figura 9.1.18: Casos de uso del lote 0, paquete Catálogo](../imagenes/ea/cu-lote-0-catalogo.png)

![Figura 9.1.19: Casos de uso del lote 0, paquete Probador](../imagenes/ea/cu-lote-0-probador.png)

![Figura 9.1.20: Casos de uso del lote 0, paquete Bot](../imagenes/ea/cu-lote-0-bot.png)

![Figura 9.1.21: Casos de uso del lote 0, paquete Ventas](../imagenes/ea/cu-lote-0-ventas.png)

![Figura 9.1.22: Casos de uso del lote 0, paquete Caja](../imagenes/ea/cu-lote-0-caja.png)

![Figura 9.1.23: Casos de uso del lote 0, paquete Reportes](../imagenes/ea/cu-lote-0-reportes.png)

![Figura 9.1.24: Casos de uso del lote 0, paquete Reservas](../imagenes/ea/cu-lote-0-reservas.png)

![Figura 9.1.25: Casos de uso del lote 0, paquete Proveedores](../imagenes/ea/cu-lote-0-proveedores.png)

![Figura 9.1.26: Casos de uso del lote 0, paquete Auth](../imagenes/ea/cu-lote-0-auth.png)

![Figura 9.1.27: Casos de uso del lote 0, paquete Cliente](../imagenes/ea/cu-lote-0-cliente.png)

![Figura 9.1.28: Casos de uso del lote 0, paquete Administración](../imagenes/ea/cu-lote-0-administracion.png)

![Figura 9.1.29: Casos de uso del lote 0, paquete Inventario](../imagenes/ea/cu-lote-0-inventario.png)

![Figura 9.1.30: Casos de uso del lote 0, paquete Pagos](../imagenes/ea/cu-lote-0-pagos.png)

![Figura 9.1.31: Casos de uso del lote 1, SaaS multi-tienda](../imagenes/ea/cu-lote-1-saas-multi-tienda.png)

![Figura 9.1.32: Casos de uso del lote 2, Operación sin conexión y sincronización](../imagenes/ea/cu-lote-2-operacion-sin-conexion-y-sincronizacion.png)

![Figura 9.1.33: Casos de uso del lote 3, Reportes generativos y ventas al crédito](../imagenes/ea/cu-lote-3-reportes-generativos-y-ventas-al-credito.png)

![Figura 9.1.34: Casos de uso del lote 4, Analítica con aprendizaje automático](../imagenes/ea/cu-lote-4-analitica-con-aprendizaje-automatico.png)

![Figura 9.1.35: Casos de uso del lote 5, Pagos para países hispanohablantes](../imagenes/ea/cu-lote-5-pagos-para-paises-hispanohablantes.png)

## 9.1.6 Texto de los casos de uso

Cada caso se escribe con las reglas de ICONIX: voz activa, evento y respuesta, sustantivos tomados del dominio y fronteras con nombre. El curso básico es el camino en que todo sale bien; cada curso alterno se numera con el paso donde se desvía (4a, 4b) y dice cómo termina. Los casos UC01 a UC35 son las fichas del primer ciclo reescritas con estas reglas.

### Lote 0: Casos heredados del primer ciclo, revisados con robustez y secuencia

#### UC01 Consultar catálogo

**Actores:** Clienta. **Paquete:** Catálogo. **Requisitos:** B1. **Pantallas:** Pantalla Catálogo.

**Curso básico**

1. La Clienta abre la Pantalla Catálogo de la tienda.
2. El sistema resuelve la Tienda activa y lista los Producto publicados con precio y disponibilidad por Sucursal.
3. La Clienta filtra por Categoria, ocasión, talla, color, precio o sucursal, o escribe una búsqueda.
4. El sistema vuelve a listar solo los productos que cumplen los filtros.
5. La Clienta elige un producto y pasa a la ficha (UC02).

**Cursos alternos**

- **4a.** Ningún producto coincide: la Pantalla Catálogo muestra la lista vacía y ofrece limpiar filtros.
- **1a.** Sin conexión: la PWA muestra el catálogo guardado en caché con un aviso de datos no actualizados.

#### UC02 Ver ficha y variantes

**Actores:** Clienta. **Paquete:** Catálogo. **Requisitos:** B1. **Pantallas:** Pantalla Ficha de producto.

**Curso básico**

1. La Clienta abre la Pantalla Ficha de producto desde el catálogo.
2. El sistema carga el Producto con sus Variante, fotos, composición y cuidados.
3. La Clienta elige talla y color.
4. El sistema muestra el precio y el stock de la variante en cada Sucursal.
5. Desde la ficha la Clienta puede probar (UC03), reservar (UC11), opinar (UC20) o agregar al carrito (UC05).

**Cursos alternos**

- **4a.** La variante está agotada: la ficha la muestra deshabilitada y ofrece pedir alerta (UC21).
- **2a.** El producto no existe o es de otra tienda: el sistema responde 404 y vuelve al catálogo.

#### UC03 Usar el probador virtual

**Actores:** Clienta. **Paquete:** Probador. **Requisitos:** B1. **Pantallas:** Pantalla Probador y Cámara del dispositivo.

**Curso básico**

1. La Clienta pulsa Probar en la Pantalla Ficha de producto y el sistema abre la Pantalla Probador.
2. La Clienta autoriza la Cámara del dispositivo o carga una foto; el video no sale del dispositivo.
3. El sistema pide el overlay de la Variante y estima los puntos del cuerpo en el dispositivo.
4. El sistema coloca la prenda anclada a los hombros; si la variante tiene modelo 3D usa UC28.
5. La Clienta cambia de color y vuelve a la ficha.

**Cursos alternos**

- **2a.** Sin permiso de cámara: la Clienta marca los hombros a mano sobre una foto o una silueta.
- **4a.** La variante no tiene overlay: el sistema avisa y ofrece otra variante.

#### UC04 Consultar la ficha con el asistente

**Actores:** Clienta y Servicio de IA. **Paquete:** Bot. **Requisitos:** B1. **Pantallas:** Pantalla Ficha de producto y Interfaz Azure OpenAI.

**Curso básico**

1. La Clienta escribe una pregunta sobre precio, talla, color, ocasión o cuidados en la Pantalla Ficha de producto.
2. El sistema arma el contexto con los datos guardados del Producto y sus Variante.
3. El sistema consulta al Servicio de IA por la Interfaz Azure OpenAI con ese contexto.
4. El sistema muestra la respuesta en la ficha.

**Cursos alternos**

- **3a.** El Servicio de IA no responde: el sistema contesta con reglas sobre los mismos datos de la ficha.
- **4a.** El dato no está en la ficha: la respuesta dice que no lo tiene y no inventa stock ni precios.

#### UC05 Comprar en línea

**Actores:** Clienta. **Paquete:** Ventas. **Requisitos:** B1, O5, O6. **Pantallas:** Pantalla Carrito y Pantalla Comprobante.

**Curso básico**

1. La Clienta revisa la Pantalla Carrito con las variantes elegidas.
2. La Clienta puede aplicar un Cupon (UC22) y elige el medio de pago (UC27).
3. La Clienta confirma la compra; el carrito envía la Venta con un uuid generado en el cliente.
4. El sistema recalcula precios en el servidor, descuenta el StockAlmacen con una actualización condicional y registra la Venta, sus LineaVenta y el MovimientoInventario en una transacción.
5. El sistema crea el Pedido para despacho y muestra la Pantalla Comprobante (UC34).

**Cursos alternos**

- **4a.** El disponible cambió: el sistema rechaza la línea con conflicto de stock y no deja saldo negativo.
- **3a.** La Clienta pulsa confirmar dos veces: el uuid repetido devuelve la misma venta sin cobrar de nuevo.
- **4b.** El pago simulado es rechazado: no se registra la venta ni baja el stock.

#### UC06 Abrir caja

**Actores:** Cajero. **Paquete:** Caja. **Requisitos:** B1, O6. **Pantallas:** Pantalla Punto de venta.

**Curso básico**

1. El Cajero indica la Sucursal y el fondo inicial en la Pantalla Punto de venta.
2. El sistema verifica que el Cajero no tenga otro CajaTurno abierto.
3. El sistema abre el CajaTurno con el fondo inicial y lo muestra en pantalla.

**Cursos alternos**

- **2a.** Ya hay un turno abierto: el sistema muestra ese turno en lugar de abrir otro.
- **1a.** Fondo negativo o sucursal ajena: el sistema rechaza la apertura.

#### UC07 Registrar venta en el punto de venta

**Actores:** Cajero. **Paquete:** Ventas. **Requisitos:** B1, O5, O6, O7. **Pantallas:** Pantalla Punto de venta.

**Curso básico**

1. El Cajero arma el ticket en la Pantalla Punto de venta con variantes y cantidades.
2. El Cajero puede asociar una clienta y un Cupon, y elige el medio de pago.
3. El sistema verifica que haya un CajaTurno abierto y comprueba el disponible en StockAlmacen.
4. El sistema descuenta el stock con una actualización condicional y registra la Venta, sus LineaVenta y el MovimientoInventario en una transacción.
5. El sistema suma el total al CajaTurno y emite el ticket y el comprobante (UC34).

**Cursos alternos**

- **3a.** Sin turno abierto o sin stock: el sistema no cobra y explica el motivo.
- **4a.** El mismo uuid llega dos veces: el sistema devuelve la venta ya cobrada sin descontar de nuevo.
- **1a.** Sin red: la venta en efectivo se guarda en la cola local y se sincroniza después (UC42).

#### UC08 Cerrar caja

**Actores:** Cajero. **Paquete:** Caja. **Requisitos:** B1, O1. **Pantallas:** Pantalla Punto de venta.

**Curso básico**

1. El Cajero declara el monto contado en la Pantalla Punto de venta.
2. El sistema calcula el total del CajaTurno y la diferencia con lo contado.
3. El sistema cierra el CajaTurno y muestra el arqueo.

**Cursos alternos**

- **1a.** Hay operaciones offline pendientes o en conflicto: el sistema bloquea el cierre hasta sincronizarlas.
- **2a.** El turno es de otra sucursal: el sistema no lo cierra.

#### UC09 Administrar catálogo

**Actores:** Administrador. **Paquete:** Catálogo. **Requisitos:** B1, O1. **Pantallas:** Pantalla Administración de catálogo.

**Curso básico**

1. El Administrador crea o edita un Producto en la Pantalla Administración de catálogo.
2. El Administrador agrega Variante con talla, color, fotos, overlay o modelo 3D y precio.
3. El Administrador asigna Categoria, Temporada y Coleccion (UC24).
4. El sistema valida que el plan de la Tienda permita el alta y guarda el producto.
5. El Administrador fija el stock inicial (UC25).

**Cursos alternos**

- **4a.** SKU repetido o talla y color ya existentes: el sistema rechaza el alta.
- **4b.** Sin red: el alta del producto queda en la cola local con uuid y se sincroniza después (UC43).

#### UC10 Pedir reporte predefinido

**Actores:** Administrador y Encargado. **Paquete:** Reportes. **Requisitos:** B1, S1. **Pantallas:** Pantalla Reportes.

**Curso básico**

1. El Administrador elige en la Pantalla Reportes un ranking rápido, el reporte del día o el de inventario.
2. El sistema fija la tienda de la sesión en la consulta y agrega las ventas o el stock del período.
3. El sistema registra la ReporteEjecucion y muestra la tabla con su narración.

**Cursos alternos**

- **1a.** El Encargado solo ve su sucursal: el sistema fuerza ese filtro.
- **2a.** No hay datos en el período: el sistema muestra el reporte vacío.

#### UC11 Reservar una prenda

**Actores:** Clienta. **Paquete:** Reservas. **Requisitos:** B1. **Pantallas:** Pantalla Ficha de producto y Pantalla Reservas.

**Curso básico**

1. La Clienta elige variante y Sucursal en la Pantalla Ficha de producto y pide reservar.
2. El sistema comprueba el disponible y aumenta la cantidad reservada en StockAlmacen; la física no baja.
3. El sistema crea la Reserva con su horario y la muestra en la Pantalla Reservas.

**Cursos alternos**

- **2a.** Sin disponible en esa sucursal: el sistema no crea la reserva y sugiere otra sucursal.

#### UC12 Atender reservas

**Actores:** Encargado. **Paquete:** Reservas. **Requisitos:** B1. **Pantallas:** Pantalla Encargado.

**Curso básico**

1. El Encargado ve las Reserva pendientes de su Sucursal en la Pantalla Encargado.
2. El Encargado completa o cancela una reserva.
3. Al completar, el sistema genera la Venta, descuenta la cantidad física y libera el reservado.
4. Al cancelar, el sistema solo libera el reservado.

**Cursos alternos**

- **2a.** La reserva es de otra sucursal: el sistema no la modifica.

#### UC13 Ingresar mercadería

**Actores:** Proveedor. **Paquete:** Proveedores. **Requisitos:** B1. **Pantallas:** Pantalla Proveedor.

**Curso básico**

1. El Proveedor elige producto, variante, Almacen y cantidad en la Pantalla Proveedor.
2. El sistema verifica que el Producto sea de ese Proveedor.
3. El sistema suma el StockAlmacen y escribe el MovimientoInventario de ingreso.

**Cursos alternos**

- **2a.** El producto es de otro proveedor: el sistema rechaza el ingreso.

#### UC14 Registrarse como clienta

**Actores:** Clienta. **Paquete:** Auth. **Requisitos:** B1, S7. **Pantallas:** Pantalla Registro.

**Curso básico**

1. La Clienta indica nombre, correo y clave en la Pantalla Registro de la tienda.
2. El sistema busca o crea la Cuenta global con la clave cifrada.
3. El sistema crea el Usuario con rol clienta en la Tienda e inicia la sesión.

**Cursos alternos**

- **2a.** El correo ya tiene cuenta en la plataforma: el sistema exige su clave y la une a esta tienda.
- **1a.** Clave débil o correo inválido: el sistema no crea la cuenta.

#### UC15 Iniciar y cerrar sesión

**Actores:** Clienta, Cajero, Encargado, Administrador y Proveedor. **Paquete:** Auth. **Requisitos:** B1, S1. **Pantallas:** Pantalla Login.

**Curso básico**

1. El usuario ingresa correo y clave en la Pantalla Login de la tienda.
2. El sistema valida la clave contra la Cuenta y busca su Usuario en la Tienda.
3. El sistema entrega un token JWT con rol, sucursal y tienda.
4. Al salir, el sistema guarda el token en TokenRevocado.

**Cursos alternos**

- **2a.** Clave incorrecta, usuario inactivo o tienda suspendida: el sistema no entrega token.
- **2b.** La cuenta no pertenece a esa tienda: el sistema responde que no tiene acceso.

#### UC16 Cambiar clave

**Actores:** Clienta, Cajero, Encargado, Administrador y Proveedor. **Paquete:** Auth. **Requisitos:** B1. **Pantallas:** Pantalla Cuenta.

**Curso básico**

1. El usuario escribe la clave actual y la nueva en la Pantalla Cuenta.
2. El sistema valida la clave actual contra la Cuenta.
3. El sistema reemplaza el hash de la clave.

**Cursos alternos**

- **2a.** La clave actual no coincide: el sistema no cambia la clave.

#### UC17 Gestionar favoritos

**Actores:** Clienta. **Paquete:** Cliente. **Requisitos:** B1. **Pantallas:** Pantalla Favoritos.

**Curso básico**

1. La Clienta marca un Producto como favorito desde la ficha.
2. El sistema guarda el Favorito sin duplicarlo.
3. La Clienta ve sus favoritos en la Pantalla Favoritos y puede quitar uno.

**Cursos alternos**

- **2a.** El producto ya era favorito: el sistema no crea un registro repetido.

#### UC18 Gestionar perfil y direcciones

**Actores:** Clienta. **Paquete:** Cliente. **Requisitos:** B1. **Pantallas:** Pantalla Cuenta.

**Curso básico**

1. La Clienta abre la Pantalla Cuenta y consulta su nombre y correo.
2. La Clienta agrega o edita una DireccionCliente de entrega.
3. El sistema valida y guarda la dirección.

**Cursos alternos**

- **3a.** La dirección está incompleta: el sistema no la guarda.

#### UC19 Ver historial de compras

**Actores:** Clienta, Cajero y Encargado. **Paquete:** Ventas. **Requisitos:** B1, S1. **Pantallas:** Pantalla Historial.

**Curso básico**

1. El usuario abre la Pantalla Historial.
2. El sistema lista las Venta propias de la Clienta, o las de la Sucursal para cajero y encargado.
3. El usuario abre el detalle con LineaVenta y medio de pago.

**Cursos alternos**

- **2a.** El sistema nunca muestra ventas de otra persona, de otra sucursal ni de otra tienda.

#### UC20 Opinar un producto

**Actores:** Clienta. **Paquete:** Cliente. **Requisitos:** B1. **Pantallas:** Pantalla Ficha de producto.

**Curso básico**

1. La Clienta escribe valoración y comentario en la Pantalla Ficha de producto.
2. El sistema guarda la Opinion como pendiente de moderación (UC26).

**Cursos alternos**

- **2a.** Ya opinó ese producto: el sistema rechaza la segunda opinión.

#### UC21 Pedir alerta de producto

**Actores:** Clienta. **Paquete:** Cliente. **Requisitos:** B1. **Pantallas:** Pantalla Ficha de producto.

**Curso básico**

1. En la Pantalla Ficha de producto la Clienta pide aviso de disponibilidad o de precio.
2. El sistema guarda la AlertaProducto y luego avisa con una Notificacion.

**Cursos alternos**

- **2a.** La misma alerta ya existe: el sistema no la duplica.

#### UC22 Aplicar cupón

**Actores:** Clienta y Cajero. **Paquete:** Ventas. **Requisitos:** B1. **Pantallas:** Pantalla Carrito y Pantalla Punto de venta.

**Curso básico**

1. La Clienta o el Cajero ingresa el código de Cupon durante la compra.
2. El sistema valida vigencia y usos, y recalcula el total con el porcentaje.
3. Al cobrar, el sistema suma un uso al cupón y la Venta guarda el descuento.

**Cursos alternos**

- **2a.** Código inválido, vencido o agotado: el total no cambia y se informa el motivo.

#### UC23 Gestionar usuarios

**Actores:** Administrador. **Paquete:** Administración. **Requisitos:** B1, S3. **Pantallas:** Pantalla Usuarios.

**Curso básico**

1. El Administrador lista los Usuario de su Tienda en la Pantalla Usuarios.
2. El Administrador crea un usuario con rol y sucursal, o edita nombre, rol y estado.
3. El sistema verifica el límite de usuarios del Plan y guarda el cambio con su Auditoria.

**Cursos alternos**

- **3a.** El plan llegó a su límite de usuarios: el sistema rechaza el alta y sugiere cambiar de plan (UC39).
- **3b.** El correo ya es usuario de la tienda: el sistema no lo duplica.

#### UC24 Gestionar sucursales, temporadas y colecciones

**Actores:** Administrador. **Paquete:** Catálogo. **Requisitos:** B1, S3. **Pantallas:** Pantalla Configuración.

**Curso básico**

1. El Administrador crea o edita una Sucursal en la Pantalla Configuración.
2. El sistema verifica el límite de sucursales del plan y crea su Almacen.
3. El Administrador crea Temporada y Coleccion para asignarlas en UC09.

**Cursos alternos**

- **2a.** El plan no admite más sucursales: el sistema rechaza el alta.
- **1a.** Nombre vacío: el sistema no guarda.

#### UC25 Ajustar inventario y ver el kardex

**Actores:** Encargado y Administrador. **Paquete:** Inventario. **Requisitos:** B1, O6. **Pantallas:** Pantalla Inventario.

**Curso básico**

1. El Encargado consulta los MovimientoInventario de su sucursal en la Pantalla Inventario.
2. El Encargado registra un ajuste con la cantidad resultante.
3. El sistema actualiza el StockAlmacen y guarda el movimiento de ajuste.

**Cursos alternos**

- **3a.** La cantidad nueva es menor que lo reservado: el sistema rechaza el ajuste.

#### UC26 Moderar opiniones y ver auditoría

**Actores:** Administrador. **Paquete:** Administración. **Requisitos:** B1. **Pantallas:** Pantalla Moderación y Pantalla Bitácora.

**Curso básico**

1. El Administrador ve las Opinion pendientes en la Pantalla Moderación y las publica o rechaza.
2. El Administrador consulta la Auditoria en la Pantalla Bitácora.

**Cursos alternos**

- **1a.** La opinión ya fue moderada: un doble clic no la vuelve a pendiente.

#### UC27 Simular un pago

**Actores:** Clienta y Cajero. **Paquete:** Pagos. **Requisitos:** B1, O8. **Pantallas:** Pantalla Pago.

**Curso básico**

1. La Clienta o el Cajero elige efectivo, QR, tarjeta o transferencia en la Pantalla Pago.
2. Con QR o tarjeta, el sistema crea el PagoSimulado y espera su autorización.
3. Solo si el pago es aprobado, la Venta continúa el cobro de UC05 o UC07.

**Cursos alternos**

- **3a.** El pago es rechazado: no hay venta cobrada y el stock no baja.
- **1a.** Sin red: QR y tarjeta no están disponibles porque necesitan confirmación en línea.

#### UC28 Usar el probador 3D

**Actores:** Clienta. **Paquete:** Probador. **Requisitos:** B1. **Pantallas:** Pantalla Probador.

**Curso básico**

1. Dentro de UC03, el sistema detecta que la Variante tiene modelo 3D.
2. El sistema ajusta la prenda al torso estimado y muestra volumen y caída simplificada.
3. La Clienta gira la vista o cambia de color.

**Cursos alternos**

- **1a.** El dispositivo no soporta el modelo: el sistema vuelve al overlay 2D sin perder la ficha.

#### UC29 Hablar con el bot

**Actores:** Clienta y Servicio de IA. **Paquete:** Bot. **Requisitos:** B1. **Pantallas:** Pantalla Bot y Interfaz Azure OpenAI.

**Curso básico**

1. La Clienta abre la Pantalla Bot y pregunta por talla, combinación, disponibilidad o su pedido.
2. El sistema arma el contexto con Producto, StockAlmacen y las Venta propias de la Clienta.
3. El sistema consulta al Servicio de IA por la Interfaz Azure OpenAI y muestra la respuesta.

**Cursos alternos**

- **2a.** Pide un reporte de la empresa: el bot responde que corresponde a administración.
- **3a.** El Servicio de IA no responde: el bot contesta con reglas sobre el catálogo.

#### UC30 Aplicar precio mayorista

**Actores:** Administrador y Clienta. **Paquete:** Catálogo. **Requisitos:** B1. **Pantallas:** Pantalla Administración de catálogo y Pantalla Carrito.

**Curso básico**

1. El Administrador carga precio mayorista y cantidad mínima en el Producto.
2. La Clienta mayorista arma un carrito que alcanza el mínimo.
3. Al cobrar, el sistema aplica el precio mayorista y la LineaVenta guarda el precio usado.

**Cursos alternos**

- **3a.** No alcanza el mínimo: el sistema aplica el precio de detalle.

#### UC31 Transferir stock entre almacenes

**Actores:** Encargado. **Paquete:** Inventario. **Requisitos:** B1, O7. **Pantallas:** Pantalla Inventario.

**Curso básico**

1. El Encargado elige variante, Almacen de origen, destino y cantidad en la Pantalla Inventario.
2. El sistema resta en origen con una actualización condicional y suma en destino.
3. El sistema escribe dos MovimientoInventario de transferencia en la misma transacción.

**Cursos alternos**

- **2a.** La cantidad supera el disponible u origen y destino son iguales: el sistema no transfiere.

#### UC32 Despachar un pedido

**Actores:** Encargado. **Paquete:** Ventas. **Requisitos:** B1. **Pantallas:** Pantalla Despacho.

**Curso básico**

1. El Encargado ve los Pedido pendientes en la Pantalla Despacho.
2. El Encargado confirma el despacho.
3. El sistema marca el pedido como enviado con su referencia y avisa a la Clienta con una Notificacion.

**Cursos alternos**

- **2a.** La venta es de caja o el pedido ya fue enviado: el sistema no lo despacha.

#### UC33 Devolver una venta

**Actores:** Cajero. **Paquete:** Ventas. **Requisitos:** B1, R2. **Pantallas:** Pantalla Historial.

**Curso básico**

1. El Cajero elige la Venta y las líneas a devolver en la Pantalla Historial.
2. El sistema repone el StockAlmacen y registra el MovimientoInventario de devolución.
3. El sistema crea la Devolucion y ajusta la caja; si la venta fue al crédito, reduce el saldo de la CuentaCobrar.

**Cursos alternos**

- **2a.** Devolver más unidades que las vendidas: el sistema rechaza la devolución.
- **3a.** Venta al crédito sin abonos: la deuda se cancela y no sale efectivo de la caja.

#### UC34 Emitir comprobante simulado

**Actores:** Cajero. **Paquete:** Pagos. **Requisitos:** B1. **Pantallas:** Pantalla Comprobante.

**Curso básico**

1. Al terminar UC05 o UC07, el sistema arma el comprobante con Sucursal, LineaVenta, totales y un NIT de prueba.
2. El sistema lo muestra en la Pantalla Comprobante y permite imprimirlo o enviarlo por correo.

**Cursos alternos**

- **1a.** Sin venta cobrada no hay comprobante; no se envía a un servicio tributario real.

#### UC35 Instalar la tienda como PWA

**Actores:** Clienta y Cajero. **Paquete:** Cliente. **Requisitos:** O1, O10. **Pantallas:** Navegador y Service Worker.

**Curso básico**

1. El Navegador ofrece instalar la aplicación a partir del manifest.
2. El Service Worker guarda la estructura de la aplicación y los datos recientes en caché.
3. La Clienta o el Cajero abre la tienda instalada desde el escritorio o el teléfono.

**Cursos alternos**

- **2a.** Sin red: la aplicación abre desde la caché y la caja trabaja en cola (UC42).
- **1a.** El navegador no soporta instalación: la tienda funciona igual como sitio web.

### Lote 1: SaaS multi-tienda

#### UC36 Registrar cuenta en la plataforma

**Actores:** Suscriptor. **Paquete:** Plataforma. **Requisitos:** S2, S3, S4. **Pantallas:** Pantalla Planes y Pantalla Empezar.

**Curso básico**

1. El Suscriptor revisa módulos, planes y precios en la Pantalla Planes.
2. El Suscriptor elige un plan y abre la Pantalla Empezar.
3. El Suscriptor indica nombre, correo y clave.
4. El sistema crea la Cuenta sin verificar y envía el enlace de verificación (UC37).

**Cursos alternos**

- **4a.** El correo ya tiene cuenta: el sistema pide iniciar sesión en lugar de crear otra.
- **4b.** No hay servidor de correo configurado: en demo, el enlace se muestra en pantalla.

#### UC37 Verificar correo

**Actores:** Suscriptor. **Paquete:** Plataforma. **Requisitos:** S6. **Pantallas:** Pantalla Verificar.

**Curso básico**

1. El Suscriptor abre el enlace recibido y llega a la Pantalla Verificar.
2. El sistema valida el token y marca la Cuenta como verificada.
3. El sistema inicia la sesión de plataforma y lleva al Suscriptor a elegir plan.

**Cursos alternos**

- **2a.** El token venció o no existe: el sistema ofrece reenviar el correo.
- **2b.** Sin verificar, la cuenta no puede suscribirse ni entrar a una tienda.

#### UC38 Suscribirse y crear tienda

**Actores:** Suscriptor y Pasarela de pago. **Paquete:** Plataforma. **Requisitos:** S3, S4, S5, O6. **Pantallas:** Pantalla Nueva tienda y Interfaz pasarela.

**Curso básico**

1. El Suscriptor elige plan y duración (1, 3 o 12 meses) e indica nombre y dirección (slug) de la tienda en la Pantalla Nueva tienda.
2. El sistema verifica que el slug esté libre.
3. El Suscriptor ingresa la tarjeta de prueba; el sistema cobra por la Interfaz pasarela con una clave de idempotencia.
4. Con el pago aprobado, el sistema crea en una transacción la Tienda, la Suscripcion, el PagoSuscripcion, la Sucursal, el Almacen y el Usuario administrador.
5. El sistema entra a la tienda nueva sin pedir otro login.

**Cursos alternos**

- **3a.** El pago es rechazado: no se crea la tienda y el Suscriptor puede reintentar.
- **3b.** El Suscriptor pulsa pagar dos veces: la misma clave de idempotencia devuelve el primer resultado.
- **2a.** El slug está ocupado: el sistema sugiere otro.

#### UC39 Renovar o cambiar de plan

**Actores:** Suscriptor y Pasarela de pago. **Paquete:** Plataforma. **Requisitos:** S3, S4. **Pantallas:** Panel Mis tiendas y Interfaz pasarela.

**Curso básico**

1. El Suscriptor abre el detalle de su Tienda en el Panel Mis tiendas y ve uso y vencimiento.
2. El Suscriptor elige renovar o cambiar a otro Plan y duración.
3. El sistema cobra por la Interfaz pasarela y extiende la Suscripcion desde su vencimiento.

**Cursos alternos**

- **3a.** El pago es rechazado: la suscripción no cambia.
- **2a.** El plan nuevo tiene menos usuarios que los activos: el sistema avisa antes de cobrar.

#### UC40 Cambiar de tienda

**Actores:** Administrador, Cajero y Encargado. **Paquete:** Auth. **Requisitos:** S7. **Pantallas:** Selector de tienda.

**Curso básico**

1. El usuario abre el Selector de tienda en la barra lateral.
2. El sistema lista las Tienda donde su Cuenta tiene un Usuario activo.
3. El usuario elige otra tienda.
4. El sistema emite un token nuevo para esa tienda y recarga los módulos sin pedir la clave.

**Cursos alternos**

- **3a.** La tienda está suspendida o vencida: el sistema no permite entrar y muestra el motivo.
- **2a.** La cuenta tiene una sola tienda: el selector no se muestra.

#### UC41 Ver métricas de suscripciones

**Actores:** Dueño de plataforma. **Paquete:** Plataforma. **Requisitos:** S9. **Pantallas:** Panel de plataforma.

**Curso básico**

1. El Dueño de plataforma abre el Panel de plataforma.
2. El sistema calcula MRR, ARR, ARPU, tiendas activas y churn a partir de Suscripcion y PagoSuscripcion.
3. El sistema arma las series de 12 meses y la proyección a 6 meses y las muestra.

**Cursos alternos**

- **1a.** Un usuario que no es superadministrador no accede al panel.

### Lote 2: Operación sin conexión y sincronización

#### UC42 Vender sin conexión

**Actores:** Cajero y Dispositivo sin red. **Paquete:** Sincronización. **Requisitos:** O1, O2, O4, O8, O9. **Pantallas:** Pantalla Punto de venta y Cola local.

**Curso básico**

1. Sin red, el Cajero arma el ticket en la Pantalla Punto de venta y cobra en efectivo.
2. El sistema genera el uuid de la Venta en el dispositivo y guarda la operación en la Cola local (IndexedDB en web, SQLite en móvil).
3. El sistema descuenta el stock en la copia local y muestra el ticket marcado como pendiente.
4. Al volver la red, la operación se envía en el siguiente lote de sincronización (UC44).

**Cursos alternos**

- **1a.** El Cajero elige QR, tarjeta o crédito: el sistema no lo permite sin red y lo explica.
- **4a.** La operación supera la ventana offline de la tienda: llegará como vencida y se informa al Cajero.

#### UC43 Registrar clienta o producto sin conexión

**Actores:** Cajero, Administrador y Dispositivo sin red. **Paquete:** Sincronización. **Requisitos:** O1, O2, O4. **Pantallas:** Pantalla Punto de venta, Pantalla Administración de catálogo y Cola local.

**Curso básico**

1. Sin red, el Cajero registra una clienta nueva, o el Administrador da de alta un producto.
2. El sistema asigna el uuid en el dispositivo y guarda la operación en la Cola local.
3. Las ventas posteriores pueden referir a esa clienta por su uuid antes de sincronizar.

**Cursos alternos**

- **3a.** Al sincronizar, el correo de la clienta ya existía: el servidor fusiona con el Usuario existente.

#### UC44 Sincronizar operaciones pendientes

**Actores:** Dispositivo sin red. **Paquete:** Sincronización. **Requisitos:** O3, O4, O6, O7. **Pantallas:** Cola local y Pantalla Sincronización.

**Curso básico**

1. Al volver la red, al abrir la app o cada 30 segundos, el sistema toma las operaciones de la Cola local.
2. El sistema envía un lote con la cabecera de idempotencia y el identificador del Dispositivo.
3. El servidor procesa cada operación en su propia transacción y guarda su OperacionSync.
4. El servidor responde un estado por operación: aplicada, duplicada, conflicto, vencida o rechazada.
5. El sistema actualiza la Cola local y muestra el resultado en la Pantalla Sincronización.

**Cursos alternos**

- **3a.** Una operación ya había llegado: el servidor la marca duplicada y devuelve el resultado original.
- **3b.** Falta stock: la operación queda en conflicto (UC45) y las demás siguen.
- **2a.** Se corta la red a mitad del envío: el lote se reintenta con la misma clave y no se duplica nada.

#### UC45 Resolver conflicto de stock

**Actores:** Cajero y Encargado. **Paquete:** Sincronización. **Requisitos:** O5. **Pantallas:** Pantalla Sincronización.

**Curso básico**

1. Dos cajas vendieron sin red la última unidad; al sincronizar, la segunda operación queda en conflicto con el disponible real.
2. El Cajero ve el conflicto en la Pantalla Sincronización con lo pedido y lo disponible.
3. El Cajero elige vender lo disponible o descartar la operación.
4. El sistema reintenta con la cantidad disponible, o marca la OperacionSync como descartada.

**Cursos alternos**

- **3a.** Ya no queda nada disponible: solo se puede descartar.
- **2a.** El Encargado puede resolver desde el panel de la tienda los conflictos de cualquier caja.

#### UC46 Configurar ventana offline

**Actores:** Administrador. **Paquete:** Sincronización. **Requisitos:** O8, O9. **Pantallas:** Pantalla Sincronización.

**Curso básico**

1. El Administrador abre la política offline en la Pantalla Sincronización.
2. El sistema muestra qué funciona sin red y qué no, con el motivo de cada caso.
3. El Administrador fija la ventana offline entre 1 y 30 días.
4. El sistema guarda la ventana en la Tienda; las operaciones más viejas llegarán como vencidas.

**Cursos alternos**

- **3a.** Valor fuera de rango: el sistema no lo guarda.

#### UC47 Activar notificaciones push

**Actores:** Clienta, Cajero y Administrador. **Paquete:** Notificaciones. **Requisitos:** O10. **Pantallas:** Navegador y Service Worker.

**Curso básico**

1. El usuario pulsa Activar notificaciones y el Navegador pide permiso.
2. El sistema obtiene la clave pública VAPID y crea la suscripción en el Service Worker.
3. El sistema guarda la PushSuscripcion del usuario.
4. Ante un evento (venta, conflicto, despacho), el sistema envía el aviso y el Service Worker lo muestra aunque la app esté cerrada.

**Cursos alternos**

- **1a.** El usuario niega el permiso: la app sigue funcionando sin push.
- **4a.** El endpoint expiró: el sistema borra la suscripción.

### Lote 3: Reportes generativos y ventas al crédito

#### UC48 Generar reporte por texto o voz

**Actores:** Administrador, Encargado y Servicio de IA. **Paquete:** Reportes. **Requisitos:** R1, R2, S1. **Pantallas:** Pantalla Reporte inteligente, Micrófono y Interfaz Azure OpenAI.

**Curso básico**

1. El Administrador escribe o dicta por el Micrófono el reporte que necesita en la Pantalla Reporte inteligente.
2. El sistema normaliza el texto y pide al Servicio de IA una especificación JSON usando el catálogo semántico y los valores reales de la tienda.
3. El sistema valida la especificación contra el catálogo y la compila a SQL con parámetros.
4. El sistema ejecuta la consulta fijando la tienda de la sesión y registra la ReporteEjecucion.
5. El sistema muestra criterios, tabla, totales, barras y la narración del resultado.

**Cursos alternos**

- **2a.** El Servicio de IA no responde o devuelve un JSON inválido: el intérprete por reglas arma la especificación.
- **3a.** Se pide un campo inexistente (teléfono, edad): el sistema avisa y no lo inventa.
- **1a.** El pedido dice en PDF o en Excel: el sistema genera el archivo al terminar (UC49).

#### UC49 Ajustar y exportar reporte

**Actores:** Administrador y Encargado. **Paquete:** Reportes. **Requisitos:** R2, R3. **Pantallas:** Pantalla Reporte inteligente y Archivo PDF o Excel.

**Curso básico**

1. El Administrador quita un criterio, quita una agrupación o invierte el orden en la Pantalla Reporte inteligente.
2. El sistema vuelve a ejecutar la especificación editada sin pasar por la IA.
3. El Administrador pide Excel o PDF.
4. El sistema genera el Archivo PDF o Excel con encabezado, criterios, totales y la hoja de cómo se generó, y lo descarga.

**Cursos alternos**

- **4a.** En el móvil, el archivo se comparte con el menú del sistema operativo.
- **2a.** La edición deja una especificación inválida: el sistema responde 400 y conserva el reporte anterior.

#### UC50 Vender al crédito

**Actores:** Cajero. **Paquete:** Ventas. **Requisitos:** R2, O8. **Pantallas:** Pantalla Punto de venta.

**Curso básico**

1. El Cajero arma el ticket, asocia una clienta y elige Crédito (30 días) en la Pantalla Punto de venta.
2. El sistema descuenta el stock y registra la Venta como en UC07, pero no suma dinero al CajaTurno.
3. El sistema crea la CuentaCobrar con monto, saldo y vencimiento a 30 días.

**Cursos alternos**

- **1a.** No hay clienta asociada: el sistema rechaza el crédito.
- **1b.** Sin red: el crédito no está disponible porque exige ver la deuda real.

#### UC51 Registrar abono de crédito

**Actores:** Cajero. **Paquete:** Créditos. **Requisitos:** R2, O6. **Pantallas:** Pantalla Cuentas por cobrar.

**Curso básico**

1. El Cajero busca la CuentaCobrar de la clienta en la Pantalla Cuentas por cobrar.
2. El Cajero ingresa monto y medio del abono.
3. El sistema descuenta el saldo con una actualización condicional que nunca lo deja negativo.
4. El sistema registra el AbonoCredito y suma el monto al CajaTurno abierto.

**Cursos alternos**

- **3a.** El abono supera el saldo: el sistema lo rechaza e informa el saldo.
- **2a.** El Cajero pulsa dos veces o se corta la red: la misma clave de idempotencia no cobra dos veces.
- **3b.** Dos cajas abonan a la vez por el saldo total: una pasa y la otra recibe el rechazo.

### Lote 4: Analítica con aprendizaje automático

> Alcance acordado con el integrante a cargo; el texto se ajusta a su implementación.

#### UC52 Ver dashboard predictivo

**Actores:** Administrador. **Paquete:** Analítica. **Requisitos:** A1, A2, A3. **Pantallas:** Dashboard de analítica.

**Curso básico**

1. El Administrador abre el Dashboard de analítica.
2. El sistema consulta el ModeloPredictivo entrenado con datos sintéticos de la tienda.
3. El sistema muestra la predicción (por ejemplo, demanda o ventas por período) con sus métricas de error.

**Cursos alternos**

- **2a.** No hay modelo entrenado: el sistema ofrece entrenarlo con los datos disponibles.

#### UC53 Ver segmentación de clientas

**Actores:** Administrador. **Paquete:** Analítica. **Requisitos:** A1, A2, A3. **Pantallas:** Dashboard de analítica.

**Curso básico**

1. El Administrador abre la segmentación en el Dashboard de analítica.
2. El sistema agrupa a las clientas con un modelo no supervisado a partir de compras y comportamiento.
3. El sistema muestra cada SegmentoCliente con su tamaño y sus rasgos.

**Cursos alternos**

- **2a.** Pocos datos: el sistema avisa que la segmentación no es confiable.

### Lote 5: Pagos para países hispanohablantes

> Alcance acordado con el integrante a cargo; el texto se ajusta a su implementación.

#### UC54 Pagar con pasarela internacional

**Actores:** Clienta y Pasarela de pago. **Paquete:** Pagos. **Requisitos:** P1, P2, P3, P4. **Pantallas:** Pantalla Pago y Interfaz pasarela.

**Curso básico**

1. La Clienta elige pagar con tarjeta o billetera en la Pantalla Pago.
2. El sistema crea la TransaccionPasarela en modo sandbox con una clave de idempotencia.
3. La Pasarela de pago autoriza el cobro y notifica el resultado.
4. Con el pago aprobado, la Venta continúa su cobro (UC05).

**Cursos alternos**

- **3a.** La pasarela rechaza el cobro: la venta no se confirma.
- **3b.** La notificación llega dos veces: el sistema la procesa una sola vez.

## 9.1.7 Revisión de requisitos

La revisión se hizo por lotes, justo antes de pasar cada uno a robustez, con la lista de verificación de ICONIX. El acta resume lo encontrado y lo corregido.

| Verificación | Resultado |
|---|---|
| Cada requisito S, O, R, A y P está asignado a al menos un caso o a una decisión documentada | Sí. S8, P2 y P4 se cubren con capítulos, no con diálogos |
| Cada caso tiene curso básico y al menos un curso alterno | Sí, en los 54 casos |
| Los sustantivos de los casos existen en el dominio con el mismo nombre | Sí, tras agregar Cuenta, Plan, Suscripcion, PagoSuscripcion, Dispositivo, OperacionSync, PushSuscripcion, CuentaCobrar y AbonoCredito |
| Cada caso nombra su pantalla | Sí; se nombraron fronteras que estaban implícitas, como Cola local y Selector de tienda |
| Los casos heredados contemplan la tienda y la falta de red | Se agregaron alternos sin red a UC01, UC07, UC08, UC09 y UC27, y el control de límites del plan a UC09, UC23 y UC24 |
| No hay requisitos del tipo "el sistema deberá" dentro del texto | Se movieron a la lista de requisitos |
