# 2. Marco teórico del primer ciclo

## 2.1 Marco teórico referencial

### 2.1.1 Antecedentes internacionales

El comercio electrónico de moda creció al permitir consultar catálogos, comparar precios y comprar sin desplazarse al local. Plataformas de gran escala y tiendas en línea generalizan un flujo conocido: búsqueda, ficha del producto, variantes, carrito, cobro y seguimiento del pedido. Ese modelo resuelve distancia y horario, pero en ropa deja un hueco: la clienta no puede probarse la prenda como en el camerino.

En la industria han aparecido soluciones de **probador virtual** y realidad aumentada que superponen la prenda sobre una foto o sobre el cuerpo estimado por la cámara. El nivel industrial suele incluir mallas tridimensionales y simulación de caída de tela; el nivel académico y de producto mínimo viable suele limitarse a un overlay 2D anclado a puntos del torso. EnsayAR se sitúa en ese segundo rango: demostrar el ensayo asistido sobre el propio cuerpo, sin pretender un motor de moda industrial.

### 2.1.2 Antecedentes nacionales

En Bolivia, y en particular en Santa Cruz, las cadenas de moda femenina concentran la venta en sucursales físicas. El prestigio y los lanzamientos saturan el local: la clienta debe desplazarse, esperar camerino y comprar solo en horario de tienda. Abrir más puntos de venta no escala de forma sostenible: cada sucursal suma espacio, personal y costo operativo, y las ciudades sin tienda quedan mal atendidas.

La compra de ropa por catálogo digital o redes sociales existe, pero muchas veces se hace **sin ensayar**. El color en pantalla puede diferir, la talla no siempre coincide y las devoluciones o el abandono de compra son consecuencias frecuentes. El problema local no es la falta de Internet; es la falta de un sistema que una el inventario de la tienda con un canal en línea y con una forma de ensayar la prenda antes de decidir.

### 2.1.3 Justificación del proyecto

EnsayAR responde a ese escenario con **un inventario** (producto × talla × color × almacén) y **dos canales** que descuentan el mismo saldo: la web/móvil y el punto de venta. Si la clienta compra la última unidad en línea y el cajero intenta cobrar la misma variante, la segunda operación debe fallar. Dos aplicaciones con inventarios copiados no son omnicanalidad.

El nombre del sistema junta *ensayar* (probarse ropa) y *AR* (realidad aumentada). El MVP del parcial (UAGRM, Sistemas de Información II, gestión 2026-2) incluye catálogo, venta en caja y en línea, reservas, pagos simulados, reportes y un probador virtual acotado, documentado con el Proceso Unificado de Desarrollo de Software.

### 2.1.4 Arquitectura cliente-servidor

EnsayAR es un sistema **cliente-servidor**. Los clientes de presentación son:

- la aplicación web en **React** (tienda, POS y administración);
- la aplicación móvil en **React Native / Expo** (clienta y cámara del probador).

Ambos consumen una API REST implementada en **NestJS**. Los clientes no almacenan el saldo de inventario ni deciden el precio final: envían peticiones autenticadas y reciben la respuesta del servidor.

El **servidor de datos** es **PostgreSQL**. La API escribe y lee el dominio (usuarios, productos, stock, ventas, reservas, etc.) a través de Prisma. La coherencia entre canales depende de que el stock viva en un solo lugar y se actualice bajo transacciones.

### 2.1.5 Patrón de arquitectura

El patrón elegido es el **monolito modular**: un solo despliegue de la API, organizado en módulos (autenticación, catálogo, inventario, ventas, caja, reservas, reportes, administración). Es adecuado para el MVP del parcial: un equipo, una base de datos y transacciones locales entre venta y stock.

No se adoptan **microservicios**. Según la indicación del curso, **FastAPI** queda reservado a escenarios de microservicios y **no** es el backend de este parcial. Tampoco forman parte del stack Angular, Flutter ni Spring. Partir el sistema en varios servicios añadiría red y consistencia distribuida sin beneficio para la defensa del examen.

### 2.1.6 Metodología de desarrollo de software

La metodología del informe es el **Proceso Unificado de Desarrollo de Software** (Booch, Rumbaugh y Jacobson). No es Scrum: Scrum organiza el trabajo en sprints, pero no prescribe por sí mismo el modelado de requisitos, análisis, diseño, implementación y pruebas que exige el parcial.

El Proceso Unificado se representa con dos ejes:

1. **Fases:** Inicio, Elaboración, Construcción y Transición.
2. **Disciplinas** que se repiten en cada ciclo: captura de requisitos, análisis, diseño, implementación y pruebas.

Un **ciclo** produce una versión operativa (un incremento). Es análogo a un sprint en cuanto a ritmo, pero el índice del informe no se organiza por sprints: la **Parte III** se estructura por esos flujos de trabajo (fases y disciplinas), como el documento de referencia del curso. El proceso está dirigido por casos de uso y centrado en la arquitectura.

### 2.1.7 Tecnologías utilizadas

| Capa | Tecnología |
|------|------------|
| API | NestJS 11 y TypeScript |
| Acceso a datos | Prisma 6 |
| Base de datos | PostgreSQL |
| Web | React 19 y Vite |
| Móvil | Expo 53 / React Native 0.79 |
| Nube | Microsoft Azure: App Service, Static Web Apps, Flexible Server, Application Insights; infraestructura en Bicep |

La autenticación usa JWT y el almacenamiento de contraseñas con hash. Los pagos del parcial son **simulados** (efectivo, QR de prueba, contra entrega): no se integra una pasarela productiva.

### 2.1.8 Base de datos relacional

PostgreSQL aporta integridad referencial, transacciones y bloqueo a nivel de fila para el stock. El inventario matricial (producto, variante, stock por almacén) y las ventas concurrentes desde web y POS exigen que dos cobros sobre la misma unidad no dejen la cantidad en negativo. Prisma versiona el esquema con migraciones y tipa el acceso desde NestJS.

### 2.1.9 Lenguaje TypeScript y framework NestJS

**TypeScript** tipa el dominio compartido entre API y clientes, reduce errores de contrato y facilita el mantenimiento del monolito. **NestJS** organiza el backend en módulos con inyección de dependencias, controladores, guards de rol y servicios de dominio, en un estilo cercano a un backend empresarial. El docente lo prefirió frente a Express para este examen y lo distinguió de Next.js. NestJS es el único backend del parcial.

## 2.2 Datos

El modelo de datos de EnsayAR gira en torno a la moda omnicanal. Un **Usuario** tiene uno o más **Roles** (clienta, cajero, encargado, administrador, proveedor). La operación física se organiza en **Sucursales**, cada una con uno o más **Almacenes**. El **Producto** se concreta en **Variantes** (talla y color); el **Stock** registra, por variante y almacén, la cantidad y lo reservado. La regla de negocio es: **disponible = cantidad − reservado**.

Las operaciones de negocio enlazan ese inventario con la venta y la logística: **MovimientoInventario** deja rastro en kardex; **Venta** y **LineaVenta** documentan el cobro; **PagoSimulado** y **ComprobanteSimulado** cubren el entorno académico; **Reserva** bloquea unidades sin venderlas aún; **Caja/Turno** abre y cierra el POS; **Cupón** aplica descuentos; **Favorito**, **Opinión** y **Pedido** atienden a la clienta; **Auditoría** registra acciones sensibles.

| Entidad | Descripción breve |
|---------|-------------------|
| Usuario | Cuenta de acceso al sistema |
| Rol | Permisos (clienta, cajero, encargado, administrador, proveedor) |
| Sucursal | Punto de operación de la cadena |
| Almacén | Depósito de stock ligado a una sucursal |
| Producto | Prenda o artículo del catálogo |
| Variante | Combinación talla × color del producto |
| Stock | Cantidad y reservado por variante y almacén |
| MovimientoInventario | Asiento de kardex (venta, reserva, ajuste, ingreso, transferencia) |
| Venta | Cabecera de cobro en línea o en POS |
| LineaVenta | Ítem vendido (variante, cantidad, precio) |
| PagoSimulado | Medio de pago de prueba asociado a la venta |
| Reserva | Bloqueo temporal de unidades para la clienta |
| Caja / Turno | Apertura, cobros y cierre del POS |
| Cupón | Descuento aplicable al total |
| Favorito | Variantes marcadas por la clienta |
| Opinión | Valoración o comentario sobre un producto |
| Pedido | Orden de compra en línea (despacho / seguimiento) |
| ComprobanteSimulado | Ticket o comprobante de entorno académico |
| Auditoría | Bitácora de acciones administrativas |

## 2.3 Procesos

Los procesos del sistema EnsayAR se organizan por módulos funcionales. Cada módulo agrupa los casos de uso que la plataforma ejecuta en la web, en el móvil y en la API; su detalle se presenta a continuación.
