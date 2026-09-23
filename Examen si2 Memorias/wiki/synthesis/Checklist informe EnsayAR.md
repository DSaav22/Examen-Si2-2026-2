---
tipo: synthesis
fuentes: 4
actualizado: 2026-09-23
tags: [informe, checklist, entrega]
---

# Checklist informe EnsayAR

Qué poner en el documento del parcial. Estructura canónica: [[Documento del examen]] (3 partes). Profundidad modelo: [[ejemplo-informe-tatiana-autogo]]. Huecos respecto a ejemplos: [[Comparacion informes ejemplo]]. Realidad del software: [[Estado del codigo]].

## Parte 1 — Fundamentación teórica

- [ ] Portada (UAGRM, facultad, título **EnsayAR**, integrantes, materia, docente propio, gestión)
- [ ] Índice
- [ ] **Perfil:** introducción del problema moda/omnicanal
- [ ] Objetivo general + objetivos específicos
- [ ] Descripción del problema (clienta + cadena)
- [ ] Alcance por capa: web [[React]], móvil [[React Native]], API [[NestJS]], BD [[PostgreSQL]], [[Azure]]
- [ ] Características del sistema + stack (tabla)
- [ ] Situaciones de uso (2–3 escenarios: compra web, POS, reporte)
- [ ] Consideraciones / límites honestos ([[Estado del codigo]]: pagos simulados, probador prototipo, IA por reglas)
- [ ] Marco breve: e-commerce omnicanal, RA 2D, reportes bajo demanda, UP (no copiar FastAPI/Angular/Flutter de los ejemplos)
- [ ] Antecedentes útiles (Amazon/Shopify como *usuario*; Magento etc. solo estudio — [[examen1-garzon-fashionstore]])

## Parte 2 — Proceso Unificado (100%)

Organizar por **fases** (Inicio → Elaboración → Construcción → Transición). Dentro de cada fase, los flujos UP que Tatiana nombra:

### Inicio
- [ ] Visión, problema, actores, CU a alto nivel, riesgos, arquitectura candidata  
  (ya en `docs/parcial/02-puds/01-fase-inicio.md`)

### Elaboración
- [ ] CU críticos expandidos (UC03, UC07, UC10) + priorización del resto
- [ ] SSD / secuencias de los críticos
- [ ] Modelo de dominio + baseline arquitectónico  
  (`02-fase-elaboracion.md`)

### Construcción
- [ ] Qué se implementó por spike/módulo (ventas, caja, catálogo, reservas, reportes, offline)
- [ ] Decisiones de diseño de datos (Prisma/esquema; normalización razonable)
- [ ] Evidencia: capturas o referencias a rutas/API  
  (`03-fase-construccion.md` + [[Estado del codigo]])

### Transición
- [ ] Criterio de “listo para demo”, deploy Azure, riesgos residuales  
  (`04-fase-transicion.md`)

### Artefactos que Tatiana tiene y conviene reforzar
- [ ] Tabla de priorización de CU
- [ ] Diagramas: casos de uso, paquetes/módulos, secuencia de cobro POS, dominio
- [ ] Plan de pruebas + casos de prueba de los CU críticos (caja negra)
- [ ] Conclusión + bibliografía (puede ir al final del PDF)

### No exigir como Tatiana (otro stack / otro docente)
- Procedimientos almacenados masivos / triggers si el diseño es Prisma-app
- Ciclos #1–#3 con nombres de su proyecto
- FastAPI/Angular/Flutter

## Parte 3 — Adopción y capacitación

Los dos ejemplos **no la traen**; el docente propio **sí**. Ya hay borrador en `docs/parcial/03-adopcion/`.

- [ ] Manual / guía por rol: CLIENTA, CAJERO, ENCARGADO, ADMIN, PROVEEDOR
- [ ] Cómo arrancar entorno demo (seed, login `*@ensayar.bo`)
- [ ] Qué no hacer en demo (no vender LLM ni RA 3D)

## Cierre del PDF

- [ ] Conclusión (qué se logró vs alcance)
- [ ] Recomendaciones / trabajo futuro (probador, Azure prod, cupones)
- [ ] Bibliografía (Nest, React, UP/Booch, Prisma, Azure)
- [ ] Links: repo + URL Azure si hay

## Prioridad si el tiempo aprieta (23 sep)

1. Completar borradores en `docs/parcial/` (perfil, pruebas, cierre) y unificar a Word.  
2. Reforzar **perfil** (§1) y **pruebas** (§7).  
3. Parte 3 adopción por rol (ya en `03-adopcion/08-…`).  
4. Diagramas clave en Elaboración.  
5. Honestidad [[Estado del codigo]] en alcance.

Cuerpo del informe: `docs/parcial/README.md` · [[Indice del informe]].
