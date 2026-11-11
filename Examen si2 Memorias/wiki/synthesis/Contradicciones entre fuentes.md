---
tipo: synthesis
fuentes: 4
actualizado: 2026-09-22
tags: [lint, conflictos]
---

# Contradicciones entre fuentes

Regla: **canónico** = docente propio + [[correccion-alcance-parcial]]. Audio fija problema; clase de stack fija tecnología y PUDS; **fecha = 23 sep**. Sprints no existen en este alcance. Garzón no pisa eso. El **estado del repo** lo fija [[contexto-completo-proyecto]] → [[Estado del codigo]] (no inventar módulos cerrados en la demo).

| Tema | Audio | Garzón PDF | Clase stack | Canon |
|------|-------|------------|-------------|-------|
| Backend | (luego) | FastAPI | NestJS | **NestJS** |
| Web | (admin web) | Angular | React | **React** |
| Móvil | Flutter | Flutter | React Native | **React Native** |
| Offline | PWA | no detalla | no menciona | **Capacidad offline**, no obliga PWA |
| Fechas | 23 sep | 05/13/20 y defensa 22 sep | sprints 3 sem / 18 sep | **23 sep**; sprints anulados |
| Dominio | Solo mujer + accesorios | Ropa general, FashionStore | — | **Mujer** |
| Reserva en tienda | No es el centro | Flujo núcleo | — | En MVP (19 sep); código tiene módulo |
| Mayorista | Sí | No | — | Fuera |
| IA cliente | Preguntas de prenda | Recomendador + chat | — | Ficha determinística (`/ia/ficha`); **no LLM** |
| Caja | Apertura, turnos, arqueo | Venta presencial más simple | — | Modelo del audio; código OK |
| Nombre UI | — | FashionStore | — | Producto **EnsayAR**; “Vesta” = marca visual Andrés |
| Probador | Innovación obligatoria | RF13 | — | Alcance: 2D+pose. **Código: experimental** — no vender como cerrado |
| Reportes generativos | Voz → SQL IA | Servicio IA | — | Endpoint + reglas/SQL acotado; **sin IA generativa** |
| Actores MVP | Clienta/cajero/admin | +encargado/proveedor | — | Decisiones 19 sep: +encargado/proveedor (código los tiene) |

El propio audio dice que stack y documentos “se definen el lunes”. La clase de [[stack-metodologia-parcial]] es esa definición.

## Cambios del segundo parcial

[[transcripcion-audio-segundo-parcial]] es canon para el segundo parcial. No contradice al primero: lo amplía. Donde cambia una decisión:

| Tema | Primer parcial | Segundo parcial |
|------|----------------|-----------------|
| Metodología | [[Proceso Unificado]] | **[[ICONIX]]** |
| Negocio | Una tienda | **Muchas tiendas (SaaS)** |
| Offline | Capacidad en el POS; PWA no obligatoria | **Web PWA + móvil SQLite**, obligatorio |
| Reportes generativos | SQL acotado a una vista | Pedidos complejos, voz, PDF y Excel |
| Analítica ML | No existía | Supervisados + no supervisados, datos sintéticos |
| Pagos | QR simulado simple | **Simulación formal por país con reserva de stock e idempotencia** (aclaración confirmada: el docente acepta pagos simulados y no exige pasarela externa viva) |
| Fecha | 23 sep | **11 nov, PDF hasta las 8:00** |
| Arquitectura | "No microservicios" | Igual: **monolito modular** listo para separarse |
