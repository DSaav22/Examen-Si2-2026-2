---
tipo: concept
fuentes: 2
actualizado: 2026-11-08
tags: [saas, multi-tenant, arquitectura, segundo-parcial]
---

# SaaS multi-tenant

[[EnsayAR]] pasa de una tienda a **muchas tiendas** bajo un modelo SaaS (Software as a Service). [[transcripcion-audio-segundo-parcial]]

## Decisión actual — 9 de noviembre

Andrés eligió **una base PostgreSQL con un esquema por tienda**, con tablas de plataforma compartidas donde corresponda. Se implementará más adelante: queda pendiente diseñar la creación de esquemas, el acceso aislado, las migraciones y los respaldos/restauraciones por tienda, y validar la compatibilidad con Prisma. [[decisiones-arquitectura-2026-11-09]]

**Distinción:** el código integrado al 8 de noviembre sigue usando tablas compartidas con `tienda_id`. La sección de implementación más abajo describe ese estado histórico, no que la nueva decisión ya esté aplicada. No se han aplicado migraciones para convertirlo a esquemas por tienda.

## Qué pide el docente

- El cliente no compra licencias ni infraestructura: paga por lo que usa.
- Página comercial pública con módulos, planes y precios. Ejemplo que dio: Netflix.
- Planes de 1, 3 y 12 meses, y niveles distintos (no es lo mismo una tienda con 1 usuario que con 10).
- Autoservicio total: registrarse, suscribirse, pagar y listo. Se crea solo el espacio de la tienda.
- Verificar que el correo existe.
- Un usuario puede tener **varias tiendas con un solo login**.
- Reportes de suscripciones y proyecciones.
- Justificar la estrategia de inquilinos (tenants).
- En la defensa crearán varias tiendas y preguntarán cómo se resuelve multi-tenant en Nest.

## Estrategias de aislamiento

| Estrategia | Ventajas | Desventajas |
|-----------|----------|-------------|
| Base de datos por tienda | Aislamiento fuerte, backup por cliente | Costo y migraciones por cada base; alta automática más lenta |
| Esquema por tienda (misma base) | Aislamiento medio | Prisma maneja mal muchos esquemas; migraciones N veces |
| Base compartida con `tenant_id` | Barato, alta instantánea, una migración | Riesgo de fuga si falta un filtro |

Como alternativa se había considerado una base compartida con `tenant_id` y Row-Level Security. La dirección elegida posteriormente es un esquema por tienda; su viabilidad y aislamiento efectivo deben comprobarse durante el diseño e implementación. [[decisiones-arquitectura-2026-11-09]]

## Cómo encaja en NestJS

- Resolver la tienda activa por subdominio, cabecera o claim del JWT.
- Guardarla por petición (contexto de la solicitud) y aplicarla en Prisma con una extensión de cliente o con `SET app.tenant_id` para la RLS.
- **Membresía** usuario ↔ tienda con rol por tienda: así un mismo usuario es dueño de una tienda y cajero de otra, con un solo login y un selector de tienda.

## Implementación en EnsayAR (8 nov, punto 1 cerrado)

Migraciones `20261108120000_saas_multitenant` y `20261108130000_tienda_desde_sesion`. Verificado con `npm run verificar:tenancy` y `npm run verificar:saas` (15 chequeos HTTP), más recorrido en navegador.

**Estrategia implementada en ese corte (S8): base compartida con `tienda_id`**, defendida en capas:

1. **Resolución de la tienda por petición** (`TenantMiddleware`): primero la tienda del JWT; si no hay sesión, la cabecera `X-Tienda` (slug); si no, la tienda por defecto. Con sesión, la cabecera no puede cambiar de tienda. Tienda vencida → 402; inexistente → 404.
2. **Contexto por petición** con `AsyncLocalStorage` (`TenantContext`).
3. **Extensión de Prisma** que agrega `tienda_id` a toda lectura y escritura de los 36 modelos de negocio. Falla cerrada: sin tienda, error `TENANT_REQUERIDO`.
4. **Defecto en la base**: `tienda_id DEFAULT current_setting('app.tienda_id')`, por si una escritura escapa a la extensión.
5. **SQL crudo de reportes**: corre en una transacción con `set_config('app.tienda_id', …)`; la vista `v_reporte_ventas` filtra por esa variable. El validador del SQL generado por IA prohíbe tocar tablas base, `set_config` y `current_setting`.
6. **Pertenencia de ids recibidos** (`exigirDeLaTienda`): las claves foráneas no saben de tiendas, así que un id de variante, almacén o proveedor ajeno se rechaza con 404.

En ese corte se eligió el modelo compartido para simplificar el alta y las migraciones. **RLS completa (políticas `CREATE POLICY`) queda como evolución de esa implementación**: la base aporta el defecto y la vista filtrada, pero no hay políticas por tabla. La decisión posterior de usar esquemas por tienda requiere revisar el aprovisionamiento y las migraciones; no se debe asumir que Prisma las resuelve automáticamente.

**Identidad (S7):** `Cuenta` global (correo verificado, una clave) ↔ `Usuario` como perfil por tienda con su rol. JWT de tienda (`tipo: 'tienda'`) y de cuenta (`tipo: 'cuenta'`, plataforma). Selector de tienda en la barra lateral, sin re-login.

**Suscripción (S2–S5, S9):** landing `/planes` (3 planes × mensual / trimestral −10 % / anual −20 %), registro con verificación de correo (enlace visible en modo demo), asistente plan → tienda → pago, pasarela simulada con idempotencia y reembolso si falla el aprovisionamiento (saga). El alta crea tienda, sucursal, almacén, admin y categorías. Límites por plan (usuarios, sucursales, productos) con `LIMITE_PLAN`. Panel de la dueña con uso, renovación, cambio de plan e historial; panel de la plataforma con MRR, ARR, ARPU, churn y proyección a 6 meses.

**Móvil:** cabecera `X-Tienda` desde `AsyncStorage` y campo "Tienda" en el login.

Pendiente menor: la moneda "Bs" sigue fija en el frontend aunque la tienda tenga otra moneda.

## Relación con el modelo anterior

Antes el rol era global en `Usuario` y no existía una entidad tienda. `Sucursal` queda **dentro** de cada tienda. Ver [[Brecha segundo parcial]].

## Relacionado

[[Pasarelas de pago]] (cobro de la suscripción) · [[Mapa del segundo parcial]] · [[Arquitectura candidata]]
