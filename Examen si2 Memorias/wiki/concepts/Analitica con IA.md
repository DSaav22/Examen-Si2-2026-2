---
tipo: concept
fuentes: 1
actualizado: 2026-11-08
tags: [ia, ml, dashboards, segundo-parcial]
---

# Analítica con IA

Segundo tipo de reporte del segundo parcial, distinto de los [[Reportes generativos]]: análisis de datos con aprendizaje automático. [[transcripcion-audio-segundo-parcial]]

## Qué pide

- Aplicar **modelos supervisados y no supervisados**. Ambos son obligatorios.
- **Entrenar** los modelos, no solo llamar a una API.
- Entrenar con **datos sintéticos** generados para que muestren exactamente los patrones buscados.
- Mostrar resultados en **dashboards**.

## Ideas que encajan con una tienda de ropa SaaS

| Tipo | Modelo | Pregunta de negocio |
|------|--------|---------------------|
| Supervisado (regresión) | Pronóstico de demanda por variante y semana | ¿Cuánto reponer de cada talla y color? |
| Supervisado (clasificación) | Abandono de clientas o de tiendas suscritas | ¿Quién va a dejar de comprar o de pagar el plan? |
| No supervisado (clustering) | K-means sobre recencia, frecuencia y monto (RFM) | ¿Qué grupos de clientas existen? |
| No supervisado (anomalías) | Isolation Forest sobre ventas o arqueos | ¿Qué ventas o cajas son raras? |

## Encaje en la arquitectura

En la clase del primer parcial el docente reservó Python para microservicios. [[transcripcion-audio-stack-metodologia-parcial]] Un servicio de analítica en Python (scikit-learn) es un primer módulo separable del monolito modular, coherente con lo que pide ahora. Los dashboards irían en [[React]].

## Estado en el código — 11 de noviembre

Existe un módulo independiente `backend/src/analitica/`: regresión lineal de demanda y k-means RFM, entrenados con ejemplos sintéticos reproducibles y con prueba separada. El tablero web `/analitica` consume `GET /analitica/panel`, restringido a administradores de tiendas con el módulo `analitica` incluido en su plan (Plan Cadena).

**Soporte dual de persistencia:** se resolvió el bloqueo `HTTP 503 (ANALITICA_REQUIERE_ESQUEMAS)`. El servicio ahora funciona de forma segura tanto en la configuración habitual de tablas compartidas con `tienda_id` en `public` (utilizando `PrismaService` y filtrado estricto por tienda) como en el modo multitienda por esquemas aislados (`TENANT_SCHEMAS_PERFILES=true` mediante `PrismaEsquemasService.clienteTienda`).

En las muestras sintéticas la regresión obtuvo MAE 1,23 frente a 6,21 de la media de entrenamiento; k-means obtuvo silueta 0,55. Son métricas de simulación, **no validación sobre resultados reales**. Se probaron por HTTP tanto en tablas compartidas (Vesta) como en esquemas aislados de laboratorio (script `verificar-analitica-http.ts` en `ensayar_copia`) el cálculo, aislamiento entre tiendas, manejo de devoluciones, estados vacíos sin ventas y restricciones de roles (401 sin sesión, 403 CAJERO) y de plan (403 para planes sin módulo como Inicial o Crecimiento).

## Relacionado

[[Reportes generativos]] · [[Mapa del segundo parcial]]
