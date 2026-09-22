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
- [ ] Proteger formalmente rutas privadas también en frontend.
- [ ] Verificar recarga directa de todas las rutas.

## Prompt 4 - Página de inicio

- [x] Hero, novedades, más vendidos simulados, últimas unidades, ocasiones, editorial, compra el look, vistos, beneficios, sucursal, modo oscuro y estados.
- [ ] Obtener más vendidos desde ventas reales o documentar selección simulada.
- [x] Añadir contador HH:MM:SS dentro de portada.
- [x] Persistir sucursal seleccionada.
- [ ] Validar disponibilidad conjunta y evitar agotados en el look.
- [ ] Registrar vistos también desde catálogo.
- [x] Preparar imágenes específicas reutilizables para historia editorial y look.
- [ ] Añadir atención al cliente e iconos accesibles.
- [ ] Afinar composición y validar responsive con pruebas visuales reales.

## Prompt 5 - Catálogo, búsqueda y filtros

- [x] Búsqueda por nombre, descripción y SKU, historial, filtros, descuento, ordenamiento básico, paginación, chips, densidad, vista rápida, comparación limitada y estados responsive.
- [x] Búsqueda por imágenes documentada como extensión futura.
- [ ] Búsquedas populares reales.
- [ ] Corrección inteligente y sugerencias semánticas.
- [ ] Ordenamiento real por novedades y popularidad.
- [ ] Filtros persistentes de material, estilo y ajuste.
- [ ] Comparador completo con vista comparativa.
- [ ] Conectar completamente favoritos desde listado de catálogo.

## Prompt 6 - Detalle de producto

- [x] Galería, miniaturas, zoom, colores, tallas, disponibilidad pública/interna, retiro, enlace, relacionados, look visual, responsive, modo oscuro y punto de extensión sin videos.
- [ ] Guía de medidas real.
- [ ] Modelo, ajuste, composición, cuidados y origen reales.
- [x] Alertas persistentes de reposición y reducción de precio mediante API y PostgreSQL.
- [ ] Opiniones, compra verificada, fotografías, moderación e incentivo.
- [ ] Complementarios determinados por datos reales.
- [ ] Look con validación conjunta y operación atómica.
- [ ] Proteger endpoints generales que puedan exponer stock exacto.

## Prompt 7 - Cliente, favoritos y carrito

- [x] Estado compartido y persistencia local para carrito, favoritos y vistos.
- [x] Evitar duplicados, modificar cantidades, eliminar y validar stock conocido.
- [x] Recalcular precio, descuento y stock en backend.
- [x] Pantalla funcional de favoritos y vistos recientes limitados.
- [x] Sincronizar favoritos con cuenta y backend mediante endpoints protegidos y persistencia local de respaldo.
- [ ] Perfil, direcciones, cupones y fidelización.
- [ ] Alertas persistentes de reposición y reducción de precio.
- [ ] Manejar cambios de precio/disponibilidad dentro del carrito.
- [ ] Pagos reales, fuera del alcance actual.

## Prompt 8 - Autenticación, roles y empleados

- [x] Login con bcrypt, errores genéricos, JWT configurable, JWT_SECRET por entorno, revocación activa, validación de rol, guards, permisos, sucursal y respuestas sin passwordHash.
- [x] Estado persistente activo/desactivado validado en login y guards.
- [x] Revocación persistente después de reiniciar servidor mediante tabla de hashes.
- [ ] Auditoría persistente.
- [x] Roles RRHH, vendedor y superadministrador agregados al enum Prisma.
- [ ] Recuperación de contraseña y rotación de credenciales.

## Prompt 9 - Punto de venta

- [x] POS protegido, turnos, arqueo, búsqueda nombre/SKU, variantes, stock, cantidades, eliminación, UUID/idempotencia, comprobante, efectivo/QR, cola conceptual y prevención de doble confirmación.
- [ ] Asociar o crear cliente.
- [ ] Cupones y descuentos con autorización.
- [ ] Transferencia, tarjeta y pago mixto; requieren ampliar pagos.
- [ ] Lector real de código de barras.
- [ ] Persistencia offline real transaccional.

## Pendientes generales y de verificación

- [ ] DTO público de producto, serialización explícita de Decimal/Date y revisión de modelo de imágenes.
- [ ] Añadir filtros de material, corte y estilo si se aprueban campos.
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
- [ ] Pedidos, promociones, opiniones y CRM reales.
- [ ] RRHH: contratos, puestos, salarios, turnos y asistencia.
- [ ] Auditoría persistente.
- [ ] Analítica de visitas, conversión y tráfico.
- [ ] Sincronización y conflictos persistentes.
- [ ] Revisar y aprobar migraciones de tablas conceptuales/propuestas.

## Prompt 11 - API, PostgreSQL e integración real

- [x] Autenticación, sucursales, productos, variantes, inventario, ventas POS y administración conectados a API real.
- [x] DTOs, validación, autorización, paginación, filtros, ordenamiento e idempotencia en módulos existentes.
- [x] Transacción crítica de venta con bloqueo de inventario y recalculo de precios en backend.
- [x] Variables sensibles fuera del código mediante entorno.
- [ ] Crear repositorios/servicios frontend por módulo para eliminar solicitudes API directas desde páginas antiguas.
- [ ] Integrar categorías como entidad separada; actualmente `Producto.categoria` es texto.
- [ ] Integrar clientes, favoritos, alertas, promociones y pedidos web reales.
- [ ] Auditoría persistente de operaciones sensibles.
- [ ] Pruebas e2e completas de todos los endpoints y errores uniformes.

## Prompt 12 - Funcionamiento offline y sincronización

- [x] Cola POS persistente en IndexedDB con fallback local.
- [x] Identificador estable de dispositivo y `operationId` conservado en reintentos.
- [x] Rehidratación de la cola al reiniciar la aplicación.
- [x] Reintento al recuperar conexión e idempotencia del servidor.
- [ ] Catálogo e inventario autorizado completo en base local.
- [ ] Estados operativos completos: draft, syncing, synced, conflict y cancelled.
- [ ] Panel de conflictos y decisión autorizada para stock/precio/caja.
- [ ] Revocación de dispositivos y auditoría persistente.
- [ ] Cifrado de información local sensible.
- [ ] Pruebas automatizadas de reinicio, servidor caído, conflictos y dos dispositivos.
