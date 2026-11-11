# 8. Analítica con aprendizaje automático

## Implementación y alcance — 11 de noviembre de 2026

El módulo `backend/src/analitica/` implementa un tablero accesible desde `/analitica` y la API `GET /analitica/panel`. Requiere JWT, rol administrador o superadministrador, suscripción vigente con el módulo `analitica` y el modo experimental de perfiles por esquema. La consulta utiliza únicamente el esquema derivado de la tienda autenticada. Los datos de entrenamiento se generan en memoria con semillas fijas; no se insertan como ventas reales. Las tiendas y ventas sintéticas usadas en la prueba de integración quedan identificadas en `ensayar_copia`.

El modelo supervisado es una regresión lineal entrenada con 480 ejemplos sintéticos de unidades vendidas en 7 y 28 días y demanda de los 7 días siguientes. Los parámetros de normalización se calculan solo con entrenamiento. Se reservan 120 ejemplos para prueba; en esta generación reproducible el MAE es 1,23 unidades frente a 6,21 de una línea base que predice la media del entrenamiento. Son métricas sobre la distribución sintética generada, no una medición de precisión comercial.

El no supervisado usa k-means con tres centros, variables de recencia, frecuencia y monto, escalado aprendido con 135 ejemplos sintéticos y evaluación de silueta sobre 45 ejemplos separados. En esa muestra la silueta es 0,55. Los centros mostrados son sintéticos; las unidades de monto sintético no son una moneda de la tienda y las etiquetas numéricas no implican una clasificación comercial validada.

El tablero lee hasta 5.000 ventas cobradas de los últimos 90 días y, para demanda, considera las unidades netas de las líneas de los últimos 28 días; presenta solo variantes con historial y, como máximo, 20 predicciones. Agrupa los clientes que tengan ventas identificadas, sin exponer sus identidades. Excluye ventas en otros estados y no garantiza una visión completa de devoluciones. Si supera el límite, devuelve un error explícito en lugar de calcular sobre una muestra truncada. El stock mostrado es la suma disponible registrada en las sucursales, no una recomendación de reposición.

La prueba `backend/scripts/verificar-analitica-http.ts` creó tiendas, productos y ventas sintéticos en la base de laboratorio y verificó predicción, agregados, aislamiento por tienda, restricción por plan y autorización. Las pruebas unitarias verifican reproducibilidad y comparación con la línea base. Los resultados son exploratorios: falta validación temporal con datos reales, tratamiento de monedas, estacionalidad, devoluciones y capacidad de producción. No deben usarse por sí solos para decidir compras ni para evaluar personas.

> Capítulo a cargo del segundo integrante (punto 4 de la consigna). Contenido esperado:

## 8.1 Fundamentos

Aprendizaje supervisado y no supervisado, conjuntos de entrenamiento y prueba, sobreajuste, métricas de evaluación (MAE, RMSE, exactitud, silueta) y el papel de los datos sintéticos cuando la tienda todavía no tiene historia suficiente.

## 8.2 Datos sintéticos

Generación de ventas, clientas y productos con estacionalidad, tallas y colores verosímiles; cómo se asegura que los datos sintéticos no se mezclen con los reales de cada tienda.

## 8.3 Modelo supervisado

Predicción de demanda o de ventas por variante (`ModeloPredictivo` en el modelo de dominio): variables, algoritmo elegido, entrenamiento, validación y resultados.

## 8.4 Modelo no supervisado

Segmentación de clientas (`SegmentoCliente`): variables de recencia, frecuencia y monto, algoritmo de agrupamiento, número de grupos y lectura comercial de cada segmento.

## 8.5 Tableros

Indicadores y gráficos que ve la dueña de la tienda, y cómo se aíslan por tienda igual que el resto de la plataforma.
