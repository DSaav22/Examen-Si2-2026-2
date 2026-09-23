# Catálogo demo femenino

El script `backend/scripts/seed-catalogo-demo.ts` carga 40 productos variados
de mujer, 80 variantes y stock en los almacenes existentes.

```powershell
cd backend
npm run demo:catalog
```

La carga es idempotente: usa identificadores estables y `upsert`, por lo que se
puede repetir sin duplicar los registros ni borrar el catálogo actual. Los
productos quedan identificados por SKUs con el prefijo `VESTA-DEMO-`.

No ejecutar `npm run demo:reset` para esta operación: ese comando ejecuta el
seed general del proyecto, que recrea los datos base y puede borrar datos.

Las fotos se guardan como URLs remotas de Unsplash en `Variante.urlFoto` para
mantener el esquema actual. Son imágenes editoriales de demostración; antes de
publicar el catálogo deben reemplazarse por fotografías propias o por recursos
con derechos comerciales verificados.
