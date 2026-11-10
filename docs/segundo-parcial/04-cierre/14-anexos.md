# 14. Anexos

## 14.1 Repositorio

El código está en https://github.com/DSaav22/Examen-Si2-2026-2 (backend, frontend, móvil, infraestructura y documentación). Este informe está en `docs/segundo-parcial`; el del primer parcial, en `docs/parcial`.

## 14.2 URL de despliegue y código QR

URL de despliegue: se completa al publicar.

Espacio para el código QR de la web o del repositorio.

## 14.3 Puesta en marcha local

Requisitos: Node.js 20 o superior, PostgreSQL 16 y las variables de entorno de `backend/.env.example` copiadas a `backend/.env`.

```
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run demo:saas
npm run datos:reportes
npm run start:dev
```

```
cd frontend
npm install
npm run dev
```

```
cd movil
npm install
npx expo start
```

La API queda en el puerto 3000 y la web en el 5173. En un teléfono, la app móvil debe apuntar a la IP de la máquina donde corre la API, no a localhost.

## 14.4 Verificaciones automáticas

Con la API en marcha, desde la carpeta `backend`:

| Comando | Qué comprueba |
|---|---|
| `npm run verificar:tenancy` | Que ninguna tienda lee ni modifica datos de otra, y que sin contexto de tienda el acceso falla |
| `npm run verificar:saas` | Registro, verificación de correo, pago idempotente, alta de tienda, cambio de tienda, límites del plan y métricas |
| `npm run verificar:offline` | Lotes de sincronización, reintentos idempotentes, conflicto de la última unidad y ventana offline |
| `npm run verificar:reportes` | Interpretación, validación, compilación, aislamiento por tienda, PDF y Excel |
| `npm test` | Pruebas unitarias (catálogo, venta concurrente, SQL seguro, ficha) |

## 14.5 Cuentas de demostración

Clave de todas las cuentas: `diego`. Solo para el laboratorio.

| Rol | Correo |
|-----|--------|
| Dueño de la plataforma | superadmin@ensayar.bo |
| Administración (Vesta, Aurora, Andes) | admin@ensayar.bo |
| Caja | cajero@ensayar.bo |
| Encargado de sucursal | encargado@ensayar.bo |
| Proveedor | proveedor@ensayar.bo |
| Clienta | clienta@ensayar.bo |
| Dueñas de las tiendas demo | duena@aurora.demo, duena@andes.demo, duena@nueva.demo y las demás `duena@<tienda>.demo` |

Tarjeta de prueba aprobada: `4242 4242 4242 4242`. Rechazos simulados: `4000 0000 0000 0002` (rechazada), `4000 0000 0000 9995` (fondos insuficientes), `4000 0000 0000 0069` (vencida).

## 14.6 Regenerar el modelo de Enterprise Architect

El modelo ICONIX se genera por automatización COM desde `docs/segundo-parcial/iconix/casos.py`, que es la única fuente de requisitos, casos de uso, robustez y secuencias.

1. Instalar Python 3 y el paquete `pywin32`.
2. Habilitar el motor JET 4 de Enterprise Architect: en el registro, `HKCU\Software\Sparx Systems\EA400\EA\OPTIONS`, valor DWORD `JET4` igual a 1. Sin ese valor EA abre un aviso modal y la automatización queda detenida.
3. Cerrar Enterprise Architect si tiene abierto el archivo del modelo.
4. Desde `docs/segundo-parcial/iconix` ejecutar `python generar_ea.py`. Reconstruye el paquete "ICONIX segundo parcial" dentro de `diagramas/EnsayAR-ICONIX.eapx`, sin tocar el modelo del primer parcial, y exporta las imágenes a `imagenes/ea`. Con `--solo UC07,UC44` regenera solo esos casos; con `--sin-exportar` omite las imágenes.
5. Ejecutar `python generar_md.py` para regenerar los capítulos 9.1 a 9.4 con las figuras numeradas.

## 14.7 Generar este informe

Desde `docs/segundo-parcial` ejecutar `python _build_docx.py`. Requiere `python-docx`. Produce `EnsayAR-Informe-Segundo-Parcial.docx` y, si Microsoft Word está instalado, también el PDF.
