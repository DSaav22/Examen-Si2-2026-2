import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { LineaCarrito } from './types'
import { useAuth } from './auth'
import { api } from './api'

const CART_KEY = 'ensayar_carrito'; const FAVORITES_KEY = 'ensayar_favoritos'; const RECENT_KEY = 'ensayar_vistos'
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) as T } catch { return fallback } }
type StorefrontContextValue = { cart: LineaCarrito[]; favorites: string[]; recent: string[]; addToCart: (line: Omit<LineaCarrito, 'cantidad'>, maxStock?: number) => boolean; setCartQuantity: (id: string, quantity: number) => void; removeFromCart: (id: string) => void; clearCart: () => void; toggleFavorite: (id: string) => void; rememberProduct: (id: string) => void; clearRecent: () => void }
const StorefrontContext = createContext<StorefrontContextValue | null>(null)

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<LineaCarrito[]>(() => read(CART_KEY, [])); const [favorites, setFavorites] = useState<string[]>(() => read(FAVORITES_KEY, [])); const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY, []))
  useEffect(() => { if (user?.rol === 'CLIENTA') api<string[]>('/cliente/favoritos').then(items => { setFavorites(items); localStorage.setItem(FAVORITES_KEY, JSON.stringify(items)) }).catch(() => undefined) }, [user?.rol])
  useEffect(() => { const sync = (event: Event) => setCart((event as CustomEvent<LineaCarrito[]>).detail); window.addEventListener('ensayar_carrito_actualizado', sync); return () => window.removeEventListener('ensayar_carrito_actualizado', sync) }, [])
  const persist = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
  const value = useMemo<StorefrontContextValue>(() => ({ cart, favorites, recent,
    addToCart: (line, maxStock) => { const next = [...cart]; const i = next.findIndex(item => item.varianteId === line.varianteId); const quantity = (i >= 0 ? next[i].cantidad : 0) + 1; if (maxStock !== undefined && quantity > maxStock) return false; if (i >= 0) next[i] = { ...next[i], ...line, cantidad: quantity }; else next.push({ ...line, cantidad: 1 }); setCart(next); persist(CART_KEY, next); return true },
    setCartQuantity: (id, quantity) => { const next = cart.map(item => item.varianteId === id ? { ...item, cantidad: Math.max(1, Math.floor(quantity)) } : item); setCart(next); persist(CART_KEY, next) },
    removeFromCart: id => { const next = cart.filter(item => item.varianteId !== id); setCart(next); persist(CART_KEY, next) },
    clearCart: () => { setCart([]); persist(CART_KEY, []) },
    toggleFavorite: id => { const exists = favorites.includes(id); const next = exists ? favorites.filter(item => item !== id) : [id, ...favorites]; setFavorites(next); persist(FAVORITES_KEY, next); if (user?.rol === 'CLIENTA') void api(`/cliente/favoritos/${id}`, { method: exists ? 'DELETE' : 'POST' }).catch(() => undefined) },
    rememberProduct: id => { const next = [id, ...recent.filter(item => item !== id)].slice(0, 8); setRecent(next); persist(RECENT_KEY, next) },
    clearRecent: () => { setRecent([]); persist(RECENT_KEY, []) },
  }), [cart, favorites, recent, user?.rol])
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>
}
export function useStorefront() { const context = useContext(StorefrontContext); if (!context) throw new Error('useStorefront debe utilizarse dentro de StorefrontProvider'); return context }
