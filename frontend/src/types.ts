export type Rol = 'ADMIN' | 'CAJERO' | 'CLIENTA' | 'ENCARGADO' | 'PROVEEDOR'

export type User = {
  id: string
  email: string
  nombre: string
  rol: Rol
  sucursalId?: string | null
  proveedorId?: string | null
}

export type Variante = {
  id: string
  talla: string
  color: string
  sku: string
  urlFoto: string
  urlOverlay: string
  stocks: {
    almacenId: string
    cantidad: number
    reservado?: number
    disponible?: boolean
    estado?: 'agotado' | 'ultimas_unidades' | 'disponible' | 'reservado'
    almacen?: { id: string; nombre: string; sucursal?: Sucursal }
  }[]
}

export type Producto = {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  ocasion: string
  precioBase: string | number
  descuentoPct?: string | number
  temporadaId?: string | null
  coleccionId?: string | null
  proveedorId?: string | null
  temporada?: { id: string; nombre: string } | null
  coleccion?: { id: string; nombre: string } | null
  proveedor?: { id: string; nombre: string } | null
  material?: string
  ajuste?: string
  composicion?: string
  cuidados?: string
  origen?: string
  modelo?: string
  popularidad?: number
  variantes: Variante[]
}

export type Sucursal = {
  id: string
  nombre: string
  ciudad: string
  almacenes: { id: string; nombre: string }[]
}

export type Turno = {
  id: string
  fondoInicial: string | number
  totalSistema: string | number
  totalDeclarado?: string | number | null
  sucursal: Sucursal
}

export type Arqueo = Turno & {
  esperado: number
  diferencia: number
}

export type LineaCarrito = {
  productoId: string
  nombre: string
  precio: number
  varianteId: string
  talla: string
  color: string
  cantidad: number
}

export function homePorRol(rol: Rol) {
  if (rol === 'CAJERO') return '/pos'
  if (rol === 'ENCARGADO') return '/encargado'
  if (rol === 'PROVEEDOR') return '/proveedor'
  if (rol === 'ADMIN') return '/admin'
  return '/inicio'
}

export type CatalogPage = {
  items: Producto[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
  hayMas: boolean
}

/** Precio cobrado por el servidor (precioBase − descuentoPct). */
export function precioEfectivo(p: {
  precioBase: string | number
  descuentoPct?: string | number
}) {
  const base = Number(p.precioBase)
  const pct = Math.min(100, Math.max(0, Number(p.descuentoPct ?? 0)))
  return Math.round(base * (1 - pct / 100) * 100) / 100
}
