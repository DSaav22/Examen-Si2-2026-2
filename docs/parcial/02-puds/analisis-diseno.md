# 3.2 Flujo de trabajo: análisis

Este apartado documenta el análisis de **EnsayAR**, monolito modular NestJS con clientes React y React Native (Expo), persistencia PostgreSQL/Prisma y despliegue en Azure. Se siguen las disciplinas de análisis del Proceso Unificado sobre el baseline de Elaboración (UC03, UC07, UC10, UC11 y los casos de pago y experiencia extendida).

## 3.2.1 Análisis de arquitectura

EnsayAR se organiza como un único proceso de servidor NestJS dividido en paquetes de dominio. Los clientes no poseen stock autoritativo: toda mutación de inventario, venta y reserva ocurre en el servidor. El video del probador permanece en el dispositivo; la API solo entrega overlays y datos de catálogo.

### 3.2.1.1 Identificar paquetes

Los paquetes de análisis agrupan responsabilidades cohesivas: autenticación, catálogo comercial, inventario físico, ventas y caja, reservas, cobros simulados, experiencia de probador y bot, reportes de solo lectura, proveedores, experiencia de clienta y administración.

**Diagrama de paquetes**

> Espacio para el diagrama.

| Paquete | Responsabilidad breve |
|---------|------------------------|
| Auth | Registro, sesión y cambio de clave. |
| Catálogo | Productos, variantes, fichas, sucursales/colecciones y precio mayorista. |
| Inventario | Ajustes, transferencias y saldos por almacén. |
| Ventas | Compra en línea, POS, historial, cupones, despacho y devoluciones. |
| Caja | Apertura y cierre de turno. |
| Reservas | Apartar prendas y atender reservas. |
| Pagos | Pago simulado y comprobante con NIT de prueba. |
| Probador | Overlay 2D y avance 3D en el dispositivo. |
| Bot | Consulta de ficha y asistencia conversacional. |
| Reportes | Preguntas fijas y libres sobre la vista permitida. |
| Proveedores | Ingreso de mercadería del proveedor. |
| Cliente | Favoritos, perfil, opiniones, alertas y PWA. |
| Administración | Usuarios, roles, moderación y auditoría. |

### 3.2.1.2 Relación de paquetes y casos de uso

Cada caso de uso UC01–UC35 se encapsula en un paquete de análisis. La tabla fija la realización; Construcción implementa estos límites como módulos NestJS.

| Paquete | Casos de uso |
|---------|--------------|
| Auth | UC14, UC15, UC16 |
| Catálogo | UC01, UC02, UC09, UC24, UC30 |
| Inventario | UC25, UC31 |
| Ventas | UC05, UC07, UC19, UC22, UC32, UC33 |
| Caja | UC06, UC08 |
| Reservas | UC11, UC12 |
| Pagos | UC27, UC34 |
| Probador | UC03, UC28 |
| Bot | UC04, UC29 |
| Reportes | UC10 |
| Proveedores | UC13 |
| Cliente | UC17, UC18, UC20, UC21, UC35 |
| Administración | UC23, UC26 |

### 3.2.1.3 Vista de paquete

Cada paquete expone una interfaz estrecha hacia el resto del sistema y oculta su diseño interno. **Ventas** no conoce cómo **Inventario** indexa filas de stock: solo solicita descontar o consultar disponible. **Pagos** recibe un importe y un identificador de cobro y responde aprobado o rechazado, sin alterar el catálogo. **Probador** no escribe en base de datos de negocio: pide la imagen de overlay y renderiza en el cliente. **Reportes** solo lee la vista autorizada. Esta encapsulación permite evolucionar un módulo sin romper los contratos de los demás.

**Vista de paquete (encapsulación)**

> Espacio para el diagrama.

## 3.2.2 Analizar un caso de uso

Se analizan las colaboraciones que cargan la arquitectura. Los diagramas de comunicación muestran actor, frontera (cliente React o Expo), controladores de aplicación y entidades o servicios de dominio.

### 3.2.2.1 Diagrama de comunicación

## CICLO #1

**UC07 — Registrar venta en POS.** Participan: Cajero, POS (React), API NestJS (Ventas/Caja), pasarela simulada si el medio es QR, y StockAlmacén/Venta en PostgreSQL. Mensajes clave: armar líneas y consultar disponible; cobrar con identificador único; bloquear filas de stock; descontar; persistir venta y movimiento; devolver ticket. Si el mismo uuid llega dos veces, se responde la venta ya cobrada sin descontar de nuevo.

**Diagrama de comunicación — UC07 Venta POS**

> Espacio para el diagrama.

**UC03 — Usar el probador virtual.** Participan: Clienta, app Expo/React, API (Catálogo/Probador) y estimador local de pose. Mensajes: pedir overlay de la variante; recibir URL de imagen, talla y color; estimar anclaje en el dispositivo; dibujar overlay. El video no sale del teléfono; no hay reserva ni venta.

**Diagrama de comunicación — UC03 Probador**

> Espacio para el diagrama.

## CICLO #2

**UC10 — Pedir un reporte.** Participan: Administrador, web React, compilador/validador en Reportes y PostgreSQL. Mensajes: enviar pregunta; compilar `SELECT`; validar (una sentencia, solo `v_reporte_ventas`, con `LIMIT`); ejecutar lectura; devolver filas y SQL. Si falla la validación, no hay consulta.

**Diagrama de comunicación — UC10 Reporte**

> Espacio para el diagrama.

**UC11 — Reservar una prenda.** Participan: Clienta, cliente web/móvil, API Reservas e Inventario. Mensajes: confirmar reserva de variante y sucursal; comprobar disponible (`cantidad − reservado`); subir `reservado` en transacción; crear Reserva y LíneaReserva. La cantidad física no baja hasta completar (UC12).

**Diagrama de comunicación — UC11 Reserva**

> Espacio para el diagrama.

## CICLO #3

**UC27 — Simular un pago.** Participan: Cajero o Clienta, cliente, módulo Pagos y, si aplica, Stripe en modo prueba. Mensajes: iniciar cobro con importe e idempotencia; respuesta aprobado/rechazado; registrar PagoSimulado. No hay liquidación real.

**Diagrama de comunicación — UC27 Pago simulado**

> Espacio para el diagrama.

**UC28 — Probador 3D / UC29 — Hablar con el bot.** En UC28 los participantes son Clienta, cliente Expo y API de overlay/modelo 3D liviano: el render ocurre en el dispositivo; no se sube video. En UC29: Clienta, cliente, Bot y Catálogo: la pregunta se responde con datos ya cargados de ficha o asistencia acotada, sin mutar stock.

**Diagrama de comunicación — UC28 Probador 3D / UC29 Bot**

> Espacio para el diagrama.

## 3.2.3 Análisis de clases

Las clases de análisis representan conceptos del dominio. El stock no vive en Producto: reside en StockAlmacén por variante y almacén. Regla transversal: `disponible = cantidad − reservado`.

## CICLO #1

Clases principales: **Usuario**, **CajaTurno**, **Venta**, **LineaVenta**, **Producto**, **Variante**, **Sucursal**, **Almacen**, **StockAlmacen**, **MovimientoInventario**, **PagoSimulado**. La venta POS exige CajaTurno abierto; cada LineaVenta referencia una Variante y descuenta un StockAlmacen. Para el probador (UC03): **Variante** aporta la imagen de overlay; no aparecen clases de persistencia de video.

**Diagrama de clases de análisis — Ciclo 1**

> Espacio para el diagrama.

## CICLO #2

Clases principales: **ReporteEjecucion**, vista lógica **v_reporte_ventas** (proyección de Venta/LineaVenta/Sucursal/Usuario), **Reserva**, **LineaReserva**, **StockAlmacen**, **Clienta** (Usuario con rol). ReporteEjecucion guarda pregunta, SQL aceptado y filas; no altera ventas. Reserva eleva el reservado sin bajar la cantidad física.

**Diagrama de clases de análisis — Ciclo 2**

> Espacio para el diagrama.

## CICLO #3

Clases principales: **PagoSimulado**, **ComprobanteSimulado**, **Venta**, y para la experiencia extendida **Variante** (asset 3D u overlay) y entidades de asistencia del **Bot** (consulta sobre ficha, sin stock). ComprobanteSimulado lleva NIT de prueba, no fiscal real.

**Diagrama de clases de análisis — Ciclo 3**

> Espacio para el diagrama.

## 3.2.4 Análisis de paquetes

Dependencias relevantes entre paquetes:

- **Ventas** depende de **Inventario** (consulta y descuento de disponible) y de **Pagos** (cobro simulado al cerrar la venta).
- **Caja** alimenta el contexto de **Ventas** en canal POS (turno abierto), pero no conoce el detalle del catálogo.
- **Reservas** depende de **Inventario** para subir o liberar `reservado`.
- **Probador** depende de **Catálogo** solo para obtener overlays; no persiste el video ni toca inventario.
- **Reportes** no escribe en Ventas ni Inventario: solo lee la vista permitida.
- **Bot** consulta **Catálogo**; no muta stock.
- **Proveedores** genera movimientos que **Inventario** consolida en saldos.
- **Administración** y **Auth** cruzan a los demás paquetes como infraestructura de identidad y gobierno, sin reglas de cobro.

---

# 3.3 Flujo de trabajo: diseño

El diseño traduce el análisis al stack del parcial: presentación React / Expo, aplicación y dominio en NestJS, datos con Prisma sobre PostgreSQL, y hospedaje en Azure.

## 3.3.1 Diseño de arquitectura

El despliegue separa clientes, API y base de datos. El navegador sirve la tienda, el POS y la administración (React). La app móvil (Expo) cubre catálogo, probador y flujos de clienta. La API NestJS es el único punto que muta negocio. PostgreSQL almacena el estado; Azure hospeda API, base y activos estáticos según el entorno académico.

**Diagrama de despliegue**

> Espacio para el diagrama.

### 3.3.1.2 Diseño lógico (diagrama organizado en capas)

| Capa | Contenido | Tecnología |
|------|-----------|------------|
| Presentación | Tienda, POS, reportes, administración; app móvil y PWA | React, React Native (Expo) |
| Aplicación | Controladores HTTP, guards de rol, DTOs | NestJS |
| Dominio | Cobrar venta, apartar stock, validar reporte, simular pago | Servicios NestJS por módulo |
| Datos | Esquema relacional, migraciones, vista de reportes | Prisma, PostgreSQL |

**Diagrama lógico en capas**

> Espacio para el diagrama.

## 3.3.2 Diseño de datos

### 3.3.2.1 Diseño de datos lógico

**Diagrama de clases**

> Espacio para el diagrama.

**Mapeo y normalización.** Producto describe la ficha comercial (nombre, ocasión, precio base). Variante separa talla y color —y SKU, foto y overlay— porque una misma prenda se vende en muchas combinaciones sin duplicar la ficha. StockAlmacen guarda cantidad y reservado por cada par variante–almacén: el saldo físico no es atributo del producto. Así se evita repetir grupos de tallas/colores en una sola fila (1FN), los atributos de línea dependen de la clave completa de la línea o del stock (2FN), y datos del producto no viajan transitivamente en cada movimiento (3FN): la línea de venta guarda el precio aplicado en el momento, no reescribe el catálogo.

### 3.3.2.2 Diseño de datos físico

**Tabla de volumen (estimación académica para una cadena de demostración; no es medición de producción):**

| Entidad / tabla | Filas estimadas | Notas |
|-----------------|-----------------|-------|
| usuarios | 40–80 | Roles: clientas, cajeros, encargados, admin |
| sucursales / almacenes | 3–6 / 3–8 | Cadena de demostración |
| productos | 80–150 | Catálogo femenino demo |
| variantes | 300–600 | Varias tallas y colores por producto |
| stock_almacen | 400–800 | Una fila por variante y almacén con stock |
| ventas / lineas_venta | 2 000–5 000 / 6 000–15 000 | Histórico de demo |
| reservas / lineas_reserva | 200–500 | Apartados vigentes e históricos |
| movimientos_inventario | 3 000–8 000 | Ventas, ingresos, ajustes, transferencias |
| pagos_simulados / comprobantes | cientos | Cobros y NIT de prueba |
| reporte_ejecucion | decenas–cientos | Trazas de UC10 |

**Script.** El esquema físico lo generan las migraciones de **Prisma** a partir del modelo; no se mantiene un script SQL monolítico a mano. Tablas clave: `usuario`, `sucursal`, `almacen`, `producto`, `variante`, `stock_almacen`, `caja_turno`, `venta`, `linea_venta`, `reserva`, `linea_reserva`, `movimiento_inventario`, `pago_simulado`, `comprobante_simulado`, `reporte_ejecucion`, más la vista `v_reporte_ventas`.

**Diagrama relacional**

> Espacio para el diagrama.

**Actualización de tuplas.** Al cobrar una venta, en la misma transacción baja `cantidad` de cada `stock_almacen` afectado y se insertan `venta`, `linea_venta` y el movimiento; el turno acumula el total. Al reservar, sube `reservado` y se crean reserva y líneas; la cantidad física no cambia. En ambos casos `disponible = cantidad − reservado`. Completar una reserva descuenta cantidad, libera reservado y genera la venta correspondiente en una sola transacción.

**Consultas.** Ejemplo 1 — listar catálogo con disponible en un almacén: unir producto, variante y stock, proyectando `cantidad - reservado`. Ejemplo 2 — ventas del día por sucursal: filtrar ventas por fecha y agrupar por sucursal.

```sql
SELECT v.sku, p.nombre, v.talla, v.color,
       (s.cantidad - s.reservado) AS disponible
FROM variante v
JOIN producto p ON p.id = v.producto_id
JOIN stock_almacen s ON s.variante_id = v.id
WHERE s.almacen_id = $1
ORDER BY p.nombre, v.talla, v.color;
```

```sql
SELECT su.nombre AS sucursal, COUNT(*) AS ventas, SUM(ve.total) AS monto
FROM venta ve
JOIN sucursal su ON su.id = ve.sucursal_id
WHERE ve.creada_en::date = CURRENT_DATE
  AND ve.estado = 'cobrada'
GROUP BY su.nombre
ORDER BY monto DESC;
```

**Procedimientos almacenados.** La regla de cobrar no depende de un procedure de PostgreSQL como mecanismo único. Vive en la transacción de la API NestJS: `SELECT … FOR UPDATE` sobre la fila de stock, recálculo del disponible, descuento, inserción de venta y commit; la idempotencia se garantiza con el uuid de cobro. Un procedure sería opcional y redundante frente a ese contrato.

**Triggers.** La integridad de no dejar cantidad negativa se controla en la transacción de aplicación (bloqueo de fila y validación antes del update). Si el esquema incluye un trigger de apoyo (`CHECK` o rechazo de update inválido), refuerza el modelo físico; no sustituye la regla de negocio del cobro.

### 3.3.1.3 Diseñar casos de uso (diagramas de secuencia)

Cuatro realizaciones de diseño detallan el paso de mensajes entre actor, cliente, API NestJS, servicios de dominio e infraestructura.

**UC07 — Venta POS.** El cajero arma líneas en el POS; la API consulta disponible; al cobrar se inicia transacción, se bloquean filas de stock, se descuenta, se persiste la venta y se emite ticket. Medio QR usa pasarela simulada; efectivo calcula vuelto. Idempotencia por uuid.

**Diagrama de secuencia — UC07 Venta POS**

> Espacio para el diagrama.

**UC10 — Reporte.** El administrador envía la pregunta; el compilador produce un `SELECT`; el validador exige una sola sentencia de lectura sobre la vista permitida con `LIMIT` (máximo académico, p. ej. 200). Solo entonces se ejecuta. No hay `INSERT`/`UPDATE`/`DELETE` vía reportes.

**Diagrama de secuencia — UC10 Reporte**

> Espacio para el diagrama.

**UC03 + UC28 — Probador (2D y avance 3D).** La clienta elige variante; el cliente pide overlay o asset; la API responde metadatos e imagen/modelo; el dispositivo captura cámara o ancla puntos y dibuja. El video del probador no se sube al servidor. Ni UC03 ni UC28 modifican stock.

**Diagrama de secuencia — UC03 y UC28 Probador**

> Espacio para el diagrama.

**UC27 + UC34 — Pago y comprobante simulado.** Se inicia el cobro simulado; si hay pasarela, Stripe corre en modo prueba, sin cobro real. Tras aprobación se registra PagoSimulado y se emite ComprobanteSimulado con NIT simulado (documento de demostración, no fiscal).

**Diagrama de secuencia — UC27 y UC34 Pago y comprobante**

> Espacio para el diagrama.
