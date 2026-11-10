---
tipo: query
fuentes: 17
actualizado: 2026-11-09
tags: [pagos, paises, paypal, binance, simulacion]
---

# Métodos de pago por país — investigación

Consulta para [[Planes y suscripciones retail]]. Fecha: 9 de noviembre de 2026. La presencia de un método en la documentación de un proveedor **no demuestra cuota de mercado**, contratación disponible para EnsayAR ni compatibilidad con pagos recurrentes. Salvo que se indique otra cosa, son candidatos para una simulación, no integraciones realizadas.

| País | Métodos identificados y fuente |
|---|---|
| Chile | Tarjetas mediante Webpay, Khipu, Fintoc, Mercado Pago, Sencillito y Servipag. [dLocal](https://docs.dlocal.com/docs/chile). |
| Costa Rica | Tarjetas, SINPE y SINPE Móvil. [dLocal](https://docs.dlocal.com/docs/costa-rica). |
| Ecuador | Tarjetas, Deuna y Pago Efectivo. [dLocal](https://docs.dlocal.com/docs/ecuador). |
| Paraguay | Tarjetas, Tigo Money, Zimple, Billetera Personal, Wally, QR, transferencias y puntos de efectivo. [dLocal](https://docs.dlocal.com/docs/paraguay). |
| Uruguay | Tarjetas, transferencias, Redpagos y Abitab. [dLocal](https://docs.dlocal.com/docs/uruguay). |
| Guatemala | Tarjetas, PayCash y SoyFri. [dLocal](https://docs.dlocal.com/docs/guatemala). |
| Honduras | Tarjetas; se requiere investigar alternativas locales y su aceptación. [dLocal](https://docs.dlocal.com/docs/honduras). |
| El Salvador | Tarjetas, PuntoXpress y Akipago. [dLocal](https://docs.dlocal.com/docs/el-salvador). |
| Nicaragua | Tarjetas y PuntoXpress. [dLocal](https://docs.dlocal.com/docs/nicaragua). |
| Panamá | Tarjetas, Punto Pago y PayCash; Yappy ofrece QR y botón de pago para comercios afiliados. [dLocal](https://docs.dlocal.com/docs/panama), [Yappy](https://yappy.com.pa/faq-items/cuales-son-los-metodos-de-cobros-que-puedo-usar-con-yappy-comercial/). |
| República Dominicana | Tarjetas y transferencia de Banco Popular en la cobertura consultada. [dLocal](https://docs.dlocal.com/docs/dominican-republic). |
| Cuba | Transfermóvil está autorizado para pagos de comercio electrónico; EnZona también aparece en comunicaciones del Banco Central. [Gaceta 2023](https://faolex.fao.org/docs/pdf/cub216388.pdf), [Banco Central de Cuba](https://t.me/s/bancocentral_1997/2740?q=%23PagoEnL%C3%ADnea). |
| Haití | MonCash ofrece cobro comercial y QR; validar otras opciones y las condiciones actuales. [MonCash Business](https://moncashdfs.com/business). |
| Venezuela | Pago Móvil y C2P para comercios afiliados; tarjetas según el proveedor. [Banesco](https://www.banesco.com/personas/banca-digital-personas/pagomovil/). |

## PayPal

[La tabla de países de PayPal Payouts](https://developer.paypal.com/payouts/supported-features/) indica categorías de envío, recepción y retiro para Chile, Costa Rica, Ecuador, El Salvador, Guatemala, Honduras, Nicaragua, Panamá, República Dominicana, Uruguay y Venezuela. Esa tabla es específica de Payouts y no garantiza la disponibilidad de Checkout, retiro a un banco local, pagos domésticos o servicios de comercio en cada caso.

En Bolivia y Paraguay las fuentes oficiales consultadas no son consistentes: el [acuerdo de disponibilidad de PayPal](https://www.paypal.com/mx/legalhub/paypal/residence-full) los ubica en la sección de capacidad de solo envío, mientras que una sección de documentación de Payouts y páginas localizadas sugieren otras capacidades. No resolver esta discrepancia por suposición: confirmar con soporte de PayPal según cuenta, residencia, recepción comercial y retiro. Cuba y Haití no aparecen en la tabla de países elegibles consultada; eso no prueba por sí solo una prohibición general de todos los servicios. Confirmar específicamente.

## Binance Pay

Andrés desea contemplarlo en todos los países. Puede modelarse como opción **simulada** para fines académicos, con advertencia sobre su disponibilidad real. [Binance excluye a Cuba de su alta para comerciantes B2C](https://www.binance.com/es/support/faq/detail/942c5c12e00b494e9bc3e2ab31f7da19); la lista no es exhaustiva y puede cambiar. No figurar en ella no garantiza elegibilidad. Confirmar país del comercio y del pagador, licencia, activo, cambio de moneda, integración y condiciones comerciales antes de habilitar pagos reales.

## Diseño pendiente

- Hay un catálogo en `backend/src/pagos/metodos-pais.ts`, disponible en `GET /plataforma/paises/:pais/metodos-pago` y en los datos públicos de la tienda. Todos figuran como simulados. El alta y renovación muestran el catálogo y el backend valida que el método elegido corresponda al país. El método se guarda en `pasarela` y se muestra en el historial. Pruebas HTTP con PostgreSQL aislado verificaron alta, renovación, historial, país, moneda y reintentos; una prueba de navegador verificó el alta con Pix simulado. Aún no gobierna el checkout ni POS, y no valida las ventas.
- Una tienda tiene alcance nacional. Su país determina el conjunto común de métodos permitidos para la suscripción de su dueño y las compras de sus clientas; los medios físicos como efectivo deben ofrecerse solo en el contexto compatible. No se implementarán ventas transfronterizas por ahora.
- El backend debe validar el país y método aunque la solicitud provenga de Postman o móvil; web y móvil deben consultar la misma configuración. Los métodos concretos y el estado de integración/simulación deben mostrarse claramente.
- Separar cobro de suscripción de cobro retail manteniendo el catálogo común del país; aplicar restricciones del canal y de capacidad del proveedor cuando correspondan y explicarlas.
- Etiquetar los métodos como simulados y no activar integraciones que no existen.
- Identificar métodos que necesitan confirmación asíncrona y estados pendiente, aprobado, rechazado y vencido; no confundir mostrar un QR con recibir un pago.
- Verificar soporte de renovación automática por método y proveedor; si no existe, requerir pago manual.
- No almacenar credenciales de pasarelas ni datos reales de tarjetas en la aplicación.
- Conservar una matriz de cobertura y fuentes con fecha; la popularidad por país queda pendiente donde no haya datos comparables.
