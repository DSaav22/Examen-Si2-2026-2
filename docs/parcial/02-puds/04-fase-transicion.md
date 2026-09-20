# Parte 2 — Proceso Unificado: Fase de Transición (en curso)

**Sistema:** EnsayAR  
**Hito:** producto usable + adopción  
**Fecha:** 19 de septiembre de 2026  

La Transición no inventa requisitos. Pone el baseline en manos de usuarias y en Azure.

## Qué entra

- Manuales por rol: `docs/parcial/03-adopcion/`.
- IaC Bicep + `azure.yaml` (App Service F1, SWA Free, PostgreSQL Flexible). Plan: `.azure/deployment-plan.md`.
- Semilla académica: tres usuarios, una sucursal, una polera.

## Criterio de salida (23 sep)

1. Demo local de UC03, UC07 y UC10 en menos de 15 minutos.
2. Informe completo (Partes 1, 2 y 3).
3. Deploy Azure **si** hay `az login` y crédito; si no, el riesgo R4 queda documentado y el IaC listo para un `azd up` el mismo día de la defensa.
