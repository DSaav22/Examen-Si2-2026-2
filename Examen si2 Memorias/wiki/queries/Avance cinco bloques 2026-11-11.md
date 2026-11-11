---
tipo: query
fuentes: 3
actualizado: 2026-11-11
tags: [auditoria, avance, segundo-parcial]
---

# Avance de los cinco bloques — 11 noviembre 2026

Estimación técnica aproximada contra [[Mapa del segundo parcial]], contrastando código local y [[Pruebas SaaS offline y reportes 2026-11-10]]. No es cobertura de pruebas ni certificación de producción. Los porcentajes consideran implementación y evidencia de validación; los cinco bloques tienen igual peso solo para el promedio orientativo.

| Bloque | Estimación | Evidencia y pendientes |
|---|---:|---|
| SaaS multi-tienda | 85% | Planes, registro, verificación, alta, límites, cambio de tienda y métricas implementados. La auditoría anterior no completó métricas de plataforma ni concurrencia de límites; correo real pendiente de validación. La operación habitual usa tablas compartidas y tienda_id. La nueva estrategia por esquemas es experimental: ver [[Pendientes conexiones por esquema]]. Este 85% corresponde al alcance original, que admite tablas compartidas, y no a la migración por esquemas. |
| Offline web y móvil | 75% | IndexedDB, SQLite, UUID, sincronización, conflictos e idempotencia implementados. La auditoría anterior probó API/DB y una venta web desconectada. Faltan reinicio y recuperación, Android real, instalación y push de extremo a extremo. Persisten borrado antes de reencolar en web/móvil y borrado en finally de la migración de cola web: riesgo de pérdida ante fallo. |
| Reportes generativos | 80% | Texto, voz web, especificación validada, SQL parametrizado y exportadores presentes. Auditoría anterior: reglas y archivos PDF/Excel respondieron; modelo no disponible y voz simulada. Faltan modelo real operativo, micrófono/dispositivo y cotejo de resultados complejos y exportaciones. |
| Analítica ML | 0% | No se encontró implementación de entrenamiento supervisado/no supervisado, datos sintéticos para ML ni dashboards de resultados ML. El capítulo 8 es una plantilla. Las métricas SaaS no sustituyen modelos entrenados. |
| Pagos internacionales | 20% | Catálogo de métodos por país, pruebas y simulación local existentes. PasarelaSimulada devuelve referencias SIM y pagos expone simular. No se encontró integración sandbox externa ni webhook; falta comparación final de costos/cobertura y pruebas con proveedor. El capítulo 5 es una plantilla. |

Promedio orientativo: 52%. Primeros tres bloques: 80%. Redondeos deliberados; no son una medición exacta.

## Verificación de esta revisión

- Backend: 15 suites, 62 pruebas aprobadas (`npm test -- --runInBand`; npm advirtió que el argumento no fue transferido, Jest ejecutó su configuración habitual).
- Frontend: `npx tsc -b --pretty false`, aprobado.
- Móvil: `npx tsc --noEmit --pretty false`, aprobado.
- No se repitieron las pruebas HTTP/DB ni los recorridos de navegador del 10 noviembre; esos resultados son evidencia previa documentada, no ejecución actual.
- No se verificaron nube, micrófono, correo real, pasarela externa ni Android físico en esta revisión.

Prioridad: implementar ML y sandbox real; reparar persistencia offline; completar validación integral de SaaS y reportes. Los cambios locales existentes se conservaron.
