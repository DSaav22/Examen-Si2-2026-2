---
tipo: synthesis
fuentes: 3
actualizado: 2026-11-09
tags: [saas, retail, suscripciones, pagos, pruebas]
---

# Planes y suscripciones para retail

Decisiones comunicadas por Andrés el 9 de noviembre de 2026. Complementa [[Pendientes segundo parcial]] y [[SaaS multi-tenant]]. Esta página distingue las decisiones, el código existente y las propuestas aún no elegidas.

## Decisiones

- Todos los planes deben permitir vender y controlar inventario. Las funciones de seguridad y acceso acordadas son esenciales en cualquier plan.
- Andrés aceptó mantener por ahora los tres planes de la migración: Inicial, Crecimiento y Cadena, con su distribución y límites actuales. Su publicación efectiva y los permisos por módulo deben validarse; las funciones no probadas no se consideran completas.
- Cobro mensual, trimestral con descuento y anual con descuento. En el código actual los descuentos son 10 % y 20 %, respectivamente; mantenerlos sujetos a revisión comercial.
- Las políticas de avisos y vencimiento, y la regla de no bajar de plan si el uso supera los límites del destino, fueron aceptadas en la conversación; falta precisar y verificar todos sus detalles.
- Pagos simulados, separados entre suscripción de la plataforma y compra de prendas. Investigar opciones por país y no prometer integraciones reales.
- Cada tienda opera por ahora dentro de un solo país: el país registrado determina los métodos habilitados tanto para el pago de su suscripción como para los pagos de sus clientas. Ejemplo: una tienda brasileña usa el catálogo permitido para Brasil. No implica cobro transfronterizo.
- Una base con un esquema por tienda sigue siendo una decisión futura; actualmente el código utiliza tablas compartidas con `tiendaId`.

## Flujo propuesto: información por paso

Andrés aprobó conservar este flujo el 9 de noviembre. Para la auditoría de su implementación, ver [[Auditoria suscripciones y ciclo de vida]].

1. **Cuenta:** nombre, correo, contraseña y verificación de correo. Inicio de sesión si ya existe cuenta.
2. **Plan:** selección del plan y período; mostrar límites, funcionalidades, precio, descuento, moneda y total.
3. **Tienda:** nombre comercial, identificador para la URL, país, moneda de operación; se crea sucursal y almacén inicial. Datos fiscales y dirección pueden solicitarse luego si corresponde.
4. **Revisión y pago simulado:** tienda, plan, período, descuentos, total, moneda y método compatible con el país; estado del pago y fecha de vencimiento antes de confirmar. El formulario actual sólo simula tarjeta.
5. **Activación:** confirmación de cuenta, tienda, primer administrador y acceso al panel; mostrar el resultado de forma clara.

### Relación con el código actual

- `GET /plataforma/planes` devuelve los planes; `POST /plataforma/registro` y `POST /plataforma/verificar` gestionan la cuenta y el correo.
- `POST /plataforma/suscribir` recibe plan, período, datos de tienda y pago simulado; requiere cuenta autenticada y correo verificado.
- Al aprobarse el pago, `PlataformaService.suscribir` crea dentro de una transacción la tienda, suscripción, registro de pago, sucursal, almacén, usuario administrador y categorías iniciales. A continuación intenta abrir sesión en la tienda.
- Si el cobro se rechaza, no debe aprovisionarse la tienda. Si falla la transacción posterior al cobro, el código invoca una compensación simulada; no constituye un reembolso real.
- El correo real depende de SMTP. El selector de alta y renovación consulta métodos simulados por país; en los métodos distintos de tarjeta, se usa una credencial de prueba interna para simular el pago, sin conexión real con ese proveedor. El método se guarda en `pasarela`; faltan pruebas de integración del historial, renovación y rollback.
- Actualmente el tenant se filtra por `tiendaId` en tablas compartidas. El esquema PostgreSQL por tienda es una decisión futura y no forma parte de este alta actual.

No se deben solicitar datos reales de tarjeta en la simulación. La integración real futura usaría una pasarela adecuada, sin guardar CVC en EnsayAR.

## Inventario de funcionalidades identificadas en el código

El código contiene módulos para catálogo y variantes, tienda en línea, carrito, favoritos, caja y POS, inventario por almacén/sucursal, reservas, pagos simulados, devoluciones, despacho, proveedores, usuarios y roles, reportes, notificaciones, asistente, probador y operación móvil. La presencia de código o pantallas no certifica el flujo completo ni su disponibilidad en todos los planes; hay migraciones pendientes y se requieren pruebas reales por caso de uso.

El catálogo inicial de planes de la migración `20261108120000_saas_multitenant` incluye catálogo, tienda en línea, POS, inventario y reservas en los tres planes; agrega probador, reportes IA y asistente IA desde Crecimiento, y analítica y mayorista en Cadena. Esa lista no demuestra que exista control de acceso por módulo. Los límites de usuarios, sucursales y productos sí cuentan con comprobaciones en algunos puntos; deben revisarse todas las rutas, sincronización y condiciones de concurrencia.

## Baja de plan: reglas y pruebas pendientes

La baja debe rechazar o programar el cambio si el uso actual supera los límites del plan destino. Informar límites y uso por recurso, y qué ajustar. No eliminar automáticamente datos, ventas, usuarios ni inventario. Aclarar si cuentas inactivas, sucursales cerradas y productos archivados cuentan; revisar funciones exclusivas, operaciones pendientes y momento de entrada en vigencia antes de implementar.

- [ ] Cambio con uso inferior a todos los límites: permitido según fecha acordada.
- [ ] Uso exactamente igual al límite: permitido; impedir agregar unidades que lo excedan.
- [ ] Usuarios, sucursales o productos por separado por encima del límite: rechazar sin cobro ni cambio.
- [ ] Plan sin límite de productos: verificar interpretación de valor nulo.
- [ ] Reintentos y doble clic: una sola operación; misma clave con datos distintos debe rechazarse.
- [ ] Dos modificaciones simultáneas: no exceder límites por carrera.
- [ ] Cambio y renovación entre tiendas: impedir operaciones de usuarios ajenos.
- [ ] Fallo de pago o persistencia: sin cambio parcial de suscripción; compensación simulada verificable.
- [ ] Operaciones offline pendientes y datos de módulos retirados: definir lectura, sincronización y exportación sin pérdida.
- [ ] Verificar vencimiento, avisos, acceso a facturación y renovación, y persistencia de datos tras reconexión.

## Fuentes para investigar métodos de pago

- [PCMI: medios de pago en Latinoamérica](https://paymentscmi.com/insights/metodos-de-pago-en-america-latina-brasil-mexico-colombia-argentina-chile-peru/): seis mercados principales y ejemplos regionales.
- [ASFI: uso del QR en Bolivia](https://www.asfi.gob.bo/sites/default/files/2025-07/El%20uso%20del%20QR%20ha%20dinamizado%20el%20sistema%20de%20pagos%20en%20Bolivia.pdf).
- [Banco de España: pagos de consumidores](https://www.bde.es/wbe/es/publicaciones/analisis-economico-investigacion/boletin-economico/2025t2-articulo-03-evolucion-y-tendencias-en-los-pagos-de-los-consumidores-espanoles.html).
- [dLocal: cobertura por métodos y país](https://docs.dlocal.com/docs/payment-method): cobertura técnica por proveedor, no una clasificación de popularidad.

Ver el detalle, fuentes y limitaciones de PayPal y Binance Pay en [[Metodos de pago por pais 2026]]. Se pidió contemplar Binance Pay en todos los países para la simulación; la documentación oficial excluye a Cuba para comerciantes y no permite garantizar disponibilidad real universal. No confundir una opción simulada con un proveedor operativo.
