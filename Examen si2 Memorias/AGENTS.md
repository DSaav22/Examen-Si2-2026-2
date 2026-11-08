# LLM Wiki — Examen SI2 2026-2

Segundo cerebro al estilo Karpathy. Obsidian es el IDE; el agente es quien escribe y mantiene la wiki.

Este directorio es **solo la bóveda**. Convive en el mismo repo con código (`backend/`, `frontend/`, `movil/`, etc.). No mezclar: las fuentes y páginas wiki viven aquí; el código, fuera. El agente no aplica este esquema al programar.

## Roles

- **Humano:** elige fuentes, las deja en `raw/inbox/`, pregunta y revisa.
- **Agente:** compila, cruza, actualiza e indexa. Nunca edita `raw/`.
- **Humano casi nunca escribe en `wiki/`.** Si corrige un error, el agente incorpora el arreglo y deja rastro en `wiki/log.md`.

## Capas

| Capa | Ruta | Inmutable | Quién escribe |
|------|------|-----------|----------------|
| Fuentes | `raw/` | Sí | Humano |
| Wiki | `wiki/` | No | Agente |
| Esquema | este archivo | No | Ambos, con el tiempo |

## Árbol

```
raw/inbox/          ← soltar fuentes nuevas (pdf, md, txt, fotos)
raw/assets/         ← adjuntos locales (imágenes)
wiki/index.md       ← catálogo; leerlo primero en cada query
wiki/log.md         ← cronología append-only
wiki/sources/       ← una página por fuente ingerida
wiki/concepts/      ← ideas de SI2 (UML, requisitos, arquitectura…)
wiki/entities/      ← personas, libros, normas, herramientas
wiki/synthesis/     ← mapa del examen, tesis, huecos
wiki/queries/       ← respuestas que merecen persistir
```

## Convenciones de página

- Markdown + wikilinks `[[nombre]]`.
- YAML frontmatter:

```yaml
---
tipo: source | concept | entity | synthesis | query
fuentes: 0
actualizado: YYYY-MM-DD
tags: []
---
```

- Una idea principal por página. Si un concepto aparece en 2+ fuentes, tiene página propia.
- Toda afirmación importante cita su `[[source-…]]`.
- Si dos fuentes chocan, se documenta en ambas y en `wiki/synthesis/` si afecta al examen.
- Idioma: español.

## Operaciones

### ingest

Una fuente por vez, salvo que el humano pida lote.

1. Mover o copiar desde `raw/inbox/` a `raw/` con nombre estable (`YYYY-MM-DD-slug.ext`). No reescribir el contenido.
2. Leer la fuente. Resumir takeaways y pedir énfasis si hace falta.
3. Crear `wiki/sources/<slug>.md`.
4. Crear o actualizar conceptos, entidades y síntesis tocados.
5. Actualizar `wiki/index.md`.
6. Append en `wiki/log.md`:

```md
## [YYYY-MM-DD] ingest | Título de la fuente
```

Un ingest puede tocar 10–15 páginas. Eso es correcto.

### query

1. Leer `wiki/index.md`.
2. Abrir solo las páginas relevantes.
3. Responder con citas a páginas wiki (y a raw si hace falta).
4. Si la respuesta aporta síntesis nueva (comparación, mapa, predicción de examen), archivarla en `wiki/queries/` o `wiki/synthesis/`, actualizar índice y log:

```md
## [YYYY-MM-DD] query | Pregunta breve
```

### lint

Cuando lo pidan, o cada ~10 ingests. Buscar: contradicciones, claims viejos, huérfanos, conceptos sin página, enlaces rotos, huecos para el examen. Reportar y, si el humano acepta, aplicar. Log:

```md
## [YYYY-MM-DD] lint | hallazgo breve
```

## Arranque de sesión

1. Leer este esquema.
2. Leer `wiki/index.md` y las últimas entradas de `wiki/log.md`.
3. No re-derivar todo desde `raw/` si la wiki ya lo compiló, salvo contradicción o fuente nueva.

## Canon de este examen

Cuando las fuentes choquen: problema e innovaciones ← audio del docente propio; stack, PUDS y estructura del informe ← `wiki/sources/stack-metodologia-parcial.md`; fecha y alcance ← `wiki/sources/correccion-alcance-parcial.md` (**solo el parcial, presentación 23 de septiembre, sin sprints**). El PDF de Garzón es complemento (RF, actores, reservas), no manda tecnología ni calendario.

**Segundo parcial (desde 2026-11-08):** manda `wiki/sources/transcripcion-audio-segundo-parcial.md`. Es un incremento: lo del primer parcial sigue vigente salvo donde esta fuente lo cambia (metodología ICONIX en vez de PU; SaaS multi-tienda; offline web y móvil; PDF hasta el 11 nov a las 8:00). Hub: `wiki/synthesis/Mapa del segundo parcial.md`.

## Primera fuente recomendada

Programa, syllabus o rúbrica del examen. Sin eso, el mapa de `wiki/synthesis/` nace ciego. El primer lote (audio + PDF Garzón + stack) ya está compilado en `wiki/synthesis/Mapa del examen.md`.
