# Contexto completo del proyecto EnsayAR

> Documento maestro para Obsidian. Estado inspeccionado al 22 de septiembre de 2026. Este documento describe el c?digo real y separa lo implementado de lo planificado o experimental.

## 1. Prop?sito

EnsayAR es un proyecto acad?mico para Sistemas de Informaci?n II. Modela una plataforma omnicanal para una cadena de tiendas de ropa femenina.

El alcance conceptual re?ne e-commerce, cat?logo, punto de venta, inventario por sucursal, almacenes, clientes, reservas, proveedores, administraci?n, reportes y funcionamiento offline parcial del POS.

No es todav?a una plataforma productiva completa. Pagos reales, env?os, pedidos completos, recursos humanos, transferencias de stock, chatbot con IA y probador virtual no deben presentarse como m?dulos terminados.

## 2. Estructura

    proyecto/
    ??? backend/
    ??? frontend/
    ??? movil/
    ??? infra/
    ??? docs/
    ??? Examen si2 Memorias/
    ??? docker-compose.yml
    ??? azure.yaml
    ??? .git/

backend/: API REST NestJS, TypeScript, Prisma, autenticaci?n, cat?logo, inventario, ventas, caja, reservas, usuarios, proveedores, reportes y administraci?n.

frontend/: SPA React con TypeScript, Vite y React Router. Contiene login, inicio, cat?logo, ficha, favoritos, carrito, cuenta, POS, reportes, administraci?n y explorador de base de datos.

movil/: aplicaci?n Expo/React Native que consume la misma API. Es un prototipo funcional parcial.

infra/: Bicep para Azure: App Service, Static Web App, PostgreSQL Flexible Server y Application Insights.

docs/: documentaci?n t?cnica, cat?logo demo, integraci?n API/offline y lista de pendientes.

Examen si2 Memorias/: material acad?mico con visi?n, actores, arquitectura, casos de uso, modelo de dominio, POS, offline, IA y probador como conceptos.

## 3. C?mo se fue trabajando

Al inicio se intentaron ejecutar comandos desde una carpeta incorrecta. PowerShell no encontraba backend, Prisma no encontraba schema.prisma y npm no encontraba package.json. La soluci?n fue ejecutar cada aplicaci?n desde su carpeta real.

Comandos principales:

    cd backend
    npm install
    npx prisma migrate deploy
    npx prisma db seed
    npm run start:dev

    cd frontend
    npm install
    npm run dev -- --host 127.0.0.1

Tambi?n se corrigi? el script start:prod, que apuntaba a dist/main aunque Nest generaba dist/src/main.js.

Se cre? la rama Andres para trabajar separadamente de main. El commit de cambios locales fue:

    0489e34 Integra modulos comerciales y seguridad

Despu?s la rama Andres se fusion? en main:

    fad2bb1 Fusiona rama Andres en main

El resultado fue subido a origin/main.

## 4. Problemas iniciales de login

El mensaje ?Correo o clave incorrectos? pod?a producirse por contrase?a incorrecta, backend apagado, PostgreSQL desconectado, migraciones no aplicadas o seed no ejecutado.

Credenciales de desarrollo:

    admin@ensayar.bo / diego
    cajero@ensayar.bo / diego
    encargado@ensayar.bo / diego
    proveedor@ensayar.bo / diego
    clienta@ensayar.bo / diego

Son credenciales acad?micas y no deben usarse en producci?n.

## 5. Evoluci?n por prompts

### Prompt 0

Se defini? Vesta como referencia conceptual y se decidi? conservar la arquitectura existente en lugar de reemplazarla.

### Prompt 2: sistema visual

Se aplic? una est?tica editorial de moda con negro, crema, vino, tipograf?a grande, espacio en blanco, navegaci?n oscura, tarjetas simples, responsive, modo claro/oscuro y foco visible.

Archivos principales:

- frontend/src/index.css
- frontend/src/styles/vesta-typography.css
- frontend/src/shared/
- frontend/src/pages/Shell.tsx

### Prompt 3: shell y navegaci?n

Shell principal en frontend/src/pages/Shell.tsx.

Incluye barra promocional, marca, navegaci?n, megamen?, b?squeda, favoritos, cuenta, carrito, sucursal, tema, conexi?n, acceso empleado y men? m?vil.

El shell organiza navegaci?n, pero no contiene toda la l?gica del cat?logo ni del POS.

### Prompt 4: inicio

Home en frontend/src/pages/Home.tsx.

Incluye hero editorial, campa?a, novedades, destacados, ?ltimas unidades, ocasiones, historia editorial, compra el look y beneficios.

Los productos se consultan desde API. Las im?genes pueden ser locales o de Unsplash.

### Prompt 5: cat?logo

Implementado en frontend/src/pages/Catalogo.tsx y backend/src/catalogo/.

Incluye b?squeda, SKU, historial local, sugerencias, categor?a, ocasi?n, talla, color, precio, sucursal, descuento, material, estilo, ajuste, ordenamiento, chips, limpieza, vista r?pida, densidad, carga progresiva y comparaci?n de hasta tres productos.

La b?squeda mediante imagen no est? implementada.

### Prompt 6: ficha

Implementado en frontend/src/pages/Ficha.tsx.

Incluye galer?a, variantes, talla, color, zoom, gu?a de medidas, informaci?n de modelo, composici?n, cuidados, origen, opiniones, alertas, complementarios, relacionados y compartir enlace.

Los videos de producto no est?n implementados.

### Prompt 7: cliente, favoritos y carrito

El estado se administra en frontend/src/storefront.tsx, frontend/src/carrito.ts y frontend/src/pages/Carrito.tsx.

Existe persistencia local, favoritos, vistos recientes, cantidades, eliminaci?n y sincronizaci?n de favoritos con backend.

El backend recalcula precios al confirmar ventas.

### Prompt 8: autenticaci?n

Se implementaron JWT, bcrypt, guards, roles, logout, revocaci?n de token, cambio de contrase?a y auditor?a.

### Prompt 9: POS

Implementado en frontend/src/pages/Pos.tsx, backend/src/ventas/ y backend/src/caja/.

Incluye turnos, productos, variantes, cliente opcional, cupones, pagos simulados, stock, caja, UUID e idempotencia.

No existe lector f?sico de c?digos de barras.

### Prompt 10: administraci?n

Incluye dashboard, explorador conceptual, auditor?a, usuarios, sucursales, temporadas, colecciones, proveedores y moderaci?n b?sica de opiniones.

### Prompt 11: integraci?n real

Se conectaron progresivamente autenticaci?n, sucursales, categor?as, productos, variantes, inventario, clientes, favoritos, alertas, carrito, ventas y administraci?n.

La venta ejecuta validaciones, recalcula precios, bloquea stock, registra movimientos y auditor?a dentro de una transacci?n.

### Prompt 12: offline

Se implement? frontend/src/cola-pos.ts con IndexedDB, fallback localStorage, UUID, dispositivo, estados y reintentos.

La resoluci?n avanzada de conflictos y sincronizaci?n de varios dispositivos permanece parcial.

### Prompt 13: cierre

Se ejecutaron build backend, build frontend, pruebas Jest, validaci?n Prisma, estado de migraciones, smoke tests de API, login, autorizaci?n, rutas web, lint y auditor?a de dependencias.

Resultados: backend y frontend compilan; 4 suites y 8 pruebas pasan; Prisma reporta la base actualizada; el cat?logo devuelve 46 productos; categor?as devuelve 15; login inv?lido devuelve 401; stock sin token devuelve 401.

## 6. Stack tecnol?gico real

Backend: NestJS 11, TypeScript, Node.js, Prisma 6.19.3, PostgreSQL, JWT, bcrypt, class-validator, Jest y Supertest.

Frontend: React 19, TypeScript, Vite 8, React Router DOM 7, Context API, fetch, CSS propio, localStorage e IndexedDB.

M?vil: Expo 53, React Native 0.79, React 19 y Expo Camera.

Infraestructura: Docker Compose para PostgreSQL local, Bicep para Azure, App Service, Static Web App, PostgreSQL Flexible Server y Application Insights.

No se confirm? despliegue activo en Azure. No se encontraron workflows CI/CD. No se confirm? Swagger, WebSockets, PWA completa ni una integraci?n real de IA.

## 7. Arquitectura

La arquitectura es cliente-servidor con monolito modular backend.

Presentaci?n: React web y Expo m?vil.

API: controladores NestJS, DTOs, guards y decoradores de roles.

Negocio: AuthService, CatalogoService, VentasService, InventarioService, CajaService, ReportesService y ReservasService.

Datos: PrismaService, Prisma Client y PostgreSQL.

No es microservicios. Web y m?vil son clientes distintos de la misma API.

## 8. M?dulos backend

Definidos en backend/src/app.module.ts:

- AuthModule
- CatalogoModule
- CajaModule
- VentasModule
- ReportesModule
- IaModule experimental
- InventarioModule
- ReservasModule
- UsuariosModule
- ProveedoresModule
- PagosModule
- MetaModule
- AdminModule
- PrismaModule

## 9. Roles reales

CLIENTA: cat?logo, favoritos, carrito, historial, reservas, opiniones, alertas y venta online.

CAJERO: caja y POS.

VENDEDOR: acceso al POS y ventas, con m?dulo espec?fico limitado.

ENCARGADO: inventario de sucursal, ventas de sucursal, POS y reservas.

ADMIN: usuarios, cat?logo, sucursales, proveedores, reportes, inventario, POS, auditor?a y explorador.

SUPERADMIN: definido en modelo y algunas rutas, sin m?dulo diferenciado completo.

PROVEEDOR: productos propios e ingresos de inventario vinculados.

RRHH: definido en enum, pero sin m?dulo funcional completo.

Actores UML sugeridos: cliente, cajero, vendedor, encargado, administrador, proveedor, responsable de RRHH, superadministrador, PostgreSQL y servicio de sincronizaci?n.

## 10. Autenticaci?n

Archivos principales:

- backend/src/auth/auth.controller.ts
- backend/src/auth/auth.service.ts
- backend/src/auth/token.service.ts
- backend/src/auth/jwt-auth.guard.ts
- backend/src/auth/roles.guard.ts

Implementado: registro, login, logout, sesi?n actual, cambio de contrase?a, bcrypt, JWT con expiraci?n, revocaci?n, usuario activo, guards, roles y auditor?a.

No implementado: refresh tokens, recuperaci?n por correo, bloqueo por intentos y gesti?n avanzada de sesiones.

Flujo: el frontend env?a credenciales, AuthService busca usuario, compara bcrypt, registra auditor?a, crea JWT y devuelve usuario p?blico. El frontend conserva token y usuario en localStorage.

## 11. Modelo de datos

El esquema est? en backend/prisma/schema.prisma.

Entidades actuales:

- Usuario
- Sucursal
- Almacen
- Proveedor
- Temporada
- Coleccion
- Producto
- Variante
- StockAlmacen
- MovimientoInventario
- Reserva
- LineaReserva
- CajaTurno
- Venta
- LineaVenta
- PagoSimulado
- ReporteEjecucion
- Categoria
- ProductoCategoria
- DireccionCliente
- Favorito
- CuentaLealtad
- Cupon
- Pedido
- Promocion
- Empleado
- TurnoEmpleado
- EventoAnalitica
- Dispositivo
- OperacionSync
- TokenRevocado
- Auditoria
- Opinion
- AlertaProducto

Relaciones principales:

Usuario se relaciona con sucursal, proveedor, ventas, reservas, opiniones, alertas, direcciones, favoritos, lealtad, pedidos y empleado.

Sucursal tiene almacenes, usuarios, turnos y reservas.

Almacen tiene stock, ventas y movimientos.

Producto tiene variantes, opiniones, alertas, favoritos, categor?as, temporada, colecci?n y proveedor.

Variante tiene stock, l?neas de venta, l?neas de reserva y movimientos.

Venta tiene l?neas, pago, almac?n, turno, clienta y movimientos.

Producto y Categoria tienen relaci?n N:M mediante ProductoCategoria.

Restricciones: email ?nico, SKU ?nico, combinaci?n producto-talla-color ?nica, UUID de venta ?nico, cup?n ?nico, favoritos ?nicos, opiniones ?nicas por producto/usuario, alertas ?nicas y operationId ?nico.

## 12. Normalizaci?n

El modelo cumple razonablemente 1FN.

Cumple parcialmente 2FN mediante claves compuestas en StockAlmacen y ProductoCategoria.

Cumple parcialmente 3FN. Persisten campos textuales que podr?an normalizarse:

- Producto.categoria
- Producto.ocasion
- Producto.material
- Producto.ajuste
- Producto.origen
- Empleado.puesto
- Empleado.contrato
- Pedido.estado
- OperacionSync.estado
- TurnoEmpleado.estado
- AlertaProducto.tipo

El inventario separa saldo actual en StockAlmacen e historial en MovimientoInventario. Los ajustes registran la cantidad final como cantidad del movimiento, por lo que podr?an mejorarse con saldo anterior, saldo nuevo y diferencia.

## 13. Inventario

El stock est? asociado a variante y almac?n. El almac?n pertenece a una sucursal.

Tipos de movimiento: venta, reserva, liberaci?n, ajuste e ingreso de proveedor.

Ventas utilizan transacciones y FOR UPDATE para evitar ventas simult?neas del mismo stock.

No existen m?dulos completos para transferencias, almac?n central, stock m?nimo/m?ximo, ?rdenes de compra o inventario c?clico.

## 14. E-commerce

Flujo real:

Cliente ? cat?logo ? detalle ? variante ? carrito ? POST /ventas ? validaci?n de stock ? venta ? movimiento.

Existe compra online b?sica.

No existe un flujo completo de pedido, l?neas de pedido, checkout formal, env?o, despacho, seguimiento o devoluci?n. La entidad Pedido existe, pero no tiene LineaPedido.

## 15. POS

Flujo real:

1. Empleado inicia sesi?n.
2. Accede a /pos.
3. Abre turno.
4. Selecciona productos y variantes.
5. Puede asociar una clienta.
6. Puede aplicar cup?n.
7. Selecciona pago simulado.
8. Backend valida turno y almac?n.
9. Backend obtiene precios reales.
10. Se bloquea stock.
11. Se crea la venta.
12. Se descuenta stock.
13. Se registra movimiento.
14. Se actualiza caja.
15. Se registra auditor?a.

No existe lector f?sico ni comprobante fiscal.

## 16. Offline

Archivos: frontend/src/cola-pos.ts y frontend/src/pages/Pos.tsx.

Implementado: IndexedDB, localStorage de respaldo, UUID, ID de dispositivo, estados pending/syncing/synced/failed/conflict/cancelled, persistencia al reiniciar, reintentos, idempotencia y cat?logo/inventario local b?sico.

Parcial: resoluci?n de conflictos, sincronizaci?n entre dispositivos, uso completo de OperacionSync, cifrado local y pruebas automatizadas de escenarios offline.

Flujo:

    venta POS
    ? IndexedDB/localStorage
    ? cola pendiente
    ? reconexi?n
    ? POST /ventas
    ? validaci?n UUID
    ? transacci?n PostgreSQL
    ? sincronizada o conflicto

## 17. Reportes

GET /reportes/dia: ventas del d?a por sucursal, cajero, producto, variante, unidades y total.

GET /reportes/inventario: stock por sucursal, almac?n, producto, SKU, cantidad, reservado y disponible.

POST /reportes/generativo: recibe una pregunta y la transforma mediante reglas limitadas en una consulta SQL validada.

No hay PDF, Excel ni gr?ficos avanzados.

## 18. Chatbot e IA

No debe presentarse como chatbot implementado.

backend/src/ia/ contiene un asistente determin?stico para precio, talla, color, ocasi?n y descripci?n. No usa OpenAI, LLM, embeddings ni generaci?n libre de SQL.

El reporte generativo tampoco utiliza IA. Usa filtros predefinidos y SQL restringido.

## 19. Probador virtual

No debe presentarse como implementado.

Existen prototipos en frontend/src/pages/Probador.tsx, frontend/src/pose.ts, movil/App.tsx y overlays gr?ficos. Utilizan c?mara y superposici?n b?sica.

No existe tracking corporal robusto, realidad aumentada completa, segmentaci?n, ajuste realista ni persistencia. Debe clasificarse como funcionalidad futura o experimental.

## 20. API REST principal

Auth:

- POST /auth/registro
- POST /auth/login
- POST /auth/logout
- GET /auth/me
- POST /auth/cambiar-clave

Cat?logo:

- GET /catalogo/productos
- GET /catalogo/productos/:id
- GET /catalogo/productos/:id/complementarios
- GET /catalogo/productos/:id/opiniones
- POST /catalogo/productos/:id/opiniones
- POST /catalogo/productos/:id/alertas
- GET /catalogo/productos/:id/interno
- GET /catalogo/stock
- GET /catalogo/sucursales
- GET /catalogo/categorias
- GET /catalogo/variantes/:id/overlay
- POST /catalogo/productos
- PATCH /catalogo/productos/:id
- POST /catalogo/productos/:id/variantes
- PATCH /catalogo/variantes/:id
- PUT /catalogo/stock

Inventario:

- GET /inventario/movimientos
- POST /inventario/ajuste
- POST /inventario/ingreso

Ventas y caja:

- GET /ventas/historial
- GET /ventas/sucursal
- POST /ventas
- GET /caja/turno-abierto
- POST /caja/abrir
- POST /caja/cerrar

Clientes:

- GET /cliente/favoritos
- POST /cliente/favoritos/:productoId
- DELETE /cliente/favoritos/:productoId
- GET /cliente/perfil
- GET /cliente/direcciones
- POST /cliente/direcciones
- GET /cliente/cupones

Reservas:

- GET /reservas/mias
- GET /reservas/sucursal
- GET /reservas/:id
- POST /reservas
- PATCH /reservas/:id/estado

Reportes:

- GET /reportes/dia
- GET /reportes/inventario
- POST /reportes/generativo

Administraci?n:

- GET /admin/esquema
- GET /admin/resumen
- GET /admin/auditoria
- GET /admin/modulos
- GET /admin/opiniones/pendientes
- PATCH /admin/opiniones/:id/moderacion

## 21. Rutas frontend

- /login
- /registro
- /inicio
- /catalogo
- /ficha/:id
- /favoritos
- /cuenta
- /carrito
- /reservas
- /historial
- /pos
- /encargado
- /admin
- /admin/configuracion
- /proveedor
- /reportes
- /base-datos
- /probar/:varianteId, experimental

Shell global: frontend/src/pages/Shell.tsx.

## 22. Aplicaci?n m?vil

movil/ utiliza Expo y React Native.

Incluye login, cat?logo, variantes, carrito, compra, reservas, sucursales y c?mara experimental.

No tiene React Navigation, SQLite ni persistencia m?vil robusta. Es un prototipo parcial.

## 23. Pruebas

Pruebas encontradas:

- backend/src/app.controller.spec.ts
- backend/src/catalogo/catalogo.service.spec.ts
- backend/src/ia/ficha.spec.ts
- backend/src/reportes/sql-seguro.spec.ts
- backend/src/ventas/ventas.spike-b.spec.ts
- backend/test/app.e2e-spec.ts

Cobertura: controlador ra?z, cat?logo, filtros, paginaci?n, ficha determin?stica, SQL seguro, concurrencia, UUID y e2e b?sico.

No existe cobertura completa de frontend, m?vil, accesibilidad, todos los roles, sincronizaci?n y navegaci?n E2E.

## 24. Casos QA sugeridos

- Registro v?lido e inv?lido.
- Login v?lido, inv?lido, usuario desactivado y token revocado.
- Rol sin permiso.
- Cat?logo paginado y filtros combinados.
- SKU inexistente.
- Variante agotada.
- Favorito duplicado.
- Carrito con dos variantes.
- Venta con stock y sin stock.
- UUID repetido.
- Venta sin turno.
- Restricci?n por sucursal.
- Cierre de turno.
- Reserva.
- Ajuste de inventario.
- Ingreso de proveedor.
- Opini?n no verificada.
- Moderaci?n.
- Reporte diario.
- Reporte de inventario.
- Operaci?n offline, reintento y conflicto.
- Explorador de esquema.
- Responsive m?vil y escritorio.

## 25. Azure y despliegue

Archivos:

- azure.yaml
- infra/main.bicep
- infra/app.bicep
- infra/main.parameters.json

Preparan App Service, Static Web App, PostgreSQL Flexible Server, Application Insights y variables seguras.

No se confirm? despliegue activo. No hay GitHub Actions ni CI/CD.

Docker prepara PostgreSQL local, no un despliegue completo.

## 26. Problemas e inconsistencias

- Pedido no tiene l?neas.
- Pagos reales no existen.
- Env?os no existen.
- Transferencias de stock no existen.
- Almac?n central no est? modelado.
- Categoria convive con Producto.categoria textual.
- Varios estados y tipos son texto.
- RRHH est? definido pero no desarrollado.
- SUPERADMIN no tiene flujo diferenciado completo.
- El l?mite de uso de cupones requiere revisi?n.
- No existen refresh tokens ni recuperaci?n de contrase?a.
- La aplicaci?n m?vil es b?sica.
- No hay E2E completa.
- No hay CI/CD.
- Los reportes generativos no usan IA real.
- El probador es experimental.
- Algunas llamadas frontend a?n no est?n completamente migradas a servicios.
- Prettier detecta formato pendiente.
- npm audit report? vulnerabilidades transitivas altas en backend.
- README describe una versi?n menor que el estado actual.

## 27. Estado general

Funcional o avanzado:

- Backend NestJS.
- Frontend React.
- PostgreSQL y Prisma.
- Migraciones y seeds.
- Login y registro.
- Roles.
- Cat?logo.
- Ficha.
- Favoritos.
- Carrito frontend.
- POS.
- Caja.
- Inventario b?sico.
- Reservas.
- Proveedores b?sicos.
- Administraci?n b?sica.
- Auditor?a.
- Reportes b?sicos.
- Cola offline parcial.
- Preparaci?n de Azure.

Parcial:

- Pedidos.
- Pagos.
- Promociones.
- Cupones.
- RRHH.
- Sincronizaci?n.
- M?vil.
- Azure.
- Restricciones por sucursal.
- Pruebas E2E.
- Administraci?n avanzada.

No implementado:

- Pagos reales.
- Env?os.
- Transferencias.
- Almac?n central.
- RRHH completo.
- Chatbot real.
- IA generativa.
- Probador virtual real.
- PWA completa.
- CI/CD.
- Exportaci?n PDF/Excel.

## 28. Recomendaci?n acad?mica

La descripci?n recomendada es:

?Plataforma omnicanal acad?mica para la gesti?n de cat?logo, ventas POS, inventario por sucursal, clientes y operaciones administrativas, desarrollada con React, Expo/React Native, NestJS, Prisma y PostgreSQL.?

Debe aclararse que los pagos son simulados, el offline es parcial, pedidos y log?stica est?n incompletos, m?vil es un prototipo, Azure est? preparado pero no confirmado como producci?n, y chatbot/probador virtual no est?n implementados.

## 29. Ejecuci?n

PostgreSQL:

    docker compose up -d postgres

Backend:

    cd backend
    npm install
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    npm run demo:catalog
    npm run start:dev

Frontend:

    cd frontend
    npm install
    npm run dev -- --host 127.0.0.1

Build backend:

    cd backend
    npm run build
    npm run start:prod

Build frontend:

    cd frontend
    npm run build

URLs:

    Frontend: http://127.0.0.1:5173/inicio
    Backend: http://127.0.0.1:3000

Variables de entorno:

    DATABASE_URL=
    PORT=3000
    JWT_SECRET=
    JWT_EXPIRES_IN=12h

## 30. Fuentes principales

- backend/prisma/schema.prisma
- backend/prisma/seed.ts
- backend/prisma/migrations/
- backend/src/app.module.ts
- backend/src/auth/
- backend/src/catalogo/
- backend/src/inventario/
- backend/src/ventas/
- backend/src/caja/
- backend/src/reportes/
- backend/src/admin/
- backend/src/usuarios/
- frontend/src/App.tsx
- frontend/src/pages/
- frontend/src/storefront.tsx
- frontend/src/cola-pos.ts
- movil/App.tsx
- infra/main.bicep
- infra/app.bicep
- docs/Lista de pendientes Prompts.md

