# Gemini para chatbot y reportes

El cliente compartido `backend/src/ia/modelo.client.ts` utiliza Gemini mediante `generateContent`. Se configura únicamente en el backend:

```dotenv
GEMINI_API_KEY=clave-local-no-publicar
GEMINI_MODEL=gemini-3.1-flash-lite
```

La clave se envía en la cabecera `x-goog-api-key`, nunca en la URL ni al frontend. Las variables `AZURE_OPENAI_*` ya no se usan para texto. El probador FLUX conserva su cliente y sus variables independientes `AZURE_AI_*` y `AZURE_FLUX_*`.

El chatbot conserva su contexto de catálogo y las restricciones sobre pedidos y reportes administrativos. Los reportes solicitan respuesta JSON; el backend mantiene el validador de especificación y la compilación de SQL parametrizado por tienda. Los registros conservan `motor=modelo` o `fuente=modelo` cuando responde Gemini y `reglas` cuando se utiliza el respaldo local.

Ante errores HTTP, cuota agotada, tiempo de espera, bloqueo o respuesta truncada, el cliente devuelve un resultado vacío para que el servicio aplique su respaldo. No se imprimen respuestas de error del proveedor ni excepciones que puedan contener credenciales. Tras cambiar el `.env`, reiniciar el backend.

La prueba inicial previa al cambio respondió HTTP 200 con «OK.» usando el modelo configurado. Para comprobar la integración, verificar además el origen `modelo` en los endpoints de chatbot y reportes; una respuesta por reglas no demuestra uso de Gemini.

## Verificación local del 11 de noviembre de 2026

- Consulta directa previa: HTTP 200, respuesta «OK.».
- Chatbot: `POST /ia/bot`, HTTP 201 y `fuente=modelo`.
- Reporte completo: `POST /reportes/inteligente`, HTTP 201 y `motor=modelo`; interpretación validada y consulta ejecutada. Se usó una tienda sintética existente sin ventas para ese período, por lo que devolvió cero filas.
- 147 pruebas del backend aprobadas y compilaciones de backend y frontend correctas.
- Durante las pruebas se observó un HTTP 503 transitorio del proveedor; el respaldo local se activó. Una nueva ejecución confirmó ambos endpoints con Gemini. El intérprete de reportes conserva su pausa de cinco minutos tras una caída del modelo.

El script `backend/scripts/verificar-gemini-http.cjs` realiza llamadas reales a Gemini a través de la API local, usa un perfil de una tienda de prueba ya existente y registra el reporte de verificación en esa tienda. No crea tenants nuevos ni muestra credenciales o información de clientes. La verificación se limita al entorno local; no implica despliegue en nube ni prueba de micrófono.
