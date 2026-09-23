# Lista de pendientes Prompts

Documento de seguimiento del proyecto. Las tareas marcadas no implican que se deban implementar sin revisar previamente conflictos de arquitectura o esquema.

## Prompt 0 - Auditoría y base del proyecto

- [x] Mantener React, TypeScript, Vite, NestJS, Prisma y PostgreSQL.
- [x] Mantener autenticación, rutas y lógica existente.
- [ ] Unificar completamente estilos antiguos con el sistema visual Vesta.
- [ ] Corregir problemas de codificación UTF-8 visibles en textos existentes.

## Prompt 2 - Sistema visual y temas

- [x] Tokens tipográficos, paleta Vesta y tema claro/oscuro inicial.
- [x] Componentes compartidos básicos.
- [x] Consolidar tokens semánticos, tipográficos, espaciales, de estados y controles en el sistema Vesta.
- [x] Aplicar jerarquía tipográfica Vesta global a títulos, cuerpo, navegación, precios, botones y datos técnicos.
- [x] Aplicar botones, formularios, tarjetas y estados visuales consistentemente.
- [x] Revisar contraste, foco visible, teclado, áreas táctiles y reducción de movimiento.
- [x] Eliminar la dependencia visual de los estilos originales conflictivos mediante aliases Vesta globales.
- [x] Revisar breakpoints para escritorio, tablet, móvil y pantallas anchas sin desbordamiento horizontal.

## Prompt 3 - Shell y navegación

- [x] Barra promocional, campaña, contador, wordmark, categorías, megamenú, buscador, favoritos, cuenta y bolsa.
- [x] Tema claro/oscuro, menú móvil, conexión y acceso según rol.
- [x] Selector de sucursal funcional y persistente mediante `localStorage`.
- [x] Navegación inferior móvil para inicio, catálogo, favoritos y bolsa.
- [x] Tooltips y etiquetas accesibles para acciones e iconos principales.
- [x] Proteger formalmente rutas privadas también en frontend mediante guards por rol.
- [x] Verificar recarga directa de rutas con fallback SPA de Vite.

## Prompt 4 - Página de inicio

- [x] Hero, novedades, más vendidos simulados, últimas unidades, ocasiones, editorial, compra el look, vistos, beneficios, sucursal, modo oscuro y estados.
- [x] Obtener más vendidos mediante popularidad persistida en API; mientras no exista historial suficiente, la selección demo queda documentada.
- [x] Añadir contador HH:MM:SS dentro de portada.
- [x] Persistir sucursal seleccionada.
- [x] Validar disponibilidad conjunta y evitar agregar un look incompleto o agotado.
- [x] Registrar vistos también desde tarjetas del catálogo.
- [x] Preparar imágenes específicas reutilizables para historia editorial y look.
- [x] Añadir atención al cliente e iconos accesibles.
- [x] Afinar composición y validar responsive mediante build, CSS de breakpoints y estados flexibles; queda pendiente una captura visual automatizada.

## Prompt 5 - Catálogo, búsqueda y filtros

- [x] Búsqueda por nombre, descripción y SKU, historial, filtros, descuento, ordenamiento básico, paginación, chips, densidad, vista rápida, comparación limitada y estados responsive.
- [x] Búsqueda por imágenes documentada como extensión futura.
- [x] Búsquedas populares visibles desde el catálogo (selección demo desacoplada).
- [x] Corrección inteligente y sugerencias semánticas para términos frecuentes del catálogo.
- [x] Ordenamiento real por novedades y popularidad mediante campos de base de datos.
- [x] Filtros persistentes de material, estilo y ajuste en URL, frontend y API.
- [x] Comparador con vista comparativa de hasta tres productos.
- [x] Favoritos desde listado de catálogo conectados al estado y API.

## Prompt 6 - Detalle de producto

- [x] Galería, miniaturas, zoom, colores, tallas, disponibilidad pública/interna, retiro, enlace, relacionados, look visual, responsive, modo oscuro y punto de extensión sin videos.
- [x] Guía de medidas real con tabla responsive de tallas.
- [x] Modelo, ajuste, material, composición, cuidados y origen cargados en datos demo.
- [x] Alertas persistentes de reposición y reducción de precio mediante API y PostgreSQL.
- [x] Opiniones con compra verificada, imagen opcional en API, moderación administrativa e incentivo documentado para una siguiente regla de cupones.
- [x] Complementarios determinados por ocasión y categoría desde endpoint real.
- [x] Look con validación conjunta en cliente y no permite agregar selecciones incompletas.
- [x] Proteger endpoints generales que puedan exponer stock exacto.

## Prompt 7 - Cliente, favoritos y carrito

- [x] Estado compartido y persistencia local para carrito, favoritos y vistos.
- [x] Evitar duplicados, modificar cantidades, eliminar y validar stock conocido.
- [x] Recalcular precio, descuento y stock en backend.
- [x] Pantalla funcional de favoritos y vistos recientes limitados.
- [x] Sincronizar favoritos con cuenta y backend mediante endpoints protegidos y persistencia local de respaldo.
- [x] Perfil, direcciones, cupones y fidelización conectados a endpoints protegidos.
- [x] Alertas persistentes de reposición y reducción de precio.
- [x] Manejar cambios de precio/disponibilidad: el backend recalcula la verdad al confirmar y devuelve conflicto de stock.
- [x] Pagos reales fuera del alcance actual; checkout usa métodos sandbox y no integra pasarela externa.

## Prompt 8 - Autenticación, roles y empleados

- [x] Login con bcrypt, errores genéricos, JWT configurable, JWT_SECRET por entorno, revocación activa, validación de rol, guards, permisos, sucursal y respuestas sin passwordHash.
- [x] Estado persistente activo/desactivado validado en login y guards.
- [x] Revocación persistente después de reiniciar servidor mediante tabla de hashes.
- [x] Auditoría persistente de login, logout y cambio de clave.
- [x] Roles RRHH, vendedor y superadministrador agregados al enum Prisma.
- [x] Rotación de credenciales mediante endpoint protegido; recuperación externa por correo queda fuera del entorno local.

## Prompt 9 - Punto de venta

- [x] POS protegido, turnos, arqueo, búsqueda nombre/SKU, variantes, stock, cantidades, eliminación, UUID/idempotencia, comprobante, efectivo/QR, cola conceptual y prevención de doble confirmación.
- [x] Asociar cliente opcional mediante identificador; creación se mantiene en el módulo cliente.
- [x] Cupones y descuentos con código validado y recalculado en backend.
- [x] Transferencia, tarjeta y pago mixto simulados en POS sin pasarela externa.
- [x] Lectura de SKU y simulación de código de barras mediante búsqueda rápida.
- [x] Persistencia offline transaccional con cola local, reintento e idempotencia backend.

## Pendientes generales y de verificación

- [ ] DTO público de producto, serialización explícita de Decimal/Date y revisión de modelo de imágenes.
- [x] Añadir filtros de material, ajuste y estilo sobre los campos aprobados.
- [ ] No ejecutar migraciones destructivas sin aprobación.
- [ ] Corregir lint existente en `frontend/src/pages/Pos.tsx`.
- [ ] Resolver advertencias de hooks y ejecutar pruebas frontend.
- [ ] Verificar login, temas, teclado, foco, rutas, móvil y escritorio.
- [ ] Reemplazar fotos demo remotas por fotografías propias/licenciadas.
- [ ] Pagos reales, offline completo, sincronización distribuida, búsqueda por imagen, videos, reportes avanzados, CRM y RRHH completos permanecen fuera de las fases actuales.

## Datos demo del catálogo

- [x] Carga idempotente de 40 productos femeninos variados.
- [x] 80 variantes con SKU `VESTA-DEMO-###` y stock.
- [x] URLs de imagen en `Variante.urlFoto` sin cambiar el esquema.

## Prompt 10 - Administración y base de datos

- [x] Dashboard modular con ventas agregadas, canales, catálogo, sucursales, usuarios, turnos e inventario bajo.
- [x] Explorador de esquema protegido y de solo lectura.
- [x] Búsqueda/filtro por dominio, selección de tabla, campos, claves, relaciones y estado.
- [x] Clasificación existente, conceptual y propuesta sin crear tablas físicas.
- [x] Responsive y compatible con el tema visual.
- [x] Pedidos, promociones, opiniones y CRM representados por modelos físicos y endpoints de consulta; operaciones avanzadas siguen separadas.
- [x] RRHH: contratos, puestos, salarios, turnos y asistencia representados en el esquema administrativo.
- [x] Auditoría persistente expuesta en endpoint administrativo protegido.
- [x] Analítica de visitas, conversión y tráfico representada por modelos y módulos de reportes.
- [x] Sincronización y conflictos persistentes representados en el modelo operativo.
- [x] Migraciones revisadas sin ejecutar cambios destructivos.

## Prompt 11 - API, PostgreSQL e integración real

- [x] Autenticación, sucursales, productos, variantes, inventario, ventas POS y administración conectados a API real.
- [x] DTOs, validación, autorización, paginación, filtros, ordenamiento e idempotencia en módulos existentes.
- [x] Transacción crítica de venta con bloqueo de inventario y recalculo de precios en backend.
- [x] Variables sensibles fuera del código mediante entorno.
- [x] Crear servicios frontend por módulo; el servicio de catálogo queda como capa de adopción progresiva.
- [x] Integrar categorías como entidad separada con endpoint y fallback compatible para el campo legado.
- [x] Integrar clientes, favoritos, alertas, promociones/cupones y pedidos web reales.
- [x] Auditoría persistente de login, cambio de clave, ventas y operaciones administrativas.
- [x] Pruebas automatizadas de servicios y smoke tests de API; la cobertura e2e completa queda como ampliación.

## Prompt 12 - Funcionamiento offline y sincronización

- [x] Cola POS persistente en IndexedDB con fallback local.
- [x] Identificador estable de dispositivo y `operationId` conservado en reintentos.
- [x] Rehidratación de la cola al reiniciar la aplicación.
- [x] Reintento al recuperar conexión e idempotencia del servidor.
- [x] Catálogo e inventario autorizado completo en base local del dispositivo POS.
- [x] Estados operativos completos: draft, syncing, synced, conflict y cancelled representados en la cola.
- [x] Panel de operaciones pendientes y mensajes de conflicto para decisión del empleado.
- [x] Identificador de dispositivo y auditoría persistente de ventas sincronizadas.
- [x] No se almacenan contraseñas ni secretos en la cola; solo datos operativos mínimos.
- [x] Verificación automatizada de build/backend y pruebas de reintento/idempotencia; escenarios de dos dispositivos quedan documentados.
