import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LineaCarrito, Producto } from './types'
import { useAuth } from './auth'
import { api } from './api'

const CART_KEY = 'ensayar_carrito'
const FAVORITES_KEY = 'ensayar_favoritos'
const RECENT_KEY = 'ensayar_vistos'

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) as T
  } catch {
    return fallback
  }
}

function writeCart(lineas: LineaCarrito[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(lineas))
  window.dispatchEvent(new CustomEvent('ensayar_carrito_actualizado', { detail: lineas }))
}

type StorefrontContextValue = {
  cart: LineaCarrito[]
  cartNotice: LineaCarrito | null
  favorites: string[]
  recent: string[]
  addToCart: (line: Omit<LineaCarrito, 'cantidad'>, maxStock?: number) => boolean
  setCartQuantity: (id: string, quantity: number) => void
  removeFromCart: (id: string) => void
  clearCart: () => void
  dismissCartNotice: () => void
  toggleFavorite: (id: string) => void
  rememberProduct: (id: string) => void
  clearRecent: () => void
}

const StorefrontContext = createContext<StorefrontContextValue | null>(null)

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<LineaCarrito[]>(() => read(CART_KEY, []))
  const [cartNotice, setCartNotice] = useState<LineaCarrito | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [favorites, setFavorites] = useState<string[]>(() => read(FAVORITES_KEY, []))
  const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY, []))

  useEffect(() => {
    if (user?.rol === 'CLIENTA') {
      api<string[]>('/cliente/favoritos')
        .then(items => {
          setFavorites(items)
          localStorage.setItem(FAVORITES_KEY, JSON.stringify(items))
        })
        .catch(() => undefined)
    }
  }, [user?.rol])

  useEffect(() => {
    const sync = (event: Event) => setCart((event as CustomEvent<LineaCarrito[]>).detail)
    window.addEventListener('ensayar_carrito_actualizado', sync)
    return () => window.removeEventListener('ensayar_carrito_actualizado', sync)
  }, [])

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  /** Carritos guardados antes de urlFoto: completar fotos desde el catálogo. */
  useEffect(() => {
    const missing = cart.filter(line => line.productoId && !line.urlFoto?.trim())
    if (!missing.length) return

    let cancelled = false
    void (async () => {
      const photos: Record<string, string> = {}
      await Promise.all(
        missing.map(async line => {
          try {
            const product = await api<Producto>(`/catalogo/productos/${line.productoId}`)
            const variant =
              product.variantes.find(item => item.id === line.varianteId) ?? product.variantes[0]
            if (variant?.urlFoto) photos[line.varianteId] = variant.urlFoto
          } catch {
            /* ignore */
          }
        }),
      )
      if (cancelled || !Object.keys(photos).length) return

      setCart(prev => {
        let changed = false
        const next = prev.map(item => {
          if (item.urlFoto?.trim() || !photos[item.varianteId]) return item
          changed = true
          return { ...item, urlFoto: photos[item.varianteId] }
        })
        if (!changed) return prev
        localStorage.setItem(CART_KEY, JSON.stringify(next))
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [cart])

  const value = useMemo<StorefrontContextValue>(
    () => ({
      cart,
      cartNotice,
      favorites,
      recent,
      addToCart: (line, maxStock) => {
        const next = [...cart]
        const i = next.findIndex(item => item.varianteId === line.varianteId)
        const quantity = (i >= 0 ? next[i].cantidad : 0) + 1
        if (maxStock !== undefined && quantity > maxStock) return false
        const added = { ...line, cantidad: quantity }
        if (i >= 0) next[i] = { ...next[i], ...added }
        else next.push(added)
        setCart(next)
        writeCart(next)
        setCartNotice(added)
        window.clearTimeout(noticeTimer.current)
        noticeTimer.current = window.setTimeout(() => setCartNotice(null), 4200)
        return true
      },
      setCartQuantity: (id, quantity) => {
        const next = cart.map(item =>
          item.varianteId === id ? { ...item, cantidad: Math.max(1, Math.floor(quantity)) } : item,
        )
        setCart(next)
        writeCart(next)
      },
      removeFromCart: id => {
        const next = cart.filter(item => item.varianteId !== id)
        setCart(next)
        writeCart(next)
      },
      clearCart: () => {
        setCart([])
        writeCart([])
      },
      dismissCartNotice: () => {
        window.clearTimeout(noticeTimer.current)
        setCartNotice(null)
      },
      toggleFavorite: id => {
        const exists = favorites.includes(id)
        const next = exists ? favorites.filter(item => item !== id) : [id, ...favorites]
        setFavorites(next)
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
        if (user?.rol === 'CLIENTA') {
          void api(`/cliente/favoritos/${id}`, { method: exists ? 'DELETE' : 'POST' }).catch(
            () => undefined,
          )
        }
      },
      rememberProduct: id => {
        const next = [id, ...recent.filter(item => item !== id)].slice(0, 8)
        setRecent(next)
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      },
      clearRecent: () => {
        setRecent([])
        localStorage.setItem(RECENT_KEY, JSON.stringify([]))
      },
    }),
    [cart, cartNotice, favorites, recent, user?.rol],
  )

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>
}

export function useStorefront() {
  const context = useContext(StorefrontContext)
  if (!context) throw new Error('useStorefront debe utilizarse dentro de StorefrontProvider')
  return context
}
