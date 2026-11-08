---
tipo: synthesis
fuentes: 2
actualizado: 2026-11-08
tags: [hub, examen, segundo-parcial, requisitos]
---

# Mapa del segundo parcial

Hub del segundo parcial. Fuente canónica: [[transcripcion-audio-segundo-parcial]]. El primer parcial sigue en [[Mapa del examen]] y **sigue valiendo**: es la base del incremento.

## Fechas

- **PDF publicado en la plataforma: 11 nov 2026, 8:00 como máximo.** Sin excusas.
- Examen y defensa: 11 nov.

## Requisitos extraídos

Códigos propios de la wiki (no del docente) para poder trazarlos.

### Base heredada

| Id | Requisito |
|----|-----------|
| B1 | Todo lo del primer parcial funciona y se presenta (catálogo, POS, probador, reportes por voz, bot, pagos…). |
| B2 | Web, API y móvil desplegados en nube (Azure o AWS). Sin despliegue no se revisa lo nuevo. |
| B3 | Arquitectura de **monolito modular**, lista para separarse en microservicios. |
| B4 | Stack se mantiene: [[NestJS]], [[PostgreSQL]], [[React]], [[React Native]]. |

### SaaS → [[SaaS multi-tenant]]

| Id | Requisito |
|----|-----------|
| S1 | Muchas tiendas en una sola aplicación (multi-tenant). |
| S2 | Página comercial pública con módulos, planes y precios. |
| S3 | Planes con duraciones (1, 3 y 12 meses) y niveles (por ejemplo, por número de usuarios). |
| S4 | Autoservicio: registro, suscripción y pago sin hablar con nadie. |
| S5 | Al suscribirse se crea automáticamente el espacio de la tienda. |
| S6 | Verificación de que el correo existe. |
| S7 | Un usuario con varias tiendas usa **un solo login** y cambia de tienda. |
| S8 | Estrategia de aislamiento de datos justificada (base por tienda o base compartida con identificador). |
| S9 | Reportes de suscripciones y proyecciones (para el dueño de la plataforma). |

### Offline → [[Modo offline]] · [[PWA]]

| Id | Requisito |
|----|-----------|
| O1 | Web como PWA: sigue trabajando sin internet (venta, cliente, producto). |
| O2 | Móvil con base local (SQLite sugerido) y la misma capacidad. |
| O3 | Sincronización completa y predecible al volver la red. |
| O4 | IDs generados sin choque entre dispositivos (UUID en el cliente). |
| O5 | Conflicto de stock: dos vendedores offline venden la última unidad. Resolver con actualización condicional en la base. **Se forzará en la defensa.** |
| O6 | Idempotencia: el doble o triple "guardar" con red inestable no duplica registros. |
| O7 | Transacciones con rollback, y saber explicar por qué con microservicios no es tan simple (sagas). |
| O8 | Decidir y justificar qué funciona offline y qué no (un pago en línea no). |
| O9 | Ventana offline configurable según el negocio (el docente sugiere hasta ~7 días). |
| O10 | Aprovechar la PWA más allá del offline: instalable y notificaciones push. |

### Reportes e IA → [[Reportes generativos]] · [[Analitica con IA]]

| Id | Requisito |
|----|-----------|
| R1 | Reporte desde lenguaje natural por texto **o voz**. |
| R2 | Pedidos complejos: muchos filtros, cálculos, agrupación, orden, varias tablas. |
| R3 | Salida en pantalla, PDF o Excel, según lo que pida el usuario. |
| A1 | Analítica con modelos **supervisados y no supervisados** (ambos obligatorios). |
| A2 | Entrenamiento con **datos sintéticos** generados a medida. |
| A3 | Resultados en **dashboards**. |

### Pagos → [[Pasarelas de pago]]

| Id | Requisito |
|----|-----------|
| P1 | Pagos que funcionen al menos en todos los países de habla hispana. |
| P2 | Estudio de costos: elegir lo que menos le cobre al cliente. |
| P3 | Simulación con una pasarela real (sandbox), no un botón inventado. |
| P4 | Explicar límites locales: QR común en Bolivia, PayPal fácil para pagar pero difícil para cobrar. |

### Documento y defensa

| Id | Requisito |
|----|-----------|
| D1 | Proceso de desarrollo con [[ICONIX]], no Proceso Unificado ni Scrum. |
| D2 | Capítulos nuevos: SaaS y variantes, inquilinos, pagos, offline/PWA/sincronización, IA para reportes dinámicos y analítica. |
| D3 | Se conservan los capítulos del primer parcial. |
| D4 | Dominio real de la teoría: preguntas orales sin mirar la app. |

## Dónde estamos

Contraste con el código actual: [[Brecha segundo parcial]]. Metodología: [[ICONIX vs Proceso Unificado]].
