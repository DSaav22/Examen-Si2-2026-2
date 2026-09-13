---
tipo: synthesis
fuentes: 4
actualizado: 2026-09-12
tags: [factibilidad, puds, parcial]
---

# Factibilidad — documentación y producto (23 sep)

Investigación del agente (12 sep). Ventana: **11 días**. Alcance: solo el parcial. [[correccion-alcance-parcial]]

## ¿Alcanza la información para documentar?

**Sí para arrancar la Parte 2 (PUDS), fase Inicio.** El enunciado oral + stack + corrección de fecha bastan para Visión, problema, actores, alcance, riesgos y una lista de casos de uso. PUDS no pide tener todo el código para escribir Inicio; Inicio *produce* esos artefactos.

**Parte 1 (teoría):** hay *temario*, no texto. Se investiga al escribir (e-commerce, RA, NestJS, React, RN, PUDS, pasarelas). Garzón da una lista útil de lecturas; no obliga su stack. [[Documento del examen]]

**Parte 3 (adopción):** se puede bosquejar por rol (clienta, cajero, admin). El detalle (capturas, tutorial) espera a que exista UI.

**No bloquea** la falta de rúbrica ni de nombre de producto: se elige un nombre y se documenta. La rúbrica afinará, no inventa el problema.

## Checklist PUDS vs lo que hay

| Artefacto | ¿Hay insumo? | ¿Se puede escribir ya? |
|-----------|--------------|-------------------------|
| Visión / problema / objetivos | Audio + Garzón | Sí |
| Actores | Audio (clienta, empresa, cajero) + Garzón | Sí |
| Casos de uso (nombres + breve) | Audio esencial | Sí |
| Especificación complementaria (RNF) | Offline, responsive, Azure, sin CMS | Sí |
| Glosario | Variante, SKU, POS, RA… | Sí |
| Lista de riesgos | RA, pagos, offline, 11 días | Sí |
| Arquitectura candidata | [[Stack del parcial]] | Sí, alto nivel |
| CU expandidos + secuencia + clases | Tras fijar alcance | Elaboración, no ahora |
| Implementación / pruebas / despliegue | Código | Construcción / Transición |
| Manual de usuario | UI | Transición = Parte 3 |

## Factibilidad del producto (11 días)

### Verde — entra

- [[NestJS]] + [[React]] + [[PostgreSQL]] + JWT/roles + CRUD de catálogo con [[Inventario matricial]] (producto × talla × color × sucursal).
- [[Punto de venta]] mínimo: abrir caja, vender, cerrar. Arqueo simple.
- Checkout con **contra entrega + QR simulado** (entorno académico). Pasarela real (Libélula/Stripe) es extra, no el núcleo.
- Deploy [[Azure]]: App Service o Container Apps + Azure Database for PostgreSQL. Hecho habitual; no es el riesgo.
- [[Reportes generativos]]: voz/texto → LLM → **SQL solo SELECT** sobre un esquema permitido → tabla. Hay patrones NestJS + text-to-SQL. Factible en días, no en semanas, si se acota (ventas, sucursal, horario, cajero).
- [[Asistente IA]] de ficha: RAG corto sobre atributos de la prenda. Más fácil que el reporte.

### Amarillo — entra recortado

- [[Modo offline]] del POS: cola local (IndexedDB / SQLite) + sync. Un flujo “vender sin red y subir después” sí; PWA completa no hace falta. [[Modo offline]]
- Mayorista + minorista: una segunda lista de precios, no un ERP.
- [[Reservas de prendas]]: **fuera** del parcial salvo que sobre tiempo. Es de Garzón, no descalifica en el audio.

### Rojo — no entra como “RA de ropa de verdad”

Ensayarse ropa sobre el cuerpo con deformación de tela (body tracking + mesh) es trabajo de **6–10 semanas** en industria (ARKit body + assets 3D). Las libs de RN de “virtual try-on” que existen hoy cubren **lentes/cara**, no vestidos.

El docente pidió: cámara, en **ella**, no maniquí, sensación de calce. Eso **sí** se puede demostrar en 11 días con un **MVP honesto**:

1. Cámara en [[React Native]].
2. Pose del cuerpo (MediaPipe / landmarks).
3. Superponer la prenda 2D de la variante (color elegido) sobre torso/cadera.
4. Fallback: foto de cuerpo completo (idea de Lilian en el audio).

Eso cumple el *problema* (probar sin ir a la tienda) y se documenta en riesgos: no es simulación física de tela. Inventar un VTO 3D de verdad para el 23 es el riesgo que tumba el parcial.

## Veredicto

| Pieza | ¿Suficiente info? | ¿Factible al 23? |
|-------|-------------------|------------------|
| Parte 1 teórica | Temario sí | Sí |
| Parte 2 Inicio | **Sí** | Sí, esta semana |
| Parte 2 Elaboración+ | Tras decidir RA/pagos | Sí si el alcance es el recorte de arriba |
| Parte 3 adopción | Roles sí | Sí al final |
| Software esencial | Sí para recortar | Sí **solo** con RA 2D+pose y SQL acotado |

## Decisiones (cerradas el 12 sep)

Ver [[Decisiones del parcial]]. Nombre [[EnsayAR]]; probador 2D+pose; pagos simulados; reservas fuera. Inicio escrito: [[Fase Inicio]].
