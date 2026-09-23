# Capítulo 8 — Adopción y capacitación

**Parte III**  
**Sistema:** EnsayAR  

El docente pidió un mecanismo para que la persona usuaria aprenda la aplicación sin un inconveniente mayor. EnsayAR lo resuelve con un entorno de demostración ya sembrado, un recorrido corto y una guía por rol. No hay un curso aparte ni un manual de cientos de páginas: cada rol ve solo las pantallas que le corresponden.

Las cuentas siguientes sirven únicamente en el laboratorio. La clave de todas es la de la semilla académica.

| Rol | Correo |
|-----|--------|
| Administración | admin@ensayar.bo |
| Caja | cajero@ensayar.bo |
| Encargado de sucursal | encargado@ensayar.bo |
| Proveedor | proveedor@ensayar.bo |
| Clienta | clienta@ensayar.bo |

La API escucha en el puerto 3000. La web, en el puerto 5173. El móvil se arranca desde la carpeta `movil` y, en un teléfono, debe apuntar a la IP de la máquina donde corre la API, no a localhost.

## 8.1 Puesta en marcha

Se levanta PostgreSQL. En la carpeta del backend se aplican las migraciones, se corre la semilla y se inicia la API en modo desarrollo. En la carpeta del frontend se inicia la web. Con eso el recorrido de quince minutos ya puede empezar. El detalle de comandos está en el capítulo 5.

## 8.2 Recorrido de quince minutos

Primero entra caja. Abre el turno con un fondo, arma un ticket con una prenda del catálogo y cobra en efectivo o con el QR de prueba. Conviene mirar que el stock de esa talla y ese color bajó.

Después entra administración. En reportes pide las ventas del día o escribe una pregunta sencilla sobre la sucursal. La pantalla muestra la tabla y la consulta. Sirve para explicar que una pregunta peligrosa no se ejecuta.

Luego entra la clienta. Recorre el catálogo, abre una ficha y elige probar. Si la cámara ve los hombros, la prenda se superpone; si no, marca los hombros. Se aclara en voz alta que el video no se envía y que la tela no es un modelo tridimensional.

Si queda un minuto, se corta la red en la caja, se cobra y se vuelve a conectar para sincronizar la cola. Con eso se ve que la tienda no se detiene y que la venta no se duplica.

## 8.3 Guía de la clienta

Entra con su correo. En el catálogo filtra o busca y abre la ficha: ahí están precio, talla y color. Puede guardar favoritos y armar el carrito. La pregunta sobre la prenda, si la usa, responde con datos ya cargados; no inventa stock ni composición. Probar abre la cámara en el propio dispositivo. Reservar aparta unidades en una sucursal sin convertirlas todavía en venta. Comprar confirma un pago simulado, en general contra entrega, y el servidor descuenta el disponible.

## 8.4 Guía de caja

Entra y abre el punto de venta. Sin turno abierto el sistema no deja cobrar. Con el turno abierto agrega variantes, puede asociar una clienta y un cupón, elige efectivo o QR simulado y confirma. El ticket queda en pantalla. Al cerrar, compara lo declarado con el total del sistema. Si no hay red, la venta espera en el navegador; al volver, se sincroniza. No se cobra de nuevo a mano la misma operación.

## 8.5 Guía del encargado

Entra con su correo. Ve el inventario, las ventas y las reservas de su sucursal, no las de otra. Puede completar o cancelar una reserva pendiente. Completarla genera la venta y libera el aparto. También puede usar el punto de venta si su rol lo permite en esa sucursal.

## 8.6 Guía de administración

Entra y mantiene catálogo, usuarios y sucursales. En reportes usa el listado del día, el de inventario o una pregunta en texto. El dictado del navegador es opcional. No se escribe SQL a mano. Si la pregunta pide borrar datos o leer contraseñas, el sistema la rechaza. La auditoría muestra acciones relevantes; no hace falta recorrerla en la primera capacitación.

## 8.7 Guía del proveedor

Entra con su correo. Ve los productos vinculados a su cuenta y registra un ingreso de mercadería. Ese ingreso es un movimiento de inventario, no una venta de caja.

## 8.8 Qué decir y qué no decir en la capacitación

Se dice que hay un solo stock para la web y la caja, que el pago es de laboratorio y que el probador es un ensayo en dos dimensiones. No se dice que haya una pasarela bancaria, un chatbot, un vestidor industrial ni un sitio publicado en Azure si esa dirección todavía no existe.

Un guion breve para el local, si se capacita a más de una persona, cabe en cuarenta minutos: cinco para los roles, diez para una venta de caja, diez para la clienta, diez para un reporte y cinco para la cola sin red y los límites del párrafo anterior.

## 8.9 Cuando exista la sesión de Azure

Se inicia sesión en la cuenta, se revisa el plan de despliegue y se aprovisiona con la herramienta del repositorio. Después se aplican las migraciones sobre la base en la nube y la web apunta su variable de API al App Service. Hasta ese paso, la capacitación ocurre en el entorno local descrito arriba.
