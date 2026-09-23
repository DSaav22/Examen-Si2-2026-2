import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { User } from './types'

type AuthCtx = {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  rename: (nombre: string) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('ensayar_user')
    return raw ? (JSON.parse(raw) as User) : null
  })

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
      rename(nombre: string) {
        setUser(current => {
          if (!current) return current
          const next = { ...current, nombre }
          localStorage.setItem('ensayar_user', JSON.stringify(next))
          return next
        })
      },
      logout() {
        void api('/auth/logout', { method: 'POST' }).catch(() => undefined)
        localStorage.removeItem('ensayar_token')
        localStorage.removeItem('ensayar_user')
        localStorage.removeItem('ensayar_carrito')
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
