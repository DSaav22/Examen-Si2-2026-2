---
tipo: source
fuentes: 1
actualizado: 2026-11-09
tags: [segundo-parcial, decisiones, arquitectura]
---

# Decisiones de arquitectura del 9 de noviembre

Fuente: decisiones expresadas por Andrés en la conversación sobre EnsayAR.

1. Para el SaaS multitienda se eligió **una base de datos PostgreSQL compartida con un esquema por tienda**. Su implementación queda pendiente para después; no se autorizó aplicarla ahora.
2. La aplicación web utilizará **PWA**.
3. La aplicación móvil utilizará **SQLite** para almacenamiento local.
4. Se aplicarán **idempotencia y rollback** para el tratamiento de operaciones y fallos.

Estas son decisiones de dirección, no prueba de que estén completas. El `main` integrado ya contiene una estrategia distinta para multitenancy: tablas compartidas con `tiendaId`. El paso a esquemas necesita diseño y evaluación de migración; no se han cambiado datos ni ejecutado migraciones por esta decisión.

Contexto previo también expresado por Andrés: se mantendrán pagos simulados, la voz deberá funcionar en móvil y se utilizará un monolito modular preparado para evolucionar en el futuro, sin implementar microservicios por ahora. Véanse [[Pendientes segundo parcial]] y [[SaaS multi-tenant]].
