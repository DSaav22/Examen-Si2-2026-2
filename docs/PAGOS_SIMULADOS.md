# Pagos simulados por país

Todos los métodos son demostraciones locales: no hay conexión con proveedores ni cobros reales.
El país de origen es el país registrado de la **tienda**, no la ubicación del dispositivo ni la nacionalidad del comprador. En el alta se elige el país; al renovar y comprar se usa el país persistido de la tienda autorizada.

## Pantallas

- Alta (`/plataforma/nueva`) y renovación (`/plataforma`): métodos del país, tarjetas de prueba y selección de resultado aprobado/rechazado para los demás métodos.
- Carrito (`/carrito`) y POS (`/pos`): botones cargados desde `GET /pagos/metodos`, que obtiene el país del contexto de tienda del servidor.
- Móvil: bolsa y caja ofrecen los mismos métodos por país; los pagos electrónicos requieren conexión y confirmación simulada. Sin conexión se conserva el cobro POS en efectivo.

## Contrato y controles

`backend/src/pagos/metodos-pais.ts` es el catálogo y la política de demostración. No certifica cobertura comercial real.
Pix se ofrece en BR; Yape y Plin en PE; QR boliviano en BO. Los países desconocidos no tienen métodos electrónicos habilitados.

Las ventas conservan el enum `medioPago` existente y agregan `metodoPasarela` opcional. Tarjeta y transferencia usan su categoría; billeteras y métodos locales usan el canal electrónico `qr`. El servidor comprueba que categoría, método y país sean compatibles antes de modificar ventas o stock. Un QR antiguo sin método explícito solo representa `qr_bolivia`.

Tarjetas, billeteras y transferencias generan un pago pendiente con stock reservado. La referencia `SIM:<metodo>:<venta>` conserva el método sin cambiar el esquema de base de datos. Al aprobar se cobra la venta; al rechazar se anula y libera la reserva. Se valida nuevamente el país al resolver el pago. Repetir un resultado ya aplicado lo devuelve sin volver a modificar caja, stock ni emitir avisos; intentar cambiarlo produce conflicto. Las peticiones concurrentes se protegen con la actualización condicional y la transacción existentes.

No es posible cambiar el país de una renovación enviándolo desde el cliente. Los reintentos de alta con otro país se rechazan. Las pantallas limpian métodos antiguos al cargar otro país y bloquean envíos repetidos mientras esperan respuesta.

## Validación local

Las pruebas cubren rechazo de combinaciones extranjeras en altas, renovaciones y ventas; consulta de métodos según tienda; nueva validación al resolver; aprobación, rechazo y reenvío sin doble movimiento.

Se verificó integralmente en el laboratorio aislado PostgreSQL (`ensayar_copia`) mediante:
- `backend/src/ventas/ventas-retail-esquemas.spec.ts` (16 pruebas unitarias y de concurrencia automatizadas).
- `backend/scripts/verificar-ventas-esquemas.ts` (ejecución directa sobre esquemas aislados de `ensayar_copia` en PostgreSQL).

## Ejemplos para Postman (sin credenciales)

Variables recomendadas en la colección o entorno:
- `baseUrl`: `http://127.0.0.1:3000` (o puerto del entorno de pruebas)
- `token`: `<JWT_BEARER_TOKEN>`
- `tiendaId`: `00000000-0000-4000-8000-000000000001`

### 1. Consultar métodos de pago disponibles según país de la tienda
```http
GET {{baseUrl}}/pagos/metodos
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
```
**Respuesta esperada (200 OK):**
```json
{
  "pais": "BO",
  "metodos": [
    { "codigo": "tarjeta", "nombre": "Tarjeta de débito o crédito", "simulado": true },
    { "codigo": "qr_bolivia", "nombre": "QR interoperable", "simulado": true },
    { "codigo": "transferencia", "nombre": "Transferencia bancaria", "simulado": true },
    { "codigo": "binance_pay", "nombre": "Binance Pay", "simulado": true }
  ]
}
```

### 2. Crear compra web con método electrónico simulado (QR Bolivia / Pix / Mercado Pago)
```http
POST {{baseUrl}}/ventas
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
Idempotency-Key: e1a5b8c2-3d4f-4e5a-9b1c-7f8e9d0a1b2c
Content-Type: application/json

{
  "uuid": "e1a5b8c2-3d4f-4e5a-9b1c-7f8e9d0a1b2c",
  "canal": "online",
  "medioPago": "qr",
  "metodoPasarela": "qr_bolivia",
  "almacenId": "{{almacenId}}",
  "direccionId": "{{direccionId}}",
  "lineas": [
    {
      "varianteId": "{{varianteId}}",
      "cantidad": 1
    }
  ]
}
```
**Respuesta esperada (201 Created):**
```json
{
  "id": "venta-uuid-generado",
  "uuid": "e1a5b8c2-3d4f-4e5a-9b1c-7f8e9d0a1b2c",
  "canal": "online",
  "estado": "pendiente_pago",
  "medioPago": "qr",
  "total": "120.00",
  "pago": {
    "id": "pago-sim-uuid",
    "estado": "pendiente",
    "referencia": "SIM:qr_bolivia:venta-uuid-generado"
  }
}
```

### 3. Aprobar pago simulado
```http
POST {{baseUrl}}/pagos/{{pagoId}}/simular
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
Idempotency-Key: {{pagoId}}:aprobado
Content-Type: application/json

{
  "resultado": "aprobado"
}
```
**Respuesta esperada (200 OK):**
```json
{
  "id": "{{pagoId}}",
  "estado": "aprobado",
  "actualizado": "2026-11-11T08:00:00.000Z",
  "venta": {
    "id": "{{ventaId}}",
    "estado": "cobrada"
  }
}
```

### 4. Rechazar pago simulado (liberación de stock reservado)
```http
POST {{baseUrl}}/pagos/{{pagoId}}/simular
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
Idempotency-Key: {{pagoId}}:rechazado
Content-Type: application/json

{
  "resultado": "rechazado"
}
```
**Respuesta esperada (200 OK):**
```json
{
  "id": "{{pagoId}}",
  "estado": "rechazado",
  "actualizado": "2026-11-11T08:00:00.000Z",
  "venta": {
    "id": "{{ventaId}}",
    "estado": "anulada"
  }
}
```

### 5. Venta POS en caja con efectivo
```http
POST {{baseUrl}}/ventas
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
Idempotency-Key: f2b6c9d3-4e5f-5a6b-0c2d-8e9f0a1b2c3d
Content-Type: application/json

{
  "uuid": "f2b6c9d3-4e5f-5a6b-0c2d-8e9f0a1b2c3d",
  "canal": "pos",
  "medioPago": "efectivo",
  "cajaTurnoId": "{{cajaTurnoId}}",
  "almacenId": "{{almacenId}}",
  "lineas": [
    {
      "varianteId": "{{varianteId}}",
      "cantidad": 1
    }
  ]
}
```

### 6. Devolución de venta
```http
POST {{baseUrl}}/devoluciones
Authorization: Bearer {{token}}
X-Tienda: {{tiendaId}}
Idempotency-Key: dev-uuid-key-01
Content-Type: application/json

{
  "ventaId": "{{ventaId}}",
  "lineas": [
    {
      "lineaId": "{{lineaVentaId}}",
      "cantidad": 1
    }
  ]
}
```
**Respuesta esperada (201 Created):**
```json
{
  "id": "dev-generado-uuid",
  "estado": "devuelta",
  "pagoEstado": "reembolsado",
  "reembolso": 120
}
```

## Limitaciones de los métodos simulados

1. **Sin conectividad externa real:** No se conectan pasarelas sandbox externas, adquirentes ni webhooks bancarios. Las referencias `SIM:<metodo>:<ventaId>` se resuelven internamente.
2. **Entorno de demostración:** Todos los métodos llevan el atributo `simulado: true`. No se debe ingresar números de tarjetas bancarias reales ni datos financieros sensibles.
3. **Aislamiento en esquemas:** Los movimientos de stock, ventas y devoluciones se registran exclusivamente en el esquema PostgreSQL de la tienda autorizada (`tienda_<uuid>`).
4. **Suscripción SaaS vs Retail:** Los pagos de planes SaaS residen en el esquema `public` (`pago_suscripcion`), mientras que los pagos de venta retail residen en el esquema del tenant (`pagos_simulados`).
