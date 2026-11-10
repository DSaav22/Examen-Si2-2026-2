---
tipo: index
actualizado: 2026-11-09
tags: [index]
---

# Índice

Portal compilado. En cada query, empezar aquí.

## Segundo parcial (11 nov, PDF hasta las 8:00)

- [[Planes y suscripciones retail]] — decisiones, flujo y pruebas de cambio de plan
- [[Metodos de pago por pais 2026]] — investigación LATAM, PayPal y Binance Pay
- [[Auditoria suscripciones y ciclo de vida]] — flujo actual, permisos, diseño y pruebas pendientes
- [[decisiones-arquitectura-2026-11-09]] — esquema por tienda pendiente, PWA, SQLite, idempotencia y rollback
- [[Mapa del segundo parcial]] — requisitos B/S/O/R/A/P/D extraídos de la clase
- [[Brecha segundo parcial]] — requisitos vs código al 8 nov
- [[ICONIX vs Proceso Unificado]] — contraste y qué se reutiliza
- [[ICONIX]] — metodología nueva: robustez, PDR, CDR
- [[SaaS multi-tenant]] — muchas tiendas, planes, un login varias tiendas
- [[PWA]] — offline web, instalable, push
- [[Analitica con IA]] — supervisado + no supervisado, datos sintéticos, dashboards
- Fuente: [[transcripcion-audio-segundo-parcial]]

## Síntesis (primer parcial)

- [[Pendientes segundo parcial]] — requisitos nuevos, backlog, riesgos y preguntas abiertas; metodología ICONIX
- [[Mapa del examen]] — qué hay que entregar y qué es canónico
- [[Contradicciones entre fuentes]] — audio vs Garzón vs stack vs código
- [[MVP y alcance]] — esencial vs complemento
- [[Estado del codigo]] — snapshot **25 sep** (móvil Vesta, probador sin cámara, scroll web)
- [[codigo-24-sep-movil-web]] — fuente de ese corte
- [[codigo-23-sep]] — corte anterior UC28–UC35 / bot
- [[Comparacion informes ejemplo]] — Tatiana vs Lozada (calidad documental)
- [[Checklist informe EnsayAR]] — puntos a poner en el PDF del parcial
- [[Indice del informe]] — docs/parcial = cuerpo; wiki = memoria
- [[Cronograma]] — presentación 23 sep; sin sprints
- [[Factibilidad]] — ¿alcanza para documentar? ¿entra el 23?
- [[Decisiones del parcial]] — EnsayAR, 2D+pose, QR simulado
- [[Fase Inicio]] — artefactos PUDS del 12 sep
- [[Fase Elaboracion]] — UC03/07/10, dominio, spikes
- [[Fase Construccion]] — A/B/C, Vesta UI, cola POS, IaC Azure
- [[Fase Transicion]] — adopción + criterio de deploy

## Conceptos

- [[Plataforma omnicanal]] — e-commerce + POS
- [[Probador virtual]] — innovación 1 (RA); móvil con foto/demo + IA
- [[Reportes generativos]] — innovación 2 (pregunta → SQL acotado)
- [[Inventario matricial]] — producto × talla × color × almacén
- [[Punto de venta]] — caja, turnos, arqueo
- [[Reservas de prendas]] — flujo fuerte en Garzón
- [[Asistente IA]] — ficha por reglas + bot `POST /ia/bot` (local)
- [[Pasarelas de pago]] — QR, tarjeta, efectivo, contra entrega
- [[Modo offline]] — cola POS parcial
- [[Proceso Unificado]] — metodología obligatoria
- [[Documento del examen]] — 3 partes + checklist
- [[Stack del parcial]] — NestJS + React + RN + PG + Azure
- [[Vision]] · [[Actores]] · [[Casos de uso]] · [[Glosario]] · [[Riesgos]] · [[Arquitectura candidata]]
- [[UC03 Probador]] · [[UC07 Venta POS]] · [[UC10 Reporte generativo]] · [[Modelo de dominio]]

## Entidades

- [[EnsayAR]] — plataforma del parcial (UI “Vesta” = visual)
- [[Tienda de ropa femenina]] — caso de negocio
- [[FashionStore]] — nombre del PDF Garzón
- [[Angelica Garzon]] — otro docente
- [[NestJS]] · [[React]] · [[React Native]] · [[PostgreSQL]] · [[Azure]]
- [[Booch Rumbaugh Jacobson]] — libro UP

## Fuentes

- [[decisiones-arquitectura-2026-11-09]] — decisiones de Andrés y estado pendiente de implementación
- [[transcripcion-audio-segundo-parcial]] — **canon del segundo parcial** (SaaS, offline, reportes, ML, pagos, ICONIX)
- [[pedidos-segundo-parcial-2026-11-08]] — resumen de pedidos comunicado por Andrés
- [[transcripcion-audio-clase-ecommerce]] — problema e innovaciones (oral)
- [[transcripcion-audio-stack-metodologia-parcial]] — stack, PUD, 3 partes (transcripción literal)
- [[examen1-garzon-fashionstore]] — PDF otro docente (RF, actores, reservas)
- [[stack-metodologia-parcial]] — **canon** resumido (misma clase que el audio de arriba)
- [[correccion-alcance-parcial]] — solo el parcial; fecha 23 sep
- [[contexto-completo-proyecto]] — snapshot código 22 sep (Andrés merge); superado por [[codigo-23-sep]] / [[codigo-24-sep-movil-web]]
- [[codigo-23-sep]] — working tree 23 sep tarde (UC28–UC35, bot, Azure viejo)
- [[codigo-24-sep-movil-web]] — working tree 24–25 sep (paridad móvil, probador sin cámara, scroll, tsconfig)
- [[ejemplo-informe-tatiana-autogo]] — modelo de profundidad (172 p.)
- [[ejemplo-informe-lozada-asistencia-mecanica]] — parcial más corto (63 p.)

## Queries archivadas

- [[Comparacion pedidos y audio segundo parcial]] — acuerdos, precisiones y diferencias entre ambas fuentes
- [[Factibilidad documentacion y producto]] — Inicio sí; RA 3D no entra
- [[Huecos locales vs examen]] — RF vs madurez real (revisado 25 sep)

## Cómo usar

1. Deja un archivo en `raw/inbox/`.
2. En Cursor: `ingiere <nombre>`.
3. Revisa el grafo en Obsidian.
