# Auditoría funcional UC36–UC54 — 11 de noviembre de 2026

**Resultado: no se puede afirmar que los 19 casos estén completamente funcionales.** Los flujos HTTP principales de SaaS, offline, reportes y crédito pasan en tablas compartidas. Analítica pasa por HTTP en esquemas. Las dos capacidades no están integradas en un mismo modo: la analítica exige esquemas y la sincronización se bloquea al activarlos. Push está desactivado en el servicio local consultado; los pagos implementados son simulados.

## Entorno y alcance

- Checkout local con cambios previos del usuario, conservados; no se corrigió código de producto.
- Base exclusiva `ensayar_iconix_audit_20261111`, creada mediante dump/restore de `ensayar_demo` dentro del contenedor local `ensayar-demo-local-20261110`, puerto 55442. Las escrituras de las pruebas se limitaron a esta copia.
- Dos API temporales con el backend compilado actual: 3302 (tablas compartidas) y 3303 (pilotos de esquemas de perfiles, alta, catálogo e inventario). No se cambiaron `.env` ni el servicio existente de 3000.
- SMTP, modelos externos y VAPID se desactivaron en ambas API de auditoría. Se usó un JWT sintético, cuentas de ensayo y tarjetas simuladas. No hubo cobros ni envíos de correo externos.
- Como preparación de la copia, se retiraron cuatro tiendas `prueba-*` heredadas de ensayos anteriores, se creó una cuenta sintética de plataforma y se generaron 309 ventas y 34 clientas sintéticas para reportes. Estos datos son fixtures de prueba, no resultados de negocio reales.
- En el servicio existente de 3000 solo se consultó `GET /push/clave`: HTTP 200 con `activo=false`.
- Al finalizar se detuvieron las API y Vite de auditoría. La copia se conserva; el rol temporal quedó `NOLOGIN NOSUPERUSER`. No se puede reejecutar el envoltorio sin preparar nuevamente su acceso local.

## Resultados por caso de uso

“Pasa API” significa que pasó el escenario automatizado indicado; no certifica todos los alternos ni la interfaz web o móvil.

| UC | Caso | Resultado y límite |
|---|---|---|
| UC36 | Registrar cuenta | Pasa API en modo compartido: registro, planes y enlace demo. También se creó cuenta nueva por API en esquemas, pero el paso de verificación posterior falla en la base parcialmente migrada. Sin prueba visual. |
| UC37 | Verificar correo | Pasa API compartida: cuenta no verificada bloqueada y enlace de demo activa la cuenta. Sin entrega SMTP real. En esquemas con tiendas heredadas sin migrar, verificar una cuenta nueva devuelve 500. |
| UC38 | Suscribirse y crear tienda | Pasa API compartida: rechazo no crea tienda, aprobación crea sucursal/almacén/admin e idempotencia evita duplicación. En esquemas con tiendas sin migrar, un ensayo devolvió 500 al construir la sesión después de crear la tienda. |
| UC39 | Renovar o cambiar de plan | Pasa el upgrade a Crecimiento trimestral y se habilita una segunda sucursal. Las pruebas unitarias de renovación pasan. No se ensayaron por HTTP todos los períodos, rechazos y downgrades. |
| UC40 | Cambiar de tienda | Pasa API compartida: cuenta con dos tiendas cambia sin repetir login; identificadores y cabecera ajena no permiten saltar de tienda. No se probó el selector visual; esquemas requiere migración completa. |
| UC41 | Ver métricas de suscripciones | Pasa API con cuenta sintética de plataforma: autorización, MRR, ARR y seis períodos de proyección. No es una certificación independiente de todas las métricas financieras ni de las gráficas. |
| UC42 | Vender sin conexión | Pasa procesamiento HTTP/DB de operaciones simuladas como creadas sin red: UUID, stock, rechazo QR y rollback. No se cortó la red de un navegador ni de un dispositivo móvil en esta ejecución. |
| UC43 | Registrar clienta/producto sin conexión | Pasa API: producto con variantes y stock, colisión de SKU, clienta con UUID, fusión por correo y venta dependiente. Falta validar captura y persistencia reales del dispositivo. |
| UC44 | Sincronizar pendientes | Pasa API compartida: lotes, reenvíos, cuatro peticiones concurrentes, una sola venta y referencias ajenas rechazadas. En modo esquemas devuelve 503 `SYNC_ESQUEMAS_NO_DISPONIBLE`: bloqueado. |
| UC45 | Resolver conflicto de stock | Pasa detección de conflicto de última unidad y descarte remoto por ADMIN (200). CAJERO recibe 403 al listar/descartar en el panel global. El código ofrece reintento ajustado y descarte en la cola local; ese recorrido no se ejecutó en navegador. No clasificar el 403 aislado como fallo de todo el caso. |
| UC46 | Configurar ventana offline | Pasa API: vencimiento con 7 días y aceptación al subir a 10; valores 0 y 31 devuelven 400; CAJERO no puede modificarla (403). |
| UC47 | Activar push | No operativo en el servicio local consultado: `activo=false`. Auditoría sin VAPID: `/push/probar` responde 200 con `enviadas=0`. No se probó permiso, suscripción real, recepción con app cerrada ni expiración del endpoint. |
| UC48 | Reporte por texto/voz | Pasa texto por reglas: interpretación, SQL parametrizado, resultado comparado con cálculo independiente, aislamiento e inyección. Sin llamada al modelo externo ni micrófono real. Voz y motor IA no verificados. |
| UC49 | Ajustar/exportar reporte | Pasa API: especificaciones válidas, Excel leído con cinco filas y hoja de explicación; PDF corto de una página y largo de siete páginas. Sin recorrido visual del editor ni inspección visual del PDF. |
| UC50 | Vender al crédito | Pasa API: exige clienta, crea deuda con saldo completo sin sumar efectivo a caja; devolución sin abonos cancela deuda sin retirar efectivo. |
| UC51 | Registrar abono | Pasa API: saldo y caja, rechazo de exceso, reintento idempotente y dos abonos concurrentes (uno aceptado, otro 409; saldo nunca negativo). |
| UC52 | Dashboard predictivo | Pasa endpoint actual `/analitica/panel` en esquemas: predicción con datos sintéticos, aislamiento, permisos y plan. En tablas compartidas devuelve 503 `ANALITICA_REQUIERE_ESQUEMAS`. No se probó dashboard visual ni todos los alternos de entrenamiento. |
| UC53 | Segmentación de clientas | Pasa el mismo endpoint en esquemas: población de segmentos consistente con clientas de prueba, aislamiento y acceso por plan/rol. No se validó calidad comercial del agrupamiento ni interfaz. |
| UC54 | Pasarela internacional | Pasa simulación local QR aprobado/rechazado: estados, descuento de stock y liberación de reserva. El catálogo HTTP marca todos los métodos como simulados. No se verificó pasarela externa sandbox, webhook ni un cobro internacional real. |

## Hallazgos reproducidos

1. **Modos incompatibles para completar todos los casos.** En modo compartido `/analitica/panel` devuelve 503 `ANALITICA_REQUIERE_ESQUEMAS`; en modo esquemas `/sync/lote` devuelve 503 `SYNC_ESQUEMAS_NO_DISPONIBLE`. No hay evidencia de una configuración actual que satisfaga ambos flujos completos.
2. **La transición parcial a esquemas rompe sesiones.** `CuentasService.perfilesEnEsquemas` comprueba que todas las tiendas registradas tengan esquema. Si falta uno, lanza `ESQUEMA_TIENDA_INEXISTENTE`. Se reprodujo HTTP 500 al verificar una cuenta nueva y al terminar un alta con una cuenta existente. La base de auditoría deliberadamente conserva tiendas heredadas sin migrar: esto demuestra un bloqueo de la transición, no que una instalación íntegramente migrada tenga necesariamente el mismo fallo. El alta había creado la tienda antes del error de sesión.
3. **Documentación de rutas desactualizada.** Las rutas documentadas `GET /analitica/prediccion`, `GET /analitica/segmentos` y `POST /pagos/pasarela` devolvieron 404. La implementación actual expone `/analitica/panel` y `/ventas` más `/pagos/:id/simular`.
4. **Alcance de pago diferente al texto de UC54.** La documentación describe transacción en pasarela sandbox y notificación externa; se comprobó un flujo de simulación interna. No presentarlo como integración internacional validada.
5. **Push desactivado.** Comprobado con una consulta de solo lectura al servicio local existente; la prueba sin VAPID de auditoría no es una prueba de entrega.

## Ejecuciones y evidencia

Logs en [artifacts/auditoria-iconix-20261111](../../../artifacts/auditoria-iconix-20261111).

| Ejecución | Resultado |
|---|---|
| `npm test` en backend | 18 suites, 93 pruebas aprobadas |
| `npm run build` en backend | Aprobado |
| `npm run build` en frontend | Aprobado; advertencia de tamaño de bundle |
| TypeScript `--noEmit` en móvil | Aprobado; ADB no disponible en PATH |
| `verificar-saas` | Aprobado tras preparar los fixtures |
| `verificar-offline` | Aprobado, HTTP/DB |
| `verificar-reportes` | Aprobado tras generar sus datos sintéticos requeridos |
| `esquemas-verificar-analitica-http` | Aprobado |
| `verificar-iconix-complementos` | Aprobado: confirma también bloqueos 503 y rutas antiguas 404 |
| `esquemas-verificar-alta-esquema-http` | Falló: alta devuelve 500 en transición parcial |
| `verificar-iconix-alta-limpia` | Falló: verificación de cuenta nueva devuelve 500 en transición parcial |
| TypeScript `--noEmit` en backend tras añadir verificaciones | Aprobado |

Los primeros intentos de SaaS y reportes encontraron problemas de preparación del ensayo: membresías de tiendas de pruebas anteriores y ausencia del dataset sintético esperado. Se corrigieron únicamente los fixtures en la copia y ambas suites se ejecutaron completas. No se atribuyen esos primeros errores al producto.

Scripts nuevos: `backend/scripts/auditoria-iconix-local.cjs`, `preparar-auditoria-iconix.ts`, `verificar-iconix-complementos.ts` y `verificar-iconix-alta-limpia.ts`. El envoltorio fija base, puertos y servicios externos desactivados; adapta temporalmente las constantes de laboratorio de los scripts existentes para apuntar exclusivamente a la copia y elimina el archivo adaptado al terminar.

## Límites de la auditoría

La revisión automática de aprobación rechazó el arranque de Edge de pruebas por una restricción de política. No se ejecutaron pruebas visuales, IndexedDB/PWA con desconexión real, micrófono ni recepción push. No se probó móvil en dispositivo. Los resultados de ejecuciones anteriores mencionados en la wiki no se reutilizaron como pruebas actuales.

Para declarar los 19 casos completos falta integrar sincronización con esquemas, terminar y validar la migración, ajustar el alcance/rutas del modelo ICONIX y ejecutar los recorridos web/móvil y servicios externos que correspondan al alcance acordado.
