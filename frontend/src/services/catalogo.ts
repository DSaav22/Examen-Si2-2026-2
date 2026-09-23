import { api } from '../api'
import type { CatalogPage, Producto, Sucursal } from '../types'

export const catalogoService = {
  productos(query = '') { return api<CatalogPage | Producto[]>(`/catalogo/productos${query ? `?${query}` : ''}`) },
  producto(id: string, interno = false) { return api<Producto>(`/catalogo/productos/${id}${interno ? '/interno' : ''}`) },
  sucursales() { return api<Sucursal[]>('/catalogo/sucursales') },
  categorias() { return api<{ id: string; nombre: string; activa: boolean }[]>('/catalogo/categorias') },
}
