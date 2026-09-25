---
tipo: source
fuentes: 1
actualizado: 2026-09-22
tags: [codigo, snapshot, ensayar, andres]
---

# Contexto completo del proyecto (código real)

Fuente cruda: `raw/2026-09-22-contexto-completo-proyecto.md`

Snapshot del **código inspeccionado al 22 sep 2026**. No es rúbrica del docente: es el estado real de `backend/`, `frontend/`, `movil/`, `infra/`. Sirve para el informe y la demo sin inflar módulos.

## Takeaways

- Producto: [[EnsayAR]]. UI editorial “Vesta” (rama Andrés, merge `fad2bb1`) es estética, no cambio de nombre canónico.
- Stack real = [[Stack del parcial]]: NestJS 11 + Prisma 6 + PG, React 19 + Vite, Expo 53 / RN, Bicep Azure. Sin microservicios.
- **Funcional avanzado:** auth JWT+revocación, catálogo, ficha, favoritos, carrito, POS+caja, inventario básico, reservas, proveedores, admin, auditoría, reportes día/inventario, cola offline parcial.
- **No presentar como terminado:** pagos reales, envíos, pedidos completos, transferencias, RRHH, chatbot LLM, [[Probador virtual]] robusto, PWA, CI/CD, Azure en producción.
- [[Reportes generativos]] y `IaModule`: reglas + SQL acotado / ficha determinística. **Sin OpenAI ni LLM.**
- Probador: prototipo cámara+overlay (`/probar`, Expo). Clasificar como experimental.
- Roles del modelo: CLIENTA, CAJERO, ENCARGADO, ADMIN, SUPERADMIN, PROVEEDOR. Bitácora solo SUPERADMIN.
- Seed académico: `*@ensayar.bo` / `diego`.

## Qué toca en la wiki

[[Estado del codigo]] · [[MVP y alcance]] · [[Huecos locales vs examen]] · [[Contradicciones entre fuentes]] · [[Fase Construccion]] · [[Actores]] · [[Arquitectura candidata]] · [[Probador virtual]] · [[Reportes generativos]] · [[Asistente IA]] · [[Modo offline]] · [[Punto de venta]] · [[EnsayAR]]
