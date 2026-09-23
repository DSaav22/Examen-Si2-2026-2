# Informe del Primer Parcial — EnsayAR

**Entrega:** 23 de septiembre de 2026  
**Metodología:** Proceso Unificado / PUD (Booch, Rumbaugh, Jacobson)  
**Estructura del Word:** la del informe de Tatiana — Parte I perfil, Parte II marco teórico (datos y módulos), Parte III flujos de trabajo (requisitos, análisis, diseño, implementación, pruebas). La capacitación por rol queda en 3.4.4. La metodología sigue siendo el Proceso Unificado.  

> **Dónde escribir:** este directorio (`docs/parcial/`).  
> **Wiki** (`Examen si2 Memorias/wiki/`): fuentes, decisiones y checklist — no el cuerpo del Word.  
> Ver `wiki/synthesis/Indice del informe.md`.

## Cómo usar (capítulos → Word)

1. Redactar/editar cada archivo `.md` de la tabla.
2. Al cerrar: copiar en orden al Word (o concatenar Markdown → PDF).
3. Portada e índice del Word = `00-portada.md` + esta tabla.

## Índice y archivos

| § | Capítulo | Archivo | Estado |
|---|----------|---------|--------|
| — | Portada | [`00-portada.md`](00-portada.md) | Plantilla (completar nombres) |
| — | Índice (mismo esquema que el informe de Tatiana) | [`00-indice.md`](00-indice.md) | Redactado |
| **Parte I** | **Fundamentación teórica** | | |
| 1 | Perfil (1.1–1.8) | [`01-fundamentacion/01-perfil.md`](01-fundamentacion/01-perfil.md) | Redactado |
| **Parte II** | **Marco teórico** | | |
| 2 | Marco, datos y anuncio de procesos | [`01-fundamentacion/02-marco-teorico.md`](01-fundamentacion/02-marco-teorico.md) | Redactado |
| 2.3 | Módulos | [`02-puds/modulos.md`](02-puds/modulos.md) | Redactado |
| **Parte III** | **Proceso de desarrollo** | | |
| 3.1 | Actores, ciclos y prioridades | [`02-puds/03-requisitos.md`](02-puds/03-requisitos.md) | Redactado |
| 3.1.3 | Fichas UC01–UC35 | [`02-puds/casos-de-uso-detalle.md`](02-puds/casos-de-uso-detalle.md) | Redactado |
| 3.2–3.3 | Análisis y diseño | [`02-puds/analisis-diseno.md`](02-puds/analisis-diseno.md) | Redactado |
| 3.4 | Implementación y capacitación | [`02-puds/03-fase-construccion.md`](02-puds/03-fase-construccion.md) | Redactado |
| 3.5 | Pruebas | [`02-puds/07-pruebas.md`](02-puds/07-pruebas.md) | Redactado |
| **Cierre** | | | |
| — | Conclusión | [`04-cierre/09-conclusion.md`](04-cierre/09-conclusion.md) | Redactado |
| — | Recomendación | [`04-cierre/10-recomendaciones.md`](04-cierre/10-recomendaciones.md) | Redactado |
| — | Bibliografía | [`04-cierre/11-bibliografia.md`](04-cierre/11-bibliografia.md) | Redactado |
| — | URL y QR | [`04-cierre/12-anexos.md`](04-cierre/12-anexos.md) | Redactado |

### Parte II — recordatorio PUD

Eje del ingeniero: **fases** (Inicio→Transición) × **disciplinas** (requisitos, análisis, diseño, implementación, pruebas).  
Los ciclos/iteraciones van *dentro* de las fases; no usar calendario Scrum del 18 sep.

### Memoria / decisiones

- Wiki: `Examen si2 Memorias/wiki/` — Decisiones, Estado del código, Checklist.
- Deploy: `.azure/deployment-plan.md`
