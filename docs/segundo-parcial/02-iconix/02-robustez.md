# 9.2 Análisis y diseño preliminar

Para cada caso de uso se dibujó su diagrama de robustez con los tres estereotipos de ICONIX: fronteras (pantallas e interfaces externas), controles (funciones lógicas, que son verbos) y entidades (clases del dominio). Las conexiones respetan las reglas del proceso: el actor solo habla con fronteras, las fronteras solo con controles y las entidades solo con controles. Cada entidad de robustez está vinculada por «trace» a su clase del dominio.

Cada diagrama se lee de izquierda a derecha siguiendo el curso básico: actor, pantalla, cadena de controles en el orden del texto y, a la derecha, las entidades que cada control lee o modifica. Cuando un control habla con un sistema externo, la frontera de ese sistema y su actor secundario aparecen en el extremo derecho.

## Lote 0: Casos heredados del primer ciclo, revisados con robustez y secuencia

### Robustez UC01 Consultar catálogo

![Figura 9.2.1: Robustez de UC01 Consultar catálogo](../imagenes/ea/rob-uc01.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Resolver tienda activa | Tienda |
| Filtrar productos | Producto, Categoria y Variante |
| Calcular disponibilidad | StockAlmacen y Sucursal |

### Robustez UC02 Ver ficha y variantes

![Figura 9.2.2: Robustez de UC02 Ver ficha y variantes](../imagenes/ea/rob-uc02.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Obtener producto | Producto y Variante |
| Consultar stock por sucursal | StockAlmacen y Sucursal |

### Robustez UC03 Usar el probador virtual

![Figura 9.2.3: Robustez de UC03 Usar el probador virtual](../imagenes/ea/rob-uc03.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Obtener overlay de la variante | Variante |
| Estimar pose en el dispositivo | Cámara del dispositivo |
| Componer prenda sobre la imagen | Cálculo interno |

### Robustez UC04 Consultar la ficha con el asistente

![Figura 9.2.4: Robustez de UC04 Consultar la ficha con el asistente](../imagenes/ea/rob-uc04.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Armar contexto de la ficha | Producto y Variante |
| Consultar modelo | Interfaz Azure OpenAI |

### Robustez UC05 Comprar en línea

![Figura 9.2.5: Robustez de UC05 Comprar en línea](../imagenes/ea/rob-uc05.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Recalcular precios y cupón | Producto, Variante y Cupon |
| Descontar stock condicional | StockAlmacen |
| Registrar venta | Venta, LineaVenta y MovimientoInventario |
| Crear pedido | Pedido |

### Robustez UC06 Abrir caja

![Figura 9.2.6: Robustez de UC06 Abrir caja](../imagenes/ea/rob-uc06.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar turno existente | CajaTurno |
| Abrir turno | CajaTurno y Sucursal |

### Robustez UC07 Registrar venta en el punto de venta

![Figura 9.2.7: Robustez de UC07 Registrar venta en el punto de venta](../imagenes/ea/rob-uc07.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar turno abierto | CajaTurno |
| Descontar stock condicional | StockAlmacen |
| Registrar venta | Venta, LineaVenta y MovimientoInventario |
| Sumar al turno | CajaTurno |

**Hallazgo de la robustez.** La robustez mostró que el cobro toca cuatro entidades y que el turno de caja debe verificarse antes del stock; el orden de los controladores quedó fijado así en el texto.

### Robustez UC08 Cerrar caja

![Figura 9.2.8: Robustez de UC08 Cerrar caja](../imagenes/ea/rob-uc08.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Calcular arqueo | CajaTurno y Venta |
| Cerrar turno | CajaTurno |

**Hallazgo de la robustez.** Al dibujar el cierre apareció la dependencia con la cola offline: un turno no debe cerrarse con operaciones pendientes. Se agregó el alterno 1a.

### Robustez UC09 Administrar catálogo

![Figura 9.2.9: Robustez de UC09 Administrar catálogo](../imagenes/ea/rob-uc09.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar límites del plan | Tienda y Plan |
| Guardar producto | Producto, Categoria, Temporada y Coleccion |
| Guardar variantes | Variante |

### Robustez UC10 Pedir reporte predefinido

![Figura 9.2.10: Robustez de UC10 Pedir reporte predefinido](../imagenes/ea/rob-uc10.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Fijar tienda en la consulta | Tienda |
| Agregar ventas o stock | Venta, LineaVenta y StockAlmacen |
| Registrar ejecución | ReporteEjecucion |

### Robustez UC11 Reservar una prenda

![Figura 9.2.11: Robustez de UC11 Reservar una prenda](../imagenes/ea/rob-uc11.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Reservar stock | StockAlmacen |
| Crear reserva | Reserva |

### Robustez UC12 Atender reservas

![Figura 9.2.12: Robustez de UC12 Atender reservas](../imagenes/ea/rob-uc12.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Cambiar estado de reserva | Reserva |
| Liberar o vender stock | StockAlmacen, Venta y MovimientoInventario |

### Robustez UC13 Ingresar mercadería

![Figura 9.2.13: Robustez de UC13 Ingresar mercadería](../imagenes/ea/rob-uc13.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar propiedad del producto | Producto y Proveedor |
| Sumar stock | StockAlmacen y MovimientoInventario |

### Robustez UC14 Registrarse como clienta

![Figura 9.2.14: Robustez de UC14 Registrarse como clienta](../imagenes/ea/rob-uc14.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Obtener o crear cuenta | Cuenta |
| Crear membresía clienta | Usuario y Tienda |

### Robustez UC15 Iniciar y cerrar sesión

![Figura 9.2.15: Robustez de UC15 Iniciar y cerrar sesión](../imagenes/ea/rob-uc15.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar credenciales | Cuenta |
| Emitir token | Usuario y Tienda |
| Revocar token | TokenRevocado |

**Hallazgo de la robustez.** El inicio de sesión necesitaba dos entidades distintas: Cuenta (identidad global) y Usuario (membresía en una tienda). El dominio se separó en consecuencia.

### Robustez UC16 Cambiar clave

![Figura 9.2.16: Robustez de UC16 Cambiar clave](../imagenes/ea/rob-uc16.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar clave actual | Cuenta |
| Reemplazar hash | Cuenta |

### Robustez UC17 Gestionar favoritos

![Figura 9.2.17: Robustez de UC17 Gestionar favoritos](../imagenes/ea/rob-uc17.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Guardar o quitar favorito | Favorito y Producto |

### Robustez UC18 Gestionar perfil y direcciones

![Figura 9.2.18: Robustez de UC18 Gestionar perfil y direcciones](../imagenes/ea/rob-uc18.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Guardar dirección | DireccionCliente y Usuario |

### Robustez UC19 Ver historial de compras

![Figura 9.2.19: Robustez de UC19 Ver historial de compras](../imagenes/ea/rob-uc19.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Filtrar ventas por rol | Venta, LineaVenta y Sucursal |

### Robustez UC20 Opinar un producto

![Figura 9.2.20: Robustez de UC20 Opinar un producto](../imagenes/ea/rob-uc20.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Registrar opinión pendiente | Opinion y Producto |

### Robustez UC21 Pedir alerta de producto

![Figura 9.2.21: Robustez de UC21 Pedir alerta de producto](../imagenes/ea/rob-uc21.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Registrar alerta | AlertaProducto |
| Avisar al cumplirse | Notificacion |

### Robustez UC22 Aplicar cupón

![Figura 9.2.22: Robustez de UC22 Aplicar cupón](../imagenes/ea/rob-uc22.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar cupón | Cupon |
| Recalcular total | Venta |

### Robustez UC23 Gestionar usuarios

![Figura 9.2.23: Robustez de UC23 Gestionar usuarios](../imagenes/ea/rob-uc23.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar límite del plan | Plan y Suscripcion |
| Guardar usuario | Usuario y Cuenta |
| Auditar cambio | Auditoria |

**Hallazgo de la robustez.** El alta de usuarios no tenía control de límites. La robustez agregó el control Verificar límite del plan y las entidades Plan y Suscripcion.

### Robustez UC24 Gestionar sucursales, temporadas y colecciones

![Figura 9.2.24: Robustez de UC24 Gestionar sucursales, temporadas y colecciones](../imagenes/ea/rob-uc24.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar límite del plan | Plan |
| Guardar sucursal y almacén | Sucursal y Almacen |
| Guardar temporada o colección | Temporada y Coleccion |

### Robustez UC25 Ajustar inventario y ver el kardex

![Figura 9.2.25: Robustez de UC25 Ajustar inventario y ver el kardex](../imagenes/ea/rob-uc25.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Consultar kardex | MovimientoInventario |
| Ajustar stock | StockAlmacen y MovimientoInventario |

### Robustez UC26 Moderar opiniones y ver auditoría

![Figura 9.2.26: Robustez de UC26 Moderar opiniones y ver auditoría](../imagenes/ea/rob-uc26.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Moderar opinión | Opinion |
| Consultar auditoría | Auditoria |

### Robustez UC27 Simular un pago

![Figura 9.2.27: Robustez de UC27 Simular un pago](../imagenes/ea/rob-uc27.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Crear pago simulado | PagoSimulado |
| Autorizar pago | PagoSimulado y Venta |

### Robustez UC28 Usar el probador 3D

![Figura 9.2.28: Robustez de UC28 Usar el probador 3D](../imagenes/ea/rob-uc28.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Cargar modelo 3D | Variante |
| Ajustar al torso | Cálculo interno |

### Robustez UC29 Hablar con el bot

![Figura 9.2.29: Robustez de UC29 Hablar con el bot](../imagenes/ea/rob-uc29.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Armar contexto de la clienta | Producto, StockAlmacen y Venta |
| Consultar modelo | Interfaz Azure OpenAI |

### Robustez UC30 Aplicar precio mayorista

![Figura 9.2.30: Robustez de UC30 Aplicar precio mayorista](../imagenes/ea/rob-uc30.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Guardar precio mayorista | Producto |
| Calcular precio por cantidad | Producto, Usuario y LineaVenta |

### Robustez UC31 Transferir stock entre almacenes

![Figura 9.2.31: Robustez de UC31 Transferir stock entre almacenes](../imagenes/ea/rob-uc31.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Restar en origen | StockAlmacen |
| Sumar en destino | StockAlmacen |
| Registrar movimientos | MovimientoInventario |

### Robustez UC32 Despachar un pedido

![Figura 9.2.32: Robustez de UC32 Despachar un pedido](../imagenes/ea/rob-uc32.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Listar pendientes | Pedido y Venta |
| Marcar enviado | Pedido y Notificacion |

### Robustez UC33 Devolver una venta

![Figura 9.2.33: Robustez de UC33 Devolver una venta](../imagenes/ea/rob-uc33.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar cantidades | LineaVenta |
| Reponer stock | StockAlmacen y MovimientoInventario |
| Registrar devolución | Devolucion, CajaTurno y CuentaCobrar |

**Hallazgo de la robustez.** Al conectar la devolución con las entidades apareció CuentaCobrar: devolver una venta al crédito debe reducir la deuda y no sacar efectivo de la caja.

### Robustez UC34 Emitir comprobante simulado

![Figura 9.2.34: Robustez de UC34 Emitir comprobante simulado](../imagenes/ea/rob-uc34.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Armar comprobante | Venta, LineaVenta y Sucursal |
| Enviar por correo | Notificacion |

### Robustez UC35 Instalar la tienda como PWA

![Figura 9.2.35: Robustez de UC35 Instalar la tienda como PWA](../imagenes/ea/rob-uc35.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Registrar service worker | Service Worker |
| Guardar caché | Cálculo interno |

## Lote 1: SaaS multi-tienda

### Robustez UC36 Registrar cuenta en la plataforma

![Figura 9.2.36: Robustez de UC36 Registrar cuenta en la plataforma](../imagenes/ea/rob-uc36.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Listar planes | Plan |
| Crear cuenta | Cuenta |
| Enviar verificación | Cuenta |

### Robustez UC37 Verificar correo

![Figura 9.2.37: Robustez de UC37 Verificar correo](../imagenes/ea/rob-uc37.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar token | Cuenta |
| Marcar verificada | Cuenta |

### Robustez UC38 Suscribirse y crear tienda

![Figura 9.2.38: Robustez de UC38 Suscribirse y crear tienda](../imagenes/ea/rob-uc38.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar slug | Tienda |
| Cobrar suscripción | Interfaz pasarela y PagoSuscripcion |
| Aprovisionar tienda | Tienda, Suscripcion, Sucursal, Almacen y Usuario |

**Hallazgo de la robustez.** El pago y la creación de la tienda debían ser una sola unidad. La robustez separó Cobrar suscripción de Aprovisionar tienda para que el segundo solo ocurra con el pago aprobado.

### Robustez UC39 Renovar o cambiar de plan

![Figura 9.2.39: Robustez de UC39 Renovar o cambiar de plan](../imagenes/ea/rob-uc39.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Calcular uso y vencimiento | Suscripcion, Usuario y Sucursal |
| Cobrar renovación | Interfaz pasarela y PagoSuscripcion |
| Extender suscripción | Suscripcion y Plan |

### Robustez UC40 Cambiar de tienda

![Figura 9.2.40: Robustez de UC40 Cambiar de tienda](../imagenes/ea/rob-uc40.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Listar tiendas de la cuenta | Cuenta, Usuario y Tienda |
| Emitir token de tienda | Usuario y Tienda |

### Robustez UC41 Ver métricas de suscripciones

![Figura 9.2.41: Robustez de UC41 Ver métricas de suscripciones](../imagenes/ea/rob-uc41.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Calcular métricas | Suscripcion, PagoSuscripcion y Plan |
| Proyectar ingresos | Suscripcion |

## Lote 2: Operación sin conexión y sincronización

### Robustez UC42 Vender sin conexión

![Figura 9.2.42: Robustez de UC42 Vender sin conexión](../imagenes/ea/rob-uc42.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Validar política offline | Tienda |
| Generar uuid | Cálculo interno |
| Encolar operación | Cola local |

**Hallazgo de la robustez.** La venta sin red no llega al servidor: sus controladores viven en el cliente (los módulos red, cola y caché de la PWA) y la frontera es la Cola local, no la API.

### Robustez UC43 Registrar clienta o producto sin conexión

![Figura 9.2.43: Robustez de UC43 Registrar clienta o producto sin conexión](../imagenes/ea/rob-uc43.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Generar uuid | Cálculo interno |
| Encolar operación | Cola local |

### Robustez UC44 Sincronizar operaciones pendientes

![Figura 9.2.44: Robustez de UC44 Sincronizar operaciones pendientes](../imagenes/ea/rob-uc44.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Registrar dispositivo | Dispositivo |
| Verificar duplicado | OperacionSync |
| Aplicar operación | Venta, StockAlmacen, Usuario y Producto |
| Guardar estado | OperacionSync |

**Hallazgo de la robustez.** El control Verificar duplicado necesitaba una entidad propia para recordar qué uuid ya se aplicó; así nació OperacionSync.

### Robustez UC45 Resolver conflicto de stock

![Figura 9.2.45: Robustez de UC45 Resolver conflicto de stock](../imagenes/ea/rob-uc45.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Consultar conflictos | OperacionSync |
| Reintentar con disponible | StockAlmacen y Venta |
| Descartar operación | OperacionSync |

### Robustez UC46 Configurar ventana offline

![Figura 9.2.46: Robustez de UC46 Configurar ventana offline](../imagenes/ea/rob-uc46.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Consultar política | Tienda |
| Fijar ventana | Tienda |

### Robustez UC47 Activar notificaciones push

![Figura 9.2.47: Robustez de UC47 Activar notificaciones push](../imagenes/ea/rob-uc47.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Obtener clave VAPID | Cálculo interno |
| Guardar suscripción | PushSuscripcion |
| Enviar aviso | PushSuscripcion y Notificacion |

## Lote 3: Reportes generativos y ventas al crédito

### Robustez UC48 Generar reporte por texto o voz

![Figura 9.2.48: Robustez de UC48 Generar reporte por texto o voz](../imagenes/ea/rob-uc48.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Interpretar pedido | Interfaz Azure OpenAI |
| Validar especificación | ReporteEjecucion |
| Compilar SQL parametrizado | Cálculo interno |
| Ejecutar aislado por tienda | Venta, Usuario, CuentaCobrar y StockAlmacen |
| Registrar ejecución | ReporteEjecucion |

**Hallazgo de la robustez.** La robustez separó interpretar (IA o reglas), validar y compilar. Solo el compilador produce SQL, y lo hace desde una especificación validada.

### Robustez UC49 Ajustar y exportar reporte

![Figura 9.2.49: Robustez de UC49 Ajustar y exportar reporte](../imagenes/ea/rob-uc49.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Ejecutar especificación editada | ReporteEjecucion |
| Generar archivo | Archivo PDF o Excel |

### Robustez UC50 Vender al crédito

![Figura 9.2.50: Robustez de UC50 Vender al crédito](../imagenes/ea/rob-uc50.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Verificar clienta | Usuario |
| Descontar stock condicional | StockAlmacen |
| Registrar venta | Venta y LineaVenta |
| Abrir cuenta por cobrar | CuentaCobrar |

### Robustez UC51 Registrar abono de crédito

![Figura 9.2.51: Robustez de UC51 Registrar abono de crédito](../imagenes/ea/rob-uc51.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Descontar saldo condicional | CuentaCobrar |
| Registrar abono | AbonoCredito |
| Sumar a caja | CajaTurno |

**Hallazgo de la robustez.** Descontar el saldo debía ser condicional para que dos abonos simultáneos no lo dejen negativo; el control lleva ese nombre a propósito.

## Lote 4: Analítica con aprendizaje automático

### Robustez UC52 Ver dashboard predictivo

![Figura 9.2.52: Robustez de UC52 Ver dashboard predictivo](../imagenes/ea/rob-uc52.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Obtener predicción | ModeloPredictivo y Venta |
| Calcular métricas | ModeloPredictivo |

### Robustez UC53 Ver segmentación de clientas

![Figura 9.2.53: Robustez de UC53 Ver segmentación de clientas](../imagenes/ea/rob-uc53.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Agrupar clientas | SegmentoCliente, Venta y EventoAnalitica |

## Lote 5: Pagos para países hispanohablantes

### Robustez UC54 Pagar con pasarela internacional

![Figura 9.2.54: Robustez de UC54 Pagar con pasarela internacional](../imagenes/ea/rob-uc54.png)

| Control | Entidades o fronteras que usa |
|---|---|
| Crear transacción | TransaccionPasarela y Interfaz pasarela |
| Confirmar pago | TransaccionPasarela y Venta |

## 9.2.1 Revisión de diseño preliminar (PDR)

La PDR aplicó la prueba del resaltador: se recorrió cada frase del curso básico y de los alternos y se marcó el elemento del diagrama que la realiza, hasta que no quedó texto sin objeto ni objeto sin texto.

| Verificación | Resultado |
|---|---|
| Cada caso tiene diagrama de robustez | Sí, 54 diagramas |
| Número de controles por caso dentro de lo recomendado (2 a 5) | Sí; el máximo es 5 (UC48) |
| Ninguna frontera habla con una entidad | Sí; se verificó al generar el modelo |
| Todas las entidades existen en el dominio | Sí; las de los lotes 4 y 5 están marcadas como previstas |
| Los hallazgos se corrigieron en el texto y en el dominio | Sí; ver los hallazgos de cada caso |
| No hay detalle de diseño prematuro (tablas, SQL, frameworks) | Sí; los nombres de tablas y métodos aparecen recién en la secuencia |
