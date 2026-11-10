---
tipo: synthesis
fuentes: 1
actualizado: 2026-11-08
tags: [segundo-parcial, pendientes, iconix, multitenant, sincronizacion]
---

# Pendientes del segundo parcial

EnsayAR continúa desde el primer parcial y debe incorporar los nuevos pedidos comunicados por el docente. Fuente: [[pedidos-segundo-parcial-2026-11-08]]. Esta lista es un **backlog inicial**, no una certificación del estado actual del código. Las casillas sin marcar indican que falta analizar, acordar o verificar el requisito; no implican necesariamente que no exista código previo.

**Actualización:** el nuevo `main` incorpora [[transcripcion-audio-segundo-parcial]], [[Mapa del segundo parcial]] y [[Brecha segundo parcial]], además de implementación para SaaS, offline y reportes. Contrastá esta lista inicial con esas fuentes antes de decidir prioridades o dar por vigente alguna pregunta abierta.

## Decisiones acordadas — 9 de noviembre

Fuente: [[decisiones-arquitectura-2026-11-09]].

- **Multitenancy:** una base PostgreSQL, un esquema por tienda. **Pendiente de implementar después**; actualmente el código usa tablas compartidas con `tiendaId`.
- **Web:** usar PWA. Ya hay código inicial; falta verificar la cobertura offline y sus pruebas.
- **Móvil:** usar SQLite local. Ya hay código inicial; falta probar su comportamiento en dispositivos y sincronización.
- **Integridad:** aplicar idempotencia y rollback, incluyendo pruebas de reintentos, doble envío y conflictos de stock. Hay que verificar lo existente antes de darlo por completo.
- **Arquitectura:** monolito modular, preparado para una posible separación futura; no se implementarán microservicios por ahora.
- **Voz en reportes:** debe funcionar también en móvil; validar si el dictado del teclado cubre el requisito o si se incorporará un control propio.
- **Pagos:** seguirán siendo simulados y se investigarán los medios y reglas de negocio por país.

## 1. Continuidad y evaluación

- [ ] Recopilar resultado y observaciones del primer parcial y convertirlos en mejoras verificables.
- [ ] Establecer una línea base actualizada de funcionalidades web, móvil, API y base de datos; conservar los [[Casos de uso]] previos.
- [ ] Definir pruebas de regresión para que los nuevos ciclos no rompan funcionalidades existentes.
- [ ] Revisar el alcance real de [[Punto de venta]], [[Probador virtual]] y [[Pasarelas de pago]], diferenciando lo operativo, simulado y pendiente.
- [ ] Proponer y comparar tres caminos de implementación para el POS y las funcionalidades por enriquecer; documentar la decisión, beneficios, costos y riesgos. **Los caminos aún no fueron definidos por la fuente.**
- [ ] Evaluar escalabilidad, flexibilidad, tecnologías y viabilidad antes de comprometer cambios de arquitectura.

## 2. Multitenancy y suscripciones

- [ ] Implementar y probar las reglas de planes y baja documentadas en [[Planes y suscripciones retail]]; todos los planes deben permitir ventas e inventario.
- [ ] Definir qué representa cada tenant (tienda, empresa u otra unidad), su ciclo de vida y administración.
- [ ] Diseñar el aislamiento por esquema y documentar la comparación con el modelo de tablas compartidas actualmente implementado.
- [ ] Planificar y probar la migración futura de los datos existentes a un esquema por tienda, junto con aprovisionamiento, migraciones, aislamiento y restauración por tienda. No ejecutar la conversión todavía.
- [ ] Diseñar identificación y aislamiento por tenant en autenticación, consultas, archivos y operaciones web/móvil.
- [ ] Diseñar planes de suscripción, estados, límites y acceso a funcionalidades; aclarar si el cobro será simulado.
- [ ] Diseñar migración y compatibilidad con datos ya existentes sin pérdida ni exposición entre tiendas.
- [ ] Probar explícitamente que una tienda no pueda consultar ni modificar información de otra, incluso manipulando identificadores.

## 3. Offline, sincronización e integridad

Relacionar este bloque con [[Modo offline]], [[Inventario matricial]] y [[Punto de venta]].

- [ ] Inventariar el almacenamiento del navegador y móvil, datos persistidos y operaciones disponibles sin conexión.
- [ ] Verificar la PWA web y SQLite móvil acordados, incluidos límites de almacenamiento y persistencia ante cierre de la aplicación.
- [ ] Definir qué se puede consultar, registrar y cobrar offline, y qué operaciones requieren conexión.
- [ ] Diseñar una cola persistente de operaciones con identificadores únicos, reintentos seguros y confirmaciones del servidor.
- [ ] Definir idempotencia, orden de sincronización, conflictos y tratamiento de duplicados; ninguna estrategia debe asumir que el stock remoto sigue disponible.
- [ ] Definir manejo visible de errores, conflictos de stock y conciliación cuando varias sucursales o dispositivos operan desconectados.
- [ ] Garantizar atomicidad y rollback dentro de los límites de cada transacción; para operaciones entre servicios evaluar patrones de compensación y consistencia eventual según el diseño elegido.
- [ ] Probar cortes antes, durante y después de una venta, reinicios, reintentos, doble envío y dos ventas por la última unidad.
- [ ] Verificar persistencia, auditoría y recuperación frente a fallos sin borrar datos existentes.

## 4. Voz, lenguaje natural y consultas

- [ ] Auditar el estado de [[Asistente IA]] y [[Reportes generativos]], incluidos permisos y límites actuales.
- [ ] Definir entradas y salidas de voz, idioma, permisos, dispositivos compatibles y alternativas accesibles por texto.
- [ ] Diseñar consultas de datos complejas por lenguaje natural, acotadas al rol y tenant del usuario.
- [ ] Probar autorización, aislamiento entre tiendas, consultas inválidas, disponibilidad del servicio y tiempos de respuesta.
- [ ] Definir cómo presentar fuentes o resultados y errores sin prometer exactitud que no se haya validado.

## 5. Análisis de datos y aprendizaje automático

- [ ] Definir preguntas de negocio, fuentes de datos, filtros, visualizaciones y métricas.
- [ ] Proponer al menos una aplicación supervisada y una no supervisada; elegir modelos sólo después de definir datos y objetivo.
- [ ] Diseñar datos sintéticos identificables y documentar generación, supuestos y limitaciones; evitar confundirlos con datos de ventas reales.
- [ ] Preparar separación de entrenamiento/validación/prueba, métricas pertinentes, una línea base y reproducibilidad.
- [ ] Verificar que los datos y resultados respeten el aislamiento por tenant.

## 6. Móvil, nube y pagos

- [ ] Aclarar qué entrega exige el docente para «aplicaciones móviles en la nube»: API pública, distribución de APK/AAB, pipeline o una combinación.
- [ ] Identificar la URL pública real del backend desplegado y verificar que web y móvil apunten al entorno previsto.
- [ ] Comprobar autenticación, catálogo, ventas y sincronización móvil en dispositivo físico contra ese entorno.
- [ ] Definir estrategia de despliegue, configuración y observabilidad sin incrustar secretos en la APK.
- [ ] Mantener explícito el alcance de los pagos simulados acordado para el proyecto; revisar si la nueva consigna exige algo diferente.

## 7. Documentación ICONIX

- [ ] Obtener la consigna o rúbrica original y confirmar entregables, formato y profundidad de ICONIX.
- [ ] Delimitar requisitos funcionales y no funcionales nuevos y sus actores.
- [ ] Actualizar modelo de dominio y casos de uso; identificar los escenarios críticos de sincronización y multitenancy.
- [ ] Elaborar diagramas de robustez y secuencia y actualizar diseño/clases de acuerdo con el alcance aprobado.
- [ ] Mantener trazabilidad requisito → caso de uso → diseño → implementación → prueba.
- [ ] Organizar ciclos y pruebas de regresión documentando las decisiones de arquitectura.

## Preguntas abiertas para el docente

1. ¿Cuáles son los tres caminos que se espera evaluar, o deben ser propuestos por el equipo?
2. ¿Qué significa exactamente desplegar la aplicación móvil en la nube y cuál es la evidencia requerida?
3. ¿Se exige implementar microservicios o sólo analizar consistencia distribuida si se usan?
4. ¿Qué nivel de multitenancy y suscripciones debe estar operativo, y el pago sigue siendo simulado?
- El pago seguira siendo simulado
5. ¿Qué problemas de negocio, métricas y evidencia se esperan para aprendizaje supervisado y no supervisado?
6. ¿Cuáles son los artefactos ICONIX, la fecha de entrega y los criterios de evaluación?

## Orden de trabajo sugerido

1. Conseguir la consigna original y auditar la línea base del primer parcial.
2. Diseñar aislamiento multitenant y estrategia de sincronización antes de modificar el modelo de datos.
3. Acordar y probar flujos críticos de POS, stock y operaciones offline.
4. Implementar incrementos de voz, análisis de datos y móvil sobre esa base.
5. Mantener los artefactos ICONIX y las pruebas durante cada ciclo, no sólo al final.

Este orden es una recomendación de trabajo, no un calendario impuesto por el docente.
