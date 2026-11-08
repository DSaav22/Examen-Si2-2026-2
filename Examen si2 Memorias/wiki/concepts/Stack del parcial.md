---
tipo: concept
fuentes: 4
actualizado: 2026-09-25
tags: [stack, canonico]
---

# Stack del parcial

**Única verdad de implementación** para este equipo. Fuente: [[stack-metodologia-parcial]].

| Capa | Tecnología |
|------|------------|
| Backend | [[NestJS]] + TypeScript |
| Web | [[React]] |
| Móvil | [[React Native]] |
| Datos | [[PostgreSQL]] (Azure SQL opcional) |
| Nube | [[Azure]] |

## Prohibido

- CMS / e-commerce listo: PrestaShop, WooCommerce, Magento, Shopify.
- Como **stack de este parcial**: FastAPI, Angular, Flutter, Spring Boot (este último es de *otros* trabajos).

## Por qué NestJS

El docente lo eligió por arquitectura modular tipo Spring Boot. FastAPI lo reservó para microservicios. [[stack-metodologia-parcial]]

## Versiones vistas en repo (22 sep)

Nest 11, Prisma 6.19, React 19, Vite 8, Expo 53 / RN 0.79, PG + Bicep (App Service, SWA, Flexible Server, App Insights). Confirmado en [[contexto-completo-proyecto]].

## Segundo parcial

El stack **se mantiene** (Nest, Postgres, React). El docente permite cambiarlo, pero no lo exige. Pide SQLite en el móvil para el offline. [[transcripcion-audio-segundo-parcial]]

## Cómo levantarlo (25 sep)

Backend `:3000`, frontend Vite `:5173`, móvil Expo web `:8081`. Detalle en [[codigo-24-sep-movil-web]].
