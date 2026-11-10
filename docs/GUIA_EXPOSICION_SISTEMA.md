# EnsayAR — guía técnica para exposición y estudio

> Documento de orientación del estado actual del repositorio. Sirve para ubicar una funcionalidad, explicar el recorrido de una petición y diferenciar lo implementado de lo planificado.

## 1. Idea general

EnsayAR/Vesta es un sistema de comercio de ropa femenina con tres clientes que consumen la misma API:

```text
Frontend web (React/Vite) ─┐
Aplicación móvil (Expo/RN) ├── HTTP + JWT ──> Backend NestJS ──> Prisma ──> PostgreSQL
Socket.IO (notificaciones) ┘                         │
                                                     ├── SMTP (facturas y avisos, opcional)
                                                     └── Azure OpenAI / Azure AI FLUX (IA, opcional)
```

- **Web:** experiencia completa para clienta, caja, encargado, proveedor y administración.
- **Móvil:** cliente de compra para clienta y panel operativo simplificado según rol.
- **Backend:** única fuente de reglas de negocio, permisos, stock y transacciones.
- **Base de datos:** PostgreSQL; Prisma define el modelo y las migraciones.

El frontend o el móvil nunca deben considerarse autoridad de seguridad: los guards de NestJS vuelven a verificar el JWT, el rol y, cuando corresponde, la sucursal.

## 2. Carpetas importantes

| Ruta | Responsabilidad | Cuándo modificarla |
|---|---|---|
| `backend/src/` | API, reglas de negocio, guards y módulos NestJS | Cuando cambia una regla, endpoint o permiso |
| `backend/prisma/schema.prisma` | Modelo relacional Prisma | Antes de crear una migración de datos/esquema |
| `backend/prisma/migrations/` | Historia de cambios de BD | Se genera con Prisma; no editar sin entender la migración |
| `backend/prisma/seed.ts` | Datos demo y cuentas de prueba | Para reconstruir un ambiente demo; puede modificar datos |
| `backend/public/` | Archivos estáticos que Nest sirve, incl. modelos 3D | Fotos, overlays y `.glb` |
| `frontend/src/pages/` | Una pantalla web por archivo | Cambios de UX o flujo web |
| `frontend/src/auth.tsx` | Sesión JWT web | Login, logout, usuario actual |
| `frontend/src/storefront.tsx` | Carrito, favoritos y estado storefront web | Estado compartido de la clienta |
| `frontend/src/features/tryon3d/` | Módulo independiente de tracking/render 3D web | Probador 3D sin mezclarlo con catálogo |
| `movil/src/screens.tsx` | Pantallas de clienta móvil | Catálogo, bolsa, cuenta, reservas, historial, IA |
| `movil/src/operaciones.tsx` | Panel por rol del móvil | Caja/POS, inventario, proveedor y admin móvil |
| `movil/src/session.tsx` | Sesión, navegación local y carrito móvil | Agregar una pantalla o estado global móvil |
| `movil/src/api.ts` | Cliente HTTP móvil y mensajes de error | Cambiar URL base, headers o tratamiento de errores |
| `docs/` | Material académico, PUDS, UML y esta guía | Exposición y trazabilidad |

## 3. Tecnologías reales

| Capa | Tecnologías |
|---|---|
| Backend | NestJS 11, TypeScript, Prisma 6, PostgreSQL, JWT, bcrypt, class-validator |
| Tiempo real | Socket.IO / WebSockets de NestJS para notificaciones |
| Web | React 19, Vite 8, React Router, CSS propio, Socket.IO client |
| Probador web | MediaPipe Tasks Vision + Three.js; BabylonJS no es el renderizador activo actual |
| IA | Cliente para Azure OpenAI (chat/ficha) y Azure AI/FLUX (vista realista) |
| Móvil | React Native 0.79, Expo 53, AsyncStorage, expo-camera, expo-image-picker |
| Infraestructura local | Node.js, npm, PostgreSQL, Android SDK/Gradle para APK |

## 4. Cómo arrancar el sistema

### Backend

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate status
npm run start:dev
```

El API usa `http://localhost:3000` por defecto. Las variables se colocan en `backend/.env`, tomando `backend/.env.example` como referencia. Nunca subir ese `.env` ni exponer claves de Azure/SMTP.

### Frontend web

```powershell
cd frontend
npm install
npm run dev
```

Vite suele exponerlo en `http://localhost:5173`.

### Móvil

```powershell
cd movil
npm install
npm run web       # navegador, normalmente http://localhost:8081
npm run android   # emulador/dispositivo Android
```

En un teléfono físico, `localhost` es el teléfono, no la PC. En login móvil existe **Ajustar servidor**: usar `http://IP_DE_LA_PC:3000` y conectar ambos a la misma red. Para emulador Android se usa `http://10.0.2.2:3000`.

Para una **APK instalada**, crear `movil/.env` antes del build con `EXPO_PUBLIC_API_URL=https://api.ejemplo.com` (o una IP LAN mientras se presenta localmente). Esta URL debe ser el mismo NestJS que utiliza la web, por lo que las cuentas y contraseñas se validan contra la misma PostgreSQL. La APK no contiene ni debe contener las credenciales de usuarios.

### Migraciones y seed

- `npx prisma migrate status` **solo informa** el estado.
- `npx prisma migrate deploy` aplica migraciones pendientes en el ambiente elegido.
- `npm run demo:reset` y seeds pueden modificar o reconstruir datos: pedir confirmación antes de usarlos en una BD importante.
- Nunca usar `prisma migrate reset` para una presentación con datos que se quieran conservar.

## 5. Dominio de la base de datos

La fuente definitiva es `backend/prisma/schema.prisma`.

```text
Usuario ──┬── Cliente: favoritos, alertas, opiniones, direcciones, lealtad
          ├── CajaTurno (cajero)
          ├── Reserva (clienta)
          └── Notificacion

Producto ── Variante (talla/color/SKU/foto/overlay/modelo 3D)
                 └── StockAlmacen (cantidad y reservado)
                         └── MovimientoInventario (auditoría operativa)

Venta ── LineaVenta ── Variante
      ├── PagoSimulado
      ├── Pedido
      └── Devolucion

Sucursal ── Almacen
Proveedor ── Producto
```

Puntos que suelen preguntarse en exposición:

- `StockAlmacen.cantidad` es stock físico; `reservado` es stock retenido por reserva/pago pendiente.
- Una variante pertenece a un producto y representa una combinación única de producto+talla+color.
- `Variantes.urlModelo` guarda la ruta del `.glb`; el archivo se sirve desde `backend/public/models/` como `/models/...`.
- Las ventas se relacionan a líneas, pago simulado y, si es online, pedido.
- `MovimientoInventario` deja trazabilidad para venta, reserva, liberación, ajuste, ingreso, transferencia y devolución.

## 6. Backend: módulos y endpoints

`backend/src/app.module.ts` es el índice de módulos. Cada módulo suele tener `controller` (HTTP), `service` (regla de negocio), `module` (registro) y, cuando corresponde, DTOs.

| Módulo | Ruta principal | Qué explica |
|---|---|---|
| `auth/` | `/auth/login`, `/auth/registro`, `/auth/me`, `/auth/logout`, `/auth/cambiar-clave` | JWT, bcrypt y sesión |
| `catalogo/` | `/catalogo/productos`, `/catalogo/productos/:id`, `/catalogo/stock` | Catálogo, variantes, fotos, opiniones, alertas y stock |
| `ventas/` | `/ventas`, `/ventas/historial`, `/ventas/sucursal` | Compra online/POS, holds y ventas |
| `pagos/` | `/pagos/:id`, `/pagos/:id/simular` | Pago QR simulado; aprobado descuenta stock, rechazado libera reserva |
| `caja/` | `/caja/abrir`, `/caja/cerrar`, `/caja/turno-abierto` | Turno de caja y arqueo |
| `reservas/` | `/reservas`, `/reservas/mias`, `/reservas/sucursal` | Reserva de prendas y estados operativos |
| `inventario/` | `/inventario/ajuste`, `/ingreso`, `/transferencias`, `/movimientos` | Operaciones multisucursal y trazabilidad |
| `pedidos/` | `/pedidos/despacho`, `/:id/despachar` | Despacho de ventas online |
| `devoluciones/` | `/devoluciones` | Reposición de stock y estado de venta/pago |
| `proveedores/` | `/proveedores/mis-productos`, `/mis-ingresos` | Catálogo e ingresos por proveedor |
| `admin/`, `usuarios/`, `reportes/` | `/admin/*`, `/usuarios`, `/reportes/*` | KPIs, usuarios, moderación, auditoría y reportes |
| `notificaciones/`, `correo/` | `/notificaciones/*` | Persistencia, WebSocket y factura/correo opcional |
| `ia/` | `/ia/bot`, `/ia/probar` | Chat y vista realista con Azure cuando está configurado |

### Patrón de seguridad

1. El cliente manda `Authorization: Bearer <token>`.
2. `JwtAuthGuard` valida firma y revocación.
3. `RolesGuard` valida el decorador `@Roles(...)`.
4. Servicios/controladores limitan además sucursal, proveedor o pertenencia de la clienta cuando aplica.

Esto significa que ocultar un botón en frontend **no** es el control de seguridad; es sólo UX.

## 7. Flujos clave para explicar

### Compra online con QR simulado

1. Clienta selecciona variante y la bolsa guarda `varianteId` y cantidad.
2. `POST /ventas` crea venta online; para QR queda `pendiente_pago` y reserva stock.
3. `POST /pagos/:id/simular` con `aprobado` descuenta `cantidad`, libera `reservado`, crea movimiento y abre pedido.
4. Si se simula `rechazado`, se libera el hold y la venta queda anulada.

Archivos de referencia: `backend/src/ventas/ventas.service.ts`, `backend/src/pagos/pagos.controller.ts`, `frontend/src/pages/Carrito.tsx`, `movil/src/screens.tsx` (`BolsaScreen`).

### Reserva de prenda

1. Clienta arma bolsa y elige sucursal/horario.
2. `POST /reservas` crea reserva pendiente; la cantidad física no baja, se incrementa la reserva.
3. Encargado consulta `GET /reservas/sucursal` y cambia el estado a preparada, atención o completada.
4. Clienta puede cancelar sólo sus reservas.

### POS y caja

1. Cajero abre turno con fondo inicial.
2. Agrega variantes al ticket y crea venta POS con el `cajaTurnoId`.
3. Pago QR se puede simular; efectivo se procesa según regla del servicio.
4. El turno acumula total de sistema y se cierra con el total declarado.

### Inventario y proveedor

- Proveedor registra ingreso sólo para variantes de sus productos.
- Encargado ajusta stock de almacenes de su sucursal.
- Transferencia registra movimientos de salida/entrada.
- Devolución repone unidades y registra movimiento de devolución.

## 8. Frontend web

`frontend/src/App.tsx` contiene la tabla de rutas. Cada `ProtectedRoute` evita entrar a pantallas que no corresponden al rol.

| Rol | Pantallas web principales |
|---|---|
| Clienta | Inicio, catálogo, ficha, carrito, favoritos, cuenta, historial, reservas, probador |
| Cajero | POS y caja |
| Encargado | Reservas operativas, inventario y despacho |
| Proveedor | Portal de proveedor e ingreso de stock |
| Admin | Dashboard, usuarios, catálogo, reportes, moderación y BD conceptual |
| Superadmin | Lo anterior y bitácora/auditoría |

Para editar estilo visual global, revisar `frontend/src/index.css`, `frontend/src/styles/` y componentes reutilizables en `frontend/src/shared/`.

## 9. Aplicación móvil

La app no usa React Navigation; maneja una pila tipada propia en `movil/src/session.tsx`. `movil/App.tsx` decide qué pantalla renderizar.

| Archivo | Función |
|---|---|
| `screens.tsx` | Login, registro, inicio, catálogo, ficha, bolsa, reservas, historial, cuenta, chatbot y probador 2D/IA |
| `operaciones.tsx` | Operaciones móviles condicionadas por `rol` |
| `session.tsx` | JWT/local storage, bolsa, favoritos, sucursal y navegación |
| `api.ts` | Fetch autenticado, URL de API y traducción de códigos de error |
| `ui.tsx` | Header, drawer, navegación inferior, tarjetas y capas |
| `theme.ts` | Colores y detección de URL para web, Android o red LAN |

El panel **Menú → Operaciones** se muestra sólo a personal:

- Cajero: caja, ticket POS y cobro simulado.
- Encargado: reservas, despacho, ajuste y movimientos.
- Proveedor: productos, ingreso e historial.
- Admin/Superadmin: resumen, reportes, usuarios y moderación.

## 10. Probador virtual: estado honesto

Hay dos experiencias distintas:

1. **Vista móvil 2D/IA:** cámara o galería, overlay ajustable manualmente y solicitud opcional a Azure FLUX. Está en `movil/src/screens.tsx` (`ProbadorScreen`).
2. **Módulo web 3D experimental:** `frontend/src/features/tryon3d/` separa dominio, adaptador MediaPipe, renderer Three.js y componente visual. Los `.glb` se ubican en `backend/public/models/`.

El 3D aún es experimental: los modelos generados no garantizan prenda físicamente fiel ni simulación textil. No presentarlo como avatar 3D comercial terminado; sí como prototipo técnico con tracking/render separado y extensible.

## 11. IA, correo y notificaciones

- Si Azure no está configurado, chatbot/vista IA deben informar error controlado; el resto de la tienda sigue funcionando.
- Si SMTP no está configurado, el envío de factura puede fallar de forma esperada. La venta no debe depender de ello.
- Notificaciones se almacenan en BD y hay gateway WebSocket. El móvil actual consulta avisos; no implementa suscripción Socket.IO en tiempo real todavía.

Variables relevantes, sin valores:

```env
DATABASE_URL=
PORT=3000
JWT_SECRET=
JWT_EXPIRES_IN=
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT=
AZURE_AI_ENDPOINT=
AZURE_AI_API_KEY=
AZURE_FLUX_DEPLOYMENT=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

## 12. Guion breve de demostración

1. Iniciar backend, web y/o móvil; explicar que ambos consumen la misma API.
2. Como clienta: catálogo → ficha/variante → bolsa → QR simulado → historial.
3. Mostrar reserva desde bolsa y su cambio de estado como encargado.
4. Como cajero: abrir caja → ticket POS → cobro → cierre.
5. Como proveedor: ingreso y historial de movimientos.
6. Como admin: KPI, usuario, moderación y reporte.
7. Mostrar Prisma para explicar por qué stock, ventas y movimientos quedan relacionados.
8. Cerrar con limitaciones reales: 3D experimental, pago simulado, SMTP/Azure opcionales y offline/PWA pendiente.

## 13. Verificación antes de exponer

```powershell
# Backend
cd backend; npm run build; npm test

# Web
cd ../frontend; npm run build

# Móvil
cd ../movil; npx tsc --noEmit; npx expo export --platform web
```

Para Android, con SDK configurado:

```powershell
cd movil/android
.\gradlew.bat assembleDebug
```

No se deben mostrar claves, tokens, hashes ni contraseñas durante la exposición. Usar cuentas demo de la base y cambiar los secretos si el repositorio salió de un entorno privado.

## 14. Pendientes que no se deben prometer como completos

- Pago real: sólo se procesa **simulado**.
- Probador 3D de cuerpo completo con física real: experimental, no producción.
- PWA/offline/sincronización: planificados; el móvil sí persiste sesión, bolsa y favoritos localmente.
- Gestión móvil de catálogo/usuarios: existen endpoints y lectura operativa, pero no todos los CRUD tienen pantalla móvil completa.
- Transferencia de stock móvil: endpoint disponible, pantalla móvil pendiente.
