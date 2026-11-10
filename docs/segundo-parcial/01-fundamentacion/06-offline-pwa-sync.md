# 6. Operación sin conexión, PWA y sincronización

El segundo parcial incorpora un requisito que modifica la manera de concebir EnsayAR: la plataforma debe seguir operando cuando el dispositivo pierde internet, tanto en la web como en el móvil, y reconciliar después lo ocurrido con el servidor de forma completa y predecible. El planteamiento docente tiene dos aristas. La frase "se cayó el sistema" deja de ser una excusa y pasa a ser síntoma de un desarrollo deficiente. Además, no basta con que la aplicación funcione sin red: se exige demostrar que los problemas clásicos de la sincronización (identificadores, venta simultánea de la última unidad, reenvíos por red inestable y deshacer transacciones incompletas) se resuelven con mecanismos formales.

Este capítulo desarrolla el fundamento teórico de esas exigencias y lo vincula con la implementación concreta de EnsayAR: modelos de consistencia, criterios para decidir qué operaciones pueden diferirse, persistencia local, aplicaciones web progresivas, sincronización, identificadores, conflictos, idempotencia, transacciones y las consecuencias de un monolito modular frente a microservicios. La sección final recorre la implementación real y propone un guion para demostrar el conflicto en la defensa.

## 6.1 Offline-first y modelos de consistencia

### 6.1.1 Concepto de offline-first

Se denomina **offline-first** al enfoque de diseño que trata la ausencia de red como un estado normal y no como una excepción. En una aplicación tradicional cada acción depende del servidor: si la petición falla, la acción se pierde. En una aplicación offline-first la interfaz trabaja primero contra un almacenamiento local, registra allí las acciones del usuario y delega en un proceso independiente su envío al servidor cuando la conectividad lo permita.

En consecuencia, el dispositivo pasa a ser una réplica parcial de los datos y sus escrituras se convierten en **intenciones** pendientes de confirmación: afirma "se vendió esta blusa a las 10:42" y el servidor decide si puede aplicarla, con reglas explícitas para cuando ya no es aplicable porque el mundo cambió mientras el dispositivo estaba aislado. Mostrar la última página guardada no es offline-first si no permite registrar acciones nuevas, y el parcial exige registrar ventas, clientes y productos sin red.

### 6.1.2 Consistencia fuerte y consistencia eventual

La **consistencia fuerte**, en su forma estricta llamada linealizabilidad, garantiza que el sistema se comporta como si existiera una única copia de los datos: toda lectura posterior a una escritura confirmada devuelve ese valor o uno más reciente (Kleppmann, 2017). Si una caja vende la última unidad de un vestido, ninguna otra puede verlo disponible después de confirmada la venta. La **consistencia eventual** es más débil: si cesan las escrituras, todas las réplicas convergerán al mismo valor, pero entretanto pueden diferir y no se garantiza cuándo convergen (Kleppmann, 2017).

Un sistema offline-first es eventualmente consistente respecto del cliente: el dispositivo desconectado muestra un stock que puede no coincidir con el del servidor. Lo que el diseño debe asegurar es que el punto de convergencia mantenga invariantes fuertes. EnsayAR adopta por ello una arquitectura híbrida: el cliente opera con consistencia eventual y el servidor PostgreSQL aplica cada operación con consistencia fuerte, de modo que el stock nunca queda negativo aunque dos dispositivos lo hayan creído disponible.

### 6.1.3 Teorema CAP aplicado

El teorema CAP, conjeturado por Eric Brewer y demostrado por Gilbert y Lynch en 2002, establece que un sistema distribuido sometido a una partición de red no puede garantizar a la vez consistencia (linealizabilidad) y disponibilidad (toda petición a un nodo activo recibe respuesta) (Abadi, 2012; Kleppmann, 2017). La lectura de "elegir dos de tres" es engañosa: las particiones no se eligen, ocurren, y la decisión real es qué sacrificar cuando ocurren.

En EnsayAR la partición es literal: el teléfono de la vendedora queda aislado cuando se corta el wifi de la tienda. **Priorizar consistencia (CP)** es rechazar la operación hasta recuperar la red, lo correcto para un pago con tarjeta, que sin la pasarela podría resultar inexistente o duplicado. **Priorizar disponibilidad (AP)** es aceptarla localmente y reconciliarla después, lo adecuado para una venta en efectivo, porque el dinero ya está en la caja. La conclusión aplicada es que CAP se decide **por operación**: EnsayAR es AP para la venta en efectivo y las altas de clientas y productos, y CP para pagos electrónicos, créditos, devoluciones, inventario y cierre de caja.

### 6.1.4 PACELC

Abadi (2012) observó que CAP describe solo el comportamiento durante una partición y propuso PACELC: si hay partición (P), el sistema elige entre disponibilidad (A) y consistencia (C); en caso contrario (E), entre latencia (L) y consistencia (C). La segunda mitad captura un compromiso cotidiano: aun con la red funcionando, la consistencia exige coordinación síncrona, y coordinar cuesta tiempo.

En EnsayAR, durante la partición el POS elige disponibilidad para el efectivo (PA). Sin partición, la venta espera la confirmación de la transacción antes de emitir el ticket, aceptando latencia a cambio de consistencia (EC); en cambio, para leer el catálogo el service worker espera la red como máximo cuatro segundos y luego sirve la última copia, sacrificando consistencia de lectura por latencia acotada (EL).

> Figura 6.1: diagrama de dos ejes que ubique las operaciones de EnsayAR según PACELC; en el eje de partición, venta en efectivo y alta de clientas del lado A, y pagos QR, créditos y cierre de caja del lado C; en el eje sin partición, lectura de catálogo del lado L y confirmación de venta del lado C.

## 6.2 Criterios para decidir qué opera sin conexión

### 6.2.1 Hechos consumados frente a operaciones que requieren confirmación

El docente lo planteó con una pregunta: "un pago, ¿se podrá hacer offline? No". De ahí se desprende un criterio general. Una operación puede registrarse sin conexión cuando describe un **hecho que ya ocurrió en el mundo físico** y cuyo registro tardío no cambia su naturaleza. No puede registrarse sin conexión cuando su validez **depende de la confirmación de un tercero** o de un estado global que el dispositivo no conoce. El criterio se traduce en cinco preguntas por caso de uso:

1. ¿El hecho ya ocurrió de forma irreversible (dinero en mano, prenda entregada)?
2. ¿Interviene un tercero que debe autorizar (banco, pasarela QR, procesador de tarjetas)?
3. ¿La decisión depende de un saldo global que otros dispositivos modifican (deuda de una clienta, arqueo)?
4. ¿Existe una regla determinista para resolver el caso si el servidor no puede aplicar la operación?
5. ¿Reintentar arriesga un efecto doble que la idempotencia no puede neutralizar?

La venta en efectivo responde sí a la primera y no a las demás, salvo por el stock, que es un contador global; ese riesgo se acepta porque existe una regla determinista para resolverlo (sección 6.7). El pago con QR falla la segunda: sin la pasarela no se sabe si el dinero se transfirió.

### 6.2.2 Matriz de EnsayAR

La política se codifica en `backend/src/sync/politica.ts` como la constante `POLITICA_OFFLINE`, con dos listas, `disponibles` y `soloEnLinea`, donde cada acción lleva su justificación. Se expone en `GET /sync/politica` y la interfaz la muestra en la pantalla de sincronización, de modo que una misma fuente rige el comportamiento y la documentación visible.

| Operación | Sin red | Justificación |
|---|---|---|
| Venta en efectivo en caja | Sí | El dinero se recibe en mano; el stock se valida al sincronizar con un UPDATE condicional |
| Registro de clientes | Sí | El dispositivo genera el UUID; si el correo ya existe, se fusiona |
| Registro de productos y variantes | Sí | Llevan UUID del dispositivo; un SKU repetido queda como conflicto |
| Consulta de catálogo, precios y stock local | Sí | Se lee la última copia; el stock es orientativo hasta sincronizar |
| Pagos con QR o tarjeta | No | La pasarela debe confirmar en el momento; reintentar arriesga cobrar dos veces |
| Ventas al crédito y abonos | No | Exigen ver la deuda real; dos cajas con datos viejos podrían cobrar el mismo abono |
| Compras de la tienda online | No | La clienta paga por pasarela y necesita stock reservado al instante |
| Devoluciones | No | Mueven dinero y stock sobre una venta que puede no estar sincronizada |
| Cierre de caja | No | El arqueo debe incluir todas las ventas; se bloquea con operaciones pendientes |
| Ajustes, ingresos y transferencias de inventario | No | Corrigen el stock real; aplicarlos sobre una copia vieja produce errores |
| Usuarios, roles y suscripción | No | Afectan permisos y facturación; requieren validación central |
| Reportes y analítica | No | Se calculan sobre los datos consolidados del servidor |

La matriz no es solo declarativa. El lote de sincronización admite únicamente los tipos `venta`, `cliente` y `producto`, y rechaza con `PAGO_REQUIERE_RED` toda venta cuyo medio de pago no sea efectivo. El cierre de caja se deshabilita en la web y en el móvil mientras haya operaciones del dispositivo pendientes o en conflicto, porque un arqueo que ignore ventas no sincronizadas produciría un faltante ficticio.

### 6.2.3 Ventana offline configurable

Aceptar operaciones diferidas plantea otra pregunta: ¿cuánto puede esperar una operación antes de que aplicarla deje de tener sentido? Una venta de hace tres horas se integra sin problemas; una de hace dos meses afectaría reportes cerrados, cajas arqueadas y stock contado, y probablemente delata un dispositivo olvidado o un reloj mal configurado.

EnsayAR resuelve esto con una **ventana offline** por tienda, guardada en `tiendas.ventana_offline_dias`, con valor por defecto de 7 días y rango de 1 a 30 (constantes `VENTANA_MIN_DIAS` y `VENTANA_MAX_DIAS`). Solo un administrador la modifica, mediante `PATCH /sync/politica`. Al procesar cada operación, el servidor compara su fecha de creación en el dispositivo con la hora actual: si la antigüedad supera la ventana, la operación queda `vencida` con el código `FUERA_DE_VENTANA` para revisión de un administrador; si la fecha está más de cinco minutos en el futuro, se rechaza con `FECHA_INVALIDA`, porque un reloj adelantado falsearía la cronología.

Siete días cubren una sucursal sin conexión durante un fin de semana largo o un corte prolongado del proveedor y coinciden con el ciclo semanal de reposición y conteo de una tienda pequeña; el tope de 30 evita que una operación atraviese un cierre mensual. La configurabilidad responde al modelo SaaS, y el cambio rige de inmediato: una operación vencida puede reenviarse tras ampliar la ventana y se aplica con su fecha real.

## 6.3 Persistencia local en el cliente

### 6.3.1 IndexedDB en el navegador

**IndexedDB** es la base de datos transaccional del navegador. Almacena objetos estructurados en almacenes identificados por clave, admite índices secundarios y ejecuta toda operación dentro de transacciones. Su interfaz es asíncrona, por lo que no bloquea la interfaz, y está disponible en páginas y service workers. Es la tecnología adecuada para una cola de operaciones porque lo guardado sobrevive al cierre de la pestaña y al reinicio del dispositivo. En la web de EnsayAR, `frontend/src/offline/cola.ts` abre la base `ensayar-offline` con un almacén `operaciones` cuya clave es el `id` de la operación y un índice por `tienda`, que mantiene colas separadas si un mismo navegador se usa en dos tiendas del SaaS.

### 6.3.2 SQLite en el móvil

**SQLite** es un motor relacional embebido: no requiere servidor, guarda la base en un archivo y ofrece SQL con transacciones ACID. En el móvil es la opción natural cuando los datos locales necesitan consultas, orden o integridad, y fue la alternativa que sugirió el docente. La aplicación React Native usa `expo-sqlite` para abrir `ensayar-offline.db` en modo de registro anticipado (`PRAGMA journal_mode = WAL`), que permite leer mientras se escribe, y crea dos tablas: `operaciones` (`id`, `tienda`, `tipo`, `creada_en`, `datos`, `resumen`, `estado`, `error`), con un índice por `(tienda, creada_en)` para recorrer la cola en orden; y `cache` (`clave`, `valor`, `guardado_en`) para las copias de catálogo, turno y clientas.

### 6.3.3 AsyncStorage y Web Storage

**AsyncStorage** es el almacenamiento clave-valor asíncrono de React Native: guarda cadenas sin estructura ni índices, de modo que cualquier búsqueda exige leer y deserializar todo el contenido. Sirve para preferencias y valores pequeños, no como cola voluminosa. Su análogo en el navegador es **Web Storage** (`localStorage`), síncrono y limitado a cadenas, con un máximo de 5 MiB por origen (MDN Web Docs, s.f.-b). En EnsayAR, AsyncStorage conserva el identificador del dispositivo y sirve de respaldo de la cola en Expo web, donde no hay SQLite nativo: `movil/src/offline/almacen.ts` expone la misma interfaz que `almacen.native.ts` y el empaquetador elige según la plataforma. En la web, `localStorage` guarda el identificador del dispositivo y las copias de datos por tienda (`frontend/src/offline/cache.ts`), mientras la cola vive en IndexedDB.

### 6.3.4 Cuotas, límites y desalojo

El almacenamiento del navegador no es ilimitado ni, por defecto, permanente. MDN Web Docs (s.f.-b) distingue el modo de **mejor esfuerzo**, predeterminado, en el que el navegador puede borrar los datos de un origen ante falta de espacio siguiendo una política de uso menos reciente, y el modo **persistente**, que se solicita con `navigator.storage.persist()` y solo el usuario puede borrar. Las cuotas varían: Chromium permite a un origen hasta el 60 % del disco; Firefox, en mejor esfuerzo, el menor valor entre el 10 % del disco y 10 GiB por sitio; Safari, desde iOS 17 y macOS 14, alrededor del 60 %. Safari además borra de forma proactiva los datos creados por script en orígenes sin interacción durante siete días de uso cuando la prevención de rastreo está activa. Exceder la cuota produce `QuotaExceededError`.

Para EnsayAR la cuota no es una restricción práctica, pues una venta ocupa del orden de un kilobyte; el riesgo real es el desalojo, porque una cola borrada equivale a ventas perdidas. Por eso la interfaz muestra siempre las operaciones pendientes; solicitar almacenamiento persistente queda como mejora.

## 6.4 Aplicaciones web progresivas

### 6.4.1 Definición y origen

Una **aplicación web progresiva** (PWA) es un sitio web que, mediante tecnologías estándar, adquiere capacidades de aplicación instalada: funcionamiento sin conexión, instalación en la pantalla de inicio, ventana propia y notificaciones. El término lo acuñaron Alex Russell y Frances Berriman en junio de 2015, al enumerar como rasgos de esta clase de aplicaciones ser adaptables, independientes de la conectividad gracias a los service workers, siempre actualizadas, servidas por TLS, capaces de reenganchar con notificaciones push, instalables sin tienda y enlazables por URL (Russell, 2015). "Progresiva" alude a la mejora progresiva: funciona como sitio común en cualquier navegador y se vuelve "app" gradualmente donde el navegador lo permite.

### 6.4.2 Manifiesto e instalabilidad

El **manifiesto de aplicación web** es un archivo JSON enlazado desde la página que declara nombre, iconos, URL de inicio, alcance, modo de presentación, colores y atajos. Con él, el navegador puede ofrecer la instalación y abrir la aplicación sin barra de direcciones cuando la presentación es `standalone`. El manifiesto de EnsayAR (`frontend/public/manifest.webmanifest`) declara `id` igual a `/`, nombre "EnsayAR Vesta", nombre corto "Vesta", `start_url` en `/inicio`, presentación `standalone`, idioma `es`, iconos de 192 y 512 píxeles (este último `maskable`, adaptable a las máscaras de cada sistema) y tres atajos: Punto de venta (`/pos`), Catálogo y Sincronización. El `id` da una identidad estable aunque cambie la URL de inicio; WebKit lo admite desde iOS 16.4 (Eidson y Simmons, 2023).

En los navegadores que lo emiten, el evento `beforeinstallprompt` permite diferir el diálogo nativo y lanzarlo desde un botón propio. `frontend/src/offline/pwa.ts` captura ese evento, expone el botón "Instalar app" con el hook `useInstalar` y detecta si ya corre instalada consultando `display-mode: standalone`.

### 6.4.3 Service worker y su ciclo de vida

Un **service worker** es un script que el navegador ejecuta en segundo plano, separado de la página, y que actúa como proxy programable entre la aplicación y la red: intercepta las peticiones de las páginas que controla, decide si responder desde caché o desde red y recibe eventos como `push` aun con la página cerrada. Exige HTTPS o localhost. Su ciclo de vida busca hacer posible el offline-first y que solo una versión del sitio esté activa a la vez (Archibald, s.f.-b). Tras el **registro** con `navigator.serviceWorker.register('/sw.js')`, el evento `install` ocurre una vez por versión y es el momento de precargar lo indispensable; si otra versión controla páginas, la nueva queda **en espera** hasta que ninguna la use, salvo que llame a `self.skipWaiting()`; en `activate` se borran las cachés anteriores y `clients.claim()` toma el control de las páginas abiertas; y cualquier cambio byte a byte en el script genera una nueva versión que repite el ciclo.

El `sw.js` de EnsayAR declara `VERSION = 'v2'` y deriva tres cachés: `ensayar-shell-v2`, `ensayar-estaticos-v2` y `ensayar-api-v2`. En `install` precarga la raíz `/`, el manifiesto y el favicon y llama a `skipWaiting()`; en `activate` elimina toda caché ajena a la lista vigente y ejecuta `clients.claim()`. Cambiar la versión basta para invalidar ordenadamente lo guardado por la anterior.

> Figura 6.2: diagrama de estados del service worker (registrado, instalando, en espera, activando, activo, redundante), señalando dónde actúan skipWaiting y clients.claim en el sw.js de EnsayAR.

### 6.4.4 Estrategias de caché

El service worker no impone una política: se elige por tipo de recurso. Archibald (s.f.-a) cataloga las estrategias habituales, de las que tres son centrales:

- **Cache first:** se responde desde la caché y solo se recurre a la red si no hay copia. Conviene a recursos versionados que no cambian.
- **Network first:** se intenta la red y, si falla, se sirve la última copia. Prioriza la frescura en datos cambiantes cuya copia vieja es mejor que nada.
- **Stale-while-revalidate:** se responde con la copia y, en paralelo, se pide la versión nueva para actualizar la caché. Combina la latencia de la caché con una frescura de un paso de atraso.

El `sw.js` de EnsayAR combina las tres. Las navegaciones siguen red primero y, sin red, devuelven el `index.html` guardado, lo que permite recargar el POS sin conexión. Los estáticos (`/assets/`, `/uploads/`, `/catalogo/`, `/icons/`, imágenes y fuentes) pasan por `estaticoCachePrimero`, que en rigor implementa stale-while-revalidate. Las lecturas de la API de una lista blanca (tienda, catálogo, sucursales, temporadas, colecciones, turno abierto y política offline) siguen red primero con un tope de cuatro segundos y caen a la copia ante demora o error 5xx. La disponibilidad por sucursal (`/catalogo/disponibilidad`) queda fuera a propósito: el POS la descuenta localmente con cada venta sin red y una copia del service worker la sobrescribiría con valores previos. Por seguridad SaaS, la clave de cada respuesta guardada incluye la cabecera `X-Tienda` y una huella SHA-256 truncada del token, para no servir nunca a una tienda o usuario la copia de otro. Solo se interceptan `GET` del mismo origen; las escrituras sin red corresponden a la cola.

### 6.4.5 Background Sync

La **API de sincronización en segundo plano** permite que una página registre una etiqueta y que el navegador despierte al service worker con un evento `sync` al detectar conectividad, incluso sin ninguna pestaña del sitio abierta (Archibald, s.f.-a). Es la herramienta idónea para vaciar una cola de salida, pero no está implementada en todos los motores de uso masivo. EnsayAR no la usa y adopta directamente el mecanismo alternativo: sincronizar al abrir la aplicación, al recibir el evento `online` y cada 30 segundos mientras haya pendientes. El costo es que la cola solo se vacía con la aplicación abierta; el beneficio, un comportamiento idéntico en todos los navegadores.

### 6.4.6 Push API, Notifications API y VAPID

La **Push API** permite recibir mensajes del servidor aunque la aplicación no esté en primer plano ni cargada: un service worker activo se suscribe con `PushManager.subscribe()` y obtiene una `PushSubscription` con un *endpoint* y claves de cifrado (MDN Web Docs, s.f.-a). El *endpoint* es una URL de capacidad que basta para enviar mensajes, por lo que debe mantenerse en reserva. La **Notifications API** muestra el aviso mediante `showNotification()`, previo permiso del usuario, y entre el servidor de aplicación y el dispositivo media el **servicio push** del fabricante del navegador.

**VAPID**, definido en la RFC 8292, identifica al servidor de aplicación ante el servicio push. El servidor genera un par de claves ECDSA sobre P-256; al suscribirse, el navegador entrega la pública como `applicationServerKey`, y cada envío incluye un JWT firmado con la privada, con audiencia igual al origen del *endpoint* y expiración no mayor a 24 horas (Thomson y Beverloo, 2017). Así, el servicio push rechaza mensajes de quien no posea la clave privada y una URL filtrada no basta para enviar notificaciones. EnsayAR carga las claves desde `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` y firma los envíos con la biblioteca `web-push`, con 24 horas de vida por mensaje.

### 6.4.7 Ventajas frente a una aplicación nativa

Frente a la aplicación nativa, la PWA se instala desde el navegador en segundos y ocupa poco espacio, algo importante para vendedoras con teléfonos de gama baja, caso que mencionó el docente; se actualiza en cuanto se publica una versión, sin revisión de tienda; usa un único código para escritorio, Android e iOS; y es enlazable, con permisos que se piden cuando hacen falta. Sus desventajas son un acceso más limitado al hardware, menor control de la ejecución en segundo plano y dependencia de cada navegador. Por eso EnsayAR mantiene ambas vías: la PWA para quien no quiere instalar nada y la aplicación React Native con SQLite para el uso intensivo en caja.

### 6.4.8 Limitaciones en iOS

En iOS los navegadores han estado históricamente obligados a usar WebKit, de modo que las capacidades de una PWA dependen de Apple. El push web llegó recién con iOS y iPadOS 16.4 y solo para aplicaciones **añadidas a la pantalla de inicio**, con un permiso que debe pedirse tras una interacción directa del usuario (Eidson y Simmons, 2023): una vendedora que use EnsayAR desde Safari sin instalarla no recibirá avisos de conflictos. Además, no existe `beforeinstallprompt` (la instalación es manual desde el menú Compartir), no hay Background Sync y el desalojo proactivo de Safari (6.3.4) puede borrar datos sin interacción reciente. En iOS conviene usar la aplicación instalada y sincronizar con frecuencia; para la caja, la aplicación nativa ofrece mayores garantías.

## 6.5 Sincronización

### 6.5.1 Cola de operaciones y orden

El núcleo de un cliente offline-first es una **cola de operaciones**, también llamada outbox del cliente por analogía con la bandeja de salida del correo. Cada acción que modifica datos se materializa como un registro inmutable con identificador único, tipo, fecha de ocurrencia, datos para reproducirla y estado. La interfaz escribe en la cola y actualiza su vista local; un proceso independiente envía los registros pendientes. Así, "sincronizar el estado" se reduce a "transmitir una secuencia de intenciones", más simple y auditable.

El modelo exige respetar el **orden causal**: si se registra una clienta nueva y luego se le vende una blusa, la venta referencia a la clienta y no puede aplicarse antes. Por eso la cola se recorre por fecha de creación y el servidor procesa cada lote en el orden recibido. En EnsayAR, `OperacionOffline` (web) y `OperacionLocal` (móvil) comparten forma: `id` (UUID que actúa como clave de idempotencia), `tipo` (`venta`, `cliente` o `producto`), `creadaEn` en ISO 8601, `datos`, `tienda`, un `resumen` legible y `estado`; las funciones `listarOps` ordenan por `creadaEn`.

### 6.5.2 Reintentos y backoff exponencial

Toda comunicación puede fallar de forma transitoria y el cliente debe reintentar, pero reintentar sin pausa contra un servidor caído agrava la caída, sobre todo si muchos clientes se reconectan a la vez. La técnica estándar es el **backoff exponencial**: tras cada fallo, la espera se multiplica por un factor (1, 2, 4, 8 segundos) hasta un máximo, con una componente aleatoria (*jitter*) para que los clientes no se sincronicen entre sí. Igual de importante es distinguir los fallos transitorios (sin red, 502, 503, 504) de los definitivos (400, 422), que repetidos producen el mismo resultado.

EnsayAR aplica esa distinción pero no implementa backoff exponencial. La función `esFalloRed` (`frontend/src/offline/red.ts`) clasifica como fallo de red la falta de conexión, los `TypeError` de `fetch`, las respuestas 502, 503 y 504 y las 5xx sin cuerpo de NestJS; en esos casos la operación sigue `pendiente`. La cadencia es fija: al recuperar la red, al abrir la aplicación y cada 30 segundos mientras haya pendientes. Con pocos dispositivos por sucursal la carga es despreciable; a gran escala convendría añadir backoff con *jitter*. Además, `sincronizar` comparte una única promesa en vuelo, de modo que el evento `online`, el temporizador y un clic manual no disparan envíos paralelos de la misma cola.

### 6.5.3 Estados de una operación

Sin estados explícitos, una operación fallida desaparece en silencio o se reintenta para siempre. Los estados de EnsayAR y su correspondencia con los conceptos teóricos son los siguientes.

| Estado | Dónde | Significado | Acción del cliente |
|---|---|---|---|
| pendiente | Cliente | Guardada localmente, sin respuesta definitiva | Reintentar en la próxima pasada |
| aplicada | Servidor | Ejecutada y confirmada por primera vez | Quitar de la cola |
| repetida (duplicada) | Servidor | Mismo id y contenido ya aplicados; se devuelve el resultado guardado | Quitar de la cola |
| fusionada | Servidor | Cliente con correo existente asociado al registro previo | Quitar y reasignar ventas pendientes |
| conflicto | Ambos | Válida pero no aplicable por el estado actual (stock, turno, SKU) | Mostrar y ofrecer resolución |
| vencida | Ambos | Fuera de la ventana offline | Revisión de un administrador |
| rechazada | Ambos | Inválida o no permitida (datos, permisos, pago sin red, fecha futura) | Mostrar; normalmente descartar |
| en_curso | Servidor | Otra petición procesa el mismo id | Mantener pendiente |
| error | Servidor | Fallo interno; el registro se libera | Mantener pendiente |
| descartada | Servidor | Conflicto dado por resuelto por un responsable | Ninguna |

El estado teórico "duplicada" se llama `repetida` en el código. Un conflicto es una operación correcta que choca con el estado del mundo y admite resolución de negocio; un rechazo es una operación que nunca debió emitirse.

> Figura 6.3: diagrama de estados de una operación offline, desde pendiente hacia aplicada, repetida, fusionada, conflicto, vencida o rechazada, con la transición de reintento (conflicto a pendiente con un id nuevo) y la de resolución administrativa (conflicto a descartada).

### 6.5.4 Sincronización por lotes

La **sincronización por lotes** agrupa varias operaciones en una petición, evitando multiplicar latencia y autenticación en redes móviles, y devuelve un resultado por cada una. Para ser robusta, el fallo de una operación no debe arrastrar a las demás y reenviar el lote no debe duplicar nada. `POST /sync/lote` recibe `dispositivoId`, un `nombreDispositivo` opcional y de 1 a 200 `operaciones` (los clientes envían tramos de 50); registra el dispositivo en `dispositivos`, procesa las operaciones en orden, cada una en su propia transacción, y responde con un resumen por estado y el resultado de cada una. La primera condición la asegura la transacción por operación; la segunda, el UUID de cada operación (6.8).

## 6.6 Identificadores generados en el dispositivo

El docente señaló los identificadores como uno de los dos problemas clásicos. Con claves **autoincrementales**, el número lo asigna la base central al insertar: un dispositivo desconectado no puede conocerlo, y si elige uno propio, dos dispositivos elegirán el mismo. Además, sin identificador definitivo no puede crear registros que referencien al nuevo: la venta a una clienta registrada sin red quedaría sin clave foránea válida. Los rangos reservados por dispositivo o los identificadores temporales que luego se reemplazan añaden complejidad y puntos de fallo.

La alternativa es generar en el cliente identificadores con probabilidad de colisión despreciable. La RFC 9562, que en 2024 reemplazó a la RFC 4122, define varias versiones de **UUID** de 128 bits (Davis et al., 2024):

- **UUID v4:** 122 bits aleatorios; la colisión puede tratarse como nula en la práctica. No guarda orden, por lo que las inserciones caen en posiciones aleatorias del índice de árbol B y lo fragmentan en tablas muy grandes.
- **UUID v7:** los primeros 48 bits son la marca de tiempo Unix en milisegundos y el resto es aleatorio, lo que añade orden temporal y mejora la localidad de los índices (Davis et al., 2024).
- **ULID:** especificación comunitaria ajena a la RFC, con 48 bits de tiempo y 80 aleatorios, representada en 26 caracteres Base32 ordenables lexicográficamente.

Generar el identificador en el dispositivo permite además construir grafos de registros sin conexión (la clienta y su venta llevan UUID definitivos desde el inicio) y convierte al identificador en la **clave de idempotencia** natural de la operación. EnsayAR usa UUID v4: `crypto.randomUUID()` en la web, con una implementación sobre `crypto.getRandomValues()` cuando la PWA se abre por IP local sin HTTPS, y `Crypto.randomUUID()` de `expo-crypto` en el móvil. Clientes y productos creados sin red se insertan con el UUID del dispositivo como clave primaria; las ventas lo guardan en `ventas.uuid`, con un índice único por `(tienda_id, uuid)` creado en la migración `20261108200000_offline_sync`. Migrar a v7 sería una mejora de rendimiento de índices, no de corrección.

## 6.7 Conflictos y control de concurrencia

### 6.7.1 Estrategias de resolución

Un **conflicto** surge cuando dos réplicas modifican el mismo dato de forma independiente y sus cambios no se combinan trivialmente. Kleppmann (2017) describe varias estrategias:

- **Last-write-wins (LWW):** gana la escritura con marca de tiempo más reciente. Es simple, pero pierde datos en silencio y depende de relojes que pueden diferir; aplicada al stock, una caja sobrescribiría la venta de la otra.
- **Fusión (merge):** se combinan los cambios con reglas del dominio, por ejemplo conservando campos no superpuestos.
- **CRDT:** tipos de datos replicados diseñados para que cualquier orden de aplicación converja al mismo estado, como contadores o conjuntos. No pueden imponer una restricción global como "el stock no puede ser negativo", porque esa regla exige coordinación.
- **Servidor autoritativo:** las réplicas envían intenciones y un servidor central decide con las reglas de negocio sobre el estado vigente; lo rechazado vuelve como conflicto.

EnsayAR adopta el **servidor autoritativo** para stock y ventas, porque la invariante de no vender lo inexistente solo se garantiza en un punto central. Para clientas aplica **fusión** por correo: si dos cajas registran sin red a la misma clienta, la segunda operación resulta `fusionada` y las ventas que referían al identificador local pasan a apuntar al del servidor, en el lote en curso, en lotes posteriores y en la cola del dispositivo. Para productos, un SKU ya usado produce el conflicto `SKU_EN_USO`.

### 6.7.2 Concurrencia optimista y pesimista

En el servidor, el control de concurrencia define cómo se protegen los datos ante transacciones simultáneas. El **pesimista** asume que el conflicto es probable y bloquea el recurso antes de leerlo, típicamente con `SELECT ... FOR UPDATE`. El **optimista** asume que es raro: no bloquea al leer, sino que verifica al escribir que el dato siga cumpliendo la condición esperada y, si no, aborta e informa el conflicto.

La sincronización offline es intrínsecamente optimista: el dispositivo actuó sin poder bloquear nada y el servidor verifica después. La clave es que esa verificación sea **atómica**. Leer el stock, comparar en el código y luego escribir deja una ventana de carrera entre lectura y escritura. EnsayAR la elimina delegando la comparación en la propia sentencia de actualización.

### 6.7.3 El caso de la última unidad paso a paso

El escenario que se forzará en la defensa es este: queda una unidad de un vestido, dos vendedores sin red la venden y, al reconectarse, uno debe enterarse de que su venta no puede aplicarse. La pieza central está en `backend/src/ventas/ventas.service.ts`, dentro de la transacción de cobro:

```sql
UPDATE stock_almacen
SET cantidad = cantidad - :n
WHERE tienda_id = :tienda
  AND almacen_id = :almacen
  AND variante_id = :variante
  AND cantidad - reservado >= :n;
```

La columna `reservado` contiene las unidades retenidas por pagos QR o con tarjeta aún no confirmados, de modo que el disponible real es `cantidad - reservado`. La sentencia descuenta solo si el disponible alcanza; si no, no modifica ninguna fila. El servicio inspecciona las filas afectadas y, si son cero, lanza `StockInsuficienteError` con el disponible y la cantidad pedida, lo que aborta toda la transacción.

Que dos ejecuciones simultáneas no puedan ambas descontar la última unidad lo garantiza PostgreSQL: en Read Committed, su nivel predeterminado, cuando un `UPDATE` encuentra una fila que otra transacción concurrente modificó, espera a que esta confirme o deshaga; si confirma, reevalúa la condición `WHERE` sobre la versión actualizada y solo procede si se sigue cumpliendo (PostgreSQL Global Development Group, s.f.). El recorrido es el siguiente:

1. Estado inicial: `cantidad = 1`, `reservado = 0`. Ambos dispositivos tienen esa copia.
2. Se corta la red. El vendedor A vende la unidad en efectivo; el POS guarda la operación con su UUID, descuenta su copia local y muestra la venta como **Pendiente**.
3. El vendedor B, también sin red, hace lo mismo con otro UUID; su pantalla también muestra **Pendiente**.
4. Vuelve la red y ambos envían su lote a `POST /sync/lote`, quizá en el mismo instante.
5. La transacción de A ejecuta el `UPDATE`: `1 - 0 >= 1` se cumple; la fila queda con `cantidad = 0` y bloqueada hasta el final de la transacción.
6. La transacción de B intenta el mismo `UPDATE`, encuentra la fila bloqueada y espera.
7. A crea la venta, sus líneas, el movimiento de inventario, suma el total al turno, registra la auditoría y confirma. Su operación queda `aplicada` y sale de la cola.
8. B reanuda; PostgreSQL reevalúa la condición sobre la fila actualizada (`0 - 0 >= 1` es falso) y el `UPDATE` afecta cero filas.
9. Se lanza `StockInsuficienteError`, la transacción de B se deshace completa y la operación queda en `conflicto` con el código `STOCK_INSUFICIENTE` y el detalle `{varianteId, disponible: 0, pedido: 1}`.
10. B ve **Conflicto** con el mensaje "Stock insuficiente: había 0 y la venta pedía 1. Otra caja vendió antes"; administradores y encargados reciben una notificación interna y push que enlaza a `/sincronizacion`.

El stock nunca queda negativo y la resolución corresponde al negocio. **Vender lo disponible** limita cada línea al disponible informado y reencola la operación con un UUID nuevo conservando la fecha original (no se ofrece si el disponible es cero). **Descartar** la elimina de la cola local, lo que implica anular la venta y devolver el dinero o buscar la prenda en otra sucursal. En el servidor, la operación original sigue como conflicto hasta que un encargado la marca resuelta, lo que la deja `descartada` con la auditoría `sync_conflicto_descartado`. En ventas de varias líneas, los `UPDATE` se ejecutan en **orden fijo de identificador de variante** para que dos ventas cruzadas adquieran los bloqueos en la misma secuencia y no se interbloqueen.

> Figura 6.4: diagrama de secuencia con dos dispositivos, el endpoint /sync/lote y PostgreSQL; muestra los dos UPDATE concurrentes, la espera de B sobre el bloqueo de fila, la reevaluación del WHERE y las respuestas "aplicada" y "conflicto".

## 6.8 Idempotencia

### 6.8.1 Definición formal

En matemática, una función f es **idempotente** si aplicarla varias veces equivale a aplicarla una vez, es decir, si f(f(x)) = f(x) para todo x de su dominio; el valor absoluto es un ejemplo clásico. En sistemas distribuidos, una operación es idempotente si ejecutarla una o n veces deja el sistema en el mismo estado. La definición se refiere al **efecto** sobre el estado, no a la respuesta: borrar un recurso dos veces deja el mismo estado aunque la segunda respuesta diga que no existía.

La idempotencia importa porque en una red no confiable el emisor no distingue entre "la petición se perdió" y "se procesó pero se perdió la respuesta". Ante la duda, lo único seguro es reintentar, y reintentar solo es seguro si la operación es idempotente. Las redes ofrecen entrega "al menos una vez"; la idempotencia del receptor convierte esa garantía en un efecto "exactamente una vez".

### 6.8.2 Métodos HTTP idempotentes

En HTTP un método es idempotente si el efecto previsto de varias peticiones idénticas es el mismo que el de una. Según la RFC 9110, `OPTIONS`, `HEAD`, `GET`, `PUT` y `DELETE` lo son, mientras que `POST` y `PATCH` no (Jena et al., 2026). `PUT` lo es porque reemplaza el recurso por un valor dado; `POST` suele crear uno nuevo en cada llamada. Registrar una venta es una creación y se expresa con `POST /ventas`: sin una medida adicional, un reintento crearía otra venta y descontaría stock dos veces. Esa idempotencia no la da el protocolo; la construye la aplicación.

### 6.8.3 La cabecera Idempotency-Key

La práctica más difundida es que el cliente genere una clave única por operación lógica y la envíe en cada intento. Stripe la popularizó: el cliente agrega `Idempotency-Key` con un valor de suficiente entropía (sugiere UUID v4) y puede repetir la petición tras un error de conexión sin crear un segundo objeto; el servidor guarda el código de estado y el cuerpo de la primera ejecución, los devuelve en los reintentos y responde con error si los parámetros no coinciden con los originales (Stripe, s.f.).

El grupo HTTPAPI de la IETF estandariza esta práctica en el borrador "The Idempotency-Key HTTP Header Field", cuya versión 08 se publicó en octubre de 2026 (Jena et al., 2026). Entre otras cosas establece que la clave la genera el cliente y que el recurso puede combinarla con una **huella** del contenido; que reutilizar una clave con otro contenido debería responderse con `422 Unprocessable Content`; que un reintento mientras la original sigue en proceso debería recibir `409 Conflict`; que si el endpoint exige la cabecera y falta corresponde `400 Bad Request`; y que el recurso debe publicar su política de expiración de claves.

### 6.8.4 Qué se almacena y por cuánto tiempo

Un registro de idempotencia guarda, como mínimo, la clave, una huella del contenido (para distinguir un reintento de una clave reutilizada por error), el estado de procesamiento (para detectar reintentos concurrentes) y la respuesta. En cuanto a la duración, Stripe permite purgar las claves con al menos 24 horas de antigüedad y trata como nueva una clave reutilizada tras la purga (Stripe, s.f.); el borrador IETF deja la política a cada recurso pero exige documentarla (Jena et al., 2026). La regla práctica es que la retención supere el tiempo máximo de reintento, que en un sistema offline no son minutos sino la ventana offline completa.

EnsayAR usa una sola tabla, `operaciones_sync`, para los dos caminos de idempotencia: las operaciones del lote y las peticiones HTTP con `Idempotency-Key`. Sus columnas relevantes son `operation_id`, `hash` (SHA-256 del contenido), `estado` (que nace `en_curso`), `resultado` (JSON con la respuesta), `tipo`, `dispositivo_id`, `usuario_id` y `hecha_en`, con índice único sobre `(tienda_id, operation_id)`. Las claves no se purgan: se conservan indefinidamente, lo que cubre con holgura la ventana máxima de 30 días y deja un historial auditable. El costo es el crecimiento de la tabla, asumible para una tienda; una depuración periódica de registros definitivos más antiguos que la ventana sería la evolución natural.

### 6.8.5 Doble y triple clic con red inestable

El segundo escenario del docente no es la falta de red sino su inestabilidad: el cajero pulsa "Guardar", la venta se registra, pero la respuesta se pierde, y el cajero pulsa tres o cuatro veces más. Sin idempotencia habría cuatro ventas. EnsayAR se defiende en tres capas.

La primera es el interceptor global `IdempotenciaInterceptor` (`backend/src/sync/idempotencia.interceptor.ts`), activo en los 11 endpoints marcados con `@Idempotente()`, entre ellos `POST /ventas`, apertura y cierre de caja, ingresos de inventario, abonos, devoluciones y pagos. Con la cabecera presente, construye el identificador `http:{usuario}:{clave}` y una huella SHA-256 del método, la ruta, los parámetros y el cuerpo, e intenta insertar un registro `en_curso`:

1. Si la inserción tiene éxito, la petición es la primera y se ejecuta.
2. Si choca con el índice único y la huella difiere, responde 422 con `IDEMPOTENCIA_CONFLICTO`.
3. Si la huella coincide y el registro terminó, devuelve la respuesta guardada con `Idempotent-Replayed: true`.
4. Si sigue en curso, espera hasta 25 veces 200 milisegundos y luego responde 409 con `OPERACION_EN_CURSO`; un registro en curso de más de 60 segundos se considera huérfano y se libera.
5. Al terminar, un 4xx queda guardado como definitivo y un 5xx borra el registro para permitir reintentar.

La segunda capa es el UUID de la venta, que el POS envía como `Idempotency-Key`: dentro de la transacción, el servicio devuelve la venta previa con ese UUID si el contenido coincide o lanza `UuidConflictError` si difiere. La tercera es el índice único `(tienda_id, uuid)` en `ventas`: si dos transacciones simultáneas superan esa búsqueda, la segunda choca con el índice y el servicio devuelve la venta ganadora. El script de verificación comprueba que cuatro `POST /ventas` simultáneos con la misma clave producen una sola venta. En el lote offline la lógica es análoga con el UUID de la operación. A diferencia del borrador IETF, EnsayAR no exige la cabecera; sin ella no hay protección HTTP, aunque las ventas siguen protegidas por su UUID.

## 6.9 Transacciones y rollback

### 6.9.1 Propiedades ACID

Una **transacción** agrupa lecturas y escrituras en una unidad que se confirma o se deshace entera. Sus propiedades se resumen en ACID (Kleppmann, 2017): **atomicidad**, todas las escrituras se aplican o ninguna, lo que hace posible el rollback; **consistencia**, la base pasa de un estado válido a otro según las invariantes de la aplicación; **aislamiento**, las transacciones concurrentes no producen resultados imposibles en una ejecución secuencial, en el grado que fije el nivel elegido; y **durabilidad**, lo confirmado sobrevive a caídas.

### 6.9.2 Niveles de aislamiento

El estándar SQL define cuatro niveles según las anomalías que permiten: Read Uncommitted, Read Committed, Repeatable Read y Serializable. PostgreSQL implementa Read Uncommitted como Read Committed, que es su nivel por defecto (PostgreSQL Global Development Group, s.f.). En Read Committed cada sentencia ve los datos confirmados al comenzar, de modo que dos lecturas en la misma transacción pueden diferir; Repeatable Read fija una instantánea para toda la transacción; Serializable garantiza equivalencia con alguna ejecución en serie a costa de abortar transacciones que deben reintentarse.

Las transacciones de EnsayAR no fijan un nivel explícito, por lo que rige Read Committed. Es suficiente porque las invariantes críticas no dependen de lecturas previas sino que se verifican en la propia sentencia de escritura, y la reevaluación del `WHERE` propia de ese nivel es justamente lo que vuelve correcta la actualización condicional.

### 6.9.3 SELECT ... FOR UPDATE frente a UPDATE condicional

Hay dos formas atómicas de proteger un descuento: la **pesimista**, que lee con `SELECT ... FOR UPDATE` (bloqueando la fila), compara en la aplicación y escribe; y la **actualización condicional**, una sola sentencia `UPDATE ... WHERE condición` cuyas filas afectadas indican si la condición se cumplió.

| Criterio | SELECT ... FOR UPDATE | UPDATE condicional |
|---|---|---|
| Viajes a la base | Dos (leer y escribir) | Uno |
| Duración del bloqueo | Desde la lectura hasta el final | Desde la escritura hasta el final |
| Lógica de validación | En la aplicación, flexible | En SQL, limitada a la condición |
| Información del fallo | Se conoce el valor leído | Requiere leer después para informar el disponible |
| Riesgo de error | Olvidar el FOR UPDATE reintroduce la carrera | Bajo, la atomicidad es intrínseca |

EnsayAR usa ambas donde corresponde. Para el stock, la actualización condicional, porque la regla es una desigualdad simple y conviene acortar el bloqueo de una fila muy disputada. Para el turno de caja, `SELECT ... FOR UPDATE` sobre `caja_turnos` en `validarTurnoEnTx`, porque la validación es más rica (turno abierto, propio del cajero, almacén de la sucursal del turno) y debe impedir que el turno se cierre mientras se registra la venta. Si falla, la operación offline queda en conflicto con códigos como `TURNO_CERRADO` y el móvil ofrece reasignarla con el botón "Pasar a mi turno".

### 6.9.4 Una transacción por operación sincronizada

Una sola transacción para todo el lote haría que un conflicto en la operación 37 deshiciera las 36 válidas anteriores, obligaría a reintentar todo y mantendría bloqueos durante el lote completo. EnsayAR usa **una transacción por operación**: cada venta, con sus líneas, su movimiento de inventario, la actualización del turno y su auditoría, se confirma o se deshace como unidad, con independencia de las demás.

Así se materializa el rollback que pide el docente. El script de verificación lo prueba con una venta de dos líneas donde la segunda variante no tiene stock: el primer `UPDATE` se ejecuta, el segundo afecta cero filas, la excepción aborta la transacción y el stock de la primera variante vuelve a su valor previo. El registro en `operaciones_sync` se escribe fuera de la transacción de negocio: si esta falla por un error interno se elimina para permitir el reintento, y si falla por una regla de negocio se conserva para que el reintento reciba el mismo veredicto.

## 6.10 Monolito modular frente a microservicios

### 6.10.1 Rollback local en el monolito

EnsayAR es un **monolito modular**: una aplicación NestJS desplegada como un solo proceso, organizada en módulos con fronteras claras (ventas, inventario, caja, sincronización, notificaciones, push, tenencia, plataforma) que comparten una base PostgreSQL y se comunican por inyección de dependencias, no por red. Cuando una venta modifica tablas que pertenecen a tres módulos (`ventas`, `stock_almacen`, `caja_turnos`), todas las escrituras ocurren en la misma conexión y transacción, y un fallo en cualquier paso se revierte con una única instrucción. No hay estados intermedios visibles ni compensaciones que programar. Ese es el sentido de la observación del docente: con una sola base, el rollback "uno a uno" es simple.

### 6.10.2 Transacciones distribuidas y 2PC

Si venta, inventario y caja fueran microservicios con base propia, no habría transacción común. La solución clásica es el **protocolo de confirmación en dos fases** (2PC): un coordinador pide a cada participante que se prepare dejando sus cambios provisionales y bloqueados; si todos votan sí, ordena confirmar, y si alguno vota no, deshacer. Kleppmann (2017) expone sus problemas: si el coordinador cae, un participante que votó sí queda en duda reteniendo bloqueos; basta un participante caído para que nada avance; y los bloqueos duran al menos dos viajes de red. Además, muchas bases e intermediarios de mensajería no soportan 2PC (Richardson, s.f.-b), y Richardson (s.f.-a) enumera "2PC no es una opción" entre las fuerzas que conducen al patrón Saga.

### 6.10.3 Patrón Saga

Una **saga** es una secuencia coordinada de transacciones locales, cada una confinada a un servicio. Si todas completan, la operación de negocio queda hecha; si una falla por violar una regla, se ejecutan **transacciones compensatorias** que deshacen semánticamente los pasos ya confirmados (Richardson, s.f.-a). Se coordina por **coreografía**, donde cada servicio publica un evento de dominio que dispara la transacción del siguiente, sin componente central, o por **orquestación**, donde un orquestador indica a cada participante qué ejecutar y decide el siguiente paso o las compensaciones. La primera acopla menos pero dificulta seguir el flujo; la segunda concentra la lógica en un punto comprensible. Richardson (s.f.-a) advierte dos desventajas inherentes: no hay rollback automático, porque cada compensación se diseña explícitamente, y no hay aislamiento, porque otras transacciones ven los estados intermedios, lo que obliga a contramedidas de diseño.

Una compensación no es un rollback técnico: no borra lo ocurrido, sino que registra una acción inversa con significado de negocio. Compensar un descuento de stock es registrar un reingreso; compensar un cobro es emitir un reembolso. EnsayAR ya aplica este razonamiento en el alta SaaS: si la creación de la tienda falla en la base después de cobrar la suscripción, el servicio de plataforma invoca el reembolso en la pasarela, porque un cobro externo no se deshace con un rollback de PostgreSQL.

### 6.10.4 Ejemplo: saga de venta si EnsayAR se dividiera

Supóngase EnsayAR dividido en cuatro servicios con base propia: Ventas, Inventario, Caja y Notificaciones. La venta en efectivo sincronizada se implementaría como una saga orquestada por Ventas:

| Paso | Servicio | Transacción local | Compensación |
|---|---|---|---|
| 1 | Ventas | Crear la venta PENDIENTE con el UUID del dispositivo | Marcar la venta RECHAZADA |
| 2 | Inventario | Descontar stock con el UPDATE condicional | Reingresar las unidades |
| 3 | Caja | Sumar el total al turno abierto | Restar el total del turno |
| 4 | Ventas | Marcar la venta COBRADA | No requiere (paso final) |
| 5 | Notificaciones | Avisar a la clienta y a los responsables | No requiere (reintentable) |

Si el paso 2 falla por stock insuficiente, se compensa el paso 1 y la operación offline se informa como conflicto, igual que hoy. Si el paso 3 falla porque el turno se cerró, se compensa el 2 (reingreso) y luego el 1. El estado PENDIENTE actúa como contramedida de aislamiento: reportes y arqueo deben ignorar ventas pendientes. La notificación va después del último paso compensable porque un aviso enviado no puede retirarse. En la variante coreografiada, los mismos pasos se encadenarían con eventos como `VentaCreada`, `StockDescontado` o `TurnoInvalido`, y cada servicio debería ser idempotente frente a eventos repetidos.

> Figura 6.5: diagrama de secuencia de la saga orquestada de venta, con el flujo exitoso arriba y, abajo, el fallo en Caja con las compensaciones de Inventario y Ventas en orden inverso.

### 6.10.5 Patrón Transactional Outbox

Una saga requiere que cada servicio actualice su base y publique un evento de forma atómica. Publicar dentro de la transacción es inseguro, porque si esta se deshace el evento anuncia algo que no ocurrió; publicar después de confirmar también, porque si el proceso cae entre ambos pasos el evento se pierde (Richardson, s.f.-b). El patrón **Transactional Outbox** escribe el mensaje en una tabla de salida de la misma base, dentro de la transacción que modifica las entidades, y un proceso separado, el relé, lo publica después. Así, los mensajes se envían si y solo si la transacción confirma, y en orden. Como el relé puede publicar un mensaje dos veces si cae tras enviarlo y antes de marcarlo, los consumidores deben ser idempotentes, típicamente registrando los identificadores ya procesados (Richardson, s.f.-b).

La analogía con EnsayAR es directa: la cola del dispositivo es un outbox del lado del cliente, y `operaciones_sync` cumple el papel del registro de mensajes procesados que exige el consumidor idempotente. Si EnsayAR se dividiera en servicios, el patrón se aplicaría entre ellos con una tabla de salida por base.

## 6.11 Notificaciones push y otras capacidades aprovechadas

El docente insistió en que la PWA no se agota en el offline. En EnsayAR, cuando una sincronización produce conflictos, `SyncService` crea para cada administrador y encargado activo la notificación "Conflicto al sincronizar", con enlace a `/sincronizacion`, y el servicio de notificaciones reenvía toda notificación interna como push mediante `PushService`.

La suscripción comienza con el botón "Activar notificaciones": la aplicación obtiene la clave pública con `GET /push/clave`, pide permiso, se suscribe con `pushManager.subscribe()` y registra la suscripción con `POST /push/suscribir`. El servidor la guarda en `push_suscripciones` con su *endpoint* y las claves `p256dh` y `auth`, y la elimina cuando el servicio push responde 404 o 410. En el service worker, el evento `push` muestra la notificación con una etiqueta (`tag`) que agrupa avisos del mismo tipo, y `notificationclick` enfoca la ventana abierta y navega al enlace. Se aprovechan además la instalación con atajos, la presentación `standalone`, la caché del armazón y los eventos `online` y `offline`, reflejados en un indicador permanente de conexión y pendientes.

## 6.12 Aplicación en EnsayAR

Esta sección recorre la implementación real, cerrada el 8 de noviembre de 2026 con la migración `20261108200000_offline_sync`.

### 6.12.1 Servidor

El módulo `backend/src/sync/` expone cinco rutas protegidas por JWT y roles: `GET` y `PATCH /sync/politica`, `POST /sync/lote`, `GET /sync/operaciones` y `POST /sync/operaciones/:id/descartar`. Cada operación del lote pasa por la idempotencia (6.8) y la ventana (6.2.3) y luego se despacha por tipo: la venta delega en `VentasService.cobrar` con su hora real (`hechaEn`); el cliente se crea con el UUID del dispositivo o se fusiona por correo; el producto se crea con variantes, stock inicial y movimiento de ajuste en una transacción. Las referencias a datos de otra tienda se rechazan con `REFERENCIA_NO_EXISTE`, apoyadas en la columna `tienda_id`, cuyo valor por defecto proviene de la variable de sesión `app.tienda_id`. La migración `20261108200000_offline_sync` añadió a `operaciones_sync` las columnas `hash`, `hecha_en`, `resultado`, `tipo` y `usuario_id` con su índice único por tienda; agregó `ventana_offline_dias` a `tiendas`; creó `push_suscripciones`; y reemplazó el índice único global de `ventas.uuid` por uno por `(tienda_id, uuid)`.

### 6.12.2 Web

La web registra el service worker desde `frontend/src/main.tsx` y concentra la lógica offline en `frontend/src/offline/`: `cola.ts`, `sync.ts`, `red.ts`, `cache.ts` y `pwa.ts`. Con red, el POS cobra con `POST /ventas` usando el UUID de la venta como `Idempotency-Key`; si la petición falla por red, encola la venta con ese mismo UUID, de modo que si el servidor alcanzó a registrarla la sincronización devuelve `repetida`. Sin red, encola directamente y descuenta el stock local; el alta de clientas y de productos funciona igual. La página `frontend/src/pages/Sincronizacion.tsx` tiene tres paneles: la cola del dispositivo con "Vender lo disponible" y "Descartar"; los conflictos de toda la tienda, para encargados y administradores, con fecha real, dispositivo y botón "Marcar resuelto"; y la política offline con el formulario de la ventana de 1 a 30 días.

### 6.12.3 Móvil

La aplicación React Native con Expo SDK 53 replica el modelo: SQLite en `almacen.native.ts`, respaldo en AsyncStorage para Expo web, UUID con `expo-crypto` y NetInfo, que considera al dispositivo en línea solo si está conectado e internet es alcanzable. El hook `useAutoSync` sincroniza al montar, al reconectar y cada 30 segundos, en tramos de 50. La función `cambiosReintento` decide la resolución según el código: ajusta las líneas al disponible ante `STOCK_INSUFICIENTE`, reasigna al turno abierto ante conflictos de turno y no ofrece reintento para `PAGO_REQUIERE_RED`, `PERMISO_DENEGADO` ni `DATOS_INVALIDOS`. La sesión guardada permite arrancar sin conexión; el servidor valida el token al sincronizar.

### 6.12.4 Verificación automatizada

El script `backend/scripts/verificar-offline.ts` (`npm run verificar:offline`) crea una tienda real con dos cajeros y realiza catorce comprobaciones contra la API en ejecución, entre ellas la última unidad vendida por dos cajas a la vez, el rollback de una venta de dos líneas, el reenvío de un lote como `repetida`, la fusión de clientas, cuatro `POST /ventas` simultáneos con la misma clave, el rechazo de una venta QR sin red y el comportamiento de la ventana al ampliarla de 7 a 10 días.

### 6.12.5 Limitaciones conocidas

El JWT dura 12 horas y la ventana 7 días: si la sesión vence sin red, la cola se conserva y la aplicación pide iniciar sesión antes de enviarla. La cadencia de reintento es fija, sin backoff exponencial; no se usa Background Sync; las claves de idempotencia no se depuran; y no se pide almacenamiento persistente. La versión móvil se probó en Expo web, con el respaldo de AsyncStorage, y se verificó que el paquete de Android compila, pero no se ejecutó con SQLite en un dispositivo Android físico.

### 6.12.6 Guion de demostración del conflicto en la defensa

1. Preparar dos cajas con turno abierto en la misma sucursal (por ejemplo, la PWA en un portátil y la aplicación móvil en un teléfono) y elegir una variante con stock 2.
2. En la caja A, cortar la red (modo avión o herramientas de desarrollo) y vender las 2 unidades en efectivo. Mostrar la venta **Pendiente** y el contador de operaciones sin sincronizar.
3. En la caja B, con red, vender 1 unidad de la misma variante; el servidor la aplica y el stock central queda en 1.
4. Explicar que A cree tener 2 disponibles porque su copia es eventualmente consistente, mientras el servidor mantiene la invariante con consistencia fuerte.
5. Reactivar la red en A. La venta pasa a **Conflicto** con "había 1 y la venta pedía 2"; mostrar que el stock no quedó negativo y que el administrador recibió el aviso.
6. Abrir `/sincronizacion` como administrador y señalar el conflicto con su fecha real y el dispositivo de origen.
7. En A, pulsar **Vender lo disponible**: se reencola con un UUID nuevo y 1 unidad, se aplica y el stock queda en 0. Marcar el conflicto original como resuelto.
8. Para cerrar, pulsar varias veces "Cobrar" con red inestable y mostrar que se registra una sola venta, explicando `Idempotency-Key` e `Idempotent-Replayed`.

La explicación puede apoyarse en tres frases que condensan el capítulo: el dispositivo registra hechos y el servidor decide si son aplicables; el descuento de stock es una única sentencia condicional que PostgreSQL reevalúa bajo bloqueo; y cada operación lleva un UUID generado en el dispositivo que la vuelve idempotente ante cualquier número de reintentos.

## Referencias del capítulo

Abadi, D. J. (2012). Consistency tradeoffs in modern distributed database system design: CAP is only part of the story. IEEE Computer, 45(2), 37-42. https://doi.org/10.1109/MC.2012.33

Archibald, J. (s.f.-a). The offline cookbook. web.dev, Google. https://web.dev/articles/offline-cookbook

Archibald, J. (s.f.-b). The service worker lifecycle. web.dev, Google. https://web.dev/articles/service-worker-lifecycle

Davis, K., Peabody, B. y Leach, P. (2024). Universally Unique IDentifiers (UUIDs) (RFC 9562). Internet Engineering Task Force. https://www.rfc-editor.org/rfc/rfc9562.html

Eidson, B. y Simmons, J. (2023, 16 de febrero). Web Push for web apps on iOS and iPadOS. WebKit Blog. https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

Jena, J., Dalal, S. y Tishkin, D. (2026). The Idempotency-Key HTTP Header Field (Internet-Draft draft-ietf-httpapi-idempotency-key-header-08). Internet Engineering Task Force. https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/

Kleppmann, M. (2017). Designing data-intensive applications: The big ideas behind reliable, scalable, and maintainable systems. O'Reilly Media.

MDN Web Docs. (s.f.-a). Push API. Mozilla. https://developer.mozilla.org/en-US/docs/Web/API/Push_API

MDN Web Docs. (s.f.-b). Storage quotas and eviction criteria. Mozilla. https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria

PostgreSQL Global Development Group. (s.f.). Transaction isolation. En PostgreSQL documentation, capítulo 13: Concurrency control. https://www.postgresql.org/docs/current/transaction-iso.html

Richardson, C. (s.f.-a). Pattern: Saga. Microservice Architecture. https://microservices.io/patterns/data/saga.html

Richardson, C. (s.f.-b). Pattern: Transactional outbox. Microservice Architecture. https://microservices.io/patterns/data/transactional-outbox.html

Russell, A. (2015, 15 de junio). Progressive web apps: Escaping tabs without losing our soul. Infrequently Noted. https://infrequently.org/2015/06/progressive-apps-escaping-tabs-without-losing-our-soul/

Stripe. (s.f.). Idempotent requests. Stripe API Reference. https://docs.stripe.com/api/idempotent_requests

Thomson, M. y Beverloo, P. (2017). Voluntary Application Server Identification (VAPID) for Web Push (RFC 8292). Internet Engineering Task Force. https://www.rfc-editor.org/info/rfc8292/
