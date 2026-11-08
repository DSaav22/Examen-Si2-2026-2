---
tipo: source
fuentes: 1
actualizado: 2026-11-08
tags: [clase, audio, segundo-parcial, canonico, saas, offline, iconix]
---

# Transcripción audio — consigna del segundo parcial

Fuente cruda: `raw/2026-11-08-transcripcion-audio-segundo-parcial.md` (dos audios de la misma clase, docente propio).

## Idea central

El segundo parcial es un **nuevo ciclo** sobre [[EnsayAR]]: un incremento, no un proyecto nuevo. Se presenta el 100% del primer parcial **más** las características nuevas. Nada se elimina. También se evalúa si la arquitectura del primer parcial aguantó el cambio.

El docente plantea tres caminos: reutilizar todo y agregar, modificar algunas capas, o tirar y rehacer. Rehacer es trabajar el doble.

## Takeaways

1. **SaaS multi-tienda.** Ya no es una tienda: son muchas. Planes, suscripción autoservicio y creación automática del espacio de trabajo. En la defensa van a crear varias tiendas. → [[SaaS multi-tenant]]
2. **Offline en web y móvil.** Web como [[PWA]]; móvil con almacenamiento local (SQLite). Sincronización completa. Casos forzados en el examen: IDs, último ítem de stock y doble clic en "guardar" con red inestable. → [[Modo offline]]
3. **Reportes generativos reforzados.** Texto o voz, pedidos complejos (filtros, operaciones, agrupación, orden). Salida en pantalla, PDF o Excel. → [[Reportes generativos]]
4. **Analítica con IA.** Modelos supervisados **y** no supervisados, entrenados con datos sintéticos, con dashboards. → [[Analitica con IA]]
5. **Pagos abiertos al mundo hispanohablante.** Pasarelas que cuesten poco al cliente y simulación de pasarela real. → [[Pasarelas de pago]]
6. **Metodología: ICONIX.** No Proceso Unificado ni Scrum. → [[ICONIX]] · [[ICONIX vs Proceso Unificado]]
7. **Stack se mantiene** (Nest, Postgres, React). Pueden cambiarlo si quieren. → [[Stack del parcial]]
8. **Arquitectura:** monolito modular, listo para partirse en microservicios. → [[Arquitectura candidata]]
9. **Todo desplegado en nube** (AWS, Azure u otro), incluida la parte del primer parcial. → [[Azure]]

## Entrega

- **PDF en la plataforma hasta el 11 de noviembre, 8:00.** Sin prórroga. Ese mismo día es el examen. → [[Cronograma]]
- Capítulos teóricos nuevos: SaaS (variantes y la elegida), inquilinos, pagos, offline/PWA/sincronización/idempotencia, IA de reportes dinámicos. Se suman a los del primer parcial. → [[Documento del examen]]

## Advertencia del docente

La teoría "no es para copiar y pegar". En la defensa puede preguntar sin mirar la app: *"explícame multi-tenant y cómo lo resuelves en Nest"*. Si no se entiende, la app no salva la nota.

## Partes ambiguas del audio

- "Ojo que para hacer esto de la aplicación móvil…" queda cortado. No queda claro si los reportes por voz se exigen también en el móvil.
- "Hay una sesión más para realizar esa regla" sobre qué es offline: el docente parece anunciar otra sesión. Sin fuente aún.
- Brasil aparece en pagos, pero el mínimo dicho es "cualquier región de habla hispana".

## Qué toca

[[Mapa del segundo parcial]] · [[Brecha segundo parcial]] · [[ICONIX]] · [[SaaS multi-tenant]] · [[PWA]] · [[Modo offline]] · [[Reportes generativos]] · [[Analitica con IA]] · [[Pasarelas de pago]]
