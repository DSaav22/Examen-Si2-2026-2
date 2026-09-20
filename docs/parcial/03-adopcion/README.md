# Parte 3 — Adopción y capacitación

**Sistema:** EnsayAR  
**Fecha:** 19 de septiembre de 2026  

Cómo aprende cada rol. Credenciales de seed (solo entorno académico): clave `diego`.

| Rol | Correo | Pantallas |
|-----|--------|-----------|
| Administradora | `admin@ensayar.bo` | Catálogo, Caja, Reportes |
| Cajero | `cajero@ensayar.bo` | Catálogo, Caja |
| Clienta | `clienta@ensayar.bo` | Catálogo, Probador, Pedir |

API local: `http://localhost:3000`. Web: `http://localhost:5173`. Móvil: `cd movil && npm start` (en teléfono, `EXPO_PUBLIC_API=http://<LAN>:3000`).

---

## 1. Onboarding de 15 minutos (defensa)

1. Encender PostgreSQL local (`postgres` / `diego`, base `ensayar`) y `npm run start:dev` en `backend/`.
2. Encender `npm run dev` en `frontend/`.
3. Login **cajero** → Abrir caja (fondo 200) → cobrar polera (efectivo o QR simulado).
4. Login **admin** → Reportes → *ventas de la sucursal Santa Cruz, a quién y cuánto* → se ve el SQL y la tabla.
5. Login **clienta** → Preguntar “qué talla hay” → Probar → (si hay cámara) overlay en hombros; si no, dos toques.
6. Opcional: apagar la red, cobrar en caja, volver a encender y **Sincronizar** (cola offline).

---

## 2. Manual — Clienta

1. Entrá con `clienta@ensayar.bo`.
2. En Catálogo ves precio, talla y color.
3. **Preguntar** usa el asistente de ficha (precio, talla, color, ocasión). No inventa stock.
4. **Probar** abre la cámara. El video **no se sube**. Cuando MediaPipe ve los hombros, la prenda se ancla. Si no, tocá hombro izquierdo y derecho.
5. **Pedir** crea un pedido **contra entrega** y descuenta stock del almacén de Santa Cruz.

---

## 3. Manual — Cajero

1. Entrá con `cajero@ensayar.bo` → **Caja**.
2. **Abrir turno** con sucursal y fondo.
3. Tocá prendas para armar el ticket.
4. Elegí **Efectivo** o **QR simulado** y **Cobrar**.
5. Si no hay red, la venta queda en cola local (uuid). Al volver, **Sincronizar**. El stock se descuenta en el servidor, no dos veces.

---

## 4. Manual — Administradora

1. Entrá con `admin@ensayar.bo`.
2. En Catálogo podés dar de alta una prenda (nombre, categoría, ocasión, precio).
3. En **Reportes** escribí o **Dictá** (Chrome). Ejemplos seguros:
   - `ventas de la sucursal Santa Cruz, a quién y cuánto`
   - `cuánto se vendió`
4. Preguntas con `usuario`, `password` o `drop` se rechazan. Solo lee `v_reporte_ventas`.

---

## 5. Capacitación en sucursal (guion)

| Minuto | Actividad |
|--------|-----------|
| 0–5 | Login y roles. Nadie comparte la clave del admin. |
| 5–15 | Cajero: abrir, vender, cerrar idea de arqueo (total sistema vs fondo). |
| 15–25 | Clienta: probarse y pedir. Explicar que el overlay es 2D, no tela 3D. |
| 25–35 | Admin: un reporte en voz. Mostrar el SQL en pantalla (transparencia). |
| 35–40 | Qué hacer si cae internet (cola). Qué no hacer (inventar un SELECT a mano). |

---

## 6. Azure (cuando haya sesión)

1. `az login` y confirmar suscripción.
2. Revisar `.azure/deployment-plan.md`.
3. `azd up` (pide password de PostgreSQL y JWT).
4. En la API: `npx prisma migrate deploy`.
5. En la web: `VITE_API_URL` apunta al App Service.

Hasta ese paso el producto corre en localhost, que **no** es la entrega final del docente. El IaC ya está en `infra/`.
