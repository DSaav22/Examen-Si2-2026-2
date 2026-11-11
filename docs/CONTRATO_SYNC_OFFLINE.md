# Contrato de API y Sincronización Offline — EnsayAR

Este documento define el contrato compartido entre el frontend web (PWA), la aplicación móvil (React Native + SQLite) y el backend NestJS con arquitectura multi-tenant PostgreSQL por esquemas aislados (`tienda_<hex>`).

---

## 1. Contrato de API para Envíos de Lotes (`POST /sync/lote`)

### 1.1. Cabeceras de la Petición
| Cabecera | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `Authorization` | `Bearer <JWT>` | Sí | Token JWT de tienda (`tipo: 'tienda'`). Contiene `sub`, `tiendaId`, `cuentaId`, `rol`, `email`. |
| `Content-Type` | `application/json` | Sí | `application/json` |
| `X-Tienda` | `string` | Opcional | Slug de la tienda (el backend prioriza siempre el `tiendaId` autenticado en el token). |

### 1.2. Cuerpo de la Solicitud (`LoteSyncDto`)
```json
{
  "dispositivoId": "pos-terminal-01",
  "nombreDispositivo": "Caja Principal Mostrador",
  "operaciones": [
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183201",
      "tipo": "cliente",
      "creadaEn": "2026-11-11T03:30:00.000Z",
      "datos": {
        "id": "23bc958d-83a0-4d7b-93f2-891df8f346e9",
        "nombre": "Ana García",
        "email": "ana.garcia@example.bo"
      }
    },
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183202",
      "tipo": "producto",
      "creadaEn": "2026-11-11T03:35:00.000Z",
      "datos": {
        "id": "64255598-9f1a-43e0-9e36-1ef5104b0948",
        "nombre": "Camisa Oxford",
        "categoria": "camisas",
        "ocasion": "formal",
        "precioBase": 150.00,
        "almacenId": "deb8ee2b-f0a6-4397-b406-ee2d7a9080a9",
        "variantes": [
          {
            "id": "436cf903-8153-4e08-b6ee-90d0d35861d3",
            "talla": "M",
            "color": "Azul",
            "sku": "CAM-OX-AZ-M",
            "stock": 10
          }
        ]
      }
    },
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183203",
      "tipo": "venta",
      "creadaEn": "2026-11-11T03:40:00.000Z",
      "datos": {
        "almacenId": "deb8ee2b-f0a6-4397-b406-ee2d7a9080a9",
        "cajaTurnoId": "1cf8495b-9dd9-4cbc-a614-a774e26b7358",
        "clientaId": "23bc958d-83a0-4d7b-93f2-891df8f346e9",
        "medioPago": "efectivo",
        "canal": "pos",
        "lineas": [
          {
            "varianteId": "436cf903-8153-4e08-b6ee-90d0d35861d3",
            "cantidad": 2
          }
        ]
      }
    }
  ]
}
```

### 1.3. Respuesta del Servidor (HTTP 200 OK)
```json
{
  "procesadas": 3,
  "resumen": {
    "aplicada": 3
  },
  "resultados": [
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183201",
      "tipo": "cliente",
      "estado": "aplicada",
      "recursoId": "23bc958d-83a0-4d7b-93f2-891df8f346e9"
    },
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183202",
      "tipo": "producto",
      "estado": "aplicada",
      "recursoId": "64255598-9f1a-43e0-9e36-1ef5104b0948"
    },
    {
      "id": "e4b6d801-443b-486d-97a1-d7904e183203",
      "tipo": "venta",
      "estado": "aplicada",
      "recursoId": "dcef6868-299e-49ca-9823-3ed587bd2eec",
      "detalle": {
        "total": 300,
        "clientaId": "23bc958d-83a0-4d7b-93f2-891df8f346e9"
      }
    }
  ],
  "servidorEn": "2026-11-11T08:00:44.411Z"
}
```

---

## 2. Modelo de Estados por Operación

| Estado | Significado | Acción del Cliente (Web / Móvil) |
|---|---|---|
| `aplicada` | Procesada con éxito y persistida en el esquema de la tienda. | Confirmar y eliminar de la cola local de pendientes. |
| `repetida` | La operación ya fue procesada previamente con idéntico hash (idempotencia). | Tratar como éxito idempotente; confirmar y limpiar localmente. |
| `fusionada` | Cliente creado sin red cuyo email ya existía en la tienda; el ID definitivo es el existente en el servidor. | Actualizar el ID local del cliente al `recursoId` del servidor y reasignar las ventas locales pendientes dependientes. |
| `conflicto` | Error de concurrencia de negocio (ej. `STOCK_INSUFICIENTE` por venta de última unidad). | Mantener en cola de conflictos; presentar al usuario opciones de «Vender lo disponible» o «Descartar». |
| `rechazada` | Rechazo definitivo por validación de negocio (datos inválidos, pago no efectivo, reloj en futuro, referencia ajena). | Marcar con error en la interfaz; no se reintenta automáticamente con los mismos datos. |
| `vencida` | La operación tiene una antigüedad mayor a la ventana offline configurada (`ventanaOfflineDias`). | Notificar que requiere autorización o revisión manual de un administrador. |
| `en_curso` | Otra petición concurrente está procesando la operación en este instante. | Mantener pendiente para la siguiente pasada de sincronización. |
| `error` | Error inesperado transitorio en el servidor. | No se consume la operación; se conserva para reintento automático. |

---

## 3. Reglas de Conflicto de Stock y Resolución

### 3.1. Detección Atómica sin Red Negativa
1. La deducción de stock en caja utiliza actualización condicional atómica a nivel de base de datos:
   ```sql
   UPDATE stock_almacen
   SET cantidad = cantidad - $cantidad
   WHERE tienda_id = $tiendaId
     AND almacen_id = $almacenId
     AND variante_id = $varianteId
     AND cantidad - reservado >= $cantidad;
   ```
2. Si el número de filas afectadas es `0`, significa que otra caja vendió las unidades antes o el stock remanente es menor al pedido.
3. Se aborta la transacción (`ROLLBACK`), revirtiendo la venta, líneas y movimientos. El stock **nunca queda en números negativos**.
4. La operación se devuelve con estado `conflicto`:
   ```json
   {
     "id": "e4b6d801-443b-486d-97a1-d7904e183204",
     "tipo": "venta",
     "estado": "conflicto",
     "codigo": "STOCK_INSUFICIENTE",
     "mensaje": "Stock insuficiente: había 0 y la venta pedía 1. Otra caja vendió antes.",
     "detalle": {
       "varianteId": "436cf903-8153-4e08-b6ee-90d0d35861d3",
       "disponible": 0,
       "pedido": 1
     }
   }
   ```
5. Se notifica automáticamente a los usuarios con rol `ADMIN` y `ENCARGADO` de la tienda.

### 3.2. Mecanismos de Resolución
- **Vender lo disponible:** La aplicación genera un nuevo UUID y reenviará la venta ajustada a las unidades disponibles (`Math.min(pedido, disponible)`).
- **Descartar:** El administrador o encargado descarta el conflicto vía:
  `POST /sync/operaciones/:id/descartar`
  Se cambia el estado a `descartada` y se emite auditoría (`sync_conflicto_descartado`).

---

## 4. Aislamiento por Esquema PostgreSQL y Rollback

1. **Aislamiento de almacenamiento:** Cada tienda opera en un esquema PostgreSQL independiente (`tienda_<hex>`). Toda consulta de sincronización se ejecuta sobre `esquemas.clienteTienda(tiendaId)`.
2. **Rechazo de referencias cruzadas:** `exigirDeLaTienda` valida `almacenId`, `cajaTurnoId`, `varianteId` y `clientaId` en el esquema de la tienda activa. Cualquier referencia de otra tienda es rechazada con `REFERENCIA_NO_EXISTE`.
3. **Rollback completo:** Cada operación del lote se ejecuta en su propia transacción ACID. Si la operación falla, se deshace íntegramente sin dejar ventas huérfanas ni movimientos de stock parciales.

---

## 5. Colección de Pruebas HTTP para Postman

### Caso 1: Enviar Lote de Sincronización
- **Método:** `POST`
- **URL:** `{{baseUrl}}/sync/lote`
- **Headers:**
  - `Authorization: Bearer {{tokenTienda}}`
  - `Content-Type: application/json`
- **Body:** Ver sección 1.2.
- **Resultado Esperado:** `200 OK`, `resumen: { "aplicada": 3 }`.

### Caso 2: Reenvío Idempotente
- **Método:** `POST`
- **URL:** `{{baseUrl}}/sync/lote`
- **Body:** Mismo cuerpo del Caso 1.
- **Resultado Esperado:** `200 OK`, `resumen: { "repetida": 3 }`.

### Caso 3: Venta con Stock Insuficiente (Conflicto)
- **Método:** `POST`
- **URL:** `{{baseUrl}}/sync/lote`
- **Body:** Operación de venta de una unidad ya agotada por otra terminal.
- **Resultado Esperado:** `200 OK`, `estado: "conflicto"`, `codigo: "STOCK_INSUFICIENTE"`.

### Caso 4: Venta con Almacén de Otra Tienda
- **Método:** `POST`
- **URL:** `{{baseUrl}}/sync/lote`
- **Body:** Venta enviada con `almacenId` perteneciente a otra tienda.
- **Resultado Esperado:** `200 OK`, `estado: "rechazada"`, `codigo: "REFERENCIA_NO_EXISTE"`.

### Caso 5: Consultar Operaciones en Conflicto
- **Método:** `GET`
- **URL:** `{{baseUrl}}/sync/operaciones?estado=conflicto`
- **Headers:** `Authorization: Bearer {{tokenAdmin}}`
- **Resultado Esperado:** `200 OK`, lista de operaciones en conflicto con detalles de stock.

### Caso 6: Descartar Conflicto de Sincronización
- **Método:** `POST`
- **URL:** `{{baseUrl}}/sync/operaciones/:id/descartar`
- **Headers:** `Authorization: Bearer {{tokenAdmin}}`
- **Resultado Esperado:** `200 OK`, `{ "id": ":id", "estado": "descartada" }`.

### Caso 7: Configuración de Ventana Offline
- **Método:** `PATCH`
- **URL:** `{{baseUrl}}/sync/politica`
- **Headers:** `Authorization: Bearer {{tokenAdmin}}`
- **Body:** `{ "ventanaOfflineDias": 14 }`
- **Resultado Esperado:** `200 OK`, `{ "ventanaOfflineDias": 14, ... }`.
