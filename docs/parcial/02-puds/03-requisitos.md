# Parte III – Proceso de desarrollo

## 3.1 Flujo de trabajo: captura de requisitos

En el Proceso Unificado, la disciplina de captura de requisitos identifica actores y casos de uso que expresan el comportamiento observable del sistema. En EnsayAR —plataforma omnicanal de moda femenina— esta disciplina organiza el trabajo en tres ciclos incrementales (#1, #2 y #3), propios del proceso iterativo e incremental: no se confunden con el Scrum del semestre ni con la fecha del 18 de septiembre.

### 3.1.1 Identificar actores y casos de uso

#### 3.1.1.1 Actores

| Actor | Responsabilidad |
|-------|-----------------|
| Clienta | Explora el catálogo, prueba prendas, reserva y compra; usa la web, la aplicación móvil y la PWA. |
| Cajero | Opera el punto de venta (POS): abre y cierra caja, registra ventas y emite comprobantes simulados. |
| Encargado de sucursal | Atiende reservas, gestiona kardex, transferencias de stock y despacho de pedidos. |
| Administrador | Administra catálogo, usuarios, reportes generativos y auditoría del sistema. |
| Proveedor | Registra el ingreso de su mercadería al inventario de la tienda. |

EnsayAR contempla 35 casos de uso, numerados de UC01 a UC35. Los que dirigen la arquitectura son UC03 (probador virtual), UC07 (venta en POS; UC05 reutiliza el mismo cobro) y UC10 (reporte con `SELECT` acotado).

### 3.1.2 Tablas de casos de uso y sus prioridades

Las tablas siguientes resumen los casos por ciclo de desarrollo. Las columnas son Número, Caso de uso, Estado, Prioridad, Riesgo, Actores y Ciclo. El Estado es Aprobado en todos los casos, según la tabla de prioridad ya definida para el informe.

## CICLO #1

| Número | Caso de uso | Estado | Prioridad | Riesgo | Actores | Ciclo |
|--------|-------------|--------|-----------|--------|---------|-------|
| UC03 | Probador virtual | Aprobado | Crítico | Alto | Clienta | 1 |
| UC05 | Comprar en línea | Aprobado | Crítico | Alto | Clienta | 1 |
| UC06 | Abrir caja | Aprobado | Crítico | Medio | Cajero | 1 |
| UC07 | Venta en POS | Aprobado | Crítico | Alto | Cajero | 1 |
| UC08 | Cerrar caja | Aprobado | Crítico | Medio | Cajero | 1 |
| UC10 | Pedir reporte | Aprobado | Crítico | Alto | Administrador, Encargado | 1 |
| UC11 | Reservar prenda | Aprobado | Crítico | Alto | Clienta | 1 |
| UC15 | Iniciar y cerrar sesión | Aprobado | Crítico | Alto | Todos | 1 |

## CICLO #2

| Número | Caso de uso | Estado | Prioridad | Riesgo | Actores | Ciclo |
|--------|-------------|--------|-----------|--------|---------|-------|
| UC01 | Consultar catálogo | Aprobado | Significativo | Medio | Clienta, Administrador | 2 |
| UC02 | Ver ficha y variantes | Aprobado | Crítico | Medio | Clienta | 2 |
| UC04 | Consultar la ficha | Aprobado | Significativo | Medio | Clienta | 2 |
| UC09 | Administrar catálogo | Aprobado | Crítico | Medio | Administrador | 2 |
| UC12 | Atender reservas | Aprobado | Crítico | Medio | Encargado | 2 |
| UC13 | Ingresar mercadería | Aprobado | Significativo | Medio | Proveedor | 2 |
| UC14 | Registrarse | Aprobado | Crítico | Medio | Clienta | 2 |
| UC16 | Cambiar clave | Aprobado | Significativo | Medio | Usuario | 2 |
| UC17 | Gestionar favoritos | Aprobado | Significativo | Bajo | Clienta | 2 |
| UC18 | Perfil y direcciones | Aprobado | Significativo | Bajo | Clienta | 2 |
| UC19 | Ver historial | Aprobado | Significativo | Bajo | Clienta, Cajero, Encargado | 2 |
| UC20 | Opinar un producto | Aprobado | Significativo | Bajo | Clienta | 2 |
| UC21 | Pedir alerta | Aprobado | Significativo | Bajo | Clienta | 2 |
| UC22 | Aplicar cupón | Aprobado | Significativo | Medio | Clienta, Cajero | 2 |
| UC23 | Gestionar usuarios | Aprobado | Crítico | Medio | Administrador | 2 |
| UC24 | Sucursales, temporadas y colecciones | Aprobado | Significativo | Bajo | Administrador | 2 |
| UC25 | Ajustar inventario | Aprobado | Crítico | Alto | Encargado, Administrador | 2 |
| UC26 | Moderar y auditar | Aprobado | Significativo | Medio | Administrador | 2 |
| UC27 | Simular un pago | Aprobado | Crítico | Alto | Clienta, Cajero | 2 |

## CICLO #3

| Número | Caso de uso | Estado | Prioridad | Riesgo | Actores | Ciclo |
|--------|-------------|--------|-----------|--------|---------|-------|
| UC28 | Probador 3D | Aprobado | Crítico | Alto | Clienta | 3 |
| UC29 | Hablar con el bot | Aprobado | Crítico | Alto | Clienta | 3 |
| UC30 | Precio mayorista | Aprobado | Significativo | Medio | Administrador, Clienta | 3 |
| UC31 | Transferir stock | Aprobado | Significativo | Alto | Encargado | 3 |
| UC32 | Despachar pedido | Aprobado | Significativo | Medio | Encargado | 3 |
| UC33 | Devolver una venta | Aprobado | Significativo | Alto | Cajero, Clienta | 3 |
| UC34 | Comprobante simulado | Aprobado | Significativo | Medio | Cajero | 3 |
| UC35 | Tienda instalable (PWA) | Aprobado | Significativo | Medio | Clienta, Cajero | 3 |

Los requisitos no funcionales de este corte son: clave con hash y JWT; si el POS pierde la red, la venta se encola y se sincroniza con `uuid` para no duplicar el descuento; dos ventas de la misma variante no dejan el stock en negativo; el reporte generativo solo ejecuta un `SELECT` permitido; los pagos son simulados (Stripe en modo prueba si hay pasarela), sin cobro real ni NIT real. Las fichas de los treinta y cinco casos siguen a continuación.
