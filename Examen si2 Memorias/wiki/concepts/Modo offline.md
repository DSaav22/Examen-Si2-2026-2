---
tipo: concept
fuentes: 3
actualizado: 2026-09-22
tags: [offline, pos, nfr]
---

# Modo offline

Requisito del audio: si se cae internet, el [[Punto de venta]] **sigue vendiendo**. Luego sincroniza. El audio lo nombra como PWA + storage local. [[transcripcion-audio-clase-ecommerce]]

## Canon técnico

El stack no es PWA-obligatorio: web = [[React]], móvil = [[React Native]]. [[stack-metodologia-parcial]]

Hay que cumplir la **capacidad** (cola local + sync), no el sello “PWA”. En React Native eso es almacenamiento local; en React web puede ser service worker si hace falta.

Implementado en el POS web (`cola-pos.ts`): IndexedDB + fallback `localStorage`, UUID, estados pending/syncing/synced/failed/conflict/cancelled, reintentos. Stock al servidor (uuid idempotente). [[contexto-completo-proyecto]]

**Parcial:** conflictos multi-dispositivo, cifrado local, E2E offline. No es PWA completa. [[Estado del codigo]]

Garzón pide disponibilidad (RNF03) pero no detalla offline-first. [[examen1-garzon-fashionstore]]
