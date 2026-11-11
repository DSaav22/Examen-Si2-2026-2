---
tipo: query
fuentes: 1
actualizado: 2026-11-11
tags: [iconix, auditoria, pruebas, segundo-parcial]
---

# Auditoría funcional UC36 a UC54 — 11 de noviembre

Se probaron los 19 casos del incremento descrito en [[ICONIX]] usando una copia local exclusiva de la base. El detalle por caso, alcance y evidencia están en el [informe de auditoría](../../../docs/segundo-parcial/05-verificacion/2026-11-11-auditoria-uc36-uc54.md).

SaaS, sincronización, reportes y crédito pasan sus suites HTTP en tablas compartidas; analítica pasa en esquemas. No se puede afirmar que todos estén completos: sincronización devuelve 503 en esquemas y analítica devuelve 503 en tablas compartidas. La transición parcial a esquemas reproduce 500 de sesión/verificación si existen tiendas sin esquema. Push está desactivado en el servicio local; UC54 implementa simulación interna, no una pasarela externa verificada. Las rutas documentadas de UC52, UC53 y UC54 están desactualizadas.

Pasaron 93 pruebas unitarias, compilación backend/frontend y tipos móvil. No hubo ejecución visual ni dispositivo móvil: el arranque del navegador fue rechazado por política. El 403 del cajero en el panel global de conflictos no prueba por sí solo un fallo de UC45: existe resolución de cola local en código, pendiente de ejecutar.

La base original y el servicio existente se conservaron. La copia de auditoría permanece; las API temporales se detuvieron y el rol temporal quedó sin login ni privilegio de superusuario.
