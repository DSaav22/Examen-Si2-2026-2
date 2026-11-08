import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import { fijarTienda, type TiendaDeCuenta, type TiendaSesion } from './tienda'
import type { User } from './types'

export type SesionTienda = {
  accessToken: string
  user: User
  tienda: TiendaSesion
  tiendas: TiendaDeCuenta[]
}

type AuthCtx = {
  user: User | null
  tienda: TiendaSesion | null
  tiendas: TiendaDeCuenta[]
  login: (email: string, password: string) => Promise<User>
  register: (nombre: string, email: string, password: string) => Promise<User>
  /** Guarda una sesión de tienda (login, alta desde la plataforma o cambio de tienda). */
  abrirSesion: (sesion: SesionTienda) => void
  cambiarTienda: (tiendaId: string) => Promise<SesionTienda>
  logout: () => void
  rename: (nombre: string) => void
  setAvatar: (avatarUrl: string) => void
}

const Ctx = createContext<AuthCtx | null>(null)

function leer<T>(clave: string, vacio: T): T {
  try {
    const raw = localStorage.getItem(clave)
    return raw ? (JSON.parse(raw) as T) : vacio
  } catch {
    return vacio
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => leer<User | null>('ensayar_user', null))
  const [tienda, setTienda] = useState<TiendaSesion | null>(() => leer<TiendaSesion | null>('ensayar_sesion_tienda', null))
  const [tiendas, setTiendas] = useState<TiendaDeCuenta[]>(() => leer<TiendaDeCuenta[]>('ensayar_tiendas', []))

  useEffect(() => {
    const token = localStorage.getItem('ensayar_token')
    if (!token) return
    api<User>('/auth/me')
      .then(me => {
        setUser(current => {
          if (!current) return current
          const next = {
            ...current,
            nombre: me.nombre ?? current.nombre,
            email: me.email ?? current.email,
            avatarUrl: me.avatarUrl ?? current.avatarUrl ?? '',
          }
          localStorage.setItem('ensayar_user', JSON.stringify(next))
          return next
        })
      })
      .catch(() => undefined)
    api<TiendaDeCuenta[]>('/auth/mis-tiendas')
      .then(lista => {
        localStorage.setItem('ensayar_tiendas', JSON.stringify(lista))
        setTiendas(lista)
      })
      .catch(() => undefined)
  }, [])

  const value = useMemo<AuthCtx>(() => {
    function abrirSesion(data: SesionTienda) {
      fijarTienda(data.tienda.slug)
      localStorage.setItem('ensayar_token', data.accessToken)
      localStorage.setItem('ensayar_user', JSON.stringify(data.user))
      localStorage.setItem('ensayar_sesion_tienda', JSON.stringify(data.tienda))
      localStorage.setItem('ensayar_tiendas', JSON.stringify(data.tiendas ?? []))
      setUser(data.user)
      setTienda(data.tienda)
      setTiendas(data.tiendas ?? [])
    }
    return {
      user,
      tienda,
      tiendas,
      abrirSesion,
      async login(email, password) {
        const data = await api<SesionTienda>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        abrirSesion(data)
        return data.user
      },
      async register(nombre, email, password) {
        const data = await api<SesionTienda>('/auth/registro', {
          method: 'POST',
          body: JSON.stringify({ nombre, email, password }),
        })
        abrirSesion(data)
        return data.user
      },
      async cambiarTienda(tiendaId) {
        const data = await api<SesionTienda>('/auth/cambiar-tienda', {
          method: 'POST',
          body: JSON.stringify({ tiendaId }),
        })
        abrirSesion(data)
        return data
      },
      rename(nombre: string) {
        setUser(current => {
          if (!current) return current
          const next = { ...current, nombre }
          localStorage.setItem('ensayar_user', JSON.stringify(next))
          return next
        })
      },
      setAvatar(avatarUrl: string) {
        setUser(current => {
          if (!current) return current
          const next = { ...current, avatarUrl }
          localStorage.setItem('ensayar_user', JSON.stringify(next))
          return next
        })
      },
      logout() {
        void api('/auth/logout', { method: 'POST' }).catch(() => undefined)
        localStorage.removeItem('ensayar_token')
        localStorage.removeItem('ensayar_user')
        localStorage.removeItem('ensayar_sesion_tienda')
        localStorage.removeItem('ensayar_tiendas')
        setUser(null)
        setTienda(null)
        setTiendas([])
      },
    }
  }, [user, tienda, tiendas])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AuthProvider')
  return ctx
}
