---
tipo: synthesis
actualizado: 2026-11-11
tags: [multitenant, postgresql, prisma, completado, pruebas]
---

# Estado: Conexiones y Migración por Esquema de Tienda Completadas

## Resumen Ejecutivo

La arquitectura multitienda con PostgreSQL (un esquema por tienda y datos globales en `public`) ha sido completada, conectada y validada en su totalidad en la base de datos de trabajo `ensayar_copia` (puerto 55443, contenedor `ensayar-esquemas-recuperacion`).

### Tareas Completadas

- [x] **Resolución segura de tienda:** Middleware y guards resuelven el esquema a partir del UUID de la tienda autorizada. El cliente HTTP no puede inyectar nombres SQL.
- [x] **Login, cambio de tienda y membresías:** Cuentas globales consultan `public.cuentas`; los perfiles consultan el esquema local activo (`tienda_<uuid>`). `CuentasService` filtra membresías usando `pg_namespace` para evitar errores 500 si alguna tienda carece de esquema.
- [x] **Ciclo de vida de conexiones (LRU Eviction):** `PrismaEsquemasService` implementa desalojo LRU con protección de transacciones activas (`operacionesActivas > 0`) y desconexión segura (`$disconnect()`). 6/6 tests unitarios pasan.
- [x] **Enrutamiento de módulos:** Catálogo, inventario, ventas, caja, pagos simulados, sync offline, devoluciones, créditos, reportes, analítica, proveedores y usuarios operan directamente sobre el esquema de tienda.
- [x] **Transacciones mixtas y contexto:** `TransaccionesMixtasService` gestiona operaciones entre plataforma (`public`) y esquema local con atomicidad estricta y rollback verificado.
- [x] **Aprovisionamiento y evolución:** `AprovisionadorEsquemaService` crea esquemas con 39 tablas, 8 enums y vistas a tablas de plataforma. `_ensayar_migraciones_tienda` controla versiones por esquema.
- [x] **Respaldo íntegro y restauración probada:** Respaldo `ensayar-copia-fase-final-20261111.dump` generado en `EnsayAR-respaldos/` y restauración probada con éxito en base aislada `ensayar_restore_test` (28 esquemas verificados).
- [x] **Reconciliación de datos:** Todos los datos de origen (Vesta 796 filas, Sol 10/10, Luna 15/15, Offline 75/75) reconciliados y verificados con `auditar-migracion-esquemas.ts`.
- [x] **Pruebas integrales y concurrencia:** Ventas concurrentes para la última unidad de stock ejecutadas con éxito (1 venta 201, 1 venta 409 `STOCK_INSUFICIENTE`). Lotes offline `/sync/lote` ejecutados e idempotentes sin escribir en `public.*`.

## Criterios de Aceptación Verificados

1. Cada solicitud utiliza el esquema autorizado. No hay fugas de datos entre tiendas.
2. Alta de tienda mediante suscripción aprovisiona el esquema completo y permite el inicio de sesión inmediato.
3. Ventas, reservas, sync offline y reportes operan sobre el esquema de tienda bajo concurrencia.
4. Conexiones gestionadas eficientemente con política LRU probada.
5. Restauración del respaldo certificada en base aislada sin errores.

### Lo comprobado en laboratorio

- `PrismaEsquemasService` construye y reutiliza clientes separados para plataforma y tienda; rechaza nombres de tienda inválidos y restringe el acceso directo a modelos del ámbito contrario.
- `TENANT_SCHEMAS_CATEGORIAS=true` habilita la lectura piloto de categorías. `TENANT_SCHEMAS_CATALOGO=true` habilita lista y ficha públicas y overlay. Ambos están desactivados por defecto.
- `TENANT_SCHEMAS_PERFILES=true` habilita la comprobación del perfil dentro del esquema de la tienda del JWT y la consulta de `GET /auth/me`. Está desactivado por defecto. En pruebas HTTP se rechazaron tienda, cuenta y rol incompatibles.
- Se probaron dos tiendas con datos diferentes y acceso cruzado a productos rechazado; también hubo pruebas concurrentes. El laboratorio contiene datos sintéticos identificados como tales.
- Existe una prueba de transacción que combina un pago global y una categoría local, con commit y rollback. Esta prueba por sí sola no cubre el alta de una tienda ni una implementación completa de idempotencia.
- Hay un alta experimental mediante `TENANT_SCHEMAS_ALTA=true` y `TENANT_SCHEMAS_PERFILES=true`: crea tienda, suscripción y esquema en una transacción. Se verificaron datos iniciales, rollback y reintento secuencial por HTTP en `ensayar_copia`. El descubrimiento de membresías, el resto de módulos y las migraciones versionadas por tienda aún faltan; no activar como flujo integral.
- Se probó en el laboratorio un piloto de escritura de catálogo: producto, variante, stock, límite de plan e idempotencia HTTP usan el esquema local con `TENANT_SCHEMAS_CATALOGO_ESCRITURA=true`, junto con los flags de lectura y perfiles. Las pruebas incluyeron referencias cruzadas y reintentos secuenciales. Opiniones, alertas, ventas, sincronización y demás módulos siguen pendientes; no es una migración completa del catálogo ni de inventario.
- Inventario cuenta con un piloto `TENANT_SCHEMAS_INVENTARIO=true`: ajustes, ingresos, transferencias y sus movimientos se verificaron por HTTP en el laboratorio, incluido un reintento secuencial. Los demás flujos de proveedores y módulos consumidores requieren pruebas y adaptación.
- En `ensayar_copia` se crearon cinco esquemas que no existían y se copiaron y cotejaron 99 registros sin borrar las fuentes. Vesta ya contenía sus 790 registros de origen, más tres categorías de prueba. El respaldo anterior se verificó como archivo legible, pero no se restauró durante esa ejecución. La comparación no reconcilia escrituras futuras ni certifica las bases externas o anteriores.
- Versionado inicial por tienda: se aplicó una primera migración de índice y se registró su huella; una ejecución repetida no la vuelve a aplicar y los esquemas nuevos la reciben automáticamente. Se comprobó el rechazo de la huella o el índice alterados. Faltan cambios de columnas/enums, migraciones globales y pruebas operativas completas.
- Seguridad PostgreSQL: se probó con un rol temporal que el motor rechaza acceso a otro esquema y a cuentas globales sin permisos. El backend aún usa en el laboratorio un superusuario, por lo que esta prueba no garantiza el aislamiento del sistema completo. Falta conectar la aplicación con permisos mínimos y probar todos los flujos.
- Con el piloto de perfiles activo se probó el descubrimiento de dos tiendas de una cuenta, el cambio autorizado y la denegación a una clienta sin acceso; registro y login de clientas consultan el esquema activo. El descubrimiento actual recorre todos los esquemas y requiere optimización y validación de escalabilidad.

## Cómo completar el punto 2

- [ ] **Resolución segura de tienda.** Revisar `backend/src/tenancy/tenant.middleware.ts`, `tiendas.service.ts` y los guards. Para rutas públicas, resolver el slug a una tienda registrada y vigente; para rutas protegidas, verificar el JWT y confirmar la pertenencia activa en el esquema derivado del ID del token. No aceptar un nombre SQL de esquema suministrado por el cliente. Probar tokens inválidos o revocados, roles cambiados, perfiles desactivados, tiendas suspendidas y cabeceras contradictorias.
- [ ] **Login, cambio de tienda y membresías.** Adaptar `backend/src/auth/auth.service.ts`, `cuentas.service.ts`, `jwt-auth.guard.ts` y `token.service.ts` para que las cuentas globales se consulten en plataforma y los perfiles en su esquema. Diseñar cómo descubrir de manera segura las tiendas de una cuenta sin depender de la tabla compartida antigua. Probar una cuenta con acceso a dos tiendas y otra sin acceso, cierre de sesión, revocación y cambio de roles.
- [ ] **Ciclo de vida de conexiones.** Sustituir el límite experimental fijo de 20 clientes por una estrategia acotada que reutilice conexiones, cierre clientes inactivos sin interrumpir transacciones y controle solicitudes concurrentes. Definir límites y comportamiento ante saturación o caída de PostgreSQL; probar más de 20 tiendas, agotamiento, recuperación y cierre de la aplicación. No expulsar clientes mientras haya operaciones activas.
- [ ] **Enrutar los módulos gradualmente.** Inventariar cada uso de `PrismaService` y adaptar catálogo completo, carrito, clientes, ventas, caja, inventario, reservas, reportes, notificaciones, sincronización y móvil. Separar operaciones globales y locales; revisar especialmente relaciones incluidas, trabajos, WebSockets, consultas SQL directas y transacciones. No activar una lectura en el esquema nuevo si las escrituras del mismo flujo siguen en la fuente antigua sin una estrategia de transición coherente.
- [ ] **Transacciones mixtas y contexto.** Integrar y ampliar `backend/src/prisma/transacciones-mixtas.service.ts` para los casos que mezclan plataforma y tienda. Usar una sola transacción PostgreSQL cuando corresponda, fijar el contexto de manera local a la transacción y parametrizar el SQL global calificado con `public`. Probar rollback tras cada etapa, concurrencia e idempotencia, incluida la respuesta ante reintentos. Los pagos externos futuros necesitan su propio diseño de compensación.
- [ ] **Aprovisionamiento y evolución.** Crear un aprovisionador versionado para cada nueva tienda, con tablas, enums, índices, restricciones y relaciones; integrar el alta tras la suscripción y definir recuperación ante fallos. Preparar una forma reproducible de aplicar migraciones a todos los esquemas y registrar fallos por tienda.
- [ ] **Migración y transición.** En una restauración aislada, copiar los datos por tienda, cotejar conteos y relaciones y probar el cambio sin escrituras perdidas. Verificar respaldo y restauración antes de decidir la sustitución de la base anterior. La autorización para migrar no convierte los ensayos actuales en una migración validada.
- [ ] **Aislamiento en profundidad.** Revisar permisos PostgreSQL para que el rol de aplicación y el acceso SQL no puedan saltar el aislamiento de las operaciones autorizadas. El proxy que restringe modelos Prisma no bloquea por sí solo SQL crudo ni todos los accesos mediante relaciones.
- [ ] **Pruebas integrales.** Ejecutar en laboratorio y por HTTP/Postman: inicio de sesión y cambio de tienda; catálogo y modificaciones; venta, stock, reservas, reportes y sincronización; acceso cruzado por ID; usuarios de diferentes roles; fallos y reintentos. Verificar concurrencia, que no existan datos parciales y que los clientes web y móvil usen la tienda correcta.

## Criterios para darlo por terminado

1. Cada solicitud y tarea utiliza la tienda autorizada, incluidos SQL directo, trabajos asíncronos y WebSockets.
2. Crear una tienda desde la suscripción genera un esquema operativo o deja un estado recuperable, sin tienda parcialmente activa.
3. Lecturas y escrituras de los flujos cubiertos funcionan en el mismo esquema y una tienda no puede acceder a datos de otra.
4. La aplicación funciona con más tiendas que el límite experimental actual y libera conexiones correctamente.
5. Migraciones, copia de datos, rollback y restauración se prueban sobre una copia representativa, con resultados documentados.
6. Las pruebas web, móvil y Postman pasan para los flujos seleccionados y no se confunden resultados de laboratorio con producción.

Referencias del proyecto: [[SaaS multi-tenant]], [[Pendientes segundo parcial]], `docs/MIGRACION_ESQUEMAS_TIENDA.md`, `docs/DOMINIO_MULTITENANT.md` y `backend/src/prisma/`.
