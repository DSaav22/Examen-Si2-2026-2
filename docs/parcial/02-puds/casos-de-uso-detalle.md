# 3.1.3 Detallar un caso de uso

Cada ficha trae propósito, actores, flujo, poscondición y excepción. El título **Diagrama de UCxx** deja el espacio para pegar la figura desde Enterprise Architect. La prioridad de cada caso está en las tablas del ciclo (apartado 3.1.2).

## Tabla de casos, prioridad y riesgo

| Número | Caso de uso | Estado | Prioridad | Riesgo | Actores |
|--------|-------------|--------|-----------|--------|---------|
| UC01 | Consultar catálogo | Aprobado | Significativo | Medio | Clienta, Administrador |
| UC02 | Ver ficha y variantes | Aprobado | Crítico | Medio | Clienta |
| UC03 | Probador virtual | Aprobado | Crítico | Alto | Clienta |
| UC04 | Consultar la ficha | Aprobado | Significativo | Medio | Clienta |
| UC05 | Comprar en línea | Aprobado | Crítico | Alto | Clienta |
| UC06 | Abrir caja | Aprobado | Crítico | Medio | Cajero |
| UC07 | Venta en POS | Aprobado | Crítico | Alto | Cajero |
| UC08 | Cerrar caja | Aprobado | Crítico | Medio | Cajero |
| UC09 | Administrar catálogo | Aprobado | Crítico | Medio | Administrador |
| UC10 | Pedir reporte | Aprobado | Crítico | Alto | Administrador, Encargado |
| UC11 | Reservar prenda | Aprobado | Crítico | Alto | Clienta |
| UC12 | Atender reservas | Aprobado | Crítico | Medio | Encargado |
| UC13 | Ingresar mercadería | Aprobado | Significativo | Medio | Proveedor |
| UC14 | Registrarse | Aprobado | Crítico | Medio | Clienta |
| UC15 | Iniciar y cerrar sesión | Aprobado | Crítico | Alto | Todos |
| UC16 | Cambiar clave | Aprobado | Significativo | Medio | Usuario |
| UC17 | Gestionar favoritos | Aprobado | Significativo | Bajo | Clienta |
| UC18 | Perfil y direcciones | Aprobado | Significativo | Bajo | Clienta |
| UC19 | Ver historial | Aprobado | Significativo | Bajo | Clienta, Cajero, Encargado |
| UC20 | Opinar un producto | Aprobado | Significativo | Bajo | Clienta |
| UC21 | Pedir alerta | Aprobado | Significativo | Bajo | Clienta |
| UC22 | Aplicar cupón | Aprobado | Significativo | Medio | Clienta, Cajero |
| UC23 | Gestionar usuarios | Aprobado | Crítico | Medio | Administrador |
| UC24 | Sucursales, temporadas y colecciones | Aprobado | Significativo | Bajo | Administrador |
| UC25 | Ajustar inventario | Aprobado | Crítico | Alto | Encargado, Administrador |
| UC26 | Moderar y auditar | Aprobado | Significativo | Medio | Administrador |
| UC27 | Simular un pago | Aprobado | Crítico | Alto | Clienta, Cajero |
| UC28 | Probador 3D | Aprobado | Crítico | Alto | Clienta |
| UC29 | Hablar con el bot | Aprobado | Crítico | Alto | Clienta |
| UC30 | Precio mayorista | Aprobado | Significativo | Medio | Administrador, Clienta |
| UC31 | Transferir stock | Aprobado | Significativo | Alto | Encargado |
| UC32 | Despachar pedido | Aprobado | Significativo | Medio | Encargado |
| UC33 | Devolver una venta | Aprobado | Significativo | Alto | Cajero, Clienta |
| UC34 | Comprobante simulado | Aprobado | Significativo | Medio | Cajero |
| UC35 | Tienda instalable (PWA) | Aprobado | Significativo | Medio | Clienta, Cajero |

## Detalle de cada caso de uso

### UC01. Consultar catálogo

**Diagrama de UC01**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC01. Consultar catálogo |
| Propósito | Consultar catálogo dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta o administrador. |
| Actor iniciador | Clienta |
| Precondición | El catálogo tiene productos publicados. |
| Flujo de suceso principal | 1. Abre el catálogo. 2. Filtra por categoría, ocasión, talla, color, precio o sucursal, o escribe una búsqueda. 3. El sistema lista nombre, precio y disponibilidad. 4. Puede abrir la ficha (UC02). |
| Poscondición | No cambia el stock. |
| Excepción | Si ningún producto coincide, la lista queda vacía y se ofrece limpiar filtros. |

### UC02. Ver ficha y variantes

**Diagrama de UC02**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC02. Ver ficha y variantes |
| Propósito | Ver ficha y variantes dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | El producto existe. |
| Flujo de suceso principal | 1. Abre la ficha. 2. Elige talla y color. 3. Ve fotos, precio, stock de la sucursal, composición y cuidados. 4. Desde ahí puede probar (UC03), reservar (UC11), opinar (UC20) o agregar al carrito (UC05). |
| Poscondición | La variante elegida queda en contexto para el caso siguiente. |
| Excepción | La variante agotada se muestra y no se puede vender. |

### UC03. Usar el probador virtual

**Diagrama de UC03**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC03. Usar el probador virtual |
| Propósito | Usar el probador virtual dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. Variante con imagen o modelo 3D. |
| Flujo de suceso principal | 1. Elige Probar. 2. Autoriza la cámara o carga una foto. El video no sale del dispositivo. 3. El sistema estima el cuerpo y coloca la prenda. 4. Si la variante tiene modelo 3D, muestra volumen y caída de tela (UC28). Si no, usa el overlay 2D anclado a los hombros. 5. Puede cambiar de color. 6. Vuelve a la ficha. |
| Poscondición | No hay venta ni reserva. |
| Excepción | Sin permiso de cámara, marca los hombros a mano. Sin modelo 3D, permanece el modo 2D. |

### UC04. Consultar la ficha

**Diagrama de UC04**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC04. Consultar la ficha |
| Propósito | Consultar la ficha dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Ficha abierta. |
| Flujo de suceso principal | 1. Pregunta por precio, talla, color, ocasión o cuidados. 2. El sistema responde con los datos guardados de esa prenda. |
| Poscondición | La ficha no se modifica. |
| Excepción | Si la pregunta no está en la ficha, indica que no tiene ese dato y no inventa stock. |

### UC05. Comprar en línea

**Diagrama de UC05**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC05. Comprar en línea |
| Propósito | Comprar en línea dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. Carrito con al menos una variante y disponible suficiente. Dirección si el medio es contra entrega. |
| Flujo de suceso principal | 1. Revisa el carrito. 2. Puede aplicar un cupón (UC22). 3. Elige el medio simulado (UC27). 4. Confirma. 5. El servidor recalcula el precio, bloquea el stock y registra la venta. 6. Muestra el comprobante simulado (UC34). |
| Poscondición | Venta cobrada en simulación y stock descontado. |
| Excepción | Si el disponible cambió, rechaza la línea y no deja el stock en negativo. |

### UC06. Abrir caja

**Diagrama de UC06**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC06. Abrir caja |
| Propósito | Abrir caja dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cajero. |
| Actor iniciador | Cajero. |
| Precondición | Sesión de caja. No hay otro turno abierto de ese cajero en la sucursal. |
| Flujo de suceso principal | 1. Indica sucursal y fondo inicial. 2. El sistema abre el turno. |
| Poscondición | Turno abierto. |
| Excepción | Fondo negativo o sucursal ajena: no abre. |

### UC07. Registrar venta en el punto de venta

**Diagrama de UC07**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC07. Registrar venta en el punto de venta |
| Propósito | Registrar venta en el punto de venta dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cajero. |
| Actor iniciador | Cajero. |
| Precondición | Turno abierto (UC06). |
| Flujo de suceso principal | 1. Arma el ticket con variantes y cantidades. 2. Puede asociar clienta y cupón. 3. El sistema comprueba el disponible. 4. Cobra con el medio simulado (UC27). 5. En una transacción descuenta stock, graba la venta y el movimiento, y suma el total al turno. 6. Emite ticket y comprobante simulado. |
| Poscondición | Venta cobrada y stock actualizado. |
| Excepción | Sin stock o sin turno, no cobra. El mismo identificador no descuenta dos veces. Sin red, la venta queda en la cola (UC35) y se sincroniza una sola vez al reconectar. |

### UC08. Cerrar caja

**Diagrama de UC08**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC08. Cerrar caja |
| Propósito | Cerrar caja dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cajero. |
| Actor iniciador | Cajero. |
| Precondición | Turno abierto. |
| Flujo de suceso principal | 1. Declara el monto contado. 2. El sistema muestra el total calculado y la diferencia. 3. Cierra el turno. |
| Poscondición | Turno cerrado. No admite ventas nuevas. |
| Excepción | No cierra el turno de otra sucursal. |

### UC09. Administrar catálogo

**Diagrama de UC09**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC09. Administrar catálogo |
| Propósito | Administrar catálogo dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador. |
| Actor iniciador | Administrador. |
| Precondición | Sesión de administración. |
| Flujo de suceso principal | 1. Crea o edita producto, variantes, fotos, overlay o modelo 3D, y precio. 2. Asigna categoría, temporada y colección (UC24). 3. Fija el stock inicial o un ajuste (UC25). |
| Poscondición | El catálogo publicado refleja el cambio. |
| Excepción | SKU repetido o talla y color ya existentes: rechaza el alta. |

### UC10. Pedir un reporte

**Diagrama de UC10**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC10. Pedir un reporte |
| Propósito | Pedir un reporte dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador o encargado de su sucursal. |
| Actor iniciador | Administrador |
| Precondición | Sesión válida. |
| Flujo de suceso principal | 1. Pide el reporte del día, el de inventario, o escribe una pregunta. 2. El sistema compila un `SELECT` solo sobre la vista permitida y lo valida. 3. Muestra la tabla y la consulta. |
| Poscondición | Nada se modifica en ventas ni en stock. Queda registro de la ejecución. |
| Excepción | Una orden de escritura o una tabla ajena no se ejecuta. |

### UC11. Reservar una prenda

**Diagrama de UC11**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC11. Reservar una prenda |
| Propósito | Reservar una prenda dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. Hay disponible en la sucursal elegida. |
| Flujo de suceso principal | 1. Elige variante y sucursal. 2. Confirma la reserva. 3. El sistema aumenta la cantidad reservada. La cantidad física no baja. |
| Poscondición | Reserva pendiente. |
| Excepción | Sin disponible, no crea la reserva. |

### UC12. Atender reservas

**Diagrama de UC12**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC12. Atender reservas |
| Propósito | Atender reservas dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Encargado. |
| Actor iniciador | Encargado. |
| Precondición | Reserva de su sucursal. |
| Flujo de suceso principal | 1. Ve las reservas pendientes. 2. Completa o cancela. 3. Al completar, el sistema genera la venta, descuenta la cantidad y libera el reservado. Al cancelar, solo libera el reservado. |
| Poscondición | La reserva queda completada o cancelada. |
| Excepción | Una reserva de otra sucursal no se modifica. |

### UC13. Ingresar mercadería

**Diagrama de UC13**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC13. Ingresar mercadería |
| Propósito | Ingresar mercadería dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Proveedor. |
| Actor iniciador | Proveedor. |
| Precondición | Sesión de proveedor. El producto es suyo. |
| Flujo de suceso principal | 1. Elige producto, variante, almacén y cantidad. 2. Confirma el ingreso. 3. El sistema suma el stock y escribe el movimiento. |
| Poscondición | Stock mayor y movimiento de ingreso. |
| Excepción | No ingresa mercadería de otro proveedor. |

### UC14. Registrarse

**Diagrama de UC14**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC14. Registrarse |
| Propósito | Registrarse dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | El correo no existe. |
| Flujo de suceso principal | 1. Indica nombre, correo y clave. 2. El sistema guarda la clave con hash y crea el rol clienta. 3. Inicia sesión. |
| Poscondición | Existe la usuaria y tiene sesión. |
| Excepción | Correo duplicado o clave débil: no crea la cuenta. |

### UC15. Iniciar y cerrar sesión

**Diagrama de UC15**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC15. Iniciar y cerrar sesión |
| Propósito | Iniciar y cerrar sesión dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cualquier rol. |
| Actor iniciador | Cualquier rol. |
| Precondición | Cuenta activa. |
| Flujo de suceso principal | 1. Ingresa correo y clave. 2. El sistema compara el hash y entrega un token con el rol. 3. Al salir, revoca el token. |
| Poscondición | Hay sesión vigente, o la sesión quedó cerrada. |
| Excepción | Clave incorrecta o usuario inactivo: no entrega token. |

### UC16. Cambiar clave

**Diagrama de UC16**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC16. Cambiar clave |
| Propósito | Cambiar clave dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Usuario con sesión. |
| Actor iniciador | Usuario con sesión. |
| Precondición | Conoce la clave actual. |
| Flujo de suceso principal | 1. Escribe la clave actual y la nueva. 2. El sistema valida y reemplaza el hash. |
| Poscondición | Solo la clave nueva permite entrar. |
| Excepción | La clave actual no coincide: no cambia. |

### UC17. Gestionar favoritos

**Diagrama de UC17**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC17. Gestionar favoritos |
| Propósito | Gestionar favoritos dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. |
| Flujo de suceso principal | 1. Marca un producto. 2. Lo ve en Favoritos. 3. Puede quitarlo. |
| Poscondición | La lista de favoritos queda actualizada. |
| Excepción | Marcar dos veces el mismo producto no duplica el registro. |

### UC18. Perfil y direcciones

**Diagrama de UC18**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC18. Perfil y direcciones |
| Propósito | Perfil y direcciones dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. |
| Flujo de suceso principal | 1. Abre su cuenta. 2. Consulta nombre y correo. 3. Agrega una dirección de entrega. |
| Poscondición | La dirección queda disponible para la compra. |
| Excepción | Una dirección incompleta no se guarda. |

### UC19. Ver historial de compras

**Diagrama de UC19**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC19. Ver historial de compras |
| Propósito | Ver historial de compras dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta, cajero o encargado. |
| Actor iniciador | Clienta |
| Precondición | Sesión iniciada. |
| Flujo de suceso principal | 1. Abre Historial. 2. La clienta ve sus ventas. Caja y encargado ven las de su sucursal. 3. Abre el detalle de líneas y medio de pago. |
| Poscondición | Solo lectura. |
| Excepción | No muestra ventas de otra persona ni de otra sucursal. |

### UC20. Opinar un producto

**Diagrama de UC20**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC20. Opinar un producto |
| Propósito | Opinar un producto dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. Una opinión por producto. |
| Flujo de suceso principal | 1. Escribe valoración y comentario en la ficha. 2. El sistema guarda la opinión como pendiente. 3. Administración la publica o la rechaza (UC26). |
| Poscondición | Opinión almacenada. |
| Excepción | Una segunda opinión del mismo producto se rechaza. |

### UC21. Pedir alerta de producto

**Diagrama de UC21**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC21. Pedir alerta de producto |
| Propósito | Pedir alerta de producto dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. |
| Flujo de suceso principal | 1. En la ficha pide aviso de disponibilidad o de precio. 2. El sistema guarda la alerta. |
| Poscondición | Alerta registrada para ese producto. |
| Excepción | La misma alerta no se duplica. |

### UC22. Aplicar cupón

**Diagrama de UC22**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC22. Aplicar cupón |
| Propósito | Aplicar cupón dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta o cajero, durante UC05 o UC07. |
| Actor iniciador | Clienta |
| Precondición | Cupón activo, no vencido y con usos disponibles. |
| Flujo de suceso principal | 1. Ingresa el código. 2. El servidor recalcula el total con el porcentaje. 3. Al cobrar, suma un uso. |
| Poscondición | La venta guarda el descuento aplicado. |
| Excepción | Código inválido, vencido o agotado: el total no cambia. |

### UC23. Gestionar usuarios

**Diagrama de UC23**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC23. Gestionar usuarios |
| Propósito | Gestionar usuarios dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador. |
| Actor iniciador | Administrador. |
| Precondición | Sesión de administración. |
| Flujo de suceso principal | 1. Lista usuarios. 2. Crea uno con rol, o edita nombre, rol y estado. 3. Puede dejar una cuenta inactiva. |
| Poscondición | El padrón de usuarios queda actualizado. |
| Excepción | No borra su propia sesión de administrador ni duplica el correo. |

### UC24. Sucursales, temporadas y colecciones

**Diagrama de UC24**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC24. Sucursales, temporadas y colecciones |
| Propósito | Sucursales, temporadas y colecciones dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador. |
| Actor iniciador | Administrador. |
| Precondición | Sesión de administración. |
| Flujo de suceso principal | 1. Crea o edita una sucursal (ciudad y nombre). 2. Crea temporada o colección. 3. Las asigna a productos en UC09. |
| Poscondición | Esos catálogos quedan disponibles en la tienda. |
| Excepción | Nombre de sucursal vacío: no guarda. |

### UC25. Ajustar inventario y ver el kardex

**Diagrama de UC25**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC25. Ajustar inventario y ver el kardex |
| Propósito | Ajustar inventario y ver el kardex dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Encargado o administrador. |
| Actor iniciador | Encargado |
| Precondición | Sesión válida. El encargado solo opera su sucursal. |
| Flujo de suceso principal | 1. Consulta movimientos. 2. Registra un ajuste con la cantidad resultante. 3. El sistema actualiza el saldo y guarda el movimiento. |
| Poscondición | Stock y kardex coherentes. |
| Excepción | Una cantidad menor que lo reservado se rechaza. |

### UC26. Moderar opiniones y ver auditoría

**Diagrama de UC26**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC26. Moderar opiniones y ver auditoría |
| Propósito | Moderar opiniones y ver auditoría dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador. |
| Actor iniciador | Administrador. |
| Precondición | Sesión de administración. |
| Flujo de suceso principal | 1. Ve opiniones pendientes y las publica o rechaza. 2. Consulta la auditoría de accesos y cambios. |
| Poscondición | La opinión tiene estado definitivo y la auditoría sigue siendo de solo lectura. |
| Excepción | Una opinión ya moderada no vuelve a pendiente por error de doble clic. |

### UC27. Simular un pago

**Diagrama de UC27**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC27. Simular un pago |
| Propósito | Simular un pago dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta o cajero. |
| Actor iniciador | Clienta |
| Precondición | Hay una venta por confirmar. |
| Flujo de suceso principal | 1. Elige efectivo, QR, tarjeta, transferencia o mixto. 2. En tarjeta o transferencia el sistema usa la pasarela en modo prueba (Stripe de prueba, sin cargo real y sin NIT real). 3. La pasarela responde aprobado o rechazado. 4. Solo si aprueba, la venta sigue el cobro de UC05 o UC07. |
| Poscondición | Queda un pago simulado asociado a la venta. |
| Excepción | Rechazo de la simulación: no hay venta cobrada y el stock no baja. |

### UC28. Probador 3D

**Diagrama de UC28**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC28. Probador 3D |
| Propósito | Probador 3D dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta, dentro de UC03. |
| Actor iniciador | Clienta |
| Precondición | La variante tiene modelo 3D cargado por administración. |
| Flujo de suceso principal | 1. El probador detecta el modelo. 2. Ajusta la prenda al torso estimado. 3. Muestra volumen y una caída de tela simplificada. 4. Permite girar la vista o cambiar de color. |
| Poscondición | No altera stock. El modelo no se sube desde el teléfono de la clienta. |
| Excepción | Si el dispositivo no sostiene el modelo, vuelve al overlay 2D sin perder la ficha. |

### UC29. Hablar con el bot

**Diagrama de UC29**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC29. Hablar con el bot |
| Propósito | Hablar con el bot dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta. |
| Actor iniciador | Clienta. |
| Precondición | Sesión iniciada. Está en el catálogo o en una ficha. |
| Flujo de suceso principal | 1. Abre el asistente. 2. Pregunta por talla, combinación, disponibilidad o el estado de un pedido propio. 3. El bot responde con datos del catálogo, del stock y de las ventas de esa clienta. 4. Si pide un reporte de toda la empresa, indica que eso corresponde a administración. |
| Poscondición | La conversación no modifica precios ni stock. |
| Excepción | No ejecuta SQL libre ni revela datos de otra clienta. |

### UC30. Precio mayorista

**Diagrama de UC30**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC30. Precio mayorista |
| Propósito | Precio mayorista dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Administrador al configurar; clienta mayorista al comprar. |
| Actor iniciador | Administrador al configurar; clienta mayorista al comprar. |
| Precondición | El producto tiene precio mayorista y cantidad mínima. La cuenta está marcada como mayorista. |
| Flujo de suceso principal | 1. Administración carga el precio y el mínimo. 2. La clienta mayorista arma un pedido que alcanza el mínimo. 3. El servidor cobra ese precio, no el de mostrador. |
| Poscondición | La venta guarda el precio usado. |
| Excepción | Si no llega al mínimo, se aplica el precio de detalle. |

### UC31. Transferir stock entre almacenes

**Diagrama de UC31**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC31. Transferir stock entre almacenes |
| Propósito | Transferir stock entre almacenes dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Encargado o administrador. |
| Actor iniciador | Encargado |
| Precondición | Hay disponible en el almacén de origen. |
| Flujo de suceso principal | 1. Elige variante, origen, destino y cantidad. 2. Confirma. 3. El sistema resta en origen, suma en destino y escribe dos movimientos de transferencia, en una transacción. |
| Poscondición | La suma de stock de la variante no cambia; cambia su ubicación. |
| Excepción | Cantidad mayor al disponible, o el mismo almacén en ambos extremos: no transfiere. |

### UC32. Despachar un pedido

**Diagrama de UC32**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC32. Despachar un pedido |
| Propósito | Despachar un pedido dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Encargado. |
| Actor iniciador | Encargado. |
| Precondición | Existe una venta en línea pagada en simulación, con dirección (UC18). |
| Flujo de suceso principal | 1. Ve pedidos pendientes de envío. 2. Confirma el despacho. 3. El sistema marca el pedido como enviado y guarda la referencia de seguimiento simulada. 4. La clienta lo ve en su historial. |
| Poscondición | Pedido en estado enviado. El stock ya se había descontado al cobrar. |
| Excepción | No despacha una venta de caja ni un pedido ya enviado. |

### UC33. Devolver una venta

**Diagrama de UC33**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC33. Devolver una venta |
| Propósito | Devolver una venta dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cajero o clienta, según el canal. |
| Actor iniciador | Cajero |
| Precondición | La venta está cobrada y no devuelta. |
| Flujo de suceso principal | 1. Elige la venta y las líneas a devolver. 2. Confirma. 3. El sistema repone el stock, registra el movimiento y marca la devolución. 4. El pago simulado queda reembolsado en el mismo modo de prueba. |
| Poscondición | Stock repuesto y venta devuelta total o parcialmente. |
| Excepción | Devolver más unidades que las vendidas se rechaza. |

### UC34. Emitir comprobante simulado

**Diagrama de UC34**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC34. Emitir comprobante simulado |
| Propósito | Emitir comprobante simulado dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Cajero o el sistema, al cerrar UC05 o UC07. |
| Actor iniciador | Cajero |
| Precondición | Venta cobrada en simulación. |
| Flujo de suceso principal | 1. Arma el comprobante con sucursal, líneas, totales y un NIT de prueba. 2. Lo muestra en pantalla y permite imprimirlo. 3. Lo asocia a la venta. |
| Poscondición | Comprobante de laboratorio guardado. |
| Excepción | Sin venta cobrada no hay comprobante. No se envía a un servicio tributario real. |

### UC35. Usar la tienda como PWA

**Diagrama de UC35**

> Espacio para el diagrama.

| Campo | Contenido |
|-------|-----------|
| Caso de uso | UC35. Usar la tienda como PWA |
| Propósito | Usar la tienda como PWA dentro de EnsayAR, con el resultado indicado en la poscondición. |
| Actores | Clienta o cajero, en el navegador. |
| Actor iniciador | Clienta |
| Precondición | La web está instalada o cargada al menos una vez con red. |
| Flujo de suceso principal | 1. El navegador ofrece instalar la aplicación. 2. Con red, catálogo, ficha y caja funcionan contra la API. 3. Sin red, la caja sigue cobrando en cola local y el catálogo reciente sigue visible. 4. Al volver la red, la cola se sincroniza (UC07). |
| Poscondición | La operación de caja no se pierde y no se duplica al sincronizar. |
| Excepción | Una compra en línea nueva no se confirma sin red. |

## 3.1.4 Estructura de los casos de uso

La ficha de cada caso usa los mismos campos: Caso de uso, Propósito, Actores, Actor iniciador, Precondición, Flujo de suceso principal, Poscondición y Excepción. Encima de la ficha está el título **Diagrama de UCxx** y la línea *Espacio para el diagrama*, para pegar la figura de Enterprise Architect. El flujo va numerado. La excepción recoge el camino alterno y el rechazo (sin stock, sin turno, uuid duplicado, consulta que no es un SELECT permitido).
