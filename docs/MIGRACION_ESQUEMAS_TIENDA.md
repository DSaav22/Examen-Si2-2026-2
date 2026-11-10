# Migración a un esquema PostgreSQL por tienda

Estado: **en preparación; el backend sigue usando tablas compartidas y `tienda_id`**. No utilizar el generador de nombres como señal de que ya exista aislamiento por esquema.

## Objetivo

Mantener cuentas globales, planes y suscripciones en un esquema de plataforma y aislar los datos operativos de cada tienda en un esquema PostgreSQL propio. El nombre interno se deriva del UUID de tienda con `nombreSchemaTienda` y no del nombre comercial. La decisión de alcance es una base PostgreSQL, no una base por ciudad.

## Estado comprobado

- La base local original tiene cuatro migraciones anteriores sin aplicar; no se modificó.
- Se generó un respaldo PostgreSQL `pg_dump` de la base original y se restauró en un contenedor PostgreSQL 18 aislado. En esa copia se aplicaron con éxito las cuatro migraciones anteriores. El archivo y la base restaurada contienen datos del usuario: tratarlos como información privada.
- En un contenedor PostgreSQL aislado y vacío se aplicaron las 16 migraciones existentes correctamente. Esto no comprueba su aplicación sobre los datos existentes ni prueba el modelo por esquemas.
- El ensayo `backend/scripts/ensayo-esquemas-aislado.sql`, limitado a la base `ensayar_prueba` y revertido al terminar, creó dos esquemas con 39 tablas cada uno. Copió los registros de dos tiendas de prueba, comparó el número de filas por tabla, reconstruyó claves foráneas y comprobó el destino local de variante→producto, el destino global de usuario→cuenta y separación de categorías. Es un ensayo en base aislada: no copia los datos reales, no verifica vistas, secuencias, rendimiento ni adapta Prisma o el backend.
- Hay identidad global y consultas que recorren perfiles de varias tiendas (`CuentasService.tiendasDe`).
- La creación de tienda mezcla, en una transacción, entidades de plataforma y entidades de negocio.
- Varias transacciones de stock, caja y reservas usan SQL directo; reportes usan vistas y SQL directo con contexto de tienda.
- Prisma vincula modelos a esquemas y las consultas SQL directas usan el esquema de conexión. No basta con cambiar el `search_path` para garantizar la separación de forma segura.
- En la copia PostgreSQL 18, un experimento persistió dos esquemas aislados con copias de los datos de prueba. Dos clientes Prisma con diferentes valores `schema` consultaron 45 productos en la tienda A y ninguno en B; también funcionó la lectura de variantes y de una vista a cuentas globales.
- El mismo experimento detectó un bloqueo reproducible al crear una tienda y su suscripción por vistas de plataforma: PostgreSQL devuelve `42704`, porque Prisma intenta usar el tipo `ensayo_tienda_a.EstadoTienda` y ese enum no existe. Las tablas copiadas con `LIKE` usan los tipos originales de `public`; crear el tipo por sí solo no garantiza compatibilidad de columnas, vistas, transacciones y parámetros. No se debe redirigir el backend a los esquemas hasta resolver y probar esos casos.
- El ensayo se amplió para copiar los enums y convertir las columnas de cada tienda al tipo de su propio esquema; los filtros Prisma de roles y estados de venta ya pasan con datos de la copia. Sigue fallando filtrar el estado de una tienda global a través de una vista, porque esa vista conserva el enum de `public`. Los casts implícitos entre enums tampoco resolvieron el operador de comparación. Es necesario separar correctamente las consultas de plataforma y de tienda y preservar la atomicidad de las operaciones que tocan ambas.

## Trabajo necesario antes del cambio real

1. Definir y probar los límites de plataforma y negocio, incluidas claves foráneas, tipos PostgreSQL, vistas, secuencias, reportes, usuarios y descubrimiento de membresías.
2. Diseñar el cliente por tenant y su ciclo de conexiones, autenticación, transacciones, trabajos y notificaciones. Comprobar explícitamente referencias entre cuentas globales y perfiles de tienda.
3. Generar y versionar el aprovisionamiento de un esquema nuevo y la aplicación de migraciones a todos los esquemas; ante fallo debe quedar visible y recuperable.
4. Preparar una copia verificable de la base original y un mecanismo de reversión. Probar sobre una restauración aislada con datos representativos; inventariar registros huérfanos o inconsistencias antes de moverlos.
5. Copiar los datos por tienda sin borrar la fuente, cotejar conteos y relaciones, comprobar ventas, stock, permisos y reportes con al menos dos tiendas y fallar de forma segura ante cualquier diferencia.
6. Ensayar una transición consistente sin escrituras perdidas, proteger conexiones y respaldos, y definir cómo volver atrás. Mantener las cuatro migraciones previas separadas del cambio a esquemas y examinar sus efectos sobre los datos existentes.
7. Aplicar el cambio a la base original solamente una vez que el ensayo y la restauración hayan pasado, con un respaldo recuperable y preservando los datos.

## Criterios de aceptación

- Una tienda no lee ni modifica datos de otra, incluso al conocer identificadores y usar SQL directo.
- Cuenta global, selector de tiendas y roles funcionan con una persona asociada a varias tiendas.
- Crear tienda completa su esquema y sus datos iniciales o deja un estado recuperable sin registros parcialmente activos.
- Las ventas, reservas, sincronización offline y reportes se ejecutan con el esquema correcto durante operaciones concurrentes.
- Las migraciones son reproducibles para una tienda nueva y para todas las tiendas existentes.
- Los datos migrados coinciden y la restauración del respaldo ha sido ensayada.

Referencias: [Prisma: varios esquemas](https://docs.prisma.io/docs/orm/v6/prisma-schema/data-model/multi-schema), [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html).
