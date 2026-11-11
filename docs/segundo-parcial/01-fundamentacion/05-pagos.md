# 5. Pagos para países de habla hispana

## 5.1 Introducción y alcance

En el primer ciclo, EnsayAR operaba para una sola tienda boliviana y aceptaba pago contra entrega, efectivo en caja y un QR simulado. El segundo ciclo cambia el problema en dos sentidos. Primero, la plataforma pasa a ser un servicio que cobra suscripciones a tiendas de distintos países (capítulo 3). Segundo, cada una de esas tiendas necesita cobrar a sus propias clientas con los medios de pago habituales en su país. El sistema maneja por lo tanto dos flujos de cobro independientes: el de la plataforma hacia la tienda, por la suscripción, y el de la tienda hacia la clienta, por la venta.

La consigna del segundo parcial exige que los pagos funcionen al menos en todos los países de habla hispana, que la elección de la pasarela se base en un estudio de costos orientado a cobrar la menor comisión posible al cliente, que la simulación utilice una pasarela real en su entorno de pruebas y que se expliquen las restricciones locales, como el predominio del QR en Bolivia o la dificultad de recibir fondos con PayPal desde ese país. Este capítulo desarrolla esos cuatro puntos y describe cómo se reflejan en el diseño de EnsayAR.

## 5.2 Conceptos fundamentales

### 5.2.1 Participantes de un pago electrónico

Un pago con tarjeta involucra a varios participantes. El titular de la tarjeta compra; el comercio vende; el banco emisor otorgó la tarjeta al titular y autoriza o rechaza el cargo; el banco adquirente mantiene la cuenta del comercio y recibe los fondos; y la red o marca (Visa, Mastercard) enruta los mensajes entre emisor y adquirente. Entre el comercio y el adquirente suele intervenir un proveedor de servicios de pago, que ofrece la pasarela técnica (la interfaz con la que se integra el sistema) y, con frecuencia, actúa como agregador: el comercio no firma un contrato directo con un banco adquirente, sino que opera bajo la cuenta maestra del proveedor. Mercado Pago, Stripe y Libélula funcionan de esta manera para comercios pequeños.

### 5.2.2 Ciclo de vida de una transacción

El cobro con tarjeta atraviesa tres etapas. En la autorización, el emisor verifica fondos y riesgo y reserva el importe. En la captura, el comercio confirma que el cobro debe efectuarse; puede ser inmediata o diferida, por ejemplo hasta despachar el pedido. En la liquidación, los fondos llegan a la cuenta del comercio, descontadas las comisiones, en un plazo que va desde el mismo día hasta varias semanas. A estas etapas se suman dos eventos posteriores posibles: el reembolso, que inicia el comercio, y el contracargo, que inicia el titular ante su banco y que el comercio debe disputar con evidencias.

### 5.2.3 Otros medios de pago

Las transferencias inmediatas de cuenta a cuenta mueven el dinero en segundos y sin intervención de las marcas de tarjeta; Pix en Brasil, SPEI en México, PSE en Colombia y Bizum en España son ejemplos de este tipo (Banco Central do Brasil, s.f.; dLocal, s.f.). El pago por QR es una forma de iniciar ese tipo de transferencia: el comercio muestra un código con el importe y la referencia, y la clienta lo escanea desde la aplicación de su banco. Las billeteras digitales (Yape y Plin en Perú, Nequi en Colombia, Tigo Money en Bolivia y Paraguay) guardan saldo propio o cuentas asociadas. Por último, los pagos en efectivo con referencia permiten pagar en una red de agentes (OXXO en México, Pago Efectivo en Ecuador y Perú, Redpagos y Abitab en Uruguay) un cupón emitido por el comercio, que se confirma de forma asíncrona horas después.

La diferencia práctica para el diseño es el momento de la confirmación. Una tarjeta se autoriza en segundos y la respuesta es síncrona; una transferencia o un QR pueden tardar, y un pago en efectivo puede confirmarse al día siguiente o no confirmarse nunca. Por ello un sistema de cobro debe modelar estados intermedios (pendiente, aprobado, rechazado, vencido) y no puede suponer que mostrar un QR equivale a haber recibido el dinero.

## 5.3 Medios de pago en los países de habla hispana

La Tabla siguiente resume los medios de pago identificados para cada país hispanohablante a partir de la documentación de cobertura de dLocal (s.f.), un procesador especializado en mercados emergentes, complementada con fuentes oficiales de cada medio. La presencia de un medio en la documentación de un proveedor indica que existe y que puede integrarse, no su participación de mercado ni su disponibilidad para un comercio concreto.

| País | Moneda | Medios identificados además de tarjeta |
|---|---|---|
| Argentina | ARS | Mercado Pago, transferencia |
| Bolivia | BOB | QR interoperable, transferencia, Tigo Money |
| Chile | CLP | Webpay, Khipu, Mercado Pago, transferencia |
| Colombia | COP | PSE, Nequi, transferencia |
| Costa Rica | CRC | SINPE Móvil, transferencia |
| Cuba | CUP | Transfermóvil, EnZona |
| Ecuador | USD | Deuna, Pago Efectivo, transferencia |
| El Salvador | USD | PuntoXpress, Akipago, transferencia |
| España | EUR | Bizum, transferencia |
| Guatemala | GTQ | PayCash, SoyFri, transferencia |
| Honduras | HNL | Transferencia |
| México | MXN | SPEI, Mercado Pago, OXXO, transferencia |
| Nicaragua | NIO | PuntoXpress, transferencia |
| Panamá | USD | Yappy, Punto Pago, PayCash, transferencia |
| Paraguay | PYG | Tigo Money, transferencia |
| Perú | PEN | Yape, Plin, transferencia |
| Puerto Rico | USD | Transferencia |
| República Dominicana | DOP | Transferencia Banco Popular |
| Uruguay | UYU | Redpagos, Abitab, transferencia |
| Venezuela | VES | Pago Móvil, transferencia |

Brasil no es un país hispanohablante, pero se incluye en el catálogo del sistema por su peso regional y porque Pix es el caso de referencia de un sistema de pagos instantáneos operado por un banco central (Banco Central do Brasil, s.f.).

Dos observaciones se desprenden de la tabla. La primera es que la tarjeta es el único medio presente en casi todos los países, pero no siempre es el preferido: en Bolivia, Perú y Brasil el pago móvil por QR o billetera ocupa ese lugar en el comercio minorista. La segunda es que ningún proveedor cubre por sí solo todos los medios locales de todos los países, de modo que un sistema regional debe poder trabajar con más de una pasarela.

## 5.4 Modelos de integración con una pasarela

Existen tres formas de integrar una pasarela, que se diferencian por quién captura los datos de pago y, por lo tanto, por la carga de cumplimiento normativo que asume el comercio.

En el modelo de redirección, el sistema crea una orden de pago en la pasarela y envía a la clienta a una página alojada por ella (por ejemplo, Checkout Pro de Mercado Pago). La pasarela captura la tarjeta, cobra y devuelve a la clienta al comercio, mientras notifica el resultado al servidor por un webhook. El comercio nunca ve los datos de la tarjeta.

En el modelo embebido, la pasarela provee componentes que se cargan dentro de la página del comercio (campos alojados o un iframe) y devuelven un token que representa la tarjeta. El servidor del comercio cobra usando ese token. La experiencia es más integrada y los datos sensibles siguen sin pasar por el comercio.

En el modelo de API directa, el comercio recibe los datos de la tarjeta en su servidor y los envía a la pasarela. Ofrece control total, pero obliga a cumplir íntegramente la norma PCI DSS (PCI Security Standards Council, 2022), lo que no es razonable para una plataforma como EnsayAR.

Los dos primeros modelos son los adecuados. EnsayAR adopta la redirección para las ventas en línea de las tiendas y el modelo embebido para la suscripción, en ambos casos con confirmación del resultado por webhook.

## 5.5 Estudio de costos

### 5.5.1 Componentes del costo

El costo de aceptar un pago no se reduce a la comisión porcentual publicada. Intervienen también un cargo fijo por transacción, que pesa más en ventas de importe bajo; un recargo cuando la tarjeta es extranjera; una comisión por conversión de moneda cuando la tarjeta y la cuenta del comercio operan en divisas distintas; el impuesto al valor agregado sobre la comisión, que en México, Chile y Argentina se suma a la tarifa publicada; el plazo de acreditación, ya que varios proveedores cobran menos cuanto más tarda el comercio en recibir el dinero; y los costos de retiro a la cuenta bancaria local.

### 5.5.2 Tarifas publicadas

La siguiente tabla reúne las tarifas estándar publicadas por los proveedores con presencia en la región, consultadas en noviembre de 2026. Son tarifas de lista para comercios sin negociación; los volúmenes altos acceden a condiciones especiales.

| Proveedor | País del comercio | Tarifa estándar con tarjeta | Observaciones | Fuente |
|---|---|---|---|---|
| Stripe | España | 1,5 % + 0,25 € (tarjetas del EEE) | 3,15 % + 0,25 € con tarjetas internacionales; +2 % si hay conversión | Stripe (s.f.-e) |
| Stripe | México | 3,6 % + MXN 3 | +0,5 % con tarjeta internacional; +2 % si hay conversión; sin IVA | Stripe (s.f.-b) |
| Stripe | Brasil | 3,99 % + BRL 0,39 | +2 % con tarjeta internacional; Pix al 2 % | Stripe (s.f.-c) |
| Mercado Pago | México | 3,49 % + MXN 4 al instante | 2,95 % + MXN 4 con acreditación a 30 días | Mercado Pago (2026) |
| Mercado Pago | Chile | 3,19 % + IVA al instante | 2,89 % + IVA a 10 días | Mercado Pago (s.f.-b) |
| Mercado Pago | Argentina | Variable por provincia y plazo | El plazo más corto es el más caro | Mercado Pago (s.f.-a) |
| PayPal | Bolivia | 3,40 % + cargo fijo (nacional) | 5,40 % + cargo fijo para destinatarios en Chile, Perú, Uruguay y otros mercados de la región | PayPal (2026) |
| Libélula | Bolivia | No publicada | Comisión según contrato; integra QR, tarjetas, Tigo Money y Pix | Libélula (s.f.) |

Stripe no permite abrir cuentas de comercio en la mayoría de los países hispanohablantes de América; en la región opera para comercios constituidos en México y Brasil, además de España. Mercado Pago cubre Argentina, Brasil, Chile, Colombia, México, Perú y Uruguay. Para el resto de Centroamérica, el Caribe, Bolivia, Paraguay y Venezuela, la cobertura se obtiene mediante procesadores locales o agregadores transfronterizos como dLocal, cuyas tarifas no son públicas y se negocian por volumen.

### 5.5.3 Comparación aplicada a EnsayAR

Para comparar proveedores se toma como referencia el cobro mensual del plan Crecimiento, de 49 USD (sección 3.9.2). La tabla muestra solo la parte porcentual de la comisión; el cargo fijo y el impuesto sobre la comisión se suman en cada caso.

| Escenario | Tasa | Comisión sobre 49 USD |
|---|---|---|
| Stripe, tienda en España, tarjeta europea | 1,5 % | 0,74 USD |
| Mercado Pago Chile, acreditación a 10 días | 2,89 % | 1,42 USD |
| Mercado Pago México, al instante | 3,49 % | 1,71 USD |
| Stripe México, tarjeta nacional | 3,6 % | 1,76 USD |
| Stripe México, tarjeta extranjera con conversión | 6,1 % | 2,99 USD |
| PayPal, destinatario en un mercado con tarifa de 5,40 % | 5,40 % | 2,65 USD |

El resultado muestra que el factor que más encarece un cobro no es el proveedor, sino cobrar en una moneda distinta a la de la tarjeta o con una tarjeta de otro país. Un cobro nacional en moneda local cuesta entre la mitad y un tercio de uno transfronterizo con conversión. De ahí se deriva el criterio de selección: cobrar a cada tienda y a cada clienta en su moneda local, a través del proveedor con adquirencia local en ese país, y reservar las opciones internacionales para los casos en que no exista alternativa local.

### 5.5.4 Recomendación por país

Con ese criterio, la estrategia recomendada para EnsayAR es la siguiente. En México, Chile, Colombia, Perú, Argentina y Uruguay se utiliza Mercado Pago, que ofrece tarjetas y los medios locales más usados (SPEI, OXXO, PSE, Yape) con una sola integración; en México, Stripe es una alternativa de costo similar. En España, Stripe ofrece la tarifa más baja de la comparación y acepta Bizum. En Bolivia, el cobro se realiza con QR interoperable a través de una pasarela local como Libélula, que además emite la factura electrónica exigida en el país. Para Centroamérica, el Caribe, Paraguay y Venezuela, se recurre a un agregador regional con medios locales. PayPal se mantiene como opción complementaria para clientas del exterior, no como medio principal.

## 5.6 Restricciones locales: Bolivia y PayPal

Bolivia combina dos características que condicionan el diseño. Por un lado, el QR interoperable se convirtió en el medio de pago electrónico dominante del comercio minorista: cualquier aplicación bancaria puede pagar un QR generado por otro banco, sin costo para la persona que paga. Por otro lado, ninguno de los grandes procesadores internacionales (Stripe, Mercado Pago) permite abrir una cuenta de comercio en el país, por lo que una tienda boliviana depende de pasarelas locales o del QR de su propio banco.

PayPal ilustra la asimetría entre pagar y cobrar. Desde Bolivia es sencillo pagar con PayPal usando una tarjeta internacional. Cobrar, en cambio, presenta dificultades. El acuerdo de disponibilidad de PayPal ubica a Bolivia entre los mercados con capacidad de solo envío, mientras otras páginas del mismo proveedor publican tarifas para recibir pagos; la información oficial no es concluyente y debe confirmarse para cada cuenta. Aun cuando la recepción esté habilitada, la tarifa es de 3,40 % a 5,40 % más un cargo fijo (PayPal, 2026), a lo que se suman la conversión de moneda y los costos de retiro. Por estas razones, PayPal no es una opción adecuada como medio principal para las tiendas bolivianas.

Fuera de Bolivia, el QR no tiene la misma aceptación. Brasil (Pix) y Perú (Yape y Plin) usan esquemas propios, y en México o España el pago con tarjeta y la transferencia inmediata siguen siendo los medios esperados. Un sistema regional no puede, por lo tanto, imponer el QR como medio universal: debe ofrecer en cada país los medios que allí se usan.

## 5.7 Requisitos para operar con pagos reales

La integración técnica con una pasarela es la parte más sencilla de aceptar pagos reales. Antes, la tienda o la plataforma debe constituirse legalmente, contar con un número de identificación tributaria y una cuenta bancaria a su nombre, y superar el proceso de verificación de identidad del proveedor de pagos, que revisa el giro del negocio, los representantes legales y el origen de los fondos. Si el comercio trabaja con un banco adquirente directo, necesita además un contrato de afiliación. En Bolivia, cada venta debe acompañarse de factura electrónica, lo que obliga a que la pasarela o el sistema se integren con la facturación. Ninguno de estos trámites se realizó para EnsayAR, que opera con fines académicos; por ese motivo todos los cobros se ejecutan en modo de prueba.

## 5.8 Seguridad y cumplimiento

La norma PCI DSS establece los requisitos de seguridad para cualquier organización que almacene, procese o transmita datos de tarjetas (PCI Security Standards Council, 2022). El alcance de su cumplimiento depende del modelo de integración: con redirección o campos alojados por la pasarela, el comercio solo debe completar el cuestionario de autoevaluación más reducido, porque los datos nunca pasan por sus servidores. EnsayAR se ajusta a ese caso y no guarda números de tarjeta: solo conserva los últimos cuatro dígitos y la referencia del cobro.

La confirmación por webhook introduce dos riesgos. El primero es la suplantación: un tercero podría enviar una notificación falsa de pago aprobado. Se mitiga verificando la firma que la pasarela adjunta a cada notificación con un secreto compartido (Stripe, s.f.-d). El segundo es la duplicación: las pasarelas reintentan la notificación hasta recibir confirmación, de modo que el mismo evento puede llegar varias veces. Se mitiga procesando cada evento de forma idempotente, con su identificador como clave única. El mismo principio se aplica al iniciar el cobro: la petición lleva una clave de idempotencia para que un reintento por falla de red no genere un segundo cargo (Stripe, s.f.-a).

## 5.9 Diseño en EnsayAR

### 5.9.1 Catálogo de métodos por país

El módulo `backend/src/pagos/metodos-pais.ts` define el catálogo de métodos de pago de 22 países: los 20 hispanohablantes de la tabla anterior, Brasil y Haití. Cada país tiene una moneda y una lista de métodos; la tarjeta y la transferencia aparecen en casi todos, PayPal solo en los países donde la documentación consultada confirma la recepción de pagos y Binance Pay como opción simulada con fines académicos. Todos los métodos están marcados como simulados, de modo que la interfaz nunca presenta como real una integración que no existe.

El catálogo se expone en `GET /plataforma/paises/:pais/metodos-pago` y alimenta tanto el asistente de alta de tienda como la renovación del plan. La tienda guarda su país y su moneda, y el servidor valida que el método elegido pertenezca al país de la tienda aunque la petición no provenga de la interfaz, por ejemplo desde un cliente HTTP manual. El método usado queda registrado junto al pago en el historial de la suscripción.

### 5.9.2 Puerto de pasarela y adaptador simulado

El cobro de suscripciones depende de una abstracción, la clase `PasarelaSuscripcion`, con dos operaciones: cobrar un importe con una clave de idempotencia y reembolsar un cobro. El servicio de plataforma solo conoce esa abstracción. La implementación actual, `PasarelaSimulada`, valida el número de tarjeta con el algoritmo de Luhn, rechaza las tarjetas de prueba estándar de fondos insuficientes, tarjeta rechazada y tarjeta vencida, y devuelve el mismo resultado si recibe dos veces la misma clave. Este diseño sigue el patrón de puertos y adaptadores: reemplazar la simulación por el entorno de pruebas de Stripe o de Mercado Pago consiste en escribir un nuevo adaptador con la misma interfaz, sin modificar la lógica de suscripción.

### 5.9.3 Atomicidad del alta

El alta de una tienda combina un cobro externo con varias escrituras en la base de datos. Si el cobro se rechaza, la respuesta es `402 PAGO_RECHAZADO` y no se crea ningún registro. Si se aprueba, la tienda, la suscripción, el pago y el espacio inicial se crean en una sola transacción; si esa transacción falla, el servicio solicita el reembolso del cobro. Es una saga de dos pasos con una acción compensatoria, como se describe en la sección 6.10.3. La clave de idempotencia del pago es única en la tabla `pagos_suscripcion`, de modo que repetir la solicitud no cobra dos veces y devuelve la tienda ya creada.

### 5.9.4 Cobro de ventas

En las ventas de cada tienda, el caso de uso UC27 cubre el pago simulado con efectivo, QR, tarjeta o transferencia, y UC54 define el pago mediante una pasarela internacional. En UC54, el sistema crea una `TransaccionPasarela` con una clave de idempotencia, la clienta completa el pago en la página de la pasarela y la venta solo se confirma cuando llega la notificación de pago aprobado; una segunda notificación del mismo evento se ignora. Los pagos con QR o tarjeta no están disponibles sin conexión, porque requieren la confirmación de un tercero; sin red la caja solo acepta efectivo (sección 6.2.2).

## 5.10 Estado de implementación

Al cierre de este informe están implementados el catálogo de métodos por país, la validación del método según el país de la tienda, el registro del método en el historial de pagos, el puerto de pasarela con su adaptador simulado, la idempotencia del cobro y la compensación por reembolso en el alta. Estas funciones cuentan con pruebas automatizadas (`metodos-pais.spec.ts` y `renovacion-permisos.spec.ts`) y con verificaciones de extremo a extremo sobre una base PostgreSQL aislada.

Queda pendiente reemplazar el adaptador simulado por el entorno de pruebas de una pasarela real y aplicar el catálogo de métodos al checkout de la tienda en línea y al punto de venta, que hoy siguen usando el pago simulado del primer ciclo. El diseño de esa integración está completo en el caso de uso UC54 y en su diagrama de secuencia (sección 9.3).
