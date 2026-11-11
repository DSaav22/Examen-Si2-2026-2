# 9.4 Implementación y pruebas

El código se escribió a partir del diseño de cada lote. ICONIX organiza las pruebas en dos niveles. Las unitarias verifican controles aislados, como el compilador de SQL seguro o los filtros del catálogo. Las de integración recorren un caso de uso completo contra el sistema en ejecución, con su curso básico y sus alternos.

## 9.4.1 Plan de pruebas

| Aspecto | Definición |
|---|---|
| Objetivo | Demostrar que cada caso de uso cumple su curso básico y sus alternos, y que se cumplen los requisitos no funcionales RNF02 a RNF06 (aislamiento, persistencia offline, integridad, idempotencia y recuperación) |
| Niveles | Unitarias sobre controles aislados; integración por caso de uso contra la API y una base PostgreSQL real; sistema, con recorridos manuales en navegador y en Expo con la red cortada |
| Datos | Semilla de demostración con al menos tres tiendas (Vesta, Aurora Boutique y Andes Moda) bajo una misma cuenta, más tiendas `demo-*` creadas por autoservicio; tarjetas de prueba de la pasarela sandbox |
| Entorno | Backend en el puerto 3000 y web en el 5173, con la base local migrada (`prisma migrate deploy`) y la semilla cargada |
| Escenarios críticos | Dos tiendas con datos parecidos (aislamiento); dos cajas que venden la última unidad sin red; el mismo lote enviado dos veces; un corte de red a mitad del envío; una operación fuera de la ventana offline; pedidos de reporte ambiguos o maliciosos |
| Criterio de aceptación | Todos los chequeos de los cuatro guiones en verde, ninguna lectura con datos de otra tienda, ningún stock o saldo negativo y ninguna operación duplicada |
| Registro | Cada guion imprime el escenario, el resultado esperado y el obtenido; los fallos detienen la ejecución con código distinto de cero |

## 9.4.2 Casos de prueba

Cada caso de prueba nombra el caso de uso y el curso que verifica, la entrada, el resultado esperado y el guion que lo automatiza. Se eligieron los que cubren los requisitos de mayor riesgo.

| Id | Caso de uso (curso) | Entrada | Resultado esperado | Verificación |
|---|---|---|---|---|
| CP01 | UC01 (básico) | Usuario de Vesta lista productos | Solo aparecen productos de Vesta | `verificar:tenancy` |
| CP02 | Transversal (RNF02) | Usuario de una tienda intenta leer o modificar un registro de otra por su id | No lo encuentra y no lo cambia | `verificar:tenancy` |
| CP03 | Transversal (RNF02) | Consulta ejecutada sin tienda en el contexto | Error; la extensión falla cerrada y no devuelve datos | `verificar:tenancy` |
| CP04 | UC37 (2b) | Cuenta nueva sin verificar intenta suscribirse | Se rechaza hasta abrir el enlace de verificación | `verificar:saas` |
| CP05 | UC38 (3a) | Pago con la tarjeta de prueba de rechazo | No se crea la tienda; se puede reintentar | `verificar:saas` |
| CP06 | UC38 (3b) | Dos pedidos de pago con la misma clave de idempotencia | Un solo cobro y una sola tienda | `verificar:saas` |
| CP07 | UC23 (3a) | Alta de un usuario por encima del límite del plan | Rechazo con el límite del plan | `verificar:saas` |
| CP08 | UC40 (básico) | La misma cuenta cambia de Vesta a Aurora Boutique | Token nuevo; solo ve datos de la tienda elegida | `verificar:saas` |
| CP09 | UC42 (básico) | Venta en efectivo con la red cortada y recarga del navegador | La venta sigue en la cola como pendiente | Recorrido manual; `verificar:offline` |
| CP10 | UC42 (1a) | Venta con QR sin red | No se permite y se explica el motivo | `verificar:offline` |
| CP11 | UC44 (2a) | El mismo lote enviado dos veces | La segunda respuesta es repetida; no hay ventas duplicadas | `verificar:offline` |
| CP12 | UC44 (3b) y UC45 | Dos cajas venden sin red la última unidad y sincronizan | Una venta aplicada y otra en conflicto; el stock queda en cero, no negativo | `verificar:offline` |
| CP13 | UC42 (4a) | Operación creada antes de la ventana offline de siete días | Llega como vencida | `verificar:offline` |
| CP14 | UC44 (transversal RNF04) | Falla dentro de la transacción de una operación | Rollback completo; nada parcial en la base | `verificar:offline` |
| CP15 | UC48 (básico) | Pedido dictado con filtros, agrupación y orden | Reporte correcto con SQL parametrizado | `verificar:reportes` |
| CP16 | UC48 (alterno) | Pedido con texto que intenta inyectar SQL | Se rechaza o se trata como texto; no se ejecuta nada extra | `verificar:reportes` |
| CP17 | UC49 (básico) | Exportar el reporte a Excel y a PDF | Se descargan los dos archivos con los mismos datos | `verificar:reportes` |
| CP18 | UC51 (3b) | Dos abonos simultáneos por el saldo total | Uno pasa y el otro se rechaza; el saldo no queda negativo | `verificar:reportes` |
| CP19 | UC07 (básico, concurrencia) | Ventas concurrentes sobre el mismo stock | Nunca se vende más de lo disponible | `ventas.spike-b.spec.ts` |

## 9.4.3 Pruebas de integración

Los scripts de verificación del backend se ejecutan contra la API levantada y una base real. Cada chequeo nombra un escenario de un caso de uso y verifica su poscondición.

| Script | Casos de uso que verifica | Escenarios |
|---|---|---|
| `npm run verificar:tenancy` | UC01, UC10, UC15, UC19 | Lecturas filtradas por tienda, fallo sin tienda en contexto, registros ajenos invisibles e inmodificables |
| `npm run verificar:saas` | UC14, UC23, UC24, UC36 a UC41 | 15 chequeos: verificación de correo, pago rechazado y aprobado, reintento sin doble cobro, catálogos aislados, límites del plan, cambio de tienda, suscripción vencida y métricas |
| `npm run verificar:offline` | UC05 a UC07, UC09, UC35, UC42 a UC46 | 14 chequeos: uuid del dispositivo, última unidad en dos cajas, reversión, reenvío sin duplicados, envíos simultáneos, pago QR sin red rechazado y ventana de siete días |
| `npm run verificar:reportes` | UC33, UC48 a UC51 | 24 chequeos: pedidos dictados complejos, agrupación y orden, parámetros separados del SQL, inyección, aislamiento, Excel y PDF, crédito y abonos repetidos o simultáneos |

## 9.4.4 Pruebas unitarias

| Prueba | Control que verifica |
|---|---|
| `catalogo.service.spec.ts` | Filtrar productos y obtener producto (UC01, UC02, UC09) |
| `ventas.spike-b.spec.ts` | Descontar stock condicional con ventas concurrentes (UC05, UC07) |
| `sql-seguro.spec.ts` | Validar consulta y fijar tienda (UC10) |
| `ficha.spec.ts` | Armar contexto de la ficha y respuesta por reglas (UC04) |

## 9.4.5 Matriz de trazabilidad

La matriz une cada caso con sus requisitos, la ruta que lo atiende, la clase y la operación que lo realizan y la prueba que lo verifica. Se lee en ambos sentidos: desde un requisito hasta su prueba, o desde una clase hasta el caso que la justifica.

| Caso | Requisitos | Ruta | Realizado por | Prueba |
|---|---|---|---|---|
| UC01 Consultar catálogo | B1 | `GET /catalogo/productos` | CatalogoService.listarProductos | catalogo.service.spec.ts (filtros) y verificar:tenancy (catálogo aislado por tienda). |
| UC02 Ver ficha y variantes | B1 | `GET /catalogo/productos/:id` | CatalogoService.obtenerProducto | catalogo.service.spec.ts. |
| UC03 Usar el probador virtual | B1 | `GET /catalogo/variantes/:id/overlay` | CatalogoService.overlay | Prueba manual guiada: con cámara, sin permiso de cámara y con foto. |
| UC04 Consultar la ficha con el asistente | B1 | `POST /ia/ficha` | IaService.ficha | ficha.spec.ts y prueba manual con y sin clave de Azure OpenAI. |
| UC05 Comprar en línea | B1, O5, O6 | `POST /ventas` | VentasService.cobrar | verificar:offline (uuid duplicado y conflicto de última unidad). |
| UC06 Abrir caja | B1, O6 | `POST /caja/abrir` | CajaService.abrir | verificar:offline (apertura idempotente). |
| UC07 Registrar venta en el punto de venta | B1, O5, O6, O7 | `POST /ventas` | VentasService.cobrar | ventas.spike-b.spec.ts y verificar:offline (venta, duplicado y conflicto). |
| UC08 Cerrar caja | B1, O1 | `POST /caja/cerrar` | CajaService.cerrar | Prueba manual de arqueo; bloqueo con cola pendiente en la web. |
| UC09 Administrar catálogo | B1, O1 | `POST /catalogo/productos` | CatalogoService.crearProducto | catalogo.service.spec.ts y verificar:offline (alta de producto offline). |
| UC10 Pedir reporte predefinido | B1, S1 | `GET /reportes/negocio` | ReportesService.negocio | sql-seguro.spec.ts y verificar:tenancy. |
| UC11 Reservar una prenda | B1 | `POST /reservas` | ReservasService.crear | Prueba manual: reservar con y sin disponible. |
| UC12 Atender reservas | B1 | `PATCH /reservas/:id/estado` | ReservasService.cambiarEstado | Prueba manual de completar y cancelar. |
| UC13 Ingresar mercadería | B1 | `POST /inventario/ingreso` | InventarioService.ingresoProveedor | Prueba manual con producto propio y ajeno. |
| UC14 Registrarse como clienta | B1, S7 | `POST /auth/registro` | AuthService.registro | verificar:saas (cuenta global y membresías). |
| UC15 Iniciar y cerrar sesión | B1, S1 | `POST /auth/login` | AuthService.login | verificar:tenancy (token de una tienda no sirve en otra). |
| UC16 Cambiar clave | B1 | `POST /auth/cambiar-clave` | AuthService.cambiarClave | Prueba manual con clave correcta e incorrecta. |
| UC17 Gestionar favoritos | B1 | `POST /cliente/favoritos/:productoId` | ClienteController.guardar | Prueba manual. |
| UC18 Gestionar perfil y direcciones | B1 | `POST /cliente/direcciones` | ClienteController.direccion | Prueba manual. |
| UC19 Ver historial de compras | B1, S1 | `GET /ventas/historial` | VentasService.historialClienta | verificar:tenancy. |
| UC20 Opinar un producto | B1 | `POST /catalogo/productos/:id/opiniones` | CatalogoController.crearOpinion | Prueba manual. |
| UC21 Pedir alerta de producto | B1 | `POST /catalogo/productos/:id/alertas` | CatalogoController.alertar | Prueba manual. |
| UC22 Aplicar cupón | B1 | `POST /ventas` | VentasService.cobrar | Prueba manual con cupón válido, vencido y agotado. |
| UC23 Gestionar usuarios | B1, S3 | `POST /usuarios` | UsuariosController.crear | verificar:saas (límites del plan). |
| UC24 Gestionar sucursales, temporadas y colecciones | B1, S3 | `POST /sucursales` | MetaController.crearSucursal | verificar:saas. |
| UC25 Ajustar inventario y ver el kardex | B1, O6 | `POST /inventario/ajuste` | InventarioService.ajustar | Prueba manual de ajuste y rechazo. |
| UC26 Moderar opiniones y ver auditoría | B1 | `PATCH /admin/opiniones/:id/moderacion` | AdminController.moderarOpinion | Prueba manual. |
| UC27 Simular un pago | B1, O8 | `POST /pagos/:id/simular` | PagosController.simular | Prueba manual de aprobación y rechazo. |
| UC28 Usar el probador 3D | B1 | `GET /catalogo/variantes/:id/overlay` | CatalogoService.overlay | Prueba manual en web y móvil. |
| UC29 Hablar con el bot | B1 | `POST /ia/bot` | IaService.bot | Prueba manual con y sin modelo. |
| UC30 Aplicar precio mayorista | B1 | `POST /ventas` | VentasService.cobrar | Prueba manual por encima y por debajo del mínimo. |
| UC31 Transferir stock entre almacenes | B1, O7 | `POST /inventario/transferencias` | InventarioService.transferir | Prueba manual; la suma total no cambia. |
| UC32 Despachar un pedido | B1 | `POST /pedidos/:id/despachar` | PedidosController.despachar | Prueba manual. |
| UC33 Devolver una venta | B1, R2 | `POST /devoluciones` | DevolucionesController.crear | verificar:reportes (devolución de venta al crédito). |
| UC34 Emitir comprobante simulado | B1 | `POST /ventas/:id/enviar-factura` | NotificacionesService.enviarFacturaVenta | Prueba manual. |
| UC35 Instalar la tienda como PWA | O1, O10 | Cliente | Lógica del cliente (web y móvil) | verificar:offline y prueba en el navegador sin red. |
| UC36 Registrar cuenta en la plataforma | S2, S3, S4 | `POST /plataforma/registro` | PlataformaService.registrar | verificar:saas (registro). |
| UC37 Verificar correo | S6 | `POST /plataforma/verificar` | PlataformaService.verificar | verificar:saas (sin verificar no suscribe). |
| UC38 Suscribirse y crear tienda | S3, S4, S5, O6 | `POST /plataforma/suscribir` | PlataformaService.suscribir | verificar:saas (pago rechazado, aprobado e idempotente). |
| UC39 Renovar o cambiar de plan | S3, S4 | `POST /plataforma/tiendas/:id/renovar` | PlataformaService.renovar | verificar:saas (renovación). |
| UC40 Cambiar de tienda | S7 | `POST /auth/cambiar-tienda` | AuthService.cambiarTienda | verificar:saas (una cuenta, varias tiendas). |
| UC41 Ver métricas de suscripciones | S9 | `GET /plataforma/admin/metricas` | PlataformaService.metricas | verificar:saas (métricas). |
| UC42 Vender sin conexión | O1, O2, O4, O8, O9 | Cliente | Lógica del cliente (web y móvil) | verificar:offline y recorrido en navegador y Expo sin red. |
| UC43 Registrar clienta o producto sin conexión | O1, O2, O4 | Cliente | Lógica del cliente (web y móvil) | verificar:offline (clienta y producto offline). |
| UC44 Sincronizar operaciones pendientes | O3, O4, O6, O7 | `POST /sync/lote` | SyncService.lote | verificar:offline (lote, duplicado, vencida y rollback). |
| UC45 Resolver conflicto de stock | O5 | `POST /sync/operaciones/:id/descartar` | SyncService.descartar | verificar:offline (conflicto de la última unidad). |
| UC46 Configurar ventana offline | O8, O9 | `PATCH /sync/politica` | SyncService.fijarVentana | verificar:offline (operación vencida). |
| UC47 Activar notificaciones push | O10 | `POST /push/suscribir` | PushService.suscribir | Prueba en el navegador con /push/probar. |
| UC48 Generar reporte por texto o voz | R1, R2, S1 | `POST /reportes/inteligente` | ReportesInteligentesService.generar | verificar:reportes (intérprete, compilador, aislamiento e inyección). |
| UC49 Ajustar y exportar reporte | R2, R3 | `POST /reportes/inteligente/exportar` | ReportesInteligentesService.exportar | verificar:reportes (Excel válido y PDF paginado). |
| UC50 Vender al crédito | R2, O8 | `POST /ventas` | VentasService.cobrar | verificar:reportes (venta al crédito y caja sin cambios). |
| UC51 Registrar abono de crédito | R2, O6 | `POST /creditos/:id/abonos` | CreditosController.abonar | verificar:reportes (abonos idempotentes y concurrentes). |
| UC52 Ver dashboard predictivo | A1, A2, A3 | `GET /analitica/panel` | AnaliticaService.panel | verificar-analitica-http.ts: 401 sin sesión, 403 por rol o plan, 200 con plan Cadena y aislamiento por tienda. |
| UC53 Ver segmentación de clientas | A1, A2, A3 | `GET /analitica/panel` | AnaliticaService.panel | analitica.service.spec.ts y verificar-analitica-http.ts: grupos, silueta sintética y tienda sin ventas. |
| UC54 Pagar con pasarela internacional | P1, P2, P3, P4 | `POST /pagos/:id/simular` | PagosController.simular | pagos-pais.spec.ts: métodos por país; reintento con la misma clave devuelve el mismo pago. |

## 9.4.6 Revisión de código y sincronización del modelo

Al cerrar cada lote, el modelo se regeneró desde `casos.py` y se comparó con el código: rutas, nombres de métodos y modelos de Prisma. Las diferencias encontradas se corrigieron en el modelo (por ejemplo, la operación del catálogo es `listarProductos` y el ingreso de mercadería es `ingresoProveedor`), y los módulos sin servicio quedaron registrados como deuda técnica. Como el dominio se lee de `schema.prisma` cada vez, una migración nueva aparece en el modelo sin trabajo manual.
