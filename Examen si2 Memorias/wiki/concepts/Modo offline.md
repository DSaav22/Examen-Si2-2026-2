---
tipo: concept
fuentes: 4
actualizado: 2026-11-08
tags: [offline, pos, nfr, segundo-parcial]
---

# Modo offline

Requisito del audio: si se cae internet, el [[Punto de venta]] **sigue vendiendo**. Luego sincroniza. El audio lo nombra como PWA + storage local. [[transcripcion-audio-clase-ecommerce]]

## Canon técnico

El stack no es PWA-obligatorio: web = [[React]], móvil = [[React Native]]. [[stack-metodologia-parcial]]

Hay que cumplir la **capacidad** (cola local + sync), no el sello “PWA”. En React Native eso es almacenamiento local; en React web puede ser service worker si hace falta.

Garzón pide disponibilidad (RNF03) pero no detalla offline-first. [[examen1-garzon-fashionstore]]

## Segundo parcial: pasa a ser central

[[transcripcion-audio-segundo-parcial]] lo vuelve requisito fuerte para **web y móvil**, no solo el POS:

- Web como [[PWA]]. Móvil con base local; el docente sugiere SQLite.
- Debe poder registrar ventas, clientes y productos sin red, y sincronizar completo después.
- "Se cayó el sistema" ya no es excusa: indica mal desarrollo.

Problemas que el docente **forzará en la defensa**:

1. **IDs:** dos dispositivos crean registros offline. Solución: UUID generado en el cliente.
2. **Última unidad:** dos vendedores offline venden el mismo celular. Uno se entera al sincronizar. Solución: actualización condicional en la base (`UPDATE … WHERE stock >= n` o `FOR UPDATE`) y estado de conflicto visible.
3. **Doble "guardar":** red inestable, el usuario pulsa 3 o 4 veces. Solución: **idempotencia** (la misma clave de operación devuelve el mismo resultado sin duplicar).
4. **Rollback:** fácil en un monolito con una base; con microservicios requiere compensaciones (sagas). La app es un **monolito modular** listo para separarse.

Además hay que decidir qué **no** puede ser offline (un pago en línea no) y fijar una ventana offline según el negocio (el docente menciona hasta ~7 días).

## Implementación en EnsayAR (8 nov, punto 2 cerrado)

Migración `20261108200000_offline_sync`. Verificado con `npm run verificar:offline` (14 chequeos contra la API real) y recorridos en navegador de la web y de la app móvil en Expo web.

**Servidor (`backend/src/sync`):**

- `POST /sync/lote`: recibe hasta 200 operaciones `{id, tipo, creadaEn, datos}` de un dispositivo y las procesa **en orden, cada una en su propia transacción**. Responde un estado por operación: `aplicada`, `repetida`, `fusionada`, `conflicto`, `rechazada`, `vencida`, `en_curso` o `error`.
- Tipos: `venta` (solo efectivo), `cliente` (si el correo ya existe en la tienda se **fusiona** con el existente y las ventas que lo referían pasan al id del servidor) y `producto` (con variantes y stock inicial).
- Cada operación queda en `OperacionSync` con su huella (hash del contenido). El mismo id con el mismo contenido devuelve `repetida`; con otro contenido, `IDEMPOTENCIA_CONFLICTO`.
- La venta guarda la **fecha real** en que se hizo sin red (`hechaEn`), no la de sincronización.
- Conflictos y rechazos se avisan a administradores y encargados con una notificación (y Web Push).

**Idempotencia HTTP (O6):** interceptor global con decorador `@Idempotente()` en 11 endpoints. El cliente manda la cabecera `Idempotency-Key`:

- Mismo contenido: se devuelve la respuesta guardada, con la cabecera `Idempotent-Replayed: true`.
- Otro contenido: 422.
- Varias llamadas simultáneas: una ejecuta y las demás esperan su resultado.
- Error del servidor: la clave se libera para reintentar.

En la prueba, cuatro `POST /ventas` simultáneos con la misma clave crearon una sola venta.

**Última unidad (O5):** el stock se descuenta con `UPDATE stock_almacen SET cantidad = cantidad - n WHERE … AND cantidad - reservado >= n`. Si no afecta filas, la transacción entera se deshace y la operación queda en `conflicto` con `{varianteId, disponible, pedido}`. El dispositivo ofrece **"Vender lo disponible"** (reintenta con la cantidad que queda) o **Descartar**. El panel `/sincronizacion` lista los conflictos de la tienda para marcarlos resueltos.

**Política (O8) y ventana (O9):** `politica.ts` define qué funciona sin red y por qué:

| Sin red | Solo en línea |
|---------|---------------|
| Venta en efectivo | Pago QR o tarjeta |
| Alta de clientes | Compra online |
| Alta de productos | Devoluciones |
| Consulta de catálogo y stock local | Cierre de caja, inventario, usuarios y suscripción, reportes |
| | Venta al crédito y abonos (desde el punto 3) |

El pago con QR o tarjeta no puede hacerse sin red porque la pasarela tiene que confirmarlo en el momento. Reintentarlo después arriesga cobrar dos veces. Fiar tampoco va sin red: hace falta ver la deuda real de la clienta, y dos cajas con datos viejos podrían cobrar el mismo abono. La ventana se guarda en `Tienda.ventanaOfflineDias` (1–30, por defecto 7). Una operación más vieja llega como `vencida`, y una fechada a futuro se rechaza.

**Web (O1):** cola en IndexedDB por tienda y sincronización automática al volver la red, al abrir la app y cada 30 s. El POS, el alta rápida de clientas y el alta de productos funcionan sin red. El cierre de caja se bloquea mientras haya operaciones pendientes o en conflicto. Ver [[PWA]].

**Móvil (O2):** `expo-sqlite` con las tablas `operaciones` y `cache` en `movil/src/offline/almacen.native.ts`. Expo web usa AsyncStorage como respaldo con la misma interfaz. Incluye:

- UUID con `expo-crypto`;
- NetInfo para detectar la reconexión;
- la misma lógica de `/sync/lote`;
- la caja que vende en efectivo y registra clientas sin red;
- arranque sin red con la sesión guardada.

**Rollback y sagas (O7):** en el monolito, cada operación es **una transacción ACID** de PostgreSQL: venta, líneas, movimiento de inventario y total del turno se confirman juntos o no se confirma nada. Con microservicios, la venta, el inventario y la caja tendrían bases distintas y no hay transacción común. Hace falta una **saga**: una secuencia de transacciones locales en la que cada paso publica un evento y, si uno falla, se ejecutan **compensaciones** (por ejemplo, devolver el stock reservado y anular la venta). El proyecto ya usa ese patrón en el alta SaaS: si el aprovisionamiento falla después de cobrar, se reembolsa.

## Cómo forzar el conflicto en la defensa

1. Dos cajas con turno en la misma sucursal y una variante con poco stock (por ejemplo 2).
2. La caja A corta la red y vende las 2 en efectivo; queda **Pendiente**.
3. La caja B, con red, vende 1.
4. La caja A recupera la red: la venta pasa a **Conflicto** con "había 1 y la venta pedía 2". El stock no queda negativo y el admin recibe el aviso.
5. "Vender lo disponible" registra 1 unidad; el stock queda en 0.

## Limitaciones conocidas

- El JWT dura 12 h y la ventana es de 7 días. Si la sesión vence sin red, la cola **se conserva**: al sincronizar llega 401, la app pide volver a entrar y después envía la cola.
- El reintento de un conflicto usa un id nuevo; la operación original queda en el historial de la tienda hasta que alguien la marca resuelta.
- La app móvil con SQLite real no se probó en un dispositivo Android: se probó en Expo web y se verificó que el bundle de Android compila.
