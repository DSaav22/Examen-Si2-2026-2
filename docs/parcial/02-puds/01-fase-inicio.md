# Capítulo 3 — Fase de Inicio

**Parte II — Proceso Unificado de Desarrollo de Software**  
**Sistema:** EnsayAR  
**Hito de la fase:** objetivos del ciclo de vida (Lifecycle Objective)  
**Apertura de la fase:** 12 de septiembre de 2026  
**Ajuste de alcance:** 19 de septiembre de 2026  
**Presentación del parcial:** 23 de septiembre de 2026  

Referencia: Jacobson, I., Booch, G. y Rumbaugh, J. *El proceso unificado de desarrollo de software*.

El relato de negocio (problema, objetivos y límites del producto) está en el capítulo 1. Aquí se registran los artefactos de **Inicio**: visión operativa, actores, casos de uso en formato breve, requisitos no funcionales, riesgos y arquitectura candidata. Esta fase no construye el software. La Elaboración detalla los casos críticos y fija el baseline.

**Disciplinas de esta fase:** captura de requisitos (principal); esbozo de análisis y de diseño (arquitectura candidata). Implementación y pruebas quedan para Construcción y para el capítulo de pruebas.

---

## 3.1 Propósito

Inicio responde si hay un problema real, un sistema viable y un alcance que se puede demostrar el 23 de septiembre. El resultado es un acuerdo de equipo: qué entra en el MVP, qué queda fuera y qué tres casos de uso dirigen la arquitectura.

---

## 3.2 Visión

EnsayAR es la plataforma omnicanal de una cadena de moda femenina. Vende en línea y en caja sobre el mismo inventario (producto × talla × color × almacén).

Frente a un catálogo genérico, el ciclo de vida se justifica con dos capacidades:

1. **Probador virtual:** la clienta ve la variante sobre su cuerpo (cámara o foto, overlay 2D), no sobre un maniquí.
2. **Consulta bajo demanda:** la administración formula una pregunta y obtiene una tabla a partir de un `SELECT` de solo lectura. Los reportes fijos (día e inventario) conviven con esa consulta.

El nombre junta *ensayar* y *AR*. El detalle del problema y de los objetivos está en las secciones 1.2 a 1.4.

---

## 3.3 Actores

| Actor | Tipo | Quiere |
|-------|------|--------|
| Clienta | Primario | Ver el catálogo, ensayar, reservar y comprar con el stock real de la sucursal. |
| Cajero | Primario | Abrir la caja, cobrar en el local y cerrar el turno. |
| Encargado de sucursal | Primario | Ver inventario, ventas y reservas de su sucursal. |
| Administrador | Primario | Mantener catálogo, usuarios y sucursales; pedir reportes. |
| Proveedor | Primario | Registrar ingresos de inventario de sus productos. |
| Servicio de consulta | Apoyo | Responder la ficha con datos ya cargados y compilar la pregunta del reporte. No modifica stock. |
| Pasarela simulada | Apoyo | Aprobar o rechazar un QR de prueba. |

El vendedor puede operar el punto de venta con un permiso más acotado que el del cajero. Superadministrador y recursos humanos existen en el modelo de datos y no tienen un módulo propio en este parcial.

---

## 3.4 Alcance acordado para el 23 de septiembre

### 3.4.1 Entra en el MVP

- Autenticación y roles: clienta, cajero, encargado, administrador y proveedor.
- Catálogo con filtros; ficha; variantes talla × color; stock por sucursal y almacén.
- Temporadas y colecciones como clasificación del catálogo.
- Carrito y compra en línea con pago simulado (contra entrega o QR).
- Reservas de prendas y su atención en sucursal.
- POS: apertura con fondo, venta, cupón, cierre de turno.
- Cola local del POS si cae la red, con sincronización posterior.
- Probador: hoy overlay 2D; el **3D entra** y se avanza en lo que el tiempo permita.
- Bot de tienda: entra; hoy la ficha responde por reglas.
- Pasarela y factura: simulación (Stripe en modo prueba si hace falta). Sin cobro ni NIT reales.
- PWA, precio mayorista, transferencia entre almacenes, despacho y devolución: entran; se implementa lo que alcance.
- API NestJS, clientes React y React Native, PostgreSQL, infraestructura Azure preparada.

### 3.4.2 Queda fuera

| Tema | Motivo |
|------|--------|
| Cobro bancario real y NIT real | El entorno es académico. La pasarela y la factura se simulan. |
| CMS (Shopify, Magento, WooCommerce, PrestaShop) | El código es propio. |
| Spring Boot, Angular, Flutter, FastAPI como backend de este examen | No son el stack del parcial. |

---

## 3.5 Casos de uso en formato breve

En Inicio cada caso lleva identificador, actor y resultado de éxito. El flujo, las alternativas y las excepciones de los treinta y cinco casos están en `casos-de-uso-detalle.md`. El diagrama UML se inserta desde Enterprise Architect.

| ID | Caso de uso | Actor | Éxito | Prioridad |
|----|-------------|-------|--------|-----------|
| UC01 | Consultar catálogo | Clienta, Administrador | Lista filtrada con precio y disponibilidad. | Alta |
| UC02 | Ver ficha y variantes | Clienta | Ve talla, color, fotos y stock de la sucursal. | Alta |
| UC03 | Usar probador virtual | Clienta | Ve la variante sobre su cuerpo (cámara o anclaje manual). | Crítica |
| UC04 | Consultar la ficha | Clienta | Recibe precio, talla, color, ocasión o descripción ya cargados. | Media |
| UC05 | Comprar en línea | Clienta | Venta registrada; pago simulado; stock descontado. | Alta |
| UC06 | Abrir caja | Cajero | Turno abierto con fondo inicial. | Alta |
| UC07 | Registrar venta en POS | Cajero | Venta cobrada; stock descontado; ticket. | Crítica |
| UC08 | Cerrar caja | Cajero | Arqueo del turno (esperado frente a declarado). | Alta |
| UC09 | Administrar catálogo | Administrador | Alta o edición de producto, variante y stock. | Alta |
| UC10 | Pedir reporte | Administrador | Tabla de ventas o de inventario; la pregunta libre solo produce un `SELECT` permitido. | Crítica |
| UC11 | Reservar una prenda | Clienta | Reserva en una sucursal; el saldo reservado sube. | Alta |
| UC12 | Atender reservas | Encargado | Cambia el estado de la reserva de su sucursal. | Alta |
| UC13 | Ingresar mercadería | Proveedor | Movimiento de ingreso asociado a sus productos. | Media |
| UC14 | Registrarse | Clienta | Cuenta creada. | Alta |
| UC15 | Iniciar y cerrar sesión | Todos | Sesión con token, o token revocado al salir. | Alta |
| UC16 | Cambiar clave | Usuario | La clave anterior deja de servir. | Media |
| UC17 | Gestionar favoritos | Clienta | El producto queda marcado o se quita. | Media |
| UC18 | Perfil y direcciones | Clienta | Datos y direcciones guardados. | Media |
| UC19 | Ver historial | Clienta, cajero, encargado | Lista de sus ventas. | Alta |
| UC20 | Opinar un producto | Clienta | Opinión registrada, sujeta a moderación. | Media |
| UC21 | Pedir alerta de producto | Clienta | Alerta guardada. | Baja |
| UC22 | Aplicar cupón | Clienta, cajero | El total de la venta refleja el descuento válido. | Media |
| UC23 | Gestionar usuarios | Administrador | Alta o cambio de usuario y rol. | Alta |
| UC24 | Sucursales, temporadas y colecciones | Administrador | Esos catálogos quedan actualizados. | Media |
| UC25 | Ajustar inventario | Encargado, administrador | Kardex con el saldo nuevo. | Alta |
| UC26 | Moderar y auditar | Administrador | Opinión moderada o evento de auditoría visible. | Media |
| UC27 | Simular un pago | Cajero, clienta | El medio queda aprobado o rechazado sin cobrar de verdad. | Alta |
| UC28 | Probador 3D | Clienta | Ve la prenda con volumen, en el avance que exista. | Alta |
| UC29 | Hablar con el bot | Clienta | Respuesta de asistencia más allá de la ficha fija. | Alta |
| UC30 | Precio mayorista | Administrador, clienta mayorista | Precio distinto según el tipo de compra. | Media |
| UC31 | Transferir stock | Encargado | El saldo sale de un almacén y entra en otro. | Media |
| UC32 | Despachar pedido | Encargado | El pedido queda enviado. | Media |
| UC33 | Devolver una venta | Cajero, clienta | El stock vuelve y la venta queda devuelta. | Media |
| UC34 | Comprobante simulado | Cajero, administración | Documento de prueba, sin NIT real. | Media |
| UC35 | Tienda instalable (PWA) | Clienta, cajero | La web sigue usable sin red en lo ya previsto. | Media |

**Dirigen la Elaboración** (riesgo de arquitectura): UC03 (cámara y overlay), UC07 (stock y caja en una transacción; la compra en línea UC05 reutiliza ese contrato) y UC10 (consulta acotada).

---

## 3.6 Requisitos no funcionales

| ID | Requisito | Criterio de Inicio |
|----|-----------|-------------------|
| RNF01 | Seguridad | Contraseña con hash; JWT; la consulta generativa solo ejecuta `SELECT` sobre el conjunto permitido. |
| RNF02 | Disponibilidad del POS | Si cae la red, la venta de caja queda en cola local y se sincroniza después. |
| RNF03 | Usabilidad | Web usable en escritorio; móvil para la clienta y la cámara. |
| RNF04 | Consistencia | Dos ventas de la misma variante y almacén no dejan el stock en negativo. |
| RNF05 | Escalabilidad de sucursales | Una sucursal nueva es un dato, no un redespliegue. |
| RNF06 | Mantenibilidad | Módulos en la API; web y móvil como clientes distintos. |
| RNF07 | Integración | API REST. Pago simulado y consulta detrás de un contrato, no mezclados con el stock. |
| RNF08 | Pagos académicos | QR, efectivo y contra entrega de prueba. Sin cobro bancario. |
| RNF09 | Código propio | Sin CMS de comercio electrónico. |

---

## 3.7 Glosario

| Término | Definición en EnsayAR |
|---------|------------------------|
| Variante | Combinación vendible de talla y color. Tiene stock y puede tener overlay. |
| Almacén | Depósito de una sucursal. La venta descuenta de un almacén. |
| Reservado | Unidades apartadas por una reserva; no están libres para otra venta. |
| POS | Punto de venta: turno, ticket y medios simulados. |
| Arqueo | Comparar lo declarado en caja con el total que calculó el sistema. |
| Probador 2D | Overlay de la variante anclado al torso. No simula tela en 3D. |
| Reporte generativo | Pregunta no prediseñada que se compila a un `SELECT` validado. |
| Cola offline | Ventas de caja guardadas en el navegador hasta que hay red. |
| Omnicanal | Un inventario; canal en línea y canal de caja. |

---

## 3.8 Riesgos aceptados en Inicio

| ID | Riesgo | Impacto | Mitigación acordada |
|----|--------|---------|---------------------|
| R1 | El 3D no alcanza a cerrarse para la defensa | Alto | Se muestra el 2D que ya existe y se dice qué falta del 3D. |
| R2 | Una pregunta arma SQL que escribe o lee de más | Alto | Solo `SELECT`, vista o conjunto permitido, tope de filas. |
| R3 | Web y POS descuentan dos veces la misma unidad | Alto | Una transacción por variante y almacén; prueba de UC05 y UC07. |
| R4 | La cuenta de Azure no alcanza a provisionarse antes de la defensa | Medio | La infraestructura queda descrita; la demo puede apoyarse en el entorno local si el alta de nube no está lista, y se dice con claridad. |
| R5 | La pose no corre en el emulador | Medio | Prueba en teléfono; si no hay pose, anclaje por toques. |
| R6 | Se presenta como terminado lo que solo está empezado (3D, bot, PWA, mayorista, despacho) | Alto | En la defensa se distingue alcance de lo que ya corre. |
| R7 | El pago simulado se cuenta como pasarela real | Medio | Stripe, si se usa, es modo prueba. Factura y NIT simulados. |

Inicio se considera cerrado cuando R1, R2, R3 y R6 quedan aceptados. Esta versión los acepta.

---

## 3.9 Arquitectura candidata

Clientes **React Native** (clienta y cámara) y **React** (tienda, POS y administración) hablan con una API **NestJS**. Los datos viven en **PostgreSQL**. El pago simulado y la consulta acotada son puertos del monolito, no servicios desplegados aparte. El overlay se calcula en el cliente; el servidor solo entrega la imagen de la variante.

Módulos previstos de la API: autenticación, catálogo, inventario, ventas, caja, reservas, usuarios, proveedores, reportes, pagos simulados y administración.

La figura de arquitectura candidata se elabora en Enterprise Architect y se inserta en este capítulo. El baseline se contrasta en Elaboración con tres spikes: overlay, venta concurrente que descuenta stock, y pregunta que solo produce un `SELECT` permitido.

---

## 3.10 Criterio de cierre de la fase

Inicio queda cumplido si:

1. Visión, alcance y exclusiones están escritos y coinciden con el capítulo 1.
2. Los casos UC01–UC35 cubren lo que el código ya hace y lo que el 23 sep a la noche se decidió construir en la medida de lo posible.
3. UC03, UC07 y UC10 están marcados como críticos para Elaboración.
4. Los riesgos R1–R6 tienen mitigación.
5. La arquitectura candidata usa el stack del curso.

La fase siguiente parte de esos tres casos críticos y del modelo de dominio del inventario matricial.
