# Respaldos PostgreSQL de EnsayAR

Estos archivos contienen datos de usuarios, incluidos correos y hashes de contraseñas. El propietario autorizó expresamente su publicación; limitar el acceso al repositorio y tratar los respaldos como información sensible.

- `ensayar_antigua_20261111.dump`: base local antigua `ensayar` (servidor PostgreSQL 18.3).
- `ensayar_copia_20261111.dump`: base `ensayar_copia` (servidor PostgreSQL 18.6), incluidos `public` y los esquemas de tiendas.

Son capturas del 11 de noviembre de 2026 en formato personalizado `pg_dump -Fc`. No se actualizan automáticamente al cambiar la base. Para restaurarlos, usar PostgreSQL 18 y `pg_restore` sobre bases nuevas y vacías distintas; validar el destino y conservar un respaldo previo antes de operar sobre una base existente. Ejemplo para una base vacía ya creada:

```sh
pg_restore --no-owner --no-acl --exit-on-error -U USUARIO -d BASE_DESTINO ensayar_copia_20261111.dump
```

No ejecutar seeds ni restaurar encima de datos existentes sin evaluar sus efectos. Las contraseñas de la conexión y claves de servicios se configuran por separado y no se incluyen en este archivo.
