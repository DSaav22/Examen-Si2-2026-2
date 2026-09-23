# Integraci?n MCP de Enterprise Architect

## Estado

La configuraci?n del servidor MCP fue agregada a `.vscode/mcp.json`.

La m?quina tiene instalado `.NET Desktop Runtime 10`, Enterprise Architect Trial 15 de 32 bits y MCP Server for Enterprise Architect 3.0.4. El ejecutable fue instalado correctamente y la prueba de arranque STDIO fue exitosa.

## Requisitos

- Windows 10 u 11.
- Enterprise Architect instalado.
- Enterprise Architect 17.1 o una versi?n compatible.
- Evitar Enterprise Architect 17.2 por incompatibilidades documentadas por Sparx.
- Microsoft .NET Desktop Runtime 10.
- Cliente MCP compatible con STDIO.
- Instalador oficial del MCP de Sparx Systems.

## Configuraci?n actual

El proyecto espera encontrar el ejecutable en:

    C:\Program Files (x86)\Sparx Systems\EA Trial\MCP_Server\MCP3.exe

Si se utiliza Enterprise Architect de 32 bits, la ruta esperada debe cambiarse a:

    C:\Program Files (x86)\Sparx Systems\EA Trial\MCP_Server\MCP3.exe

La configuraci?n utiliza `-enableEdit` para permitir crear y modificar elementos y diagramas. `-enableDelete` permanece desactivado para evitar eliminaciones accidentales.

## Instalaci?n realizada

1. Enterprise Architect Trial 15 x86 fue localizado en `C:\Program Files (x86)\Sparx Systems\EA Trial\EA.exe`.
2. Se descarg? el instalador oficial x86 de Sparx Systems.
3. Se instal? MCP Server for Enterprise Architect 3.0.4 con elevaci?n administrativa.
4. Se verific? `C:\Program Files (x86)\Sparx Systems\EA Trial\MCP_Server\MCP3.exe`.
5. Se verific? que el proceso MCP3 inicia y espera comunicaci?n STDIO.

## Primer uso

1. Abrir Enterprise Architect.
2. Abrir un proyecto UML.
3. Abrir un diagrama.
4. Abrir VS Code en este repositorio.
5. Ejecutar `MCP: List Servers`.
6. Confirmar que aparece `Enterprise Architect`.
7. Revisar la ventana Output si el servidor no inicia.

## Funciones esperadas

El MCP permite consultar:

- Diagrama actual.
- Diagramas abiertos.
- Informaci?n de diagramas.
- Im?genes de diagramas.
- Elementos.
- Conectores.
- Paquetes.
- Elementos seleccionados.
- B?squeda de elementos y paquetes.

Tambi?n dispone de funciones para crear y modificar diagramas, elementos, conectores y paquetes, pero se mantienen deshabilitadas inicialmente.

## Uso recomendado para EnsayAR

Primero crear en Enterprise Architect estos paquetes:

- Autenticaci?n.
- Cat?logo.
- Clientes.
- Inventario.
- Ventas.
- POS.
- Caja.
- Reservas.
- Administraci?n.
- Reportes.
- Offline y sincronizaci?n.
- Despliegue.

Luego construir progresivamente:

1. Diagrama de contexto.
2. Casos de uso.
3. Paquetes.
4. Arquitectura por capas.
5. Clases desde `backend/prisma/schema.prisma`.
6. Modelo relacional.
7. Secuencia de login.
8. Secuencia de venta POS.
9. Secuencia de venta offline.
10. Actividad de inventario.
11. Despliegue web, m?vil, API, PostgreSQL y Azure.

El MCP no analiza autom?ticamente todo el repositorio para producir un modelo UML correcto. El modelo debe definirse en Enterprise Architect usando el contexto t?cnico documentado en `docs/Contexto completo del proyecto.md`.

## Seguridad

No habilitar `-enableDelete` para este proyecto sin realizar una copia del archivo del modelo de Enterprise Architect.

No habilitar `-enableEdit` hasta que el modelo inicial est? respaldado y se haya probado el flujo de lectura.

El MCP comunica informaci?n del modelo al cliente MCP local. Si el cliente utiliza un LLM remoto, revisar la pol?tica de privacidad antes de enviar modelos que contengan informaci?n sensible.

## Diagn?stico

Si VS Code no muestra el servidor:

1. Confirmar que existe `MCP3.exe` en la ruta configurada.
2. Confirmar que Enterprise Architect est? instalado y abierto.
3. Confirmar que hay un proyecto y diagrama abiertos.
4. Ejecutar `MCP: List Servers`.
5. Revisar la ventana Output de VS Code.
6. Revisar los logs de Sparx en `%APPDATA%\Sparx Systems\EA\MCP_EA.log` y `MCP_EA_Errors.log`.

## Fuentes

- https://www.sparxsystems.jp/en/MCP/
- P?gina oficial del MCP Server for Enterprise Architect.
