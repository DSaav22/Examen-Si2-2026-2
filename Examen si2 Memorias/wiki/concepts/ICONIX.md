---
tipo: concept
fuentes: 1
actualizado: 2026-11-09
tags: [metodologia, iconix, uml, segundo-parcial]
---

# ICONIX

Metodología **obligatoria del segundo parcial**. Reemplaza al [[Proceso Unificado]] del primero. El docente dijo: "buscan, investigan y aplican las características de ICONIX". [[transcripcion-audio-segundo-parcial]]

Autores: Doug Rosenberg (ICONIX Software Engineering) y Matt Stephens. Libros de referencia:

- *Use Case Driven Object Modeling with UML: Theory and Practice* (Apress, 2007).
- *Agile Development with ICONIX Process* (Apress, 2005).
- Sitio oficial: [ICONIX Process](https://iconixprocess.wordpress.com/iconix-process/).

## Qué es

Un proceso **dirigido por casos de uso**, **mínimo** y **trazable**. Usa solo un subconjunto de UML y busca evitar la "parálisis por análisis". Se ubica entre el Proceso Unificado (pesado) y XP (casi sin diseño).

Rasgo distintivo: el **análisis de robustez**, que cierra el hueco entre el texto del caso de uso y el diseño detallado.

## Las 4 etapas y sus hitos

| Etapa | Qué se hace | Hito al cerrar |
|-------|-------------|----------------|
| 1. Requisitos | Requisitos funcionales, **modelo de dominio**, **prototipos de GUI**, primer borrador de **casos de uso** | Revisión de requisitos |
| 2. Análisis y diseño preliminar | **Diagrama de robustez** por caso de uso, actualizar el dominio, nombrar los controladores, reescribir el caso de uso | Revisión de diseño preliminar (PDR) |
| 3. Diseño detallado | **Diagrama de secuencia** por caso de uso (reparte el comportamiento en clases), modelo estático (**diagrama de clases**) | Revisión crítica de diseño (CDR) |
| 4. Implementación | Código, pruebas unitarias, pruebas de integración basadas en los casos de uso, revisión de código y del modelo | Entrega |

Se itera por **lotes pequeños de casos de uso**: un lote recorre las cuatro etapas hasta el código, y luego sigue el siguiente.

## Los diagramas que usa

1. Modelo de dominio (clases sin operaciones).
2. Casos de uso (diagrama + texto con curso básico y alternos).
3. Diagrama de robustez (no es UML estándar; usa estereotipos de Jacobson).
4. Diagrama de secuencia.
5. Diagrama de clases de diseño.

## Reglas del diagrama de robustez

Tres tipos de objeto:

- **Frontera** (boundary): pantallas o interfaces.
- **Control** (controller): lógica, verbos del caso de uso.
- **Entidad** (entity): objetos del dominio.

Conexiones permitidas:

- Actor ↔ frontera.
- Frontera ↔ control.
- Control ↔ entidad.
- Control ↔ control.

Prohibido: actor ↔ control o entidad, frontera ↔ entidad, frontera ↔ frontera, entidad ↔ entidad.

## Trazabilidad

Cada paso del curso básico y de los alternos del caso de uso debe aparecer en el diagrama de robustez y luego en el de secuencia. Los controladores del diagrama de robustez se convierten en métodos o servicios en el diseño.

## Cómo se aplicó en EnsayAR (9 nov)

- **Alcance.** Los 54 casos de uso tienen robustez y secuencia completas: UC01 a UC35 del primer parcial y UC36 a UC54 del incremento. Se organizaron en lotes: 0 (primer parcial), 1 SaaS, 2 offline, 3 reportes, 4 analítica y 5 pagos.
- **Fuente única.** El archivo `docs/segundo-parcial/iconix/casos.py` contiene actores, requisitos, entidades y casos de uso, cada uno con su curso básico, alternos, controles, ruta, clases, método, requisitos y prueba.
- **Modelo EA.** `generar_ea.py` reconstruye por COM el paquete "ICONIX segundo parcial" dentro de `diagramas/EnsayAR-ICONIX.eapx`: 156 diagramas, exportados a `imagenes/ea`. Requiere `JET4=1` en el registro de EA.
- **Capítulos.** `generar_md.py` escribe los capítulos 9.1 a 9.4: requisitos, robustez con hallazgos y PDR, secuencias con clases de diseño y CDR, e implementación con la matriz de trazabilidad.
- **Correspondencia con el código.** Los controllers de NestJS hacen de fronteras del lado del servidor, y los controles de ICONIX son métodos de los services. Los casos que no pasan por la API (UC35, UC42, UC43) usan clases del cliente: `Red`, `ColaOffline` y `CacheLocal`.

## Críticas conocidas

Dice poco de arquitectura y de pruebas fuera de los casos de uso. En este proyecto eso se cubre con el capítulo de arquitectura (monolito modular, multi-tenant, sincronización) dentro del diseño detallado.

## Relacionado

[[ICONIX vs Proceso Unificado]] · [[Casos de uso]] · [[Modelo de dominio]] · [[Mapa del segundo parcial]]
