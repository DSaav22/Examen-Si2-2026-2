# 8. Analítica con aprendizaje automático

## 8.1 Introducción y alcance

Los reportes del capítulo 7 responden preguntas sobre lo que ya ocurrió: cuánto se vendió, en qué sucursal, con qué medio de pago. La analítica con aprendizaje automático responde dos preguntas de otra naturaleza. La primera es predictiva: cuánto se venderá de cada producto en las próximas semanas, para decidir la reposición. La segunda es descriptiva pero no evidente a simple vista: qué grupos de clientas con comportamientos parecidos existen, para dirigir a cada grupo una acción comercial distinta.

La consigna del segundo parcial exige aplicar un modelo supervisado y uno no supervisado, entrenarlos con datos sintéticos generados para el caso y presentar los resultados en tableros. Este capítulo expone los fundamentos de cada técnica, justifica los modelos elegidos para una tienda de moda y describe el diseño del módulo de analítica de EnsayAR, modelado en los casos de uso UC52 (ver tablero predictivo) y UC53 (ver segmentación de clientas).

## 8.2 Fundamentos del aprendizaje automático

### 8.2.1 Aprendizaje supervisado

En el aprendizaje supervisado se dispone de ejemplos formados por un conjunto de variables de entrada y el valor que se desea predecir, llamado etiqueta. El algoritmo ajusta una función que relaciona entradas y etiqueta de modo que el error sobre los ejemplos conocidos sea pequeño y, sobre todo, que el modelo generalice a casos nuevos (Hastie et al., 2009). Si la etiqueta es numérica, como las unidades vendidas, el problema es de regresión; si es una categoría, como "volverá a comprar" o "no volverá", es de clasificación.

### 8.2.2 Aprendizaje no supervisado

En el aprendizaje no supervisado los ejemplos no tienen etiqueta. El objetivo es descubrir estructura en los datos, por ejemplo agrupar observaciones similares (agrupamiento o clustering), reducir el número de variables conservando la información o detectar observaciones atípicas. Como no existe una respuesta correcta con la cual comparar, la evaluación se basa en medidas internas de calidad de los grupos y en la utilidad de la interpretación para el negocio.

### 8.2.3 Entrenamiento, validación y prueba

Un modelo que memoriza los ejemplos de entrenamiento obtiene un error muy bajo sobre ellos y uno alto sobre datos nuevos; este fenómeno se denomina sobreajuste. Para detectarlo, los datos se dividen en un conjunto de entrenamiento, con el que se ajusta el modelo; uno de validación, con el que se eligen sus hiperparámetros; y uno de prueba, que solo se usa al final para estimar el desempeño real. Cuando los datos son series de tiempo, la división debe respetar el orden cronológico: se entrena con el pasado y se evalúa con el futuro, porque mezclar semanas posteriores en el entrenamiento produce estimaciones optimistas (Hyndman y Athanasopoulos, 2021).

### 8.2.4 Métricas de evaluación

Para la regresión se emplean el error absoluto medio (MAE), que expresa el error promedio en las mismas unidades de la variable; la raíz del error cuadrático medio (RMSE), que penaliza más los errores grandes; y el error porcentual absoluto medio (MAPE), que facilita la comparación entre productos de distinto volumen, aunque se vuelve inestable cuando las ventas reales son cercanas a cero. Para el agrupamiento se utiliza el coeficiente de silueta, que compara la distancia media de cada punto a su propio grupo con la distancia al grupo vecino más cercano y toma valores entre −1 y 1; valores cercanos a 1 indican grupos compactos y bien separados (Rousseeuw, 1987).

## 8.3 Datos sintéticos

### 8.3.1 Justificación

Una tienda que se suscribe a EnsayAR no tiene historia en la plataforma, y las tiendas de demostración tienen pocas semanas de ventas. Entrenar un modelo de demanda requiere al menos uno o dos ciclos estacionales completos. Los datos sintéticos resuelven este problema: se generan con un proceso estadístico controlado que reproduce los patrones que el modelo debe aprender. Además, como los patrones se conocen de antemano, permiten verificar que el modelo los recupera, algo imposible con datos reales cuya estructura se desconoce (Jordon et al., 2022).

### 8.3.2 Proceso de generación

Los datos sintéticos se generan en memoria, dentro del propio backend, con un generador congruencial lineal de semilla fija (`backend/src/analitica/modelos.ts`). Cada ejecución produce exactamente los mismos ejemplos, de modo que las métricas informadas en este capítulo son reproducibles.

Para el modelo de demanda se generan 600 ejemplos. Cada ejemplo representa una variante con sus unidades vendidas en los últimos 7 días y en los últimos 28 días; la etiqueta es la demanda de los 7 días siguientes. La relación de fondo es lineal, con mayor peso para la venta reciente, y se le suma un ruido uniforme que imita la variabilidad de las ventas de pocas unidades. El valor se acota en cero, porque no existen ventas negativas.

Para la segmentación se generan 180 clientas repartidas en partes iguales entre tres perfiles ocultos, descritos con las variables de recencia, frecuencia y monto de la sección 8.5.

| Perfil oculto | Días desde la última compra | Número de compras | Monto acumulado |
|---|---|---|---|
| Frecuente de alto gasto | 3 a 20 | 6 a 13 | 700 a 1700 |
| Ocasional | 20 a 50 | 2 a 6 | 150 a 650 |
| Inactiva | 50 a 90 | 1 a 3 | 20 a 180 |

El monto se expresa en unidades sintéticas, no en la moneda de una tienda. El perfil no forma parte de las variables de entrada: solo sirve para comprobar después si el agrupamiento reencuentra la estructura conocida.

### 8.3.3 Separación de los datos reales

Los ejemplos sintéticos solo existen en memoria durante el entrenamiento; no se insertan en las tablas de ventas ni de clientas de ninguna tienda, por lo que no pueden mezclarse con la operación real. Los modelos ya entrenados se aplican a los datos reales de la tienda autenticada, siempre a través del contexto multi-tenant descrito en el capítulo 4, y el tablero muestra un aviso permanente que indica que los modelos se entrenaron y evaluaron con datos sintéticos. Para las pruebas de integración se crearon tiendas, productos y ventas sintéticos en la base de laboratorio, separada de la base de producción.

## 8.4 Modelo supervisado: pronóstico de demanda

### 8.4.1 Formulación

El problema se formula como una regresión: estimar las unidades que se venderán de cada variante en los próximos 7 días a partir de dos variables, las unidades vendidas en los últimos 7 días y en los últimos 28 días. Las ventas se toman netas de devoluciones. Se eligieron pocas variables porque son las únicas que cualquier tienda tiene desde sus primeras semanas en la plataforma; variables como la estacionalidad anual o el efecto de las fechas comerciales exigen al menos un año de historia.

### 8.4.2 Algoritmo

Se utiliza una regresión lineal ajustada por descenso de gradiente sobre variables estandarizadas. La media y la desviación estándar de cada variable se calculan solo con el conjunto de entrenamiento y se aplican después al de prueba, para que ninguna información de la prueba influya en el ajuste. El modelo parte de la media de la etiqueta y ajusta sus pesos durante 600 épocas con una tasa de aprendizaje de 0,05; las predicciones negativas se llevan a cero.

La regresión lineal se eligió por tres razones: es interpretable, porque cada peso indica cuánto aporta cada variable a la estimación; no requiere bibliotecas externas, lo que permite ejecutarla dentro del mismo backend NestJS; y su costo de entrenamiento y de predicción es despreciable. Como referencia se usa una línea base que predice siempre la media del entrenamiento. Un modelo solo aporta valor si mejora claramente esa referencia (Hastie et al., 2009).

### 8.4.3 Entrenamiento y evaluación

Los 600 ejemplos se dividen antes de estimar cualquier parámetro: los primeros 480 se usan para entrenar y los 120 restantes para la prueba. Los resultados sobre el conjunto de prueba son los siguientes.

| Modelo | MAE en prueba (unidades) |
|---|---|
| Línea base: media del entrenamiento | 6,21 |
| Regresión lineal | 1,23 |

La regresión reduce el error absoluto medio en un 80 % respecto de la línea base. Estas cifras miden el ajuste del modelo a la distribución sintética generada; no estiman la precisión con ventas reales, que deberá medirse con una validación cronológica cuando las tiendas acumulen historia suficiente (sección 8.2.3). Las pruebas unitarias de `modelos.spec.ts` verifican que el entrenamiento sea reproducible y que el modelo supere a la línea base.

### 8.4.4 Uso del resultado

El tablero aplica el modelo a las ventas cobradas de los últimos 28 días de la tienda y muestra hasta 20 variantes, ordenadas por demanda estimada, junto con sus ventas de 7 y 28 días y el stock disponible, calculado como la cantidad menos lo reservado y sumado en todas las sucursales. La comparación entre la demanda estimada y el disponible orienta la reposición, pero el sistema no genera compras automáticamente: la decisión sigue siendo del encargado.

## 8.5 Modelo no supervisado: segmentación de clientas

### 8.5.1 Variables RFM

La segmentación se basa en el análisis RFM, una técnica clásica del marketing de bases de datos que describe a cada cliente con tres variables: recencia, frecuencia y monto (Fader et al., 2005). En EnsayAR se calculan sobre las ventas cobradas de los últimos 90 días: días desde la última compra, número de compras y monto acumulado. Como el monto tiene una escala mucho mayor que las otras dos variables y dominaría el cálculo de distancias, las tres se estandarizan con la media y la desviación del conjunto de entrenamiento.

### 8.5.2 Algoritmo

Se utiliza el algoritmo k-medias (Lloyd, 1982), que divide las observaciones en k grupos de forma que cada una pertenezca al grupo con el centro más cercano. Parte de k centros iniciales, asigna cada clienta al centro más próximo, recalcula cada centro como el promedio de sus clientas y repite hasta que los centros dejan de moverse. La implementación toma como centros iniciales los tres primeros ejemplos y se detiene cuando el desplazamiento máximo de los centros es menor que 10⁻⁸ o tras 100 iteraciones. Es un algoritmo eficiente y fácil de explicar, y sus centros pueden leerse directamente como el perfil promedio de cada segmento.

### 8.5.3 Número de grupos y evaluación

Se fijó k = 3, el número de perfiles con que se generaron los datos. Las 180 clientas sintéticas se dividen en 135 para entrenar y 45 para evaluar, y sobre estas últimas se calcula el coeficiente de silueta medio, que resulta de 0,55. Según Rousseeuw (1987), un valor superior a 0,5 indica una estructura de grupos razonable, de modo que el algoritmo recupera los tres perfiles generados. Cuando existan datos reales, el número de grupos deberá elegirse comparando la silueta para valores de k entre 2 y 8, porque la cantidad de perfiles reales no se conoce de antemano.

### 8.5.4 Interpretación

El tablero clasifica en uno de los tres grupos a cada clienta con compras identificadas en los últimos 90 días y muestra, para cada grupo, la cantidad de clientas y su centro expresado en las tres variables. Los grupos se presentan numerados y nunca se exponen las identidades de las clientas. La lectura comercial es orientativa: el grupo de compras frecuentes y gasto alto es el destinatario natural de un aviso anticipado de nueva colección, el de compras ocasionales responde mejor a promociones y el de clientas inactivas a una campaña de reactivación.

## 8.6 Tablero

El tablero se encuentra en la página `/analitica` de la aplicación web y corresponde a los casos de uso UC52 y UC53. Solo pueden abrirlo el administrador y el superadministrador de una tienda cuyo plan vigente incluya el módulo de analítica. Presenta un resumen de los datos usados (ventas cobradas en los 90 días, clientas con compras y variantes con ventas en los últimos 28 días), la tabla de demanda estimada con el stock disponible, la tabla de segmentos y las métricas de evaluación de ambos modelos, junto con el aviso de que se entrenaron con datos sintéticos.

El diseño sigue el principio de que un tablero debe permitir comprender la situación de un vistazo, con pocos indicadores bien elegidos y sin decoración superflua (Few, 2006). Cuando la tienda no tiene ventas en el período, el tablero muestra un estado vacío explicativo. Si el período supera las 5000 ventas, el servicio responde con el error 422 `DEMASIADAS_VENTAS` en lugar de calcular sobre una muestra truncada que daría resultados engañosos.

## 8.7 Arquitectura del módulo

La analítica es un módulo más del monolito modular NestJS (`backend/src/analitica/`), compuesto por un controlador, un servicio y el archivo de modelos. El endpoint `GET /analitica/panel` está protegido por `JwtAuthGuard` y `RolesGuard`, que exigen una sesión válida con rol `ADMIN` o `SUPERADMIN`; además, el servicio verifica que la suscripción esté vigente y que el plan incluya el módulo, y en caso contrario responde 403 `MODULO_NO_INCLUIDO`. Ambos modelos se entrenan una sola vez al cargar el módulo, en milisegundos, y quedan en memoria; cada consulta solo aplica los modelos a los datos de la tienda.

La lectura de datos funciona en los dos modos de aislamiento descritos en el capítulo 4. En el modo habitual usa `PrismaService` sobre las tablas compartidas, filtrando por `tiendaId`; cuando se activa el modo de esquema por tienda, usa el cliente del esquema de la tienda autenticada que entrega `PrismaEsquemasService` (sección 4.12). La tienda se obtiene siempre del contexto de la petición, nunca de un parámetro del cliente.

En esta versión, las predicciones y los segmentos se calculan en cada consulta; las entidades `ModeloPredictivo` y `SegmentoCliente` del modelo de dominio quedan reservadas para persistir versiones de los modelos cuando se entrenen con datos reales. Si en el futuro se adoptan modelos más complejos, como un bosque aleatorio de regresión (Breiman, 2001) implementado con scikit-learn (Pedregosa et al., 2011), el entrenamiento será el primer candidato a separarse del monolito como un servicio independiente, tal como anticipa la sección 6.10.

## 8.8 Estado de implementación y verificación

El módulo está implementado en el backend y en la web. Las pruebas unitarias de `modelos.spec.ts` y `analitica.service.spec.ts` cubren la reproducibilidad del entrenamiento, la comparación con la línea base y el comportamiento del servicio. El script `backend/scripts/verificar-analitica-http.ts`, ejecutado sobre la base de laboratorio, comprobó por HTTP los siguientes casos:

- Una petición sin sesión recibe 401.
- Un rol no autorizado, como el cajero, recibe 403.
- Una tienda cuyo plan no incluye el módulo de analítica recibe 403.
- Una tienda con el plan Cadena recibe el tablero completo (200), tanto en tablas compartidas como en esquemas por tienda.
- La cabecera `X-Tienda` no permite consultar los datos de otra tienda.
- Una tienda sin ventas en el período recibe el estado vacío.

Los resultados son exploratorios. Falta la validación cronológica con ventas reales, el tratamiento de varias monedas, la estacionalidad anual y la medición de la capacidad con volúmenes de producción; por ello el tablero no debe usarse por sí solo para decidir compras ni para evaluar personas.
