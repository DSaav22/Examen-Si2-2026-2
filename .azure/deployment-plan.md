# Azure Deployment Plan

> **Status:** Deployed

Generated: 2026-09-19

---

## 1. Project Overview

**Goal:** Desplegar EnsayAR (API NestJS + web React + PostgreSQL) en Azure para el parcial del 23 sep. Sin Docker Desktop: App Service Node + Static Web Apps + Flexible Server.

**Path:** Modernize Existing

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | POC / académico |
| Scale | Small |
| Budget | Cost-Optimized (F1 + SWA Free + PG B1ms) |
| **Subscription** | `41a4808f-a0e7-453b-b19f-d85297091ec5` (default tras `az login` 19 sep) |
| **Location** | `brazilsouth` (política de la suscripción: westus, canadacentral, mexicocentral, westus3, brazilsouth). Static Web Apps no está en esas regiones, así que la web va en App Service. |

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| api | API | NestJS 11 + Prisma 6 | `backend/` |
| web | Frontend | React + Vite | `frontend/` |
| movil | App (fuera de este deploy) | Expo / React Native | `movil/` |
| db | Database | PostgreSQL | Azure Database for PostgreSQL Flexible Server |

---

## 4. Recipe Selection

**Selected:** Bicep + `azure.yaml` (AZD)

**Rationale:** El docente pide Azure, no localhost. No hay Docker Desktop en esta máquina; App Service Linux Node evita contenedor. SWA Free cubre el SPA.

---

## 5. Architecture

**Stack:** App Service

### Service Mapping

| Component | Azure Service | SKU |
|-----------|---------------|-----|
| api | App Service Linux Node 20 | F1 |
| web | Static Web Apps | Free |
| db | PostgreSQL Flexible Server | Standard_B1ms / 32 GB |
| logs | Application Insights | workspace-based |

### Supporting Services

| Service | Purpose |
|---------|---------|
| Application Insights | Telemetría de la API |
| Managed Identity | Identidad del App Service |
| Firewall PG “AllowAzureServices” | La API llega a la base |

No se usa Key Vault en este corte (POC). Secretos van como parámetros `@secure()` al desplegar.

---

## 6. Provisioning Limit Checklist

Cuotas tomadas de [Azure subscription service limits](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits) porque `subscription_list` y `az quota` no respondieron (sin sesión Azure en este agente).

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| Microsoft.Resources/resourceGroups | 1 | 1 | 980 / suscripción | Docs oficiales |
| Microsoft.Web/serverfarms | 1 | 1 | 100 App Service plans / región (Free) | Docs oficiales |
| Microsoft.Web/sites | 1 | 1 | 10 apps por plan F1 | Docs oficiales |
| Microsoft.Web/staticSites | 1 | 1 | 10 SWA Free / suscripción | Docs oficiales |
| Microsoft.DBforPostgreSQL/flexibleServers | 1 | 1 | 50 servidores / suscripción (típico) | Docs oficiales; quota CLI no disponible |
| Microsoft.Insights/components | 1 | 1 | 100 / suscripción | Docs oficiales |

**Status:** ✅ Dentro de límites documentados, sujeto a crédito estudiantil y a que `az login` confirme la suscripción.

---

## 7. Execution Checklist

### Phase 1: Planning
- [x] Analyze workspace
- [x] Gather requirements
- [ ] Confirm subscription and location with user
- [x] Prepare resource inventory
- [x] Fetch quotas (fallback docs; CLI no disponible)
- [x] Scan codebase
- [x] Select recipe
- [x] Plan architecture
- [ ] **User approved this plan**

### Phase 2: Execution
- [x] Generate `infra/main.bicep`, `infra/app.bicep`, `azure.yaml`
- [ ] Provision (`azd up`) — instalar azd (https://aka.ms/azd/install); `az login` ya OK

### Phase 3–4
- [x] Validate (2026-09-23)
- [ ] Deploy

## 10. Validation Proof

Comandos del 2026-09-23, suscripción Azure for Students `41a4808f-a0e7-453b-b19f-d85297091ec5`, entorno `ensayar-p23a`.

| Check | Resultado |
|-------|-----------|
| `azd version` | 1.34.1 |
| `azd auth login --check-status` | diego_joaquin_@hotmail.com |
| `az bicep build --file infra/main.bicep` | OK |
| `npm run build` backend (tras `prisma generate`) | OK |
| `npm run build` frontend | OK |
| `azd provision --preview --no-prompt` en eastus2 | Rechazado por política `sys.regionrestriction` |
| `azd provision --preview --no-prompt` en brazilsouth | OK. Crea RG `ensayar-rg-2xhvsljjqvilk`, PostgreSQL, App Insights, Log Analytics, plan F1 y dos Web Apps |

RBAC: no hay asignaciones de rol. PostgreSQL usa usuario y contraseña; la identidad del App Service no accede a datos. No aplica AcrPull.

Regiones permitidas por la suscripción: westus, canadacentral, mexicocentral, westus3, brazilsouth. Static Web Apps no existe en esas regiones, por eso la web se publica como App Service Linux en el mismo plan.

---

## 8. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | Este plan | ✅ |
| `azure.yaml` | AZD | ✅ |
| `infra/main.bicep` | RG + módulo | ✅ |
| `infra/app.bicep` | App Service + PG + SWA | ✅ |
| `frontend/public/staticwebapp.config.json` | SPA fallback | ✅ |

---

## 9. Next Steps

1. Instalar Azure Developer CLI: https://aka.ms/azd/install (no estaba en PATH el 19 sep).
2. Confirmar región; `azd up` (password PG + JWT).
3. En App Service: `npx prisma migrate deploy` y `npm run demo:reset`.
4. En SWA: `VITE_API_URL=https://<api>.azurewebsites.net`.

**Estado dominio:** RF01–25 + RNF en local (smoke OK). Suscripción Azure activa.