# Capítulo 6 — Fase de Transición

**Parte II — Proceso Unificado de Desarrollo de Software**  
**Sistema:** EnsayAR  
**Hito de la fase:** producto en manos de quien lo usa, y listo para la defensa  
**Fecha:** 23 de septiembre de 2026  

Referencia: Jacobson, I., Booch, G. y Rumbaugh, J. *El proceso unificado de desarrollo de software*.

Construcción entregó una versión operativa. Transición no agrega casos de uso. Prepara la demostración, el despliegue y la forma en que cada rol aprende el sistema. La guía paso a paso está en el capítulo 8. Aquí se fija el criterio de salida.

**Disciplinas de esta fase:** transición del producto (despliegue, datos de demostración, capacitación) y cierre de riesgos residuales. Las pruebas formales están en el capítulo 7.

---

## 6.1 Qué se pone en manos del usuario

El entorno de defensa usa la semilla académica: varias sucursales, un catálogo de demostración y las cuentas `superadmin@ensayar.bo`, `admin@ensayar.bo`, `cajero@ensayar.bo`, `encargado@ensayar.bo`, `proveedor@ensayar.bo` y `clienta@ensayar.bo`, todas con la clave de laboratorio. Esas claves no salen del aula.

Quien recibe el sistema no lee el código. Recibe tres cosas: la aplicación web, la aplicación móvil en modo prototipo, y el capítulo 8, que explica qué tocar según el rol. El mecanismo de adopción que pidió el docente es ese manual más un recorrido guiado de unos quince minutos.

## 6.2 Recorrido de la defensa

En un cuarto de hora se puede mostrar el incremento sin abrir el repositorio.

Se entra como cajero, se abre el turno con un fondo y se cobra una prenda en efectivo o con el QR simulado. El stock de esa variante baja. Se entra como administración y se pide el reporte del día o una pregunta permitida; en pantalla quedan la tabla y el SQL. Se entra como clienta, se abre el catálogo y el probador: si la cámara estima los hombros, el overlay se ancla; si no, se marcan dos puntos. Si se corta la red en la caja, la venta queda en la cola y, al reconectar, se sincroniza una sola vez.

Ese recorrido cubre UC07, UC10 y el prototipo de UC03. Reservas y portal del proveedor se muestran si queda tiempo; no son el centro de los quince minutos.

## 6.3 Despliegue

La infraestructura está descrita en Bicep y en `azure.yaml`: App Service para la API, Static Web Apps para el front, PostgreSQL Flexible Server y Application Insights. El plan de alta está en `.azure/deployment-plan.md`.

El alta en la suscripción no quedó confirmada en este corte, porque faltó una sesión autenticada en Azure. El riesgo R4 de Inicio se mantiene así: el día de la defensa se muestra el producto en el entorno local, se enseña el código de infraestructura y, si la cuenta está disponible, se ejecuta el aprovisionamiento y las migraciones. No se afirma un URL de producción que no exista.

Hasta ese momento la entrega verificable es el incremento local más el informe. Localhost no sustituye la intención de nube del curso; sustituye la demo cuando la nube aún no está dada de alta.

## 6.4 Riesgos que pasan a la defensa

El probador se nombra como prototipo. El reporte se nombra como compilador y validador, no como un modelo de lenguaje. Los pagos se nombran como simulación. El móvil se nombra como cliente parcial de la misma API. Esas cuatro frases evitan el riesgo R7.

## 6.5 Criterio de salida

Transición queda cumplida para el 23 de septiembre si se cumplen las tres condiciones siguientes.

El recorrido de la sección 6.2 se puede hacer con la semilla, sin pasos ocultos. El informe tiene las tres partes que pidió el docente: fundamentación, Proceso Unificado y adopción. El despliegue en Azure está hecho o, en su defecto, el mecanismo de alta está escrito y el riesgo queda dicho en voz alta.
