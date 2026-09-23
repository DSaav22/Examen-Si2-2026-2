# Contexto completo del proyecto EnsayAR

> Documento maestro para Obsidian. Estado inspeccionado al 22 de septiembre de 2026. Este documento describe el código real y separa lo implementado de lo planificado o experimental.

## 1. Propósito

EnsayAR es un proyecto académico para Sistemas de Información II. Modela una plataforma omnicanal para una cadena de tiendas de ropa femenina.

El alcance conceptual reúne e-commerce, catálogo, punto de venta, inventario por sucursal, almacenes, clientes, reservas, proveedores, administración, reportes y funcionamiento offline parcial del POS.

No es todavía una plataforma productiva completa. Pagos reales, envíos, pedidos completos, recursos humanos, transferencias de stock, chatbot con IA y probador virtual no deben presentarse como módulos terminados.

## 2. Estructura

    proyecto/
    ├── backend/
    ├── frontend/
    ├── movil/
    ├── infra/
    ├── docs/
    ├── Examen si2 Memorias/
    ├── docker-compose.yml
    ├── azure.yaml
    └── .git/

backend/: API REST NestJS, TypeScript, Prisma, autenticación, catálogo, inventario, ventas, caja, reservas, usuarios, proveedores, reportes y administración.

frontend/: SPA React con TypeScript, Vite y React Router. Contiene login, inicio, catálogo, ficha, favoritos, carrito, cuenta, POS, reportes, administración y explorador de base de datos.

movil/: aplicación Expo/React Native que consume la misma API. Es un prototipo funcional parcial.

infra/: Bicep para Azure: App Service, Static Web App, PostgreSQL Flexible Server y Application Insights.

docs/: documentación técnica, catálogo demo, integración API/offline y lista de pendientes.

Examen si2 Memorias/: material académico con visión, actores, arquitectura, casos de uso, modelo de dominio, POS, offline, IA y probador como conceptos.

## 3. Cómo se fue trabajando

Al inicio se intentaron ejecutar comandos desde una carpeta incorrecta. PowerShell no encontraba backend, Prisma no encontraba schema.prisma y npm no encontraba package.json. La solución fue ejecutar cada aplicación desde su carpeta real.

Comandos principales:

    cd backend
    npm install
    npx prisma migrate deploy
    npx prisma db seed
    npm run start:dev

    cd frontend
    npm install
    npm run dev -- --host 127.0.0.1

También se corrigió el script start:prod, que apuntaba a dist/main aunque Nest generaba dist/src/main.js.

Se creó la rama Andres para trabajar separadamente de main. El commit de cambios locales fue:

    0489e34 Integra modulos comerciales y seguridad

Después la rama Andres se fusionó en main:

    fad2bb1 Fusiona rama Andres en main

El resultado fue subido a origin/main.

## 4. Problemas iniciales de login

El mensaje “Correo o clave incorrectos” podía producirse por contraseña incorrecta, backend apagado, PostgreSQL desconectado, migraciones no aplicadas o seed no ejecutado.

Credenciales de desarrollo:

    admin@ensayar.bo / diego
    cajero@ensayar.bo / diego
    encargado@ensayar.bo / diego
    proveedor@ensayar.bo / diego
    clienta@ensayar.bo / diego

Son credenciales académicas y no deben usarse en producción.

## 5. Evolución por prompts

### Prompt 0

Se definió Vesta como referencia conceptual y se decidió conservar la arquitectura existente en lugar de reemplazarla.

### Prompt 2: sistema visual

Se aplicó una estética editorial de moda con negro, crema, vino, tipografía grande, espacio en blanco, navegación oscura, tarjetas simples, responsive, modo claro/oscuro y foco visible.

Archivos principales:

- frontend/src/index.css
- frontend/src/styles/vesta-typography.css
- frontend/src/shared/
- frontend/src/pages/Shell.tsx

### Prompt 3: shell y navegación

Shell principal en frontend/src/pages/Shell.tsx.

Incluye barra promocional, marca, navegación, megamenú, búsqueda, favoritos, cuenta, carrito, sucursal, tema, conexión, acceso empleado y menú móvil.

El shell organiza navegación, pero no contiene toda la lógica del catálogo ni del POS.

### Prompt 4: inicio

Home en frontend/src/pages/Home.tsx.

Incluye hero editorial, campaña, novedades, destacados, últimas unidades, ocasiones, historia editorial, compra el look y beneficios.

Los productos se consultan desde API. Las imágenes pueden ser locales o de Unsplash.

### Prompt 5: catálogo

Implementado en frontend/src/pages/Catalogo.tsx y backend/src/catalogo/.

Incluye búsqueda, SKU, historial local, sugerencias, categoría, ocasión, talla, color, precio, sucursal, descuento, material, estilo, ajuste, ordenamiento, chips, limpieza, vista rápida, densidad, carga progresiva y comparación de hasta tres productos.

La búsqueda mediante imagen no está implementada.

### Prompt 6: ficha

Implementado en frontend/src/pages/Ficha.tsx.

Incluye galería, variantes, talla, color, zoom, guía de medidas, información de modelo, composición, cuidados, origen, opiniones, alertas, complementarios, relacionados y compartir enlace.

Los videos de producto no están implementados.

### Prompt 7: cliente, favoritos y carrito

El estado se administra en frontend/src/storefront.tsx, frontend/src/carrito.ts y frontend/src/pages/Carrito.tsx.

Existe persistencia local, favoritos, vistos recientes, cantidades, eliminación y sincronización de favoritos con backend.

El backend recalcula precios al confirmar ventas.

### Prompt 8: autenticación

Se implementaron JWT, bcrypt, guards, roles, logout, revocación de token, cambio de contraseña y auditoría.

### Prompt 9: POS

Implementado en frontend/src/pages/Pos.tsx, backend/src/ventas/ y backend/src/caja/.

Incluye turnos, productos, variantes, cliente opcional, cupones, pagos simulados, stock, caja, UUID e idempotencia.

No existe lector físico de códigos de barras.

### Prompt 10: administración

Incluye dashboard, explorador conceptual, auditoría, usuarios, sucursales, temporadas, colecciones, proveedores y moderación básica de opiniones.

### Prompt 11: integración real

Se conectaron progresivamente autenticación, sucursales, categorías, productos, variantes, inventario, clientes, favoritos, alertas, carrito, ventas y administración.

La venta ejecuta validaciones, recalcula precios, bloquea stock, registra movimientos y auditoría dentro de una transacción.

### Prompt 12: offline

Se implementó frontend/src/cola-pos.ts con IndexedDB, fallback localStorage, UUID, dispositivo, estados y reintentos.

La resolución avanzada de conflictos y sincronización de varios dispositivos permanece parcial.

### Prompt 13: cierre

Se ejecutaron build backend, build frontend, pruebas Jest, validación Prisma, estado de migraciones, smoke tests de API, login, autorización, rutas web, lint y auditoría de dependencias.

Resultados: backend y frontend compilan; 4 suites y 8 pruebas pasan; Prisma reporta la base actualizada; el catálogo devuelve 46 productos; categorías devuelve 15; login inválido devuelve 401; stock sin token devuelve 401.

## 6. Stack tecnológico real

Backend: NestJS 11, TypeScript, Node.js, Prisma 6.19.3, PostgreSQL, JWT, bcrypt, class-validator, Jest y Supertest.

Frontend: React 19, TypeScript, Vite 8, React Router DOM 7, Context API, fetch, CSS propio, localStorage e IndexedDB.

Móvil: Expo 53, React Native 0.79, React 19 y Expo Camera.

Infraestructura: Docker Compose para PostgreSQL local, Bicep para Azure, App Service, Static Web App, PostgreSQL Flexible Server y Application Insights.

No se confirmó despliegue activo en Azure. No se encontraron workflows CI/CD. No se confirmó Swagger, WebSockets, PWA completa ni una integración real de IA.

## 7. Arquitectura

La arquitectura es cliente-servidor con monolito modular backend.

Presentación: React web y Expo móvil.

API: controladores NestJS, DTOs, guards y decoradores de roles.

Negocio: AuthService, CatalogoService, VentasService, InventarioService, CajaService, ReportesService y ReservasService.

Datos: PrismaService, Prisma Client y PostgreSQL.

No es microservicios. Web y móvil son clientes distintos de la misma API.

## 8. Módulos backend

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

CLIENTA: catálogo, favoritos, carrito, historial, reservas, opiniones, alertas y venta online.

CAJERO: caja y POS.

VENDEDOR: acceso al POS y ventas, con módulo específico limitado.

ENCARGADO: inventario de sucursal, ventas de sucursal, POS y reservas.

ADMIN: usuarios, catálogo, sucursales, proveedores, reportes, inventario, POS, auditoría y explorador.

SUPERADMIN: definido en modelo y algunas rutas, sin módulo diferenciado completo.

PROVEEDOR: productos propios e ingresos de inventario vinculados.

RRHH: definido en enum, pero sin módulo funcional completo.

Actores UML sugeridos: cliente, cajero, vendedor, encargado, administrador, proveedor, responsable de RRHH, superadministrador, PostgreSQL y servicio de sincronización.

## 10. Autenticación

Archivos principales:

- backend/src/auth/auth.controller.ts
- backend/src/auth/auth.service.ts
- backend/src/auth/token.service.ts
- backend/src/auth/jwt-auth.guard.ts
- backend/src/auth/roles.guard.ts

Implementado: registro, login, logout, sesión actual, cambio de contraseña, bcrypt, JWT con expiración, revocación, usuario activo, guards, roles y auditoría.

No implementado: refresh tokens, recuperación por correo, bloqueo por intentos y gestión avanzada de sesiones.

Flujo: el frontend envía credenciales, AuthService busca usuario, compara bcrypt, registra auditoría, crea JWT y devuelve usuario público. El frontend conserva token y usuario en localStorage.

## 11. Modelo de datos

El esquema está en backend/prisma/schema.prisma.

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

Producto tiene variantes, opiniones, alertas, favoritos, categorías, temporada, colección y proveedor.

Variante tiene stock, líneas de venta, líneas de reserva y movimientos.

Venta tiene líneas, pago, almacén, turno, clienta y movimientos.

Producto y Categoria tienen relación N:M mediante ProductoCategoria.

Restricciones: email único, SKU único, combinación producto-talla-color única, UUID de venta único, cupón único, favoritos únicos, opiniones únicas por producto/usuario, alertas únicas y operationId único.

## 12. Normalización

El modelo cumple razonablemente 1FN.

Cumple parcialmente 2FN mediante claves compuestas en StockAlmacen y ProductoCategoria.

Cumple parcialmente 3FN. Persisten campos textuales que podrían normalizarse:

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

El inventario separa saldo actual en StockAlmacen e historial en MovimientoInventario. Los ajustes registran la cantidad final como cantidad del movimiento, por lo que podrían mejorarse con saldo anterior, saldo nuevo y diferencia.

## 13. Inventario

El stock está asociado a variante y almacén. El almacén pertenece a una sucursal.

Tipos de movimiento: venta, reserva, liberación, ajuste e ingreso de proveedor.

Ventas utilizan transacciones y FOR UPDATE para evitar ventas simultáneas del mismo stock.

No existen módulos completos para transferencias, almacén central, stock mínimo/máximo, órdenes de compra o inventario cíclico.

## 14. E-commerce

Flujo real:

Cliente → catálogo → detalle → variante → carrito → POST /ventas → validación de stock → venta → movimiento.

Existe compra online básica.

No existe un flujo completo de pedido, líneas de pedido, checkout formal, envío, despacho, seguimiento o devolución. La entidad Pedido existe, pero no tiene LineaPedido.

## 15. POS

Flujo real:

1. Empleado inicia sesión.
2. Accede a /pos.
3. Abre turno.
4. Selecciona productos y variantes.
5. Puede asociar una clienta.
6. Puede aplicar cupón.
7. Selecciona pago simulado.
8. Backend valida turno y almacén.
9. Backend obtiene precios reales.
10. Se bloquea stock.
11. Se crea la venta.
12. Se descuenta stock.
13. Se registra movimiento.
14. Se actualiza caja.
15. Se registra auditoría.

No existe lector físico ni comprobante fiscal.

## 16. Offline

Archivos: frontend/src/cola-pos.ts y frontend/src/pages/Pos.tsx.

Implementado: IndexedDB, localStorage de respaldo, UUID, ID de dispositivo, estados pending/syncing/synced/failed/conflict/cancelled, persistencia al reiniciar, reintentos, idempotencia y catálogo/inventario local básico.

Parcial: resolución de conflictos, sincronización entre dispositivos, uso completo de OperacionSync, cifrado local y pruebas automatizadas de escenarios offline.

Flujo:

    venta POS
    → IndexedDB/localStorage
    → cola pendiente
    → reconexión
    → POST /ventas
    → validación UUID
    → transacción PostgreSQL
    → sincronizada o conflicto

## 17. Reportes

GET /reportes/dia: ventas del día por sucursal, cajero, producto, variante, unidades y total.

GET /reportes/inventario: stock por sucursal, almacén, producto, SKU, cantidad, reservado y disponible.

POST /reportes/generativo: recibe una pregunta y la transforma mediante reglas limitadas en una consulta SQL validada.

No hay PDF, Excel ni gráficos avanzados.

## 18. Chatbot e IA

No debe presentarse como chatbot implementado.

backend/src/ia/ contiene un asistente determinístico para precio, talla, color, ocasión y descripción. No usa OpenAI, LLM, embeddings ni generación libre de SQL.

El reporte generativo tampoco utiliza IA. Usa filtros predefinidos y SQL restringido.

## 19. Probador virtual

No debe presentarse como implementado.

Existen prototipos en frontend/src/pages/Probador.tsx, frontend/src/pose.ts, movil/App.tsx y overlays gráficos. Utilizan cámara y superposición básica.

No existe tracking corporal robusto, realidad aumentada completa, segmentación, ajuste realista ni persistencia. Debe clasificarse como funcionalidad futura o experimental.

## 20. API REST principal

Auth:

- POST /auth/registro
- POST /auth/login
- POST /auth/logout
- GET /auth/me
- POST /auth/cambiar-clave

Catálogo:

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

Administración:

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

## 22. Aplicación móvil

movil/ utiliza Expo y React Native.

Incluye login, catálogo, variantes, carrito, compra, reservas, sucursales y cámara experimental.

No tiene React Navigation, SQLite ni persistencia móvil robusta. Es un prototipo parcial.

## 23. Pruebas

Pruebas encontradas:

- backend/src/app.controller.spec.ts
- backend/src/catalogo/catalogo.service.spec.ts
- backend/src/ia/ficha.spec.ts
- backend/src/reportes/sql-seguro.spec.ts
- backend/src/ventas/ventas.spike-b.spec.ts
- backend/test/app.e2e-spec.ts

Cobertura: controlador raíz, catálogo, filtros, paginación, ficha determinística, SQL seguro, concurrencia, UUID y e2e básico.

No existe cobertura completa de frontend, móvil, accesibilidad, todos los roles, sincronización y navegación E2E.

## 24. Casos QA sugeridos

- Registro válido e inválido.
- Login válido, inválido, usuario desactivado y token revocado.
- Rol sin permiso.
- Catálogo paginado y filtros combinados.
- SKU inexistente.
- Variante agotada.
- Favorito duplicado.
- Carrito con dos variantes.
- Venta con stock y sin stock.
- UUID repetido.
- Venta sin turno.
- Restricción por sucursal.
- Cierre de turno.
- Reserva.
- Ajuste de inventario.
- Ingreso de proveedor.
- Opinión no verificada.
- Moderación.
- Reporte diario.
- Reporte de inventario.
- Operación offline, reintento y conflicto.
- Explorador de esquema.
- Responsive móvil y escritorio.

## 25. Azure y despliegue

Archivos:

- azure.yaml
- infra/main.bicep
- infra/app.bicep
- infra/main.parameters.json

Preparan App Service, Static Web App, PostgreSQL Flexible Server, Application Insights y variables seguras.

No se confirmó despliegue activo. No hay GitHub Actions ni CI/CD.

Docker prepara PostgreSQL local, no un despliegue completo.

## 26. Problemas e inconsistencias

- Pedido no tiene líneas.
- Pagos reales no existen.
- Envíos no existen.
- Transferencias de stock no existen.
- Almacén central no está modelado.
- Categoria convive con Producto.categoria textual.
- Varios estados y tipos son texto.
- RRHH está definido pero no desarrollado.
- SUPERADMIN no tiene flujo diferenciado completo.
- El límite de uso de cupones requiere revisión.
- No existen refresh tokens ni recuperación de contraseña.
- La aplicación móvil es básica.
- No hay E2E completa.
- No hay CI/CD.
- Los reportes generativos no usan IA real.
- El probador es experimental.
- Algunas llamadas frontend aún no están completamente migradas a servicios.
- Prettier detecta formato pendiente.
- npm audit reportó vulnerabilidades transitivas altas en backend.
- README describe una versión menor que el estado actual.

## 27. Estado general

Funcional o avanzado:

- Backend NestJS.
- Frontend React.
- PostgreSQL y Prisma.
- Migraciones y seeds.
- Login y registro.
- Roles.
- Catálogo.
- Ficha.
- Favoritos.
- Carrito frontend.
- POS.
- Caja.
- Inventario básico.
- Reservas.
- Proveedores básicos.
- Administración básica.
- Auditoría.
- Reportes básicos.
- Cola offline parcial.
- Preparación de Azure.

Parcial:

- Pedidos.
- Pagos.
- Promociones.
- Cupones.
- RRHH.
- Sincronización.
- Móvil.
- Azure.
- Restricciones por sucursal.
- Pruebas E2E.
- Administración avanzada.

No implementado:

- Pagos reales.
- Envíos.
- Transferencias.
- Almacén central.
- RRHH completo.
- Chatbot real.
- IA generativa.
- Probador virtual real.
- PWA completa.
- CI/CD.
- Exportación PDF/Excel.

## 28. Recomendación académica

La descripción recomendada es:

“Plataforma omnicanal académica para la gestión de catálogo, ventas POS, inventario por sucursal, clientes y operaciones administrativas, desarrollada con React, Expo/React Native, NestJS, Prisma y PostgreSQL.”

Debe aclararse que los pagos son simulados, el offline es parcial, pedidos y logística están incompletos, móvil es un prototipo, Azure está preparado pero no confirmado como producción, y chatbot/probador virtual no están implementados.

## 29. Ejecución

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

