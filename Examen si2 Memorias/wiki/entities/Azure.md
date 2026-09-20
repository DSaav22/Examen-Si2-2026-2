---
tipo: entity
fuentes: 2
actualizado: 2026-09-19
tags: [cloud]
---

# Azure

Nube obligatoria del docente propio. Garzón pide “en la nube, no localhost”. Vendor: Azure. [[stack-metodologia-parcial]]

IaC listo: `azure.yaml` + `infra/*.bicep` (App Service F1, SWA Free, PostgreSQL Flexible B1ms). Plan: `.azure/deployment-plan.md`.

19 sep (tarde): hay `az login` activo (suscripción por defecto). Dominio RF01–25 ya está en local. **Provisionar** (`azd up`) queda como paso de costo: requiere validar el plan (`azure-validate`) y confirmar SKU/región. Hasta entonces la app corre en localhost con el mismo contrato API.
