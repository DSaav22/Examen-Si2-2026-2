# Capítulo 4 — Fase de Elaboración

**Parte II — Proceso Unificado de Desarrollo de Software**  
**Sistema:** EnsayAR  
**Hito de la fase:** arquitectura del ciclo de vida (Lifecycle Architecture)  
**Fecha de la fase:** 12 de septiembre de 2026, ajustada con el alcance del 19 de septiembre  

Referencia: Jacobson, I., Booch, G. y Rumbaugh, J. *El proceso unificado de desarrollo de software*.

El detalle de cada caso, escrito como comportamiento del sistema, está en `casos-de-uso-detalle.md`. Este capítulo fija el baseline de los casos que cargan la arquitectura.

**Disciplinas de esta fase:** requisitos (detalle de casos críticos), análisis (secuencias de sistema y modelo de dominio) y diseño (baseline y spikes). La implementación corre en Construcción.

Los diagramas (secuencia, clases, paquetes) se dibujan en Enterprise Architect y se insertan en este capítulo. El texto de abajo es el modelo que esos diagramas deben respetar.

---

## 4.1 Qué se elabora

| Se detalla en esta fase | Permanece en formato breve (capítulo 3) |
|-------------------------|------------------------------------------|
| UC03 Probador virtual | UC01, UC02, UC04, UC06, UC08, UC09 |
| UC07 Venta en POS | UC12, UC13 |
| UC10 Reporte | |
| UC11 Reservar prenda (porque altera el stock) | |

UC05 (compra en línea) **no** se reescribe: usa el mismo contrato de cobro y de descuento que UC07, con canal `en línea` y sin turno de caja. UC12 solo cambia el estado de una reserva ya creada.

---

## 4.2 UC03 — Usar el probador virtual

| Campo | Contenido |
|-------|-----------|
| Actor principal | Clienta |
| Apoyo | Ninguno. La pose, si existe, se estima en el dispositivo. |
| Precondiciones | Clienta con sesión. Ficha abierta (UC02) y variante elegida (talla y color) con imagen de overlay. |
| Postcondición de éxito | La clienta vio esa variante sobre su cuerpo (cámara o anclaje manual). No hay reserva ni venta. |
| Disparador | Elige “Probar”. |

### Flujo básico

1. El sistema muestra la variante (nombre, talla, color, miniatura).
2. La clienta elige cámara en vivo o una foto de cuerpo.
3. Si hace falta, el sistema pide permiso de cámara.
4. Con cámara: el dispositivo captura el video y, si puede, estima hombros (y cadera si el modelo la da).
5. Superpone la imagen 2D de la variante sobre el torso, escalada a la distancia entre hombros.
6. La clienta puede cambiar de color (otra variante del mismo producto y talla) sin salir del probador.
7. Vuelve a la ficha. El caso termina.

### Alternativas

- **3a.** Niega el permiso de cámara: queda el flujo por foto o por toques.
- **4a.** El dispositivo no estima la pose (emulador o equipo sin modelo): la clienta marca dos puntos (hombros) o un recuadro, y el overlay se ancla ahí.
- **6a.** La variante nueva no tiene overlay: se informa y se mantiene la imagen anterior.

### Excepciones

- **E1.** La variante no tiene imagen de overlay: no se abre el probador. El administrador la carga en UC09.
- **E2.** La cámara falla a mitad: se ofrece el modo foto o toques.

### Reglas

- El overlay es 2D. No se deforma la tela ni se simula su caída.
- El video no se envía al servidor. Solo se descarga la imagen de la variante.
- El probador no modifica stock ni reservas.

### Mensajes de la secuencia (figura en Enterprise Architect)

1. Clienta → cliente: probar la variante.
2. Cliente → API: obtener overlay de la variante.
3. API → cliente: dirección de la imagen, talla y color.
4. Cliente → estimador local: cuadro de cámara o puntos marcados.
5. Estimador → cliente: anclaje del torso.
6. Cliente: dibuja el overlay. Si cambia el color, se repite el paso 2.

---

## 4.3 UC07 — Registrar una venta en el punto de venta

| Campo | Contenido |
|-------|-----------|
| Actor principal | Cajero (también puede operar un vendedor o un encargado con permiso de caja) |
| Apoyo | Pasarela simulada, si el medio es QR |
| Precondiciones | Turno de caja abierto (UC06). Sesión válida. El almacén del turno está definido. |
| Postcondición de éxito | Existe una venta cobrada. Cada línea descontó el disponible de esa variante en ese almacén. El turno acumula el total. Queda un movimiento de inventario. |
| Disparador | El cajero inicia una venta nueva. |

### Flujo básico

1. El sistema asocia el borrador al turno abierto y a su almacén.
2. El cajero agrega líneas: producto, variante (talla y color) y cantidad. Puede indicar clienta y cupón.
3. Por cada línea el sistema comprueba que el disponible alcance (`cantidad − reservado`).
4. El cajero elige medio: efectivo, QR simulado o el medio que el caso académico permita en caja.
5. Efectivo: ingresa lo recibido; el sistema calcula el vuelto.
6. QR: la pasarela simulada responde aprobado o rechazado.
7. En **una transacción** el servidor bloquea las filas de stock, vuelve a comprobar el disponible, descuenta, persiste la venta cobrada y sus líneas, registra el movimiento y suma el total al turno.
8. Muestra el ticket.
9. La caja sigue abierta.

### Alternativas

- **2a. Sin red.** La venta queda en la cola del navegador con un identificador único. Al volver la red se envía el mismo identificador. El stock se descuenta en el servidor una sola vez.
- **4a.** El cajero descarta el borrador antes de cobrar: no hay venta y el stock no cambia.
- **6a.** QR rechazado: se ofrece otro medio o se anula el borrador.

### Excepciones

- **E1.** En el paso 3 el disponible no alcanza: no se agrega la línea y se muestra el saldo real.
- **E2.** Entre la consulta y el cobro otra venta dejó stock insuficiente: la transacción se revierte y se indica la variante.
- **E3.** No hay turno abierto: se exige UC06.
- **E4.** El mismo identificador de venta llega dos veces: se devuelve la venta ya cobrada y no se descuenta de nuevo.

### Contrato `cobrarVenta`

- **Antes:** turno abierto; al menos una línea; cantidades mayores que cero; cada línea cabe en el disponible.
- **Después:** venta cobrada; el disponible bajó en la cantidad de cada línea; el total del turno subió; hay movimiento de inventario.
- **No hace:** no abre otra caja, no llama al probador y no ejecuta SQL libre.

### Mensajes de la secuencia (figura en Enterprise Architect)

1. Cajero → POS: nueva venta y líneas.
2. POS → API: consultar disponible.
3. Cajero → POS: cobrar (medio e identificador único).
4. API → pasarela simulada: cobrar, si el medio es QR.
5. API → base: iniciar transacción, bloquear stock, descontar, insertar venta, confirmar.
6. API → POS: ticket.

---

## 4.4 UC10 — Pedir un reporte

| Campo | Contenido |
|-------|-----------|
| Actor principal | Administrador |
| Apoyo | Compilador de pregunta y validador de SQL (no un modelo de lenguaje) |
| Precondiciones | Administrador con sesión. Si no hay ventas, el resultado es una tabla vacía. |
| Postcondición de éxito | Se muestra una tabla. Queda registro de la pregunta, del SQL aceptado y del momento. Ventas y stock no se modifican. |
| Disparador | Escribe una pregunta o usa el dictado del navegador. |

Hay dos caminos en la misma pantalla:

- **Reportes fijos:** ventas del día e inventario por sucursal, almacén, SKU, cantidad, reservado y disponible.
- **Pregunta libre:** el texto se traduce a un `SELECT` y solo se ejecuta si pasa el validador.

### Flujo básico de la pregunta libre

1. El administrador formula la pregunta. Ejemplo de clase: ventas de una sucursal, de un cajero, en un rango, a quién y cuánto.
2. El compilador produce un `SELECT` candidato usando solo el esquema permitido (la vista de ventas).
3. El validador exige: una sola sentencia; empieza por `SELECT`; solo la vista permitida; sin `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER` ni `COPY`; límite de filas (como máximo 200).
4. Se ejecuta esa lectura.
5. Se muestran columnas, filas y el SQL, para que en la defensa se vea qué corrió.
6. Se guarda la ejecución (pregunta, SQL, cantidad de filas).

### Alternativas

- **1a.** El dictado no se entiende: se pide texto.
- **3a.** El SQL no pasa el validador: no se ejecuta. Mensaje claro y ejemplos de preguntas admitidas.
- **4a.** Cero filas: tabla vacía. No es un error.

### Excepciones

- **E1.** La pregunta pide credenciales, otras tablas o modificar datos: se rechaza antes de ejecutar.
- **E2.** No hay sesión de administrador: no se consulta.

### Vista permitida

`v_reporte_ventas` reúne fecha, sucursal, almacén, turno, cajero, venta, clienta si existe, SKU, producto, talla, color, cantidad, precio, subtotal y medio de pago.

Preguntas admitidas: ventas por sucursal, por cajero, por rango, por prenda y totales. El inventario fijo no pasa por esta vista: tiene su propio listado.

### Mensajes de la secuencia (figura en Enterprise Architect)

1. Administrador → web: pregunta.
2. Web → API: enviar la pregunta.
3. API: compilar y validar.
4. API → PostgreSQL: ejecutar el `SELECT` aceptado.
5. API → web: filas y SQL. Si la validación falla, el paso 4 no ocurre.

---

## 4.5 UC11 — Reservar una prenda

Se elabora aquí porque comparte el stock con UC07. El flujo de atención (UC12) queda breve: el encargado de la sucursal confirma, completa o cancela.

| Campo | Contenido |
|-------|-----------|
| Actor principal | Clienta |
| Precondiciones | Sesión de clienta. Variante con disponible en la sucursal elegida. |
| Postcondición de éxito | Reserva en estado pendiente. Sube la cantidad **reservada** de esa variante en el almacén. La cantidad física no baja todavía. |
| Disparador | La clienta confirma “reservar” en la ficha o el catálogo. |

### Regla de disponible

`disponible = cantidad − reservado`.

UC07 y UC05 solo pueden vender el disponible. Una reserva no es una venta.

### Al completar o cancelar

- **Completar** (encargado, UC12): se crea la venta correspondiente, se descuenta la cantidad y se libera el reservado, en una transacción.
- **Cancelar:** baja el reservado y no hay venta.

### Excepciones

- **E1.** Disponible insuficiente: no se crea la reserva.
- **E2.** La clienta intenta ver o cancelar una reserva ajena: se niega.

---

## 4.6 Modelo de dominio

Clases conceptuales. La figura de clases se inserta desde Enterprise Architect.

| Clase | Responsabilidad |
|-------|-----------------|
| Producto | Nombre, ocasión, precio base, categoría. No guarda stock. |
| Variante | Talla, color, SKU, foto, overlay. Hija de un producto. |
| Sucursal | Local y ciudad. |
| Almacén | Depósito de una sucursal. |
| StockAlmacén | Cantidad y reservado de una variante en un almacén. |
| Usuario | Correo y rol. |
| CajaTurno | Fondo, apertura, cierre, totales. Pertenece a sucursal y cajero. |
| Venta | Identificador único, canal (en línea o POS), estado, medio de pago, total. |
| LíneaVenta | Cantidad y precio de una variante dentro de la venta. |
| Reserva | Estado y sucursal. La hace una clienta. |
| LíneaReserva | Variante y cantidad apartadas. |
| MovimientoInventario | Historia: venta, reserva, liberación, ajuste, ingreso. |
| ReporteEjecución | Pregunta, SQL aceptado, filas, momento. No altera ventas. |

Reglas:

- El stock vive en StockAlmacén, nunca en el producto.
- Toda venta, sea web o caja, descuenta un StockAlmacén.
- UC07 exige un CajaTurno abierto. UC05 no.
- ReporteEjecución es traza de lectura.

---

## 4.7 Modelo de datos lógico (baseline)

Tablas que el baseline no puede perder: usuarios, sucursales, almacenes, productos, variantes, stock por variante y almacén (clave compuesta), turnos de caja, ventas, líneas de venta, reservas, líneas de reserva, movimientos de inventario, ejecuciones de reporte.

Vista `v_reporte_ventas`: es la única fuente de la pregunta libre de UC10.

Índices mínimos: ventas por fecha y por turno; stock por almacén; variantes por producto.

El esquema físico completo (Prisma) se describe en Construcción. Elaboración fija las claves y la vista, no cada columna comercial añadida después (cupón, favorito, opinión).

---

## 4.8 Arquitectura baseline

Vista lógica. La figura de paquetes se inserta desde Enterprise Architect.

| Capa | Elementos |
|------|-----------|
| Presentación | React Native: catálogo y UC03. React: tienda, POS (UC06–UC08), reportes (UC10), reservas. |
| Aplicación | Módulos NestJS: autenticación, catálogo, inventario, ventas, caja, reservas, usuarios, proveedores, reportes, pagos simulados, administración. |
| Dominio | Descontar stock, cobrar venta, apartar y liberar reservado. |
| Infraestructura | PostgreSQL; puerto de QR simulado; compilador y validador de UC10. |

**Decisiones que Construcción no reabre:**

1. Un `POST /ventas` para UC05 y UC07. El canal distingue en línea y POS.
2. El descuento de stock ocurre solo en el servidor, dentro de una transacción, con bloqueo de fila.
3. El probador corre en el cliente. La API entrega el overlay.
4. La pregunta libre solo lee `v_reporte_ventas` después del validador. No hay SQL escrito a mano desde el navegador.
5. La cola offline guarda el identificador de la venta. El servidor es idempotente.
6. Reservar sube `reservado`. Vender baja `cantidad` sobre el disponible. Completar una reserva genera la venta y libera el aparto.

---

## 4.9 Spikes de arquitectura

Sirven para aceptar o corregir el baseline antes de dar por cerrada la fase. El resultado de haberlos corrido se cuenta en Construcción.

### Spike A — Overlay (R1, R5, UC03)

Cámara o foto, imagen de la variante, anclaje a hombros o a dos toques. El video no sale del dispositivo.

- **Pasa si** el overlay se ve sobre el torso o sobre los puntos marcados, y el caso no toca stock.
- **No pasa si** el flujo exige subir el video o solo funciona como una foto de maniquí ajena a la clienta.

### Spike B — Venta concurrente (R3, UC07)

Dos cobros paralelos de la última unidad, y el mismo identificador enviado dos veces.

- **Pasa si** una venta queda cobrada, la otra se rechaza, el stock final no es negativo y el identificador repetido no duplica la venta.
- **No pasa si** hay stock negativo o dos ventas cobradas de la misma unidad.

### Spike C — SELECT acotado (R2, UC10)

Pregunta permitida, y a propósito una orden de borrado o un `SELECT` sobre usuarios.

- **Pasa si** la pregunta legal devuelve filas (o cero filas) y las maliciosas no se ejecutan.
- **No pasa si** llega a ejecutarse una sentencia sobre otra tabla.

---

## 4.10 Cierre de la fase

El hito de arquitectura queda cumplido si:

1. UC03, UC07, UC10 y el contrato de UC11 están escritos.
2. El dominio separa producto, variante, stock, reservado, venta y turno.
3. Las seis decisiones de la sección 4.8 están aceptadas.
4. Los spikes A, B y C tienen criterio de pasa y no pasa.

Construcción implementa el resto de casos sobre este baseline. No rediseña el inventario ni abre el SQL del reporte.
