# Parte I – Fundamentación teórica

## 1) Perfil

### 1.1 Introducción

EnsayAR es una plataforma omnicanal de moda femenina pensada para una cadena nacional que vende prendas, básicos, calzado, carteras y joyería en ocasiones social, casual y de trabajo. El nombre une *ensayar* (probarse la ropa) y *AR* (realidad aumentada): el sistema no se limita a publicar un catálogo; acompaña a la clienta desde la exploración de la prenda hasta la compra, en la tienda física y a distancia.

La expansión presencial de la cadena satura los locales en lanzamientos y temporadas, exige más sucursales y personal, y deja fuera a quien no puede desplazarse o compra fuera de horario. Un canal digital resuelve alcance y continuidad, pero en ropa introduce otra fricción: sin una forma de ensayar la prenda sobre el propio cuerpo, la compra en línea se vuelve incierta y la devolución, frecuente. EnsayAR responde con un inventario único (producto × talla × color × almacén) compartido por la web, la aplicación móvil y el punto de venta, y con capacidades de ensayo asistido (probador virtual 2D y 3D), asistencia conversacional en tienda, operación de caja —incluida una cola offline— y reportes bajo demanda.

La interfaz de cliente y tienda adopta una estética editorial de moda bajo la marca visual **Vesta**; el nombre del sistema documentado en este informe es **EnsayAR**. Los datos de demostración cubren al menos dos ciudades (Santa Cruz y La Paz) y usuarios de semilla con correo `*@ensayar.bo`. El desarrollo se organiza con el Proceso Unificado de Desarrollo de Software y un stack NestJS, React, React Native / Expo, PostgreSQL y Microsoft Azure.

### 1.2 Objetivo general

Desarrollar e implantar EnsayAR como sistema omnicanal de moda femenina (aplicación web instalable, aplicación móvil y API) que permita a la clienta consultar, ensayar en 2D y 3D, reservar y comprar, y a la tienda vender en caja, transferir stock, despachar, devolver, aplicar precio mayorista y consultar ventas e inventario —incluidos reportes generativos acotados—, con pagos y comprobantes simulados, aplicando el Proceso Unificado y un despliegue preparado para Microsoft Azure.

### 1.3 Objetivos específicos

1. Modelar el inventario matricial (producto, variante talla × color, stock por almacén y sucursal) de modo que el disponible sea siempre cantidad menos reservado y que una sola venta descuente el mismo saldo en web y en caja.
2. Implementar el catálogo, la ficha de producto, favoritos, opiniones y perfil de clienta en la aplicación web (PWA) y en la aplicación móvil Expo / React Native.
3. Operar el punto de venta: apertura de caja, venta con cupón, cierre de caja y cola local cuando no hay red.
4. Incorporar el probador virtual 2D (cámara o foto con superposición de la prenda) y el probador 3D sobre el cuerpo de la clienta.
5. Ofrecer el bot de la tienda para orientación sobre catálogo, talla, color, ocasión y estado de pedidos o reservas.
6. Soportar precio mayorista, transferencia de stock entre almacenes, despacho y devolución, con comprobante / NIT simulado.
7. Cubrir reportes del día, de inventario y reporte generativo (pregunta en español → consulta `SELECT` acotada, con límite y sin modificar datos).
8. Gestionar roles de clienta, cajero, encargado, administrador y proveedor, documentar el proceso con el Proceso Unificado y dejar material de adopción para cada rol.

### 1.4 Descripción del problema

| Pregunta | Respuesta |
|----------|-----------|
| ¿Quién lo padece? | La cadena (costo de seguir abriendo locales y de operar inventario fragmentado) y la clienta (debe desplazarse o compra sin ensayarse). |
| ¿Cuál es el problema? | El modelo solo presencial no atiende demanda continua ni geografía; un e-commerce de ropa falla si no hay ensayo, stock compartido ni operación de caja alineada. |
| ¿Cuál es el impacto? | Tiendas saturadas, más planilla, ventas perdidas fuera de horario, overselling entre canales y devoluciones cuando la prenda no coincide con lo esperado. |
| ¿Qué se propone? | EnsayAR: catálogo con variantes, venta web y POS sobre el mismo stock, reservas, probador 2D/3D, bot de tienda, mayorista, transferencias, despacho, devolución e informes bajo demanda. |

Hoy la alternativa habitual es ir al local o comprar “a ciegas”. Si cada canal lleva su propio saldo, la última unidad de una talla y color puede venderse dos veces: una en línea y otra en caja. EnsayAR trata el stock como un recurso concurrente: el disponible se calcula como cantidad menos reservado; al confirmar una venta, el descuento es el mismo para la web y para el punto de venta.

Además, la gerencia necesita más que menús fijos de informes. Preguntas del día —ventas de una sucursal, de un cajero, en un rango— deben resolverse sin abrir la base a SQL libre. El sistema traduce una pregunta en español a un `SELECT` de solo lectura, con límite de filas y rechazo de cualquier intento de modificar datos.

### 1.4 Alcance y funcionalidades del sistema

El alcance del 23 de septiembre de 2026 describe el producto EnsayAR que se documenta y defiende: usable por la clienta, por la caja y por la administración de la cadena. Lo que sigue detalla las funcionalidades por capa.

#### 1.4.1 Aplicación móvil (clienta)

La aplicación móvil, construida con Expo / React Native sobre la misma API, permite a la clienta iniciar sesión, explorar el catálogo, abrir la ficha con variantes talla × color, marcar favoritos, gestionar el perfil, armar el carrito y completar la compra en línea con pago simulado. Desde la ficha se abre el probador virtual 2D (cámara o foto) y el probador 3D. También consulta sucursales (Santa Cruz y La Paz en la demo), reservas y el estado de pedidos. La app consume autenticación JWT y los mismos servicios de catálogo, inventario y ventas que la web.

#### 1.4.2 Aplicación web (tienda, punto de venta y administración)

La aplicación web React (Vite) cubre tres frentes bajo la marca visual Vesta:

- **Clienta:** inicio editorial, catálogo con búsqueda y filtros (categoría, ocasión, talla, color, precio, sucursal), ficha, favoritos, opiniones, carrito, compra en línea, reservas, probadores 2D/3D y acceso al bot de la tienda. La tienda se ofrece como **PWA instalable**.
- **Punto de venta:** apertura de caja con fondo, armado de ticket, aplicación de cupón, cobro simulado (efectivo, QR, tarjeta, transferencia o mixto), cierre de caja y cola offline cuando cae la red.
- **Administración y operación:** usuarios y roles, sucursales y almacenes, catálogo, inventario, precio mayorista, transferencia de stock entre almacenes, despacho, devolución, comprobante / NIT simulado, reportes del día, de inventario y generativos, auditoría y portal del proveedor (productos propios e ingresos de inventario).

#### 1.4.3 Backend (NestJS)

La API REST, en NestJS con TypeScript, organiza módulos de autenticación (JWT, bcrypt, roles y revocación), catálogo, inventario, ventas, caja, reservas, usuarios, proveedores, pagos simulados, despacho, devoluciones, transferencias, reportes, administración, bot de tienda y capacidades de ensayo. El stock de una venta se valida y descuenta dentro de una transacción: el disponible es cantidad menos reservado, y una sola venta descuenta el mismo saldo independientemente del canal (web o POS).

#### 1.4.4 Base de datos (PostgreSQL)

El modelo relacional (Prisma) incluye, entre otras, las entidades de usuario, sucursal, almacén, producto, variante, stock, movimiento de inventario, venta, línea de venta, pago simulado, reserva, caja, cupón, favorito, opinión, transferencia entre almacenes, despacho, devolución, comprobante simulado y auditoría. La base local se levanta con Docker; el mismo motor está previsto en Azure (PostgreSQL Flexible Server). Las restricciones de integridad y las transacciones evitan saldos negativos y overselling entre canales.

#### 1.4.5 Módulos de inteligencia artificial

| Capacidad | Función en EnsayAR |
|-----------|--------------------|
| Probador virtual 2D | Superpone la variante (talla × color) sobre el torso de la clienta a partir de cámara o foto. |
| Probador virtual 3D | Ensayo tridimensional de la prenda sobre el cuerpo, complementario al modo 2D. |
| Bot de la tienda | Asiste en lenguaje natural sobre catálogo, tallas, colores, ocasiones, reservas y pedidos. |
| Reportes generativos | Traduce una pregunta en español a un `SELECT` acotado (esquema permitido, límite de filas, solo lectura). |

Estas capacidades forman parte del producto documentado: el ensayo asistido reduce la compra a ciegas; el bot orienta sin sustituir al personal; el reporte generativo responde consultas de gerencia sin exponer la base a SQL libre ni a sentencias de modificación.

#### 1.4.6 Stock compartido y reserva

El inventario es matricial: cada unidad lógica es producto × talla × color × almacén. El **disponible** se calcula como cantidad menos reservado. La reserva bloquea unidades para retiro en sucursal o para completar una compra; al confirmar la venta —en línea o en caja— se descuenta el mismo stock. Las transferencias entre almacenes mueven saldo con trazabilidad; el despacho y la devolución actualizan movimientos de inventario de forma coherente con ese modelo único.

#### 1.4.7 Alertas

El sistema emite alertas operativas relevantes para la tienda y la administración: stock bajo o agotado por variante y almacén, ventas o reservas que no pueden completarse por falta de disponible, fallos o reintentos de la cola offline del POS, y avisos de sincronización al recuperar la red. El encargado y el administrador consultan estas señales junto con los reportes del día y de inventario.

### 1.5 Características del sistema

- **Omnicanal:** un saldo por variante y almacén; web, móvil y POS compiten por la misma unidad.
- **Disponible = cantidad − reservado:** la reserva reduce lo vendible sin confundirse con el descuento definitivo de la venta.
- **Multi-sucursal:** datos de demostración en Santa Cruz y La Paz, con transferencias entre almacenes.
- **Roles:** clienta, cajero, encargado, administrador y proveedor.
- **Ensayo asistido:** probador virtual 2D y 3D desde la ficha de producto.
- **Asistencia conversacional:** bot de la tienda para orientación de clienta y personal.
- **Caja y offline:** apertura, venta con cupón, cierre y cola local con sincronización idempotente.
- **Comercio extendido:** precio mayorista, despacho, devolución y comprobante / NIT simulado.
- **Pagos de entorno de prueba:** efectivo, QR, tarjeta, transferencia y mixto; si se usa pasarela, Stripe en modo prueba, sin cobro real.
- **PWA e instalación:** la tienda web es instalable; la clienta también dispone de app Expo / React Native.
- **Seguridad académica:** contraseñas con hash, token con expiración y revocación, autorización por rol.
- **Trazabilidad:** movimientos de inventario y auditoría de acciones relevantes.

### 1.6 Stack tecnológico

| Capa | Tecnología | Motivo en este parcial |
|------|------------|------------------------|
| API | NestJS + TypeScript | Arquitectura modular análoga a un backend empresarial |
| Acceso a datos | Prisma | Esquema, migraciones y cliente tipado sobre PostgreSQL |
| Web / PWA | React + Vite | Storefront, POS, reportes, administración e instalación como PWA |
| Móvil | React Native / Expo | Misma familia que la web y acceso a cámara para el probador |
| Datos | PostgreSQL | Relacional, transacciones y restricciones de integridad |
| Nube | Microsoft Azure | App Service, Static Web Apps, PostgreSQL Flexible Server, Application Insights (infraestructura como código en Bicep) |
| Pagos (prueba) | Simulación; Stripe en modo prueba si hace falta pasarela | Sin cobro bancario real |

Quedan fuera del stack de este examen: Spring Boot, Angular, Flutter, FastAPI como backend del parcial, y cualquier CMS de comercio de terceros (Shopify, Magento, WooCommerce, PrestaShop).

### 1.7 Ejemplos de situaciones de uso

**Situación 1 — Compra en línea.** La clienta abre el catálogo en la PWA o en el móvil, filtra por ocasión y talla, entra a la ficha, elige color y talla, consulta opiniones y confirma el carrito. El servidor recalcula el precio (incluyendo precio mayorista cuando aplica), comprueba el disponible (cantidad − reservado) del almacén y registra la venta con pago simulado. Si otra operación se llevó la última unidad, la compra se rechaza.

**Situación 2 — Venta en caja.** El cajero abre el turno con un fondo, arma el ticket (clienta y cupón opcionales) y cobra en efectivo, QR, tarjeta, transferencia o de forma mixta. El stock y la caja se actualizan en la misma transacción. Si no hay red, la venta queda en la cola offline y se sincroniza al reconectar, sin duplicar el cobro.

**Situación 3 — Reporte del día y generativo.** El administrador o el encargado consulta las ventas del día o formula una pregunta en español (“ventas de la sucursal de La Paz, por cajero, en el turno actual”). El sistema ejecuta un `SELECT` acotado, con límite, y muestra el resultado tabular. Cualquier intento de modificar datos o de leer tablas no permitidas se rechaza.

**Situación 4 — Ensayo 2D y 3D.** Desde la ficha, la clienta abre el probador 2D (cámara o foto) y superpone la variante elegida; luego puede pasar al probador 3D para evaluar volumen y caída sobre el cuerpo. El ensayo informa la decisión de compra o de reserva sin sustituir el control de stock del servidor.

**Situación 5 — Bot de tienda y reserva.** La clienta pregunta al bot por una prenda en talla M negra disponible en Santa Cruz; el bot orienta hacia la ficha y la sucursal. Si desea retirar en local, crea una reserva: el disponible baja (cantidad − reservado) hasta el retiro o la liberación, y la venta posterior —en web o en caja— descuenta el mismo inventario compartido.

### 1.8 Consideraciones importantes

| Tema | Criterio del sistema |
|------|----------------------|
| Pagos | Simulados (efectivo, QR, tarjeta, transferencia, mixto). Stripe solo en modo prueba; sin cobro bancario real. |
| Comprobante / NIT | Emisión simulada con fines académicos; sin NIT real ni facturación fiscal productiva. |
| Stock | Disponible = cantidad − reservado; una venta descuenta el mismo saldo en web y en caja. |
| Canales | PWA instalable, app Expo / React Native y POS con cola offline. |
| Ensayo e IA | Probador 2D, probador 3D, bot de tienda y reportes generativos de solo lectura. |
| Operación comercial | Precio mayorista, transferencia entre almacenes, despacho y devolución. |
| Roles | Clienta, cajero, encargado, administrador y proveedor. |
| Datos de demo | Sucursales en Santa Cruz y La Paz; credenciales `*@ensayar.bo` solo para el entorno académico. |
| Fuera de alcance | Cobro bancario real, NIT real y CMS de terceros. |

Las credenciales de demostración son académicas y no deben usarse fuera del entorno de la materia. El marco teórico está en la Parte II y el proceso de desarrollo en la Parte III.
