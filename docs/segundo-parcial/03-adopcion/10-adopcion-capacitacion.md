# 10. Adopción y capacitación

En el primer ciclo la capacitación era para una sola cadena: un entorno sembrado, un recorrido de quince minutos y una guía por rol. En el segundo ciclo la persona que adopta EnsayAR ya no es una cajera de Vesta sino la dueña de cualquier tienda, que llega sola a la página de planes y debe poder operar sin que nadie la llame. Por eso la adopción se diseñó en tres capas:

- **Autoservicio.** El propio flujo de alta enseña el producto: elegir plan, verificar el correo, pagar y entrar a una tienda ya creada, con sucursal, almacén y su usuario administrador.
- **Recorridos guiados por rol.** Cada rol ve solo sus pantallas y tiene una guía corta, la misma del primer ciclo más las pantallas nuevas.
- **Simulacros.** El corte de red y el reporte por voz se practican en el entorno de demostración antes de usarlos con clientas reales.

## 10.1 Entorno de demostración

Las cuentas siguientes sirven solo en el laboratorio. La clave de todas es `diego`. Las de la tienda Vesta entran con la tienda Vesta seleccionada; las dueñas de las tiendas de demostración entran desde la página de la plataforma.

| Rol | Correo | Qué muestra |
|-----|--------|-------------|
| Dueño de la plataforma | superadmin@ensayar.bo | Métricas de suscripciones de todas las tiendas |
| Administración (varias tiendas) | admin@ensayar.bo | Vesta, Aurora Boutique y Andes Moda con un solo login |
| Caja | cajero@ensayar.bo | Punto de venta, créditos, sincronización |
| Encargado de sucursal | encargado@ensayar.bo | Inventario, reservas y revisión de conflictos |
| Proveedor | proveedor@ensayar.bo | Ingresos de mercadería |
| Clienta | clienta@ensayar.bo | Catálogo, probador, carrito, reservas |
| Dueña de una tienda demo | duena@demo-nueva.demo (y las demás `demo-*`) | Su propia tienda y su suscripción |

La API escucha en el puerto 3000 y la web en el 5173. La semilla crea la tienda Vesta con sus usuarios; el script `demo:saas` crea nueve tiendas de distintos países con historia de suscripciones, y `datos:reportes` agrega las clientas y ventas al crédito que usan los reportes. Los comandos están en los anexos.

## 10.2 Alta de una tienda nueva (autoservicio)

1. Entrar a `/planes`, comparar los tres planes (Inicial, Crecimiento, Cadena) y elegir el período: mensual, trimestral o anual.
2. Registrar la cuenta con nombre, correo y clave. El sistema envía un enlace de verificación; en el laboratorio, sin servidor de correo, el enlace aparece en pantalla y en el registro de la API.
3. Abrir el enlace. La cuenta queda verificada; sin verificar no se puede pagar.
4. Completar los datos de la tienda (nombre, país, moneda) y pagar con la tarjeta de prueba `4242 4242 4242 4242`. Las tarjetas `4000 0000 0000 0002`, `…9995` y `…0069` simulan rechazo, fondos insuficientes y tarjeta vencida, y sirven para mostrar que un pago rechazado no crea la tienda.
5. Al aprobarse el pago, la plataforma crea la tienda y deja a la dueña dentro, como administradora. Si pulsa pagar dos veces, el segundo intento devuelve el mismo resultado sin cobrar de nuevo.

Lo que se enseña en este paso es que la tienda es suya: no ve productos, clientas ni ventas de ninguna otra tienda, aunque comparta la aplicación.

## 10.3 Una cuenta, varias tiendas

La misma persona puede administrar varias tiendas. Con `admin@ensayar.bo` se entra a Vesta; en la barra lateral aparece el selector de tiendas con Aurora Boutique y Andes Moda. Al elegir otra, el sistema emite un token nuevo para esa tienda y la pantalla muestra sus datos. Desde `/plataforma` la dueña ve todas sus tiendas y desde `/plataforma/nueva` agrega otra con el mismo flujo de pago. Cuando una suscripción vence, la tienda deja de atender y muestra el aviso de suscripción vencida hasta que se renueve.

## 10.4 Guía del dueño de la plataforma

Entra en `/plataforma/login` con `superadmin@ensayar.bo` y abre `/plataforma/admin`. Ve las tiendas registradas y las vigentes, las bajas de los últimos treinta días, el ingreso recurrente mensual (MRR) y anual (ARR), el ingreso promedio por tienda (ARPU), la tasa de abandono mensual (churn), la distribución por plan y por período, la serie mensual de ingresos y altas, las renovaciones próximas y la proyección de seis meses. Debe saber explicar que el MRR normaliza los planes trimestrales y anuales a su equivalente mensual, y que la proyección aplica una regla visible en pantalla: el MRR del mes siguiente es el MRR actual por uno menos el churn, más las altas promedio de los últimos tres meses por el ARPU. Es una tendencia sobre la historia, no una promesa.

## 10.5 Guía de caja (con y sin conexión)

Lo del primer ciclo sigue igual: sin turno abierto no se cobra; con turno abierto se arma el ticket, se elige el medio de pago y se confirma. Lo nuevo es la operación sin red:

- Cuando cae la conexión aparece el aviso "sin conexión". La venta en **efectivo**, el registro de una clienta y el alta de un producto siguen funcionando; se guardan en el dispositivo con un identificador propio.
- El **QR**, la **tarjeta** y la **venta al crédito** se bloquean sin red, porque necesitan una confirmación externa o el saldo actualizado de la clienta.
- Al volver la red, la cola se envía sola. En `/sincronizacion` se ven las operaciones pendientes, aplicadas y en conflicto.
- Si una venta quedó **en conflicto** porque otra caja vendió la última unidad, el cajero elige vender lo que queda o descartar la línea. Nunca se vuelve a cobrar a mano la misma operación: el sistema reconoce los reintentos por su clave.

Los **abonos** de ventas al crédito se registran en `/creditos`, con el saldo de cada clienta.

## 10.6 Guía del encargado

Ve el inventario, las ventas y las reservas de su sucursal. En `/sincronizacion` revisa los conflictos de todas las cajas de la tienda y puede resolverlos. Puede completar o cancelar reservas como en el primer ciclo.

## 10.7 Guía de administración de la tienda

Mantiene catálogo, usuarios y sucursales dentro de los límites del plan: el plan Inicial permite tres usuarios, una sucursal y doscientos productos, así que la segunda sucursal se rechaza con un aviso para mejorar el plan. En `/sincronizacion` fija la **ventana offline** (de 1 a 30 días): cuánto tiempo puede operar un dispositivo sin conectarse antes de exigir sincronizar.

En `/reportes` pide el reporte en lenguaje natural, por texto o por voz con el micrófono. Ejemplos para practicar:

- "Ventas por mes de los últimos 6 meses."
- "Top 10 productos más vendidos por cantidad."
- "Clientes con nombre, dirección y email que me deben de 500 a 3000 bolivianos por ventas al crédito."

La pantalla muestra cómo entendió el pedido (fuente, columnas, filtros, orden), la tabla y los totales, y permite descargar PDF o Excel. Si el pedido no se entiende o pide algo prohibido, el sistema lo dice y no ejecuta nada. Se enseña que la IA solo propone la estructura del reporte: el servidor la valida y arma la consulta.

## 10.8 Guías de clienta y proveedor

No cambian respecto del primer ciclo: la clienta recorre el catálogo, usa el probador 2D o 3D, guarda favoritos, reserva y compra; el proveedor registra ingresos de mercadería. La única diferencia es que ahora lo hacen dentro de una tienda concreta.

## 10.9 Simulacros

**Simulacro de corte de red (diez minutos).** Dos personas abren el punto de venta en dos navegadores. En las herramientas del navegador se marca "sin conexión" en ambos. Cada una vende en efectivo la última unidad de la misma variante. Se reconecta primero una y luego la otra. Se observa que la primera venta se aplica, la segunda queda en conflicto y el stock no baja de cero. Se resuelve el conflicto desde la pantalla de sincronización.

**Simulacro de reporte (cinco minutos).** La administradora dicta un pedido de reporte, revisa la interpretación, corrige una palabra si el dictado se equivocó y descarga el Excel. Se abre la hoja "Cómo se generó" para ver los criterios aplicados.

## 10.10 Guion de capacitación

| Bloque | Minutos | Contenido |
|---|---|---|
| Alta de la tienda | 10 | Planes, registro, verificación, pago de prueba y entrada a la tienda nueva |
| Roles | 5 | Qué ve cada rol; una cuenta, varias tiendas |
| Caja | 10 | Venta en línea y simulacro de corte de red |
| Reportes | 10 | Tres pedidos de ejemplo, voz, PDF y Excel |
| Plataforma | 5 | Métricas de suscripción, para el dueño |

## 10.11 Qué decir y qué no decir

Se dice que cada tienda ve solo sus datos, que la caja sigue vendiendo en efectivo sin internet y que la sincronización no duplica ventas, que el pago de la suscripción y el de las ventas son de prueba, y que los reportes no ejecutan texto escrito por la IA.

No se dice que haya cobro bancario real, que el QR o la tarjeta funcionen sin red, ni que la analítica predictiva o la pasarela regional estén en producción mientras el segundo integrante no las integre.
