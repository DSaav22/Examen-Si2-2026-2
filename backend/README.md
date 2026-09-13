# EnsayAR API (NestJS)

Construcción PUDS — spike B: `POST /ventas` descuenta stock con `FOR UPDATE`, es idempotente por `uuid` y no vende la misma última unidad dos veces.

## Requisitos

PostgreSQL 16. En la raíz del repo:

```bash
docker compose up -d
```

Si no hay Docker, crea una base `ensayar` y copia `.env.example` a `.env`.

## Comandos

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
npm run spike:b
```

## Contrato

`POST /ventas`

```json
{
  "uuid": "7d0c0c2a-6b3a-4c1e-9f11-2a6c8d4e0001",
  "canal": "pos",
  "medioPago": "efectivo",
  "almacenId": "22222222-2222-2222-2222-222222222222",
  "cajaTurnoId": "66666666-6666-6666-6666-666666666666",
  "lineas": [{ "varianteId": "44444444-4444-4444-4444-444444444444", "cantidad": 1 }]
}
```

- `201` venta cobrada  
- `409 STOCK_INSUFICIENTE` si otra transacción se llevó la unidad  
- El mismo `uuid` se responde igual, sin descontar de nuevo  
