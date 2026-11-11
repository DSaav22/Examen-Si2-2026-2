---
tipo: query
fuentes: 2
actualizado: 2026-11-10
tags: [auditoria, saas, offline, reportes, pruebas]
---

# Pruebas SaaS, offline y reportes — 10 de noviembre

Contraste con [[Mapa del segundo parcial]] y [[Auditoria suscripciones y ciclo de vida]]. Las pruebas usaron una **copia de demostración**, no la base original; se conservaron tiendas y operaciones de prueba.

## SaaS

El script `verificar-saas.ts` comprobó los tres planes, precios, verificación de correo simulado, rechazo de pago y alta aprobada con reintento idempotente, sucursal y almacén, aislamiento de catálogo y reportes por tienda, límites de usuarios y sucursales, cuenta en varias tiendas, dos tiendas, cambio de plan y rechazo de tienda vencida. La ejecución quedó incompleta al intentar entrar al panel de plataforma: la cuenta esperada por el script no existe en la copia y no hay cuentas con `esPlataforma`; métricas pendientes de prueba. Aislamiento actual por `tienda_id`, no por esquemas. Permisos de módulos por plan y concurrencia de límites requieren más pruebas.

## Offline e integridad

`verificar-offline.ts` terminó correctamente contra la copia: última unidad disputada por dos cajas (una aplicada, una en conflicto), rollback de una venta con línea sin stock, cuatro envíos simultáneos con misma clave (una venta y un descuento), triple ingreso idempotente, clave repetida con otro contenido rechazada, sincronización y fusión de clientes, producto con UUID, validación de ventana y rechazo de referencia ajena. Son pruebas HTTP/DB, no equivalen por sí solas a probar desconexión del dispositivo.

En navegador automatizado se cargó el POS, se cortó la conexión, se cobró una venta en efectivo y se comprobó que quedara pendiente en IndexedDB; al reconectar se verificó una sola venta en la copia. No se probó cerrar el navegador ni recuperar la cola tras reiniciar.

El código móvil contiene `expo-sqlite` y sincronización, y pasa comprobación de tipos; no había dispositivos ADB conectados, por lo que Android, persistencia SQLite y reconexión móvil no fueron probados.

Riesgos observados en código: `frontend/src/offline/cola.ts` y `movil/src/offline/sync.ts` eliminan una operación antes de guardar su reemplazo al reintentar; un fallo entre pasos puede perderla. En la migración de cola antigua web se elimina la entrada de `localStorage` en `finally`, incluso si la conversión falla. No se corrigieron en esta auditoría.

## Reportes por texto y voz

Dos peticiones de texto respondieron HTTP 201 con `motor=reglas`; una devolvió diez filas. Se generaron PDF y Excel con HTTP 201 y firmas de archivo válidas; no se realizó una comparación independiente exhaustiva de contenido. El catálogo indicó modelo configurado pero no disponible en ese momento. Sin token se obtuvo 401 y como cajero 403.

La interfaz web fue probada con un reconocimiento de voz simulado: el texto llegó a la API y generó un resultado. No se probó un micrófono real ni la exactitud del reconocimiento. Móvil usa dictado del teclado y no se probó en dispositivo.
