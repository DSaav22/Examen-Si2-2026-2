---
tipo: synthesis
fuentes: 2
actualizado: 2026-09-23
tags: [informe, ejemplos, calidad]
---

# Comparación informes ejemplo

Fuentes: [[ejemplo-informe-tatiana-autogo]] (172 p.) vs [[ejemplo-informe-lozada-asistencia-mecanica]] (63 p.). Ambos son **otros proyectos / otros stacks**. Sirven de modelo de *profundidad documental*, no de tecnología ni de dominio moda.

Veredicto del dueño: **Tatiana convence más**; Lozada “está pero le falta”. Coincide con el análisis.

## Tabla rápida

| Dimensión | Tatiana (Garzón) | Lozada (Martínez) | Canon [[EnsayAR]] |
|-----------|------------------|-------------------|-------------------|
| Perfil (intro, OG/OE, problema, alcance) | Fuerte | Débil / implícito | **Obligatorio** en Parte 1 |
| Marco teórico + antecedentes | Parte II completa | Solo teoría de stack | Nutrir Parte 1 |
| PUDS por disciplinas UP | Req→Análisis→Diseño→Impl→**Pruebas** | Req→Análisis→Diseño→Impl (corta) | Sí, **dentro** de Inicio→Transición |
| Fases Inicio/Elaboración/… | No (usa ciclos #1–3) | No | **Sí** ([[stack-metodologia-parcial]]) |
| CU detallados | Sí + priorización + estructura | Sí (mucho texto CU) | Ya hay UC03/07/10; ampliar resto breve |
| Datos (normalización, físico, SQL) | Muy profundo | Básico | Mejorar si el PDF lo pide |
| Pruebas documentadas | Extensas por CU | Casi ausentes | Agregar plan + casos clave |
| Adopción / capacitación | **Ausente** | **Ausente** | **Parte 3 obligatoria** |
| Deploy / evidencia | URLs + QR | No | Azure + links |
| Conclusión / biblio | Sí | Solo biblio+anexo | Sí |

## Por qué Tatiana “pesa más”

1. Cuenta una historia: problema → objetivos → alcance → teoría → modelado → pruebas → cierre.
2. El proceso UP se ve **iterado** (ciclos) y con artefactos UML densos.
3. Las pruebas no son un párrafo: son casos ligados a CU.
4. Hay producto desplegado enlazado.

## Por qué Lozada “más o menos”

1. Buena fundamentación tecnológica y buenos CU.
2. Se corta en implementación y no cierra el ciclo (pruebas, adopción, evidencia).
3. Parece “parcial a medias” frente a un informe de defensa completa.

## Regla para [[EnsayAR]]

Tomar la **densidad de Tatiana** + la **estructura de 3 partes del docente propio** (teoría | PUDS por fases | adopción). Checklist operativo: [[Checklist informe EnsayAR]].
