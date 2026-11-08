---
tipo: synthesis
fuentes: 3
actualizado: 2026-11-08
tags: [metodologia, iconix, puds, contraste, segundo-parcial]
---

# ICONIX vs Proceso Unificado

El primer parcial se documentó con el [[Proceso Unificado]] ([[transcripcion-audio-stack-metodologia-parcial]]). El segundo exige [[ICONIX]] ([[transcripcion-audio-segundo-parcial]]).

## Parecidos

- Ambos son **dirigidos por casos de uso** y usan UML.
- Ambos son **iterativos e incrementales**.
- Ambos vienen de la misma raíz: Jacobson. El análisis de robustez de ICONIX usa los mismos estereotipos (frontera, control, entidad) que las clases de análisis del PU.

## Diferencias

| Aspecto | Proceso Unificado | ICONIX |
|---------|-------------------|--------|
| Tamaño | Marco amplio y pesado | Mínimo: 4–5 diagramas |
| Estructura | Fases (Inicio, Elaboración, Construcción, Transición) × disciplinas | 4 etapas secuenciales por lote de casos de uso |
| Hitos | Fin de cada fase (objetivos, arquitectura, capacidad operativa, entrega) | Revisión de requisitos, PDR, CDR, entrega |
| Centro | Casos de uso + **arquitectura** | Casos de uso + **trazabilidad** |
| Puente análisis → diseño | Modelo de análisis (opcional en la práctica) | **Diagrama de robustez obligatorio** por caso de uso |
| Prototipos de GUI | No obligatorios | Parte de los requisitos |
| Diseño detallado | Varios modelos | Un diagrama de secuencia por caso de uso + clases |
| Riesgo que combate | Riesgo técnico temprano (prototipo de arquitectura) | Ambigüedad del caso de uso y parálisis por análisis |
| Documentación | Muchos artefactos | Lo necesario para pasar de caso de uso a código |

## Qué se reutiliza del primer parcial

| Ya existe (PU) | Pasa a ICONIX como |
|----------------|---------------------|
| Casos de uso UC01–UC35 (`docs/parcial/02-puds/casos-de-uso-detalle.md`) | Etapa 1, con texto de curso básico y alternos |
| [[Modelo de dominio]] | Etapa 1, y se actualiza en las etapas 2 y 3 |
| Diagramas de secuencia (login, venta POS, offline) en `docs/enterprise-architect/` | Etapa 3 |
| Clases de análisis y diseño físico | Etapa 3, modelo estático |
| Pruebas (`07-pruebas.md`) | Etapa 4 |

## Qué falta crear

- **Diagramas de robustez** para cada caso de uso del lote, empezando por los nuevos (suscripción, crear tienda, cambiar de tienda, venta offline y sincronización, reporte por voz, dashboard de analítica). No existe ninguno en `docs/enterprise-architect/`.
- **Prototipos de GUI** (bocetos o capturas) enlazados a cada caso de uso.
- Las actas cortas de los tres hitos: revisión de requisitos, PDR y CDR.
- Reordenar el capítulo de proceso: dejar de organizarlo por fases del PU y organizarlo por las 4 etapas de ICONIX.

## Cómo explicarlo en la defensa

"El primer ciclo usamos el PU porque necesitábamos fijar la arquitectura. En este ciclo la arquitectura ya existe; usamos ICONIX para llevar cada caso de uso nuevo a código con trazabilidad: caso de uso, robustez, secuencia, clases y prueba."

## Relacionado

[[Mapa del segundo parcial]] · [[Documento del examen]] · [[Contradicciones entre fuentes]]
