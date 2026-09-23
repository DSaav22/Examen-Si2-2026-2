---
tipo: entity
fuentes: 2
actualizado: 2026-09-23
tags: [cloud]
---

# Azure

Nube obligatoria del docente propio. Garzón pide “en la nube, no localhost”. Vendor: Azure. [[stack-metodologia-parcial]]

IaC listo: `azure.yaml` + `infra/*.bicep` (App Service F1, SWA Free, PostgreSQL Flexible B1ms). Plan: `.azure/deployment-plan.md`.

23 sep: hay un entorno publicado en Brazil South (la suscripción de estudiante no deja East US 2). Web y API son App Service Linux F1; PostgreSQL Flexible B1ms. Recursos `ensayar-web-2xhvsljjqvilk` y `ensayar-api-2xhvsljjqvilk`, grupo `ensayar-rg-2xhvsljjqvilk`. OpenAI `ensayar-openai`, deployment `gpt-4.1-mini`.

Ese sitio es un corte anterior al código de la tarde del 23. Bot, probador 3D, mayorista, transferencia, despacho, devolución y el catálogo de 40 prendas están en local hasta el próximo deploy. [[Estado del codigo]]
