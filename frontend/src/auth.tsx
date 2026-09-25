import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { User } from './types'

type AuthCtx = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (nombre: string, email: string, password: string) => Promise<User>
  logout: () => void
  rename: (nombre: string) => void
  setAvatar: (avatarUrl: string) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('ensayar_user')
    return raw ? (JSON.parse(raw) as User) : null
  })

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
  }, [])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      async login(email, password) {
        const data = await api<{ accessToken: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        localStorage.setItem('ensayar_token', data.accessToken)
        localStorage.setItem('ensayar_user', JSON.stringify(data.user))
        setUser(data.user)
        return data.user
      },
      async register(nombre, email, password) {
        const data = await api<{ accessToken: string; user: User }>('/auth/registro', {
          method: 'POST',
          body: JSON.stringify({ nombre, email, password }),
        })
        localStorage.setItem('ensayar_token', data.accessToken)
        localStorage.setItem('ensayar_user', JSON.stringify(data.user))
        setUser(data.user)
        return data.user
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
        localStorage.removeItem('ensayar_cola_pos')
        setUser(null)
      },
    }),
    [user],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('AuthProvider')
  return ctx
}
