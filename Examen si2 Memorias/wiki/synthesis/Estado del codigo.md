---
tipo: synthesis
fuentes: 1
actualizado: 2026-09-22
tags: [codigo, demo, informe]
---

# Estado del código (22 sep)

Compilado desde [[contexto-completo-proyecto]]. Para la presentación y la Parte 2/3: **decir lo que el repo hace**, no el MVP aspiracional de páginas viejas.

## Frase segura para el examen

> Plataforma omnicanal académica: catálogo, ventas POS, inventario por sucursal, clientes y admin; React + Expo + NestJS + Prisma + PostgreSQL. Pagos simulados; offline parcial; móvil prototipo; Azure preparado, no confirmado en prod; chatbot/probador no como módulos cerrados.

## Avanzado / demoable

Auth, roles, catálogo+ficha, favoritos, carrito→`POST /ventas`, POS+caja+cupones, stock con TX/`FOR UPDATE`, reservas, proveedores, admin/auditoría, `GET /reportes/dia` + inventario, cola IndexedDB del POS, IaC Bicep.

## Parcial

Cupones (revisar `usoMaximo`), promociones, pedidos (entidad sin líneas), sync multi-dispositivo, restricciones sucursal, móvil, Azure deploy, E2E.

## No implementar / no vender

Pagos bancarios reales, envíos, transferencias, almacén central, RRHH completo, LLM/chatbot, VTO 3D, PWA completa, CI/CD.

## Tensión con el alcance documental

[[MVP y alcance]] y [[Huecos locales vs examen]] (19 sep) marcaron RF13/RF25/probador/IA como OK. Esta fuente los marca **experimentales o sin IA real**. Canon de *qué entregar*: [[Decisiones del parcial]] + docente. Canon de *qué hay hoy*: esta página. Ver [[Contradicciones entre fuentes]].
