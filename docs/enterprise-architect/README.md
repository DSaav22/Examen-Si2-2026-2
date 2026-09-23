# Modelo UML de EnsayAR para Enterprise Architect

Esta carpeta contiene el paquete de trabajo para modelar EnsayAR en Enterprise Architect.

## Estado

- El MCP de Enterprise Architect est? instalado en Windows.
- La configuraci?n est? en ../.vscode/mcp.json.
- La edici?n del modelo est? habilitada con -enableEdit.
- La eliminaci?n permanece deshabilitada.
- El archivo EnsayAR_Model.eapx es una copia base de Enterprise Architect y no debe confundirse con un modelo final.
- Los archivos .puml contienen las vistas UML y de arquitectura que deben importarse o recrearse en Enterprise Architect.

## Fuentes

El contenido se basa en:

- ../../backend/prisma/schema.prisma
- ../../backend/src/
- ../../frontend/src/App.tsx
- ../../docs/Contexto completo del proyecto.md

## Orden recomendado

1. 01-casos-de-uso.puml
2. 02-paquetes.puml
3. 03-comunicacion-venta-pos.puml
4. 04-clases-analisis.puml
5. 05-analisis-paquetes.puml
6. 06-diseno-fisico.puml
7. 07-secuencia-login.puml
8. 08-secuencia-venta-pos.puml
9. 09-secuencia-offline.puml
10. 10-actividad-inventario.puml
11. 11-despliegue.puml

## Alcance excluido

El chatbot con IA y el probador virtual no se modelan como funcionalidades terminadas. Existen prototipos o reglas determin?sticas, pero no forman parte del n?cleo implementado.

## Nota

El MCP puede consultar y modificar el modelo abierto en Enterprise Architect. Para que cree elementos directamente, Enterprise Architect debe estar abierto con el proyecto y el diagrama seleccionados, y el cliente MCP debe mostrar el servidor Enterprise Architect conectado.

