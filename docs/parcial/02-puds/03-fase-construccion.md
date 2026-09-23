# 3.4 Flujo de trabajo: implementación

**Parte II — Proceso Unificado de Desarrollo de Software**  
**Sistema:** EnsayAR  
**Hito de la fase:** versión operativa del baseline (incremento)  
**Fecha de entrega y defensa:** 23 de septiembre de 2026  

Referencia: Jacobson, I., Booch, G. y Rumbaugh, J. *El proceso unificado de desarrollo de software*.

Elaboración fijó el baseline arquitectónico. Construcción lo convierte en un sistema usable: la clienta consulta y compra, la caja cobra, el encargado mueve inventario y administración pide reportes. Esta sección describe la plataforma elegida, la arquitectura implementada, los subsistemas con sus casos UC01–UC35 y la puesta en marcha con capacitación, porque el docente exige que el usuario aprenda la aplicación dentro del flujo de implementación.

---

## 3.4.1 Elección de plataforma de desarrollo de software

### Lenguaje de programación

TypeScript es el lenguaje común del backend, del front web y del cliente móvil. Tipado estático, un solo ecosistema de paquetes y coincidencia con el stack del parcial. No se usa Python, Java ni Dart como lenguaje principal de EnsayAR.

### Framework backend: NestJS

La API es NestJS 11: módulos, inyección de dependencias, controladores y servicios. Prisma 6 genera el cliente sobre PostgreSQL. Autenticación con JWT y bcrypt. La venta, el stock y los reportes viven en el servidor; el cliente no decide el precio ni el saldo disponible.

### Librería frontend: React

La tienda y el backoffice web usan React 19 con Vite. Catálogo, ficha, carrito, POS, reportes, administración, portal del proveedor, probador, bot y PWA. No se usa Angular ni un CMS de comercio (Shopify u equivalente).

### Framework móvil: Expo y React Native

El canal móvil es Expo 53 sobre React Native 0.79. Comparte la misma API NestJS: inicio de sesión, catálogo, carrito, compra, reservas y cámara del probador. Una sola fuente de verdad de inventario y precios.

### Bases de datos

PostgreSQL es la base relacional. El esquema físico está en Prisma (`backend/prisma/schema.prisma`), con migraciones versionadas y semilla académica. El saldo de stock vive en la tabla de inventario; el historial, en movimientos. La vista `v_reporte_ventas` es la única fuente de la pregunta libre de reportes.

### Entorno de desarrollo

Desarrollo local: PostgreSQL (Docker o instancia propia), API en el puerto 3000, web en el puerto 5173, móvil apuntando a la IP de la máquina cuando corre en un teléfono. Variables: `DATABASE_URL`, `JWT_SECRET` y el puerto de la API. La infraestructura de nube se describe en Azure Bicep (App Service, Static Web Apps, Flexible Server, Application Insights) y en `azure.yaml`.

---

## 3.4.2 Implementación de la arquitectura del sistema

EnsayAR se implementa como monolito modular NestJS: un solo proceso de API con módulos por dominio (identidad, catálogo, ventas, inventario, reportes, pagos, etc.). Dos clientes consumen esa API: la web React (tienda, caja, administración y PWA) y la app Expo. PostgreSQL concentra el estado compartido; el stock se descuenta solo en el servidor, dentro de una transacción con bloqueo de fila.

Decisiones del baseline que la implementación sostiene:

| Decisión | Realización |
|----------|-------------|
| Un `POST /ventas` para línea y POS | El cuerpo lleva el canal. El precio lo recalcula el servidor. |
| Stock solo en el servidor | Transacción con `FOR UPDATE`. Sin disponible suficiente, la venta no se cobra. |
| Idempotencia | Identificador único de venta: reenviar el mismo no descuenta dos veces. |
| Probador en el cliente | Overlay 2D y, cuando hay modelo, vista 3D. El video no se sube. |
| Pregunta libre acotada | Compilador más validador: solo `SELECT` sobre `v_reporte_ventas`. |
| Reserva distinta de venta | Reservar aumenta `reservado`. Completar genera la venta y libera el aparto. |
| Pago y comprobante | Simulación (efectivo, QR, contra entrega; Stripe en modo prueba si se usa pasarela). Comprobante sin NIT real. |

**Despliegue y criterio de la fase de transición.** El 23 de septiembre se entrega el incremento operativo con semilla académica, el informe en tres partes y el recorrido corto de defensa (unos quince minutos): caja abre turno y cobra, administración pide un reporte o una pregunta permitida, la clienta recorre catálogo y probador; si queda tiempo, cola offline del POS. La infraestructura Azure (Bicep) prepara App Service, Static Web Apps, PostgreSQL Flexible Server y Application Insights. La demostración se hace en el entorno disponible el día de la defensa (local o nube). No se afirma un URL de producción que aún no exista; fuera de alcance quedan el cobro bancario real y el NIT real.

---

## 3.4.3 Implementación de la arquitectura de subsistemas

Los casos UC01–UC35 se agrupan en subsistemas implementados. Cada grupo resume qué hace el sistema.

### Identidad y administración de acceso

Registro de clienta, inicio y cierre de sesión con JWT, cambio de clave, gestión de usuarios y roles (UC14, UC15, UC16, UC23). Moderación de opiniones y consulta de auditoría (UC26). Datos de demostración: sucursales y cuentas `admin@`, `cajero@`, `encargado@`, `proveedor@` y `clienta@ensayar.bo`.

### Catálogo y ficha

Consulta con filtros, ficha con variantes e imágenes, alta y edición de productos, sucursales, temporadas y colecciones (UC01, UC02, UC09, UC24). Favoritos, perfil, direcciones, opiniones y alertas de producto (UC17, UC18, UC20, UC21). Precio mayorista cuando el perfil o la regla de negocio lo aplican (UC30).

### Caja y ventas

Abrir y cerrar turno, venta en POS, compra en línea, cupón e historial (UC05, UC06, UC07, UC08, UC19, UC22). Un solo endpoint de venta recalcula precio, bloquea stock y registra líneas. Sin turno abierto, la caja no cobra.

### Reservas e inventario

Reservar y atender reservas (UC11, UC12). Ajuste de inventario, ingreso del proveedor y transferencia entre almacenes (UC13, UC25, UC31). El kardex refleja el saldo; catálogo y POS ven la misma disponibilidad.

### Probador 2D y 3D

Probador 2D con overlay anclado a la pose o a toques en los hombros (UC03). Probador 3D cuando la variante tiene modelo; si no, permanece el modo 2D (UC28). El procesamiento corre en el dispositivo.

### Bot y asistencia de ficha

Consulta acotada a campos de la prenda (UC04) y bot de asistencia limitado al catálogo y al perfil de la clienta (UC29). No inventa stock ni abre SQL libre.

### Reportes

Reportes del día, inventario y pregunta libre que solo produce un `SELECT` permitido sobre la vista de ventas (UC10). Un `UPDATE` u otra tabla se rechaza antes de ejecutarse.

### Pagos y comprobante

Pago simulado: efectivo, QR, contra entrega; Stripe solo en modo prueba (UC27). Comprobante simulado de prueba, sin NIT real (UC34). El resultado aprobado o rechazado alimenta la venta sin mover dinero verdadero.

### Mayorista, transferencias, despacho y devolución

Precio mayorista en la venta cuando corresponde (UC30). Transferencia de stock entre almacenes (UC31). Despacho de pedido en línea (UC32). Devolución de venta con reintegro de stock (UC33).

### PWA y operación sin red en caja

Tienda instalable como PWA y cola offline del POS: la venta queda pendiente en el navegador y se sincroniza al volver la red, sin duplicar el cobro (UC35, alternativa operativa de UC07).

---

## 3.4.4 Puesta en marcha y capacitación

Esta sección forma parte de la implementación: el docente pide que el usuario aprenda la aplicación. El mecanismo es un entorno sembrado, un recorrido de unos quince minutos y una guía breve por rol. No hay un curso aparte.

**Puesta en marcha.** Se levanta PostgreSQL. En `backend/` se aplican migraciones, se corre la semilla y se inicia la API. En `frontend/` se inicia la web. El móvil, desde `movil`, apunta a la IP de la máquina si corre en un teléfono. Puertos: API 3000, web 5173.

**Cuentas de laboratorio** (clave académica de la semilla):

| Rol | Correo |
|-----|--------|
| Administración | admin@ensayar.bo |
| Caja | cajero@ensayar.bo |
| Encargado de sucursal | encargado@ensayar.bo |
| Proveedor | proveedor@ensayar.bo |
| Clienta | clienta@ensayar.bo |

**Recorrido de unos quince minutos.** Entra caja: abre turno, cobra una prenda en efectivo o con QR simulado y verifica que bajó el stock. Entra administración: pide el reporte del día o una pregunta sencilla; la pantalla muestra la tabla y el SQL. Entra la clienta: catálogo, ficha y probador (cámara o marca de hombros). Si queda un minuto, se corta la red en caja, se cobra y al reconectar se sincroniza la cola una sola vez.

**Guía breve por rol.**

- **Clienta.** Catálogo, ficha, favoritos, carrito, reserva, compra con pago simulado, probador 2D/3D y bot acotado a la prenda.
- **Cajero.** Abrir turno, vender en POS, aplicar cupón, pago simulado, ticket, cerrar caja; sin red, la cola del navegador espera y sincroniza.
- **Encargado.** Inventario, reservas, transferencias y despacho de su sucursal; completar una reserva genera la venta.
- **Administrador.** Catálogo, usuarios, sucursales, reportes con `SELECT` acotado, precio mayorista y comprobante simulado.
- **Proveedor.** Productos vinculados e ingreso de mercadería (movimiento de inventario, no venta de caja).

**Qué no prometer.** Cobro bancario real ni NIT real. El pago y el comprobante son de laboratorio. El reporte es compilador y validador, no un modelo de lenguaje libre. Azure se muestra con el plan Bicep y, si la suscripción está lista, con el aprovisionamiento; si no, la capacitación y la defensa usan el entorno local descrito arriba.
