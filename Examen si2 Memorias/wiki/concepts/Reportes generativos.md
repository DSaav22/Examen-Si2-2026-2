---
tipo: concept
fuentes: 3
actualizado: 2026-11-08
tags: [innovacion, ia, sql]
---

# Reportes generativos

**Innovación 2.** Reportes **bajo demanda**, no un menú fijo de Crystal/Jasper.

## Cómo lo pidió el docente

El gerente habla (o escribe) algo como: *ventas de la sucursal X, POS Y, de tal hora a tal hora; a quién y cuánto*. El sistema no tiene ese reporte prediseñado. La IA arma la consulta (SQL) y el resultado en el momento. [[transcripcion-audio-clase-ecommerce]]

Garzón lo pone en el actor “Servicio de IA”: reportes generativos bajo demanda por voz. Los RF clásicos (RF24) no sustituyen esto. [[examen1-garzon-fashionstore]]

## Implicación de diseño

- Reportes estáticos: sí, pero no son lo evaluable.
- Hay que acotar qué puede preguntar la IA (esquema, permisos, sucursal) para no soltar SQL libre.
- Encaja en la Parte 1 teórica y en el [[MVP y alcance]] si entra al primer incremento.

## Construcción (19 sep)

Sin clave OpenAI. `compilarPregunta` arma el SELECT; `validarSelect` lo acota a `v_reporte_ventas`. `POST /reportes/generativo` y **`GET /reportes/dia`** (ADMIN). UI en `/reportes` (Consultar + Ventas del día). Spike C. [[UC10 Reporte generativo]]

## Madurez real (23 sep, tarde)

El modelo propone `{titulo, sql}` sobre `v_reporte_ventas`. Si el SQL no pasa `validarSelect`, se usa el compilador por reglas. Luego narra hasta 12 filas. Sigue sin SQL libre. También existen el reporte del día y el de inventario. [[codigo-23-sep]] · [[Estado del codigo]]

## Segundo parcial: reforzado

[[transcripcion-audio-segundo-parcial]] lo mantiene y sube la vara:

- Entrada por **texto o voz**.
- Pedidos **complejos**: muchos filtros, cálculos, agrupación, orden y datos de varias tablas. Ejemplo del docente: "clientes con nombre, dirección y email que me deben entre tal y tal monto por ventas al crédito".
- Salida a elección: **pantalla, PDF o Excel**.
- Un reporte tiene filas, columnas, criterios, agrupaciones y orden.
- El documento necesita un capítulo extenso sobre cómo se estructura la IA para generar reportes dinámicos.

## Implementado (8 nov): punto 3 del segundo parcial

Reemplaza la pregunta libre sobre `v_reporte_ventas`. La IA **nunca escribe SQL**. Solo traduce el pedido a una especificación JSON, y el servidor la valida y la compila. Código en `backend/src/reportes/inteligente/`.

**Tubería, en orden:**

1. **Entrada (R1).** Se escribe o se dicta.
   - Web: Web Speech API `es-BO` con texto parcial en vivo; al terminar de hablar, genera.
   - Móvil: micrófono del teclado del sistema.
   - Los números hablados se pasan a cifras ("de cien a mil quinientos" → 100 y 1500).
2. **Capa semántica (`catalogo.ts`).** Describe 6 fuentes de negocio:

   | Fuente | Qué es cada fila | Ejemplos de campos |
   |--------|------------------|--------------------|
   | Ventas | Línea vendida | Sucursal, cajero, clienta, producto, medio de pago, mes, hora, importe, tickets |
   | Clientes | Clienta | Nombre, email, dirección, ciudad, tipo, compras, total comprado, deuda, días de mora |
   | Créditos | Cuenta por cobrar | Clienta, ticket, vence, monto, pagado, saldo, estado |
   | Inventario | Variante en almacén | Disponible, reservado, valor |
   | Productos | Producto | Stock, unidades vendidas, ingresos |
   | Movimientos | Movimiento de stock | Tipo, cantidad, fecha |

   Cada campo tiene etiqueta, tipo, sinónimos en español, expresión SQL fija y los joins que necesita. Lo que no está en el catálogo no se puede pedir.
3. **Intérprete.**
   - Primero el modelo de Azure OpenAI. El prompt lleva el catálogo, los operadores, los valores reales de la tienda (sucursales, categorías, colores) y 4 ejemplos resueltos; la salida es JSON.
   - Si el modelo falla, o su JSON no pasa la validación, interviene un intérprete por reglas en español: período, top N, agrupaciones encadenadas, rangos de montos, valores del diccionario y formato. El modelo queda en pausa 5 minutos.
   - Los datos que no existen (teléfono, CI, costo) generan un aviso en vez de inventarse.
4. **Especificación validada (`especificacion.ts`).** Contiene:
   - `fuente`;
   - `columnas[{campo, agregacion}]`;
   - `filtros[{campo, op, valor, valor2, agregacion}]`, con operadores según el tipo: entre, contiene, en, últimos N días, este mes…;
   - `agrupar[]`, `orden[]`, `limite` (≤ 2000) y `formato` (pantalla, pdf o excel).

   Todo se valida contra el catálogo. Un campo, operador o agregación inválido devuelve 400.
5. **Compilador (`compilador.ts`).** Genera SQL con:
   - solo los joins necesarios;
   - `GROUP BY` automático, y un criterio sobre totales pasa a `HAVING`;
   - valores del usuario siempre como parámetros `$n`;
   - comparación de texto sin tildes ni mayúsculas.
6. **Ejecución aislada.** `set_config('app.tienda_id')` en la misma transacción. Cada fuente filtra por `current_setting`, así que con otra tienda no ve nada.
7. **Salida (R3).**
   - Pantalla: chips de criterios que se pueden quitar, orden reversible, barras si hay agrupación, totales, narración y el SQL a la vista.
   - Excel (`exceljs`): encabezado con criterios, formatos, fila TOTAL, autofiltro y una hoja "Cómo se generó".
   - PDF (`pdfkit`): A4 apaisado, encabezado repetido en cada página, "Página i de n".
   - Cada ejecución queda en `ReporteEjecucion` con su especificación.

**Ejemplo del docente.** Para que exista "deben por ventas al crédito" se agregaron:
- medio de pago `credito` en el POS (exige clienta, plazo de 30 días, no suma a caja);
- `CuentaCobrar` y `AbonoCredito` con `CHECK saldo ≥ 0`;
- abonos idempotentes con `UPDATE` condicional;
- pantalla web `/creditos`;
- ajuste del saldo en devoluciones.

"Clientes con nombre, dirección y email que me deben de 500 a 3000 Bs por ventas al crédito" devuelve la fuente *clientes*, las columnas nombre, dirección, email y deuda, el filtro deuda entre 500 y 3000, y orden por deuda descendente.

**Rutas:**

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/reportes/inteligente/catalogo` | Catálogo de fuentes y estado del modelo |
| POST | `/reportes/inteligente` | Pregunta → reporte |
| POST | `/reportes/inteligente/interpretar` | Pregunta → especificación, sin ejecutar |
| POST | `/reportes/inteligente/ejecutar` | Especificación editada → reporte |
| POST | `/reportes/inteligente/exportar` | Genera PDF o Excel |

Pueden usarlas ADMIN, ENCARGADO y SUPERADMIN.

**Verificación.** `npm run datos:reportes` crea datos sintéticos: 34 clientas, 320 ventas en 180 días y créditos con abonos. `npm run verificar:reportes` corre 24 chequeos:
- intérprete;
- comparación con un SQL independiente;
- parámetros e inyección;
- aislamiento por tienda;
- Excel y PDF válidos, sin hojas en blanco;
- permisos;
- crédito, abonos concurrentes y devolución.

**Pendiente.** La clave de Azure OpenAI responde 401. Al renovarla, el modelo entra solo y las reglas quedan de respaldo.

El segundo tipo de reporte (aprendizaje automático y dashboards) está en [[Analitica con IA]].

## Relacionado

[[Asistente IA]] · [[Punto de venta]] · [[Mapa del examen]] · [[Mapa del segundo parcial]]
