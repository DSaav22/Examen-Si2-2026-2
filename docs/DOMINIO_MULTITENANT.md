# Dominio de plataforma y de tiendas

Este documento fija la clasificación lógica para la arquitectura objetivo de una base PostgreSQL con un esquema por tienda. El contrato comprobable está en `backend/src/tenancy/dominio-ambitos.ts` y sus pruebas contrastan todos los modelos con el schema Prisma generado.

**Estado:** la clasificación se usa para identificar los modelos globales en la extensión de tenancy existente. La base y las conexiones siguen usando tablas compartidas; este contrato no crea esquemas ni migra datos.

## Datos globales de plataforma

| Modelos | Responsabilidad |
|---|---|
| `Cuenta` | Identidad global, credenciales y verificación: una persona puede tener perfiles en varias tiendas. |
| `Tienda` | Registro global de tiendas, slug, país, moneda, estado y dueño. Su ID es la referencia estable para localizar el espacio de trabajo. |
| `Plan` | Catálogo de planes, límites, módulos y precios. |
| `Suscripcion` | Asociación entre tienda y plan, período, vigencia y estado. Aunque tenga `tiendaId`, pertenece a plataforma. |
| `PagoSuscripcion` | Historial de los pagos simulados del SaaS asociados a la suscripción. |
| `TokenRevocado` | Revocación de tokens para sesiones de plataforma y de tienda. |

La pertenencia de una cuenta a una tienda se expresa actualmente mediante `Usuario.cuentaId`: el usuario es un **perfil local**, no una cuenta global distinta. El descubrimiento eficiente y seguro de todas las tiendas de una cuenta requerirá una estrategia concreta en la siguiente fase; no se añade un registro global duplicado sin definir cómo mantenerlo consistente.

## Datos propios de cada tienda

Cada uno de estos 39 modelos contiene `tiendaId` y pertenece exclusivamente a una tienda. En la arquitectura objetivo vive en el esquema de esa tienda; conservar o eliminar `tiendaId` físicamente queda sujeto a la implementación y pruebas de migración.

| Dominio | Modelos Prisma |
|---|---|
| Perfiles y estructura | `Usuario`, `Sucursal`, `Almacen`, `Proveedor`, `Empleado`, `TurnoEmpleado` |
| Catálogo | `Temporada`, `Coleccion`, `Producto`, `Variante`, `Categoria`, `ProductoCategoria`, `Promocion` |
| Inventario | `StockAlmacen`, `MovimientoInventario` |
| Reservas | `Reserva`, `LineaReserva` |
| Ventas y caja | `CajaTurno`, `Venta`, `LineaVenta`, `PagoSimulado`, `Pedido`, `Devolucion`, `DevolucionLinea` |
| Créditos | `CuentaCobrar`, `AbonoCredito` |
| Clientes | `DireccionCliente`, `Favorito`, `CuentaLealtad`, `Cupon`, `Opinion`, `AlertaProducto` |
| Reportes, auditoría y avisos | `ReporteEjecucion`, `EventoAnalitica`, `Auditoria`, `Notificacion`, `PushSuscripcion` |
| Sincronización | `Dispositivo`, `OperacionSync` |

`PagoSimulado` es pago de una **venta retail** y es local. `PagoSuscripcion` corresponde a la **suscripción SaaS** y es global: son operaciones y registros distintos aunque utilicen un catálogo de métodos por país.

## Relaciones entre ámbitos y reglas de identidad

1. `Tienda.duenoCuentaId → Cuenta.id`: ambos globales.
2. `Suscripcion.tiendaId → Tienda.id` y `Suscripcion.planId → Plan.id`: globales. `PagoSuscripcion.suscripcionId → Suscripcion.id` también es global.
3. `Usuario.cuentaId → Cuenta.id`: relación local hacia la identidad global; el esquema de la tienda debe conservar una referencia válida a la cuenta compartida.
4. Las demás claves foráneas explícitas entre modelos de negocio deben apuntar a tablas del **mismo esquema de tienda**. Los identificadores y cabeceras proporcionados por clientes no autorizan acceso por sí solos.
5. Los datos de rol, sucursal y proveedor de un perfil pertenecen a la tienda. La misma cuenta puede tener roles diferentes en negocios distintos.
6. Las operaciones offline y sus claves, las ventas y sus identificadores de idempotencia deben conservar el ámbito de la tienda; una operación pendiente nunca debe cambiar de tienda por un selector o sesión diferente.
7. Archivos, cachés, notificaciones y reportes deben respetar el mismo ámbito. Su ubicación o filtrado físico se resolverá en las fases de conexión y seguridad.

Las pruebas del contrato identifican cualquier relación nueva con clave desde un modelo local hacia uno global. Una modificación legítima requiere actualizar el contrato y documentar cómo se autorizan, migran y mantienen los datos.

## Enums y vistas

Los enums no son por sí mismos registros de un tenant: son tipos PostgreSQL. `EstadoPago` se usa tanto en `PagoSuscripcion` global como en `PagoSimulado` local; los estados de tienda y suscripción son globales, mientras roles y estados de venta/reserva pertenecen a operaciones locales. El ensayo comprobó que tipos del mismo nombre en esquemas diferentes no son intercambiables automáticamente para Prisma. Su representación, las vistas y las transacciones entre ámbitos deben resolverse y probarse antes del cambio de conexión.

La vista `v_reporte_ventas` consulta ventas, líneas, variantes, productos, almacenes, sucursales y usuarios; en la arquitectura objetivo debe leer exclusivamente los datos de la tienda activa. Las consultas SQL directas requieren una auditoría adicional, pues el contrato de modelos por sí solo no las aísla.

## Alta de futuras tiendas desde la web

Flujo objetivo, pendiente de implementación por esquemas:

1. La cuenta global verificada selecciona plan y país; el servidor valida límites, moneda y pago simulado.
2. La plataforma registra la tienda y suscripción con un identificador interno estable; el identificador de esquema se deriva de ese ID, no de una cadena libre del navegador.
3. El aprovisionador crea y versiona el esquema de la tienda con las tablas, tipos, claves, vistas y demás objetos requeridos.
4. Se crean en la tienda el perfil administrador vinculado a `Cuenta`, la primera sucursal, almacén y categorías iniciales.
5. El espacio se activa y la cuenta puede entrar cuando todos los pasos se hayan confirmado. Ante fallos, el estado y la compensación deben ser visibles y recuperables, sin un tenant parcialmente activo ni doble cobro simulado.
6. Cada nueva versión del modelo se aplica y registra por esquema. Los tenants creados después reciben la versión vigente.

La implementación, la atomicidad o compensación, los permisos PostgreSQL, el enrutamiento de Prisma y la ejecución de migraciones para todos los tenants corresponden a las siguientes fases. La clasificación de este documento no certifica esos comportamientos.
