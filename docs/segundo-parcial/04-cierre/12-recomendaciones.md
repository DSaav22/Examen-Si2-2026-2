# 12. Recomendaciones

**Aislamiento en la base de datos.** El aislamiento actual vive en la aplicación. Se recomienda agregar políticas de seguridad por fila (RLS) de PostgreSQL sobre `current_setting('app.tienda_id')` como segunda barrera, para que un error de código no pueda filtrar datos aunque omita la extensión de Prisma.

**Pasarela real.** Reemplazar la pasarela simulada de la suscripción por la pasarela elegida en el capítulo 5, en modo de pruebas primero, verificando la firma de los webhooks y conservando la clave de idempotencia ya existente.

**Correo transaccional.** En producción, configurar un servicio de correo para la verificación de cuentas y los avisos de vencimiento; hoy el envío es simulado cuando no hay servidor de correo.

**Despliegue.** Volver a publicar la plataforma en la nube con dominio propio, HTTPS (requisito de la PWA y de Web Push) y base de datos administrada, y renovar la clave de Azure OpenAI del entorno de demostración.

**Móvil.** Probar la cola SQLite y la sincronización en dispositivos Android físicos con cortes de red reales, no solo en Expo web, y medir el tamaño de la base local con la ventana offline máxima de 30 días.

**Reportes.** Registrar los pedidos que el intérprete no entiende para ampliar sinónimos y fuentes, y agregar gráficos al resultado y al PDF. Limitar el uso del intérprete con IA por plan, porque cada pedido tiene costo.

**Sincronización.** Si el volumen crece, separar la cola de sincronización y los reportes pesados en trabajadores en segundo plano, manteniendo el monolito modular como base.

**Analítica.** Reentrenar los modelos con datos reales de cada tienda cuando haya historia suficiente, y mostrar siempre la precisión del modelo junto a la predicción.

**Pruebas.** Convertir los scripts `verificar:*` en pruebas de integración ejecutadas en cada cambio, y agregar pruebas de extremo a extremo del alta de tienda y del simulacro de corte de red.
