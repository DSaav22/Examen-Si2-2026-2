---
tipo: query
fuentes: 2
actualizado: 2026-11-09
tags: [suscripciones, permisos, auditoria, pagos, pruebas]
---

# Auditoría de suscripciones y ciclo de vida

Corte del código local del 9 de noviembre de 2026. Complementa [[Planes y suscripciones retail]] y [[Pendientes segundo parcial]]. Las pruebas unitarias usan dobles; no acreditan funcionamiento con PostgreSQL, correo real, Postman ni navegador.

## 1. Flujo actual

| Paso | Evidencia | Estado |
|---|---|---|
| Listar y elegir plan | `GET /plataforma/planes`, `frontend/src/plataforma/Planes.tsx` | Implementado en código; depende de migraciones y datos. |
| Registro | `POST /plataforma/registro`, `CuentasService.crear` | Guarda cuenta y hash; ejecución real no probada en esta auditoría. |
| Verificar correo | `POST /plataforma/verificar`; token con vigencia de 48 h | Correo real depende de SMTP; sin SMTP puede devolver enlace de demostración. No verificado ahora. |
| Pago simulado | `POST /plataforma/suscribir`, `PasarelaSimulada` | Simulación de tarjeta; no hay cobro real. |
| Aprovisionar | Transacción en `PlataformaService.suscribir` | Crea tienda, suscripción, pago, sucursal, almacén, administrador y categorías; sin prueba de integración en este corte. |
| Acceder y renovar | `POST /plataforma/entrar`, `GET /plataforma/tiendas/:id`, `POST /plataforma/tiendas/:id/renovar` | Hay control de cuenta dueña en detalle y renovación; falta prueba HTTP con base. |

La pasarela simulada guarda resultados de idempotencia en memoria, por lo que no sobrevive a reinicios. La persistencia de pagos aprobados usa la base. Su compensación es una simulación, no un reembolso real.

## 2. Límites y permisos

`PlanLimitesService` cuenta personal activo excluyendo clientas, sucursales y productos. Se invoca al crear productos, sucursales, personal y en algunas rutas de proveedor y sincronización. El conteo de sucursales y productos no distingue en ese servicio inactivos o archivados. Se requiere revisar rutas indirectas, importaciones y condiciones de carrera: contar y crear no constituye por sí solo una garantía atómica.

La renovación comprueba que el uso no supere el plan elegido antes de cobrar. Las pruebas unitarias cubren límite exacto, producto ilimitado, ausencia de plan, exclusión de clientas, acceso de otra cuenta y reintentos. Falta verificar con dos tiendas, tokens reales y Postman. Los módulos declarados en el plan no se hacen cumplir mediante una guarda general identificada; no bloquear hasta acordar la matriz comercial.

## 3. Diseño pendiente del ciclo de vida

Propuesta de estados de negocio — requiere implementación y prueba, no son estados todos presentes en el esquema actual:

1. **Pendiente de activación:** cuenta verificada, aún sin pago aprobado ni tienda activa.
2. **Activa:** dentro del período pagado, con funciones y límites contratados.
3. **Próxima a vencer:** condición informativa; enviar recordatorios por canales configurados.
4. **Período de gracia:** si se acuerda una duración, mantener las operaciones permitidas y explicar la fecha límite. La duración aún no está fijada aquí.
5. **Vencida:** suspender nuevas operaciones de negocio según política acordada, conservar datos y dar acceso al dueño a renovación e información de facturación; diseñar acceso de consulta/exportación sin exponer datos.
6. **Cancelada:** detener renovación futura, definir fecha efectiva y conservar datos conforme a la política que se acuerde.

Cambio superior e inferior: mostrar diferencias, fecha efectiva y precio antes de confirmar. El cambio inferior no elimina datos ni se permite si supera límites, salvo que se diseñe expresamente una programación validada al hacerse efectiva. El tratamiento de períodos pagados y prorrateo todavía requiere decisión.

Offline: nunca eliminar operaciones pendientes por vencimiento o cambio de plan. Guardar de forma duradera y mostrar estado; definir si se permite sincronizar operaciones creadas durante vigencia aun con suscripción vencida, con autorización, idempotencia, validación de stock y resolución de conflictos. El permiso de sincronizar después del vencimiento queda como regla por decidir y probar.

Hallazgos actuales: `TiendasService` busca suscripciones activas que no vencieron sin filtrar `inicio <= ahora`; por ello una renovación futura puede seleccionarse anticipadamente. `sumarMeses` usa `Date.setMonth`, que puede desbordar en fin de mes. El cambio de plan cancela la suscripción vigente inmediatamente; falta definir prorrateo y operaciones futuras. No se identificó un flujo completo de cancelación ni recordatorios automáticos en esta revisión. `TenantMiddleware` rechaza solicitudes de negocio con tienda vencida; `/plataforma` tiene flujo separado de cuenta para consultar/renovar.

## 4. Separación de pagos

| Aspecto | Suscripción SaaS | Compra retail |
|---|---|---|
| Quién paga | Dueño a la plataforma | Cliente a la tienda |
| Concepto | Plan y período | Prendas de una venta |
| Rutas | `/plataforma/suscribir`, `/plataforma/tiendas/:id/renovar` | `/pagos/:id`, `/pagos/:id/simular` y flujo de ventas |
| Datos | `Suscripcion`, `PagoSuscripcion` | `Venta`, `PagoSimulado`, inventario y pedido |
| Efecto aprobado | Activa o renueva acceso de la tienda | Actualiza venta y stock según flujo |
| Efecto rechazado | No debería activar ni renovar | Libera reservas y anula venta en el flujo simulado correspondiente |

Esta separación ya existe parcialmente en el código; probar aislamiento de datos, claves idempotentes y errores en cada flujo. Los pagos permanecen simulados y no debe inferirse compatibilidad real con un proveedor.

## Plan de pruebas HTTP pendiente

Con una base de pruebas aislada y migraciones aprobadas: consultar planes; registrar y verificar una cuenta de prueba; suscribir con pago aprobado y rechazado; repetir solicitud; entrar como dueño; intentar acceso con cuenta ajena; alcanzar cada límite; probar baja con uso igual y superior al límite; probar módulos por rol y plan cuando se acuerde la matriz; renovar antes y después del vencimiento; comprobar segregación entre dos tiendas; simular compra retail y verificar que no cambie la suscripción; probar suspensión y sincronización de operaciones offline con datos controlados.

No se ejecutaron migraciones, semillas ni solicitudes que alteren datos en esta auditoría.
