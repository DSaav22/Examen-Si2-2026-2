Cada módulo agrupa los casos de uso de la web (React), del móvil (React Native / Expo) y de la API (NestJS) sobre PostgreSQL. El diagrama se pega bajo **Diagrama del módulo**.

---

## 2.3.1 Módulo de autenticación y seguridad

Este módulo crea la cuenta de la clienta, abre y cierra la sesión de cualquier usuario y permite cambiar la contraseña. La API emite un token JWT tras validar las credenciales; la clave se almacena con hash. Al cerrar sesión el token deja de ser válido. Los clientes web y móvil envían el token en las peticiones protegidas.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC14 | Registrarse con correo y contraseña; crea la cuenta de clienta. | Clienta |
| UC15 | Iniciar sesión (emite token) y cerrar sesión (revoca el token). | Todos |
| UC16 | Cambiar la clave; la anterior deja de servir. | Usuario autenticado |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.2 Módulo de gestión de usuarios

El administrador da de alta usuarios, asigna roles (clienta, cajero, encargado, administrador, proveedor) y actualiza el estado de la cuenta. El módulo alimenta los permisos que la API exige en el resto de procesos: un cajero no administra el catálogo y un proveedor solo opera el ingreso de mercadería.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC23 | Alta, edición y asignación de rol a usuarios del sistema. | Administrador |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.3 Módulo de catálogo, temporadas y colecciones

Publica el catálogo omnicanal: listado filtrado, ficha con variantes (talla y color), fotos y disponibilidad por sucursal. El administrador mantiene productos, variantes, stock inicial y los catálogos de sucursales, temporadas y colecciones. La clienta consulta desde web o móvil; el mismo inventario sostiene el POS.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC01 | Consultar el catálogo con filtros, precio y disponibilidad. | Clienta, Administrador |
| UC02 | Ver ficha, variantes, fotos y stock de la sucursal. | Clienta |
| UC09 | Alta o edición de producto, variante e imágenes. | Administrador |
| UC24 | Mantener sucursales, temporadas y colecciones. | Administrador |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.4 Módulo de inventario, kardex y transferencias

Controla el saldo por variante y almacén. El proveedor registra ingresos de mercadería; el encargado o el administrador ajustan inventario con asiento en kardex; las transferencias mueven unidades entre almacenes de sucursales. Las ventas y reservas del resto del sistema leen y escriben este mismo saldo.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC13 | Ingresar mercadería asociada a los productos del proveedor. | Proveedor |
| UC25 | Ajustar inventario; el kardex refleja el saldo nuevo. | Encargado, Administrador |
| UC31 | Transferir stock de un almacén a otro. | Encargado |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.5 Módulo de punto de venta y caja

Cubre la operación en tienda: el cajero abre el turno con fondo inicial, registra la venta en el POS (descuento de stock y ticket) y cierra con arqueo (esperado frente a declarado). Los cupones válidos reducen el total en la misma transacción de cobro. El canal de caja comparte inventario con la compra en línea.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC06 | Abrir caja con fondo inicial; inicia el turno. | Cajero |
| UC07 | Registrar venta en POS; cobra, descuenta stock y emite ticket. | Cajero |
| UC08 | Cerrar caja; compara lo declarado con el total del sistema. | Cajero |
| UC22 | Aplicar cupón válido al total de la venta. | Clienta, Cajero |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.6 Módulo de compra en línea, pedidos, despacho y devolución

La clienta compra desde web o móvil con el mismo contrato de cobro y descuento que el POS, en canal en línea y sin turno de caja. Consulta su historial de ventas; el encargado despacha el pedido; cajero o clienta registran la devolución y el stock vuelve al almacén correspondiente.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC05 | Comprar en línea; venta registrada, pago simulado y stock descontado. | Clienta |
| UC19 | Ver historial de ventas propias o del canal que corresponde al rol. | Clienta, Cajero, Encargado |
| UC32 | Despachar pedido; el pedido queda enviado. | Encargado |
| UC33 | Devolver una venta; el stock vuelve y la venta queda devuelta. | Cajero, Clienta |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.7 Módulo de reservas

La clienta reserva una prenda en una sucursal; el saldo reservado sube y esas unidades no quedan libres para otra venta. El encargado de la sucursal confirma, completa (pasa a venta y descuenta stock) o cancela la reserva, liberando el saldo cuando corresponde.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC11 | Reservar una prenda en una sucursal; aumenta el reservado. | Clienta |
| UC12 | Atender reservas: confirmar, completar o cancelar. | Encargado |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.8 Módulo de pagos y comprobante simulado

Registra el medio de pago en modo de prueba: QR, efectivo o contra entrega según el canal. Stripe opera solo en modo prueba. No hay cobro bancario real ni NIT real. El comprobante es una factura simulada para la demo académica; el resultado del pago (aprobado o rechazado) alimenta la venta sin mover dinero verdadero.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC27 | Simular un pago; el medio queda aprobado o rechazado sin cobrar de verdad. | Cajero, Clienta |
| UC34 | Emitir comprobante simulado de prueba, sin NIT real. | Cajero, Administración |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.9 Módulo de probador virtual

La clienta ensaya la variante sobre su cuerpo con la cámara o una foto. El procesamiento corre en el dispositivo: el video no sale del teléfono ni de la computadora. Si la variante tiene modelo 3D, el probador muestra volumen; si no, permanece el overlay 2D anclado al torso. La ficha y la variante elegida provienen del catálogo.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC03 | Usar el probador 2D: overlay de la prenda sobre el cuerpo. | Clienta |
| UC28 | Usar el probador 3D cuando existe modelo; si no, mantiene el 2D. | Clienta |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.10 Módulo del bot de la tienda

Asiste a la clienta con respuestas basadas en datos del catálogo (precio, talla, color, ocasión, descripción) y en el perfil de la clienta autenticada. No ejecuta SQL libre ni consultas arbitrarias a la base: solo lee la información que el dominio ya expone para ficha y asistencia.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC04 | Consultar la ficha: precio, talla, color, ocasión o descripción cargados. | Clienta |
| UC29 | Hablar con el bot; respuesta de asistencia acotada al catálogo y a la clienta. | Clienta |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.11 Módulo de reportes

El administrador pide reportes de ventas o de inventario. La pregunta libre no genera SQL arbitrario: el compilador produce únicamente un `SELECT` acotado a la vista de ventas permitida (`v_reporte_ventas`) y el validador rechaza cualquier otra forma de consulta.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC10 | Pedir reporte; la pregunta libre solo produce un `SELECT` permitido sobre la vista de ventas. | Administrador |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.12 Módulo de proveedores

El proveedor autenticado registra el ingreso de mercadería de los productos que tiene asignados. El movimiento alimenta el kardex y actualiza el saldo del almacén destino, de modo que catálogo y POS ven la nueva disponibilidad sin un proceso aparte de carga masiva.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC13 | Ingresar mercadería asociada a sus productos; genera movimiento de ingreso. | Proveedor |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.13 Módulo de favoritos, opiniones, alertas y perfil

La clienta marca favoritos, mantiene perfil y direcciones, deja opiniones sujetas a moderación y solicita alertas de producto. El administrador modera opiniones y consulta eventos de auditoría vinculados a estas acciones sociales y de perfil.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC17 | Gestionar favoritos: marcar o quitar un producto. | Clienta |
| UC18 | Actualizar perfil y direcciones de entrega. | Clienta |
| UC20 | Opinar un producto; la opinión queda sujeta a moderación. | Clienta |
| UC21 | Pedir alerta de producto (disponibilidad o aviso). | Clienta |
| UC26 | Moderar opiniones y consultar auditoría de estos eventos. | Administrador |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.14 Módulo PWA y cola offline

La tienda web se instala como PWA. Si cae la red en caja, la venta del POS se guarda en una cola local del navegador y se sincroniza cuando vuelve la conectividad. Es la alternativa operativa de UC07 para no interrumpir el cobro en el local cuando no hay red.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC35 | Usar la tienda instalable (PWA) y la cola offline del POS como alternativa de UC07. | Clienta, Cajero |

**Diagrama del módulo**

> Espacio para el diagrama.

---

## 2.3.15 Administración y bitácora

Centraliza la gestión de usuarios y roles junto con la moderación y el rastro de auditoría. El administrador ve quién cambió qué en opiniones, cuentas y eventos sensibles, y mantiene el control de acceso que el resto de módulos exige en cada petición autenticada.

| Caso de uso | Descripción | Actor |
|-------------|-------------|-------|
| UC23 | Gestionar usuarios y roles del sistema. | Administrador |
| UC26 | Moderar contenido y consultar el registro de auditoría. | Administrador |

**Diagrama del módulo**

> Espacio para el diagrama.
