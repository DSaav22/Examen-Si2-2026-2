# Log

Cronología append-only. No reescribir entradas viejas.

## [2026-09-12] init | Esqueleto LLM Wiki

Capas `raw/` + `wiki/` + `AGENTS.md`. Carpetas vacías: sources, concepts, entities, synthesis, queries. Pendiente: primer ingest (programa del curso).

## [2026-09-12] ingest | Transcripción audio e-commerce

Problema de la cadena de ropa femenina, omnicanal, probador virtual y reportes generativos. Flutter/PWA/23-sep quedan marcados como no canónicos.

## [2026-09-12] ingest | Examen 1 Garzón FashionStore

PDF de otro docente: RF01–25, actores, reservas, PUDS, stack FastAPI/Angular/Flutter y calendario 05/13/20/22 sep. Se usa como complemento, no como mandatorio.

## [2026-09-12] ingest | Stack y metodología del parcial

Canon: NestJS + React + React Native + PostgreSQL + Azure. UP (Booch et al.). Documento en 3 partes. Primer sprint 18 sep, ciclos de 3 semanas.

## [2026-09-12] lint | Conflictos de stack y fechas

Documentados en [[Contradicciones entre fuentes]]. Gana la clase de stack para tecnología/calendario y el audio para problema/innovaciones.

## [2026-09-12] ingest | Corrección: solo el parcial

El dueño anula sprints y el 18 sep. Canon de fecha: presentación **23 de septiembre**. Alcance de la wiki: únicamente el examen parcial + PUDS. Actualizados mapa, cronograma, MVP, contradicciones e índice.

## [2026-09-12] query | ¿Alcanza la info para documentar? Factibilidad

Sí para Parte 2 Inicio y temario Parte 1. Producto al 23 solo si el probador es overlay 2D+pose (no VTO 3D de tela) y el SQL generativo va acotado. Archivado en [[Factibilidad]].

## [2026-09-12] query | Fase Inicio PUDS

Decisiones: EnsayAR, probador 2D+pose, pagos simulados, reservas fuera. Artefacto formal en `docs/parcial/02-puds/01-fase-inicio.md`. Wiki: [[Fase Inicio]], 10 CU breves, riesgos, arquitectura candidata. Siguiente: Elaboración (UC03, UC07, UC10).

## [2026-09-12] query | Fase Elaboración PUDS

UC03, UC07 y UC10 en formato expandido + SSD. Modelo de dominio (producto/variante/stock/venta/turno). Baseline: un POST /ventas, stock en servidor, probador en cliente, SQL solo v_reporte_ventas. Spikes A/B/C. Formal: `docs/parcial/02-puds/02-fase-elaboracion.md`.

## [2026-09-12] query | Construcción: backend + spike B

NestJS + Prisma en `backend/`. `POST /ventas` con FOR UPDATE, 409 si no hay stock, uuid idempotente. Test `npm run spike:b` (pide PostgreSQL). Docker Desktop no estaba instalado en esta máquina; el spike queda listo para cuando haya Postgres.
