export type User = {
  id: string
  email: string
  nombre: string
  rol: string
  sucursalId?: string | null
  mayorista?: boolean
}

export type Variante = {
  id: string
  talla: string
  color: string
  sku: string
  urlFoto?: string
  urlOverlay?: string
  stocks?: { disponible?: boolean; estado?: string; cantidad?: number }[]
}

export type Producto = {
  id: string
  nombre: string
  descripcion?: string
  categoria?: string
  ocasion?: string
  precioBase: string | number
  descuentoPct?: string | number
  material?: string
  cuidados?: string
  variantes: Variante[]
}

export type Sucursal = {
  id: string
  nombre: string
  ciudad?: string
  almacenes: { id: string; nombre: string }[]
}

export type Linea = {
  productoId: string
  nombre: string
  precio: number
  varianteId: string
  talla: string
  color: string
  cantidad: number
  foto?: string
}

export type Reserva = {
  id: string
  estado: string
  horario: string
  sucursal: { nombre: string }
  lineas?: {
    cantidad: number
    variante: { talla: string; color: string; producto: { nombre: string } }
  }[]
}

export type Venta = {
  id: string
  total: string | number
  medioPago: string
  estado: string
  creadaEn: string
  pago?: { id: string; estado: string } | null
  pedido?: { estado: string; seguimiento?: string | null } | null
  lineas: {
    id: string
    cantidad: number
    variante: { talla: string; color: string; producto: { nombre: string } }
  }[]
}

export type CatalogPage = {
  items: Producto[]
  total: number
  pagina: number
  hayMas: boolean
}

export function precioEfectivo(p: { precioBase: string | number; descuentoPct?: string | number }) {
  const base = Number(p.precioBase)
  const pct = Math.min(100, Math.max(0, Number(p.descuentoPct ?? 0)))
  return Math.round(base * (1 - pct / 100) * 100) / 100
}

export function bs(n: number) {
  return `Bs ${n.toFixed(0)}`
}
