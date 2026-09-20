# Parte 1 — Fundamentación teórica

**Sistema:** EnsayAR  
**Curso:** Sistemas de Información 2, 2026-2  
**Fecha:** 19 de septiembre de 2026  

Esta parte explica *por qué* el problema y el stack existen. No sustituye el código ni el PUDS (`02-puds/`). Fuentes: wiki `Examen si2 Memorias/` (audio de clase, stack canónico, PDF Garzón como lectura complementaria).

---

## 1. E-commerce y omnicanalidad

Un e-commerce clásico (Amazon, Mercado Libre, un Shopify) resuelve catálogo, carrito, pago y envío. En **moda femenina** eso no basta: la clienta en tienda se prueba veinte veces; en digital compra a ciegas, el color miente y la talla falla. El docente del audio lo marca como el motivo por el que un e-commerce de ropa “no despacha” sin probador.

**Omnicanal** no es “una web y una caja sueltas”. Es **un inventario** (producto × talla × color × almacén) y **dos canales** (línea y POS) que descuentan el mismo stock. Si la web vende la última M negra y el cajero cobra la misma unidad, el sistema tiene que fallar de forma explícita (`409 STOCK_INSUFICIENTE`), no dejar el stock en negativo.

Estudiar Amazon/Alibaba/Shopify como *usuaria* sirve para ver búsqueda, ficha, checkout y devoluciones. Estudiar Magento/PrestaShop/WooCommerce como *desarrolladora* sirve para entender catálogo, impuestos y stock. **Usarlos como producto del parcial está prohibido**: hay que escribir el código propio.

---

## 2. Inventario matricial

Una polera no es un SKU plano. Es un **producto** (nombre, categoría, ocasión, precio base) con **variantes** (talla × color, foto, overlay) y **stock por almacén**. Sin esa matriz el POS y la web mienten. El modelo físico de EnsayAR (Prisma) sigue esa terna: `productos`, `variantes`, `stock_almacen`.

---

## 3. Realidad aumentada y el recorte 2D+pose

La RA industrial de ropa (cuerpo 3D + tela que cae) es un proyecto de semanas o meses (ARKit body, mallas). El parcial pide: cámara, sobre *ella*, no un maniquí. Eso se cumple con:

1. Video en el dispositivo (no se sube).
2. **Landmarks de pose** (hombros; cadera opcional) — MediaPipe Pose en web.
3. Overlay **2D** de la variante, escalado a la distancia entre hombros.
4. Fallback: dos toques (hombros) o recuadro fijo si no hay cámara/modelo.

No se simula física de tela. Se declara como riesgo aceptado (R1).

---

## 4. Inteligencia artificial en el mostrador y en gerencia

Hay **dos caras** distintas:

| Cara | Actor | Riesgo | Mitigación en EnsayAR |
|------|-------|--------|------------------------|
| Asistente de ficha | Clienta | Alucinar material | Responde solo campos de la prenda (precio, talla, color, ocasión, descripción). |
| Reportes generativos | Admin | SQL que escribe o lee de más | Compilador de pregunta + validador: un `SELECT`, vista `v_reporte_ventas`, `LIMIT 200`. |

No hace falta un LLM de pago para demostrar el *contrato*. Si más adelante hay clave OpenAI, el mismo validador sigue siendo el muro.

---

## 5. Pagos académicos

Libélula, Stripe y PayPal se estudian como mercado (QR, tarjeta, transferencia). En el parcial el medio es **efectivo / QR simulado / contra entrega**. Un entorno de prueba no cobra plata real (RNF09). El QR “aprobado” es un medio de la venta, no una pasarela bancaria.

---

## 6. Stack y por qué está

| Capa | Tecnología | Por qué (docente) |
|------|------------|-------------------|
| API | NestJS + TypeScript | Módulos tipo Spring Boot; FastAPI queda para microservicios. |
| Web | React | Admin, POS, reportes. |
| Móvil | React Native / Expo | Cámara de la clienta. No Flutter. |
| Datos | PostgreSQL | Relacional, transacciones, vistas. |
| Nube | Azure | App Service + Flexible Server + Static Web Apps. |

JWT + bcrypt cubren autenticación. Roles: CLIENTA, CAJERO, ADMIN.

---

## 7. Proceso Unificado

Jacobson, Booch y Rumbaugh: iterativo, dirigido por casos de uso, centrado en arquitectura. Fases Inicio → Elaboración → Construcción → Transición. En cada ciclo: requisitos, análisis, diseño, implementación, pruebas. La Parte 2 de este informe *es* ese proceso, no un diario de commits. UML (casos de uso, SSD, dominio) está en `02-puds/`.

---

## 8. Conclusión de la Parte 1

El problema es de negocio (escala presencial + compra a ciegas) y de consistencia (un stock, dos canales). Las innovaciones evaluables son el **probador 2D+pose** y el **reporte generativo acotado**. El resto (POS, catálogo, Azure) es el soporte que las hace creíbles.
