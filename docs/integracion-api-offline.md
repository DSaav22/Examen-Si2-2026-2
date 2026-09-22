# Integración API y funcionamiento offline

## Estado de la integración real

El backend ya utiliza NestJS, DTOs con `class-validator`, Prisma y PostgreSQL.
La creación de ventas se ejecuta dentro de una transacción: valida el turno y
la sucursal, bloquea stock, recalcula precios desde la base, crea la venta y
sus líneas, descuenta o reserva inventario y registra movimientos.

`Venta.uuid` tiene restricción única y funciona como `operationId`: si se reenvía
el mismo payload, el backend devuelve la venta existente y no la duplica.

El frontend centraliza las solicitudes HTTP en `frontend/src/api.ts`; todavía
hay pantallas antiguas que importan ese cliente directamente en lugar de pasar
por repositorios por módulo. Esta migración se hará progresivamente.

## Offline del POS

El POS conserva una cola local y ahora la replica en IndexedDB:

- Cada dispositivo obtiene un identificador local.
- Cada venta conserva su `uuid` durante los reintentos.
- Las operaciones se guardan como `pending` y pueden quedar `failed`.
- La cola se hidrata al abrir nuevamente la aplicación.
- Al recuperar la conexión, el POS reenvía las operaciones al backend.
- El servidor aplica la idempotencia y valida nuevamente stock/precios.

Todavía no se almacena un catálogo completo offline ni se implementan todos los
estados `draft`, `syncing`, `synced`, `conflict` y `cancelled` en una pantalla
operativa. Los conflictos de stock, precio o caja requieren decisión autorizada.

## Datos todavía simulados o dependientes de conexión

- Promociones y cupones.
- Clientes desde el POS.
- Favoritos y alertas sincronizados con backend.
- Opiniones y fidelización.
- Analítica de visitas y conversión.
- Auditoría persistente.
- Tarjeta, transferencia y pago mixto.
- Catálogo e inventario completo disponible sin conexión.
