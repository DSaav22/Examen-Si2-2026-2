# 3.5 Flujo de trabajo: pruebas

**Parte II — Proceso Unificado de Desarrollo de Software**  
**Sistema:** EnsayAR  

La disciplina de pruebas recorre las fases; en este informe se reúne aquí para que la defensa tenga un plan único. El objetivo no es cubrir cada pantalla. Es demostrar que los casos que cargan riesgo —acceso, catálogo, venta, stock, reporte, probador, pago simulado y devolución— se comportan como fijó Elaboración.

## 3.5.1 Planificar pruebas

### 3.5.1.1 Objetivo de las pruebas

Verificar que el incremento operativo cumple el contrato del baseline: autenticación por rol, catálogo coherente, venta que no deja stock negativo, idempotencia del cobro, reportes que solo admiten lectura permitida, probador sin crear venta, pago y comprobante en modo simulado, y devolución que reintegra unidades. Las pruebas del plan sirven para preparar la demostración del 23 de septiembre; no sustituyen el recorrido en vivo.

### 3.5.1.2 Estrategia de pruebas

Hay dos niveles.

El primero es automatizado y vive en el backend. Cubre el cobro concurrente de la última unidad, el rechazo de SQL que no es una lectura permitida, la respuesta de la ficha y consultas de catálogo. Esas pruebas se ejecutan con el conjunto de tests del proyecto API. Aseguran el contrato del servidor.

El segundo nivel es caja negra, con la web (y, cuando aplique, el móvil) y la semilla académica. Una persona entra con un rol, hace la acción y compara el resultado con la tabla de casos de este capítulo.

#### Pruebas de validación (caja negra)

Se diseñan desde el punto de vista del actor: entrada observable, acción y resultado esperado, sin mirar el código. Cubren al menos inicio de sesión, catálogo, venta POS con y sin stock suficiente, compra en línea, reserva, reporte que rechaza un `UPDATE`, probador, pago simulado y devolución. Los casos CP-01 en adelante de la sección 3.5.2 son ese plan.

### 3.5.1.3 Entorno de pruebas

PostgreSQL local (o el de la semilla de defensa), API NestJS en el puerto 3000, web React en el puerto 5173. Cuentas de laboratorio `*@ensayar.bo` con la clave académica. Variables: `DATABASE_URL`, `JWT_SECRET`. No se exige, en este parcial, una suite de extremo a extremo de todos los roles en el móvil; el plan de caja negra se ejecuta principalmente en la web.

## 3.5.2 Casos de pruebas

Los siguientes casos forman el plan de validación (caja negra). Columnas: identificador, caso de uso, datos de entrada y resultado esperado. Son criterios del plan; no se afirma aquí una fecha de ejecución ni un porcentaje de éxito.

| ID | Caso de uso | Datos | Resultado esperado |
|----|-------------|-------|-------------------|
| CP-01 | UC15. Iniciar sesión | Correo `cajero@ensayar.bo` y clave de laboratorio válidos | El sistema autentica, entrega token y abre la sesión del rol caja |
| CP-02 | UC15. Iniciar sesión (clave incorrecta) | Correo válido y clave incorrecta | Respuesta no autorizada; no entrega token ni abre sesión |
| CP-03 | UC01. Consultar catálogo | Clienta autenticada; filtros o búsqueda sobre el catálogo sembrado | Lista de productos con nombre, precio y disponibilidad; el stock no cambia |
| CP-04 | UC07. Venta en POS con stock | Turno abierto; variante con disponible suficiente; cobro en efectivo simulado | Venta cobrada, disponible baja en esa cantidad y se muestra el ticket |
| CP-05 | UC07. Venta en POS sin stock | Turno abierto; cantidad pedida mayor al disponible (o sin turno) | No se crea la venta; el stock no queda negativo |
| CP-06 | UC07. Idempotencia de venta | Reenvío del mismo identificador de una venta ya cobrada | El servidor devuelve esa venta y no descuenta de nuevo |
| CP-07 | UC35 / UC07. Cola sin red | Turno abierto; red cortada; cobro; luego reconexión | La venta queda en cola local; al sincronizar hay una sola venta en el servidor |
| CP-08 | UC05. Comprar en línea | Clienta con carrito y disponible; pago simulado (p. ej. contra entrega) | Venta registrada, stock descontado y comprobante simulado visible |
| CP-09 | UC11 / UC12. Reserva | Clienta reserva variante con disponible; encargado atiende su sucursal | Sube `reservado` sin bajar la cantidad física; completar o cancelar según el flujo |
| CP-10 | UC10. Reporte permitido | Administración; pregunta o filtro de ventas de una sucursal | Filas o tabla vacía; SQL visible es un `SELECT` sobre la vista de ventas |
| CP-11 | UC10. Reporte que rechaza un UPDATE | Administración; sentencia u orden de tipo `UPDATE` (o tabla ajena) | El validador no ejecuta la sentencia; no hay filas de otra tabla ni escritura |
| CP-12 | UC03 / UC28. Probador | Ficha con overlay (y modelo 3D si existe); cámara o toques en hombros | Se ve la prenda en 2D o 3D; no se crea venta ni reserva solo por probar |
| CP-13 | UC27. Pago simulado | Medio de prueba (efectivo, QR o Stripe modo prueba) en caja o compra | Pago aprobado o rechazado en simulación; no hay cobro bancario real |
| CP-14 | UC33. Devolución | Venta cobrada elegible; cajero o clienta inicia la devolución | La venta queda devuelta y el stock de las líneas vuelve al disponible |
| CP-15 | UC10 / UC23. Rol sin permiso | Clienta intenta reportes generativos o administración | El sistema niega la operación |

**Evidencia prevista.** Sirve el resultado de las pruebas automáticas del backend en la máquina de la defensa, y sirve ejecutar en vivo casos representativos (por ejemplo CP-04, CP-10 y CP-12) durante el recorrido de transición. Las capturas, si se agregan, van al anexo. No hace falta una captura por cada caso para dar por descrito el plan.
