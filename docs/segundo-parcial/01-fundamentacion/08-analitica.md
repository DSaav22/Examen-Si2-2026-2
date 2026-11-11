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

El generador produce dos años de ventas semanales por variante para una tienda de demostración. La demanda de cada variante se construye como el producto de varios componentes. Un nivel base depende de la categoría (las blusas y los pantalones venden más que los abrigos). Un componente estacional sigue el calendario del hemisferio sur: los abrigos y las prendas de lana suben entre mayo y agosto, y las prendas livianas entre octubre y febrero. Un componente de eventos agrega picos en fechas comerciales, como el Día de la Madre y las fiestas de fin de año. Un componente de precio reduce la demanda cuando el precio sube y la aumenta en las semanas de promoción. La distribución de tallas sigue una curva centrada en M, y los colores tienen preferencias distintas por temporada. Sobre ese valor esperado se extrae la cantidad vendida de una distribución de Poisson, que reproduce el carácter entero y la variabilidad de las ventas reales de pocas unidades.

Para la segmentación, el generador crea clientas pertenecientes a cinco perfiles ocultos con comportamientos distintos (compradoras frecuentes de alto gasto, compradoras de temporada, compradoras de ofertas, clientas nuevas y clientas inactivas) y simula sus compras a lo largo de los dos años. Los perfiles no se guardan como variables del conjunto de entrenamiento; solo se usan después para comprobar si el modelo no supervisado los reencuentra.

### 8.3.3 Separación de los datos reales

Los datos sintéticos se generan en una tienda de demostración propia y cada registro lleva una marca de origen. Por el aislamiento multi-tenant descrito en el capítulo 4, esos datos no son visibles desde ninguna otra tienda, y la marca de origen impide que se mezclen con ventas reales si una tienda decide combinar ambos para entrenar. Los tableros indican explícitamente cuando un resultado proviene de un modelo entrenado con datos sintéticos.

## 8.4 Modelo supervisado: pronóstico de demanda

### 8.4.1 Formulación

El problema se formula como una regresión: predecir las unidades que se venderán de cada variante en cada una de las próximas cuatro semanas. Las variables de entrada son la categoría, la talla y el color de la variante; la semana del año y el mes, que capturan la estacionalidad; un indicador de fecha comercial; el precio relativo respecto del precio de lista; y las ventas rezagadas de la misma variante en las semanas 1, 2, 4 y 52 anteriores, junto con su media móvil de cuatro semanas.

### 8.4.2 Algoritmo

Se compara una línea base ingenua estacional, que predice para cada semana lo vendido en la misma semana del año anterior, con un bosque aleatorio de regresión (Breiman, 2001). El bosque aleatorio combina muchos árboles de decisión entrenados sobre muestras distintas de los datos y promedia sus predicciones. Se elige por tres razones: captura relaciones no lineales e interacciones (por ejemplo, que el efecto de la temporada depende de la categoría) sin necesidad de especificarlas, es poco sensible a la escala de las variables y permite estimar la importancia de cada variable, lo que ayuda a explicar el pronóstico a la dueña de la tienda. La implementación de referencia es la biblioteca scikit-learn (Pedregosa et al., 2011).

### 8.4.3 Entrenamiento y evaluación

Los primeros 18 meses se usan para entrenar, los tres siguientes para ajustar los hiperparámetros (número de árboles y profundidad máxima) y los últimos tres para la prueba final. El modelo se acepta si su MAE sobre el conjunto de prueba es menor que el de la línea base estacional; en caso contrario, el tablero muestra la línea base, que siempre está disponible. Las métricas se guardan junto con cada versión del modelo en la entidad `ModeloPredictivo`, que registra la tienda, la fecha de entrenamiento, el algoritmo, los hiperparámetros y los errores obtenidos.

### 8.4.4 Uso del resultado

El pronóstico se transforma en una sugerencia de reposición. Para cada variante y sucursal se compara la demanda prevista para las próximas cuatro semanas con el stock disponible y lo ya reservado; si el disponible no alcanza, el tablero sugiere la cantidad a reponer. La sugerencia no se ejecuta automáticamente: la decisión de compra sigue siendo del encargado.

## 8.5 Modelo no supervisado: segmentación de clientas

### 8.5.1 Variables RFM

La segmentación se basa en el análisis RFM, una técnica clásica del marketing de bases de datos que describe a cada cliente con tres variables: recencia (días desde la última compra), frecuencia (número de compras en el período) y monto (gasto total) (Fader et al., 2005). Se agregan dos variables propias de una tienda de moda: la proporción de compras realizadas en promoción y la proporción de compras en línea frente a compras en tienda física. Como las variables tienen escalas muy distintas, se estandarizan antes del agrupamiento, y el monto se transforma con un logaritmo para reducir el peso de las pocas clientas de gasto muy alto.

### 8.5.2 Algoritmo

Se utiliza el algoritmo k-medias (Lloyd, 1982), que divide las observaciones en k grupos de forma que cada una pertenezca al grupo con el centro más cercano. Parte de k centros iniciales, asigna cada clienta al centro más próximo, recalcula cada centro como el promedio de sus clientas y repite hasta que las asignaciones dejan de cambiar. Es eficiente, fácil de explicar y sus centros pueden leerse directamente como el perfil promedio de cada segmento.

### 8.5.3 Elección del número de grupos

El número de grupos no se fija de antemano. Se entrena el modelo para k entre 2 y 8 y se elige el valor con mayor coeficiente de silueta (Rousseeuw, 1987), siempre que ningún grupo resulte demasiado pequeño para ser útil comercialmente. Con los datos sintéticos, el valor esperado es k = 5, porque los datos se generaron a partir de cinco perfiles; que el procedimiento llegue a ese valor y que los grupos coincidan mayoritariamente con los perfiles originales es la prueba de que el modelo funciona.

### 8.5.4 Interpretación

Cada grupo se describe por su centro expresado en las unidades originales (por ejemplo, "compra cada 20 días, gasta en promedio 450 Bs, 10 % en promoción") y recibe un nombre comercial asignado a partir de esos rasgos. El resultado se guarda en la entidad `SegmentoCliente`, con el tamaño del grupo, sus rasgos y la fecha del cálculo. Algunas acciones posibles son una campaña de reactivación para las clientas inactivas, un aviso anticipado de nueva colección para las compradoras frecuentes y alertas de oferta para quienes compran casi siempre en promoción.

## 8.6 Tableros

El tablero de analítica se dirige al administrador de la tienda y se organiza en dos vistas, que corresponden a los casos de uso UC52 y UC53. La vista de demanda muestra, para la categoría o variante elegida, la serie de ventas de las últimas semanas junto con el pronóstico de las cuatro siguientes y su intervalo de error, una tabla de sugerencias de reposición ordenada por urgencia y las métricas del modelo comparadas con la línea base. La vista de segmentos muestra el tamaño de cada grupo, un gráfico de dispersión de recencia frente a monto coloreado por segmento y una ficha por segmento con sus rasgos y la acción sugerida.

El diseño sigue el principio de que un tablero debe permitir comprender la situación de un vistazo, con pocos indicadores bien elegidos y sin decoración superflua (Few, 2006). Por eso cada vista abre con una sola cifra principal (unidades a reponer esta semana, clientas en riesgo de abandono) y deja el detalle para debajo. Como el resto de la aplicación, las consultas del tablero se filtran por tienda mediante el contexto multi-tenant, de modo que una tienda nunca ve los modelos ni los segmentos de otra.

## 8.7 Arquitectura del módulo

El entrenamiento de modelos tiene requisitos distintos a los del resto del sistema: usa bibliotecas del ecosistema de Python, consume mucho procesador durante minutos y no necesita responder en tiempo real. Por eso el módulo de analítica es el primer candidato a separarse del monolito modular como un servicio independiente, tal como anticipa la sección 6.10. El diseño contempla un servicio de entrenamiento en Python con scikit-learn que lee las ventas de una tienda, entrena ambos modelos y escribe los resultados en las tablas `ModeloPredictivo` y `SegmentoCliente`. El backend NestJS expone los endpoints `GET /analitica/prediccion` y `GET /analitica/segmentos`, que solo leen esos resultados ya calculados, de modo que el tablero responde en milisegundos aunque el entrenamiento haya tardado minutos. Si una tienda no tiene modelo entrenado, el tablero ofrece entrenarlo con los datos disponibles; si los datos son insuficientes para una segmentación confiable, lo advierte (cursos alternos de UC52 y UC53).

## 8.8 Estado de implementación

El módulo de analítica está especificado en el modelo ICONIX con sus casos de uso, diagramas de robustez y de secuencia, y con las entidades `ModeloPredictivo`, `SegmentoCliente` y `EventoAnalitica` del modelo de dominio. El generador de datos sintéticos, el servicio de entrenamiento y los tableros descritos en este capítulo no forman parte todavía de la versión desplegada del sistema y constituyen el siguiente incremento del proyecto.
