# Tiendas publicadas en la portada

`GET /plataforma/directorio` muestra las tiendas activas, con suscripción vigente y `esPrueba=false`. Solo devuelve nombre, slug, logo y país.

Las altas normales tienen `esPrueba=false` por defecto y aparecen automáticamente; no hay una lista fija limitada a Vesta y Trendify. No se aceptan campos de prueba en el formulario público.

El campo explícito `es_prueba` separa los ensayos de las tiendas reales sin borrar ventas, suscripciones ni esquemas. Los scripts de laboratorio deben crear tiendas con `esPrueba=true` o marcarlas inmediatamente después de un alta por HTTP. Para un proceso dedicado de pruebas, `TENANT_ALTA_PRUEBA=true` marca sus altas automáticamente; no activar esa configuración en el proceso de uso normal.

Se clasificaron 49 fixtures conocidos de la copia local `ensayar_copia`; se conservaron Vesta y Trendify como tiendas reales. El script `backend/scripts/clasificar-tiendas-prueba.cjs` limita la ejecución a esa copia local y comprueba nombre y slug de los fixtures. Sin `--apply` solo informa lo que clasificaría. No se ejecuta automáticamente y no afecta altas manuales futuras.
