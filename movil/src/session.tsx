import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, cargarApiBase, esFalloRed, guardarTienda, tiendaActiva } from './api'
import { fijarCuentaActiva } from './offline/sync'
import type { Linea, Sucursal, TiendaAutorizada, TiendaInfo, User } from './types'

export type FiltroCatalogo = 'novedades' | 'ofertas' | 'ocasiones'

export type Screen =
  | { name: 'login' }
  | { name: 'registro' }
  | { name: 'inicio' }
  | { name: 'catalogo'; filtro?: FiltroCatalogo; ocasion?: string; q?: string }
  | { name: 'favoritos' }
  | { name: 'bolsa' }
  | { name: 'cuenta' }
  | { name: 'ficha'; id: string }
  | { name: 'probar'; varianteId: string }
  | { name: 'reservas' }
  | { name: 'historial' }
  | { name: 'asistente'; productoId?: string }
  | { name: 'operaciones' }

/** Pantallas que comparten la barra inferior de clienta. */
const TABS = new Set(['inicio', 'catalogo', 'favoritos', 'bolsa', 'cuenta'])

export function esTab(screen: Screen) {
  return TABS.has(screen.name)
}

type Sesion = {
  listo: boolean
  token: string | null
  user: User | null
  tiendaActual: TiendaInfo | null
  tiendasAutorizadas: TiendaAutorizada[]
  cart: Linea[]
  favs: string[]
  sucursales: Sucursal[]
  sucursalId: string
  sucursal?: Sucursal
  almacenId: string
  stack: Screen[]
  screen: Screen
  menu: boolean
  elegir: boolean
  aviso: string
  error: string
  setAviso: (t: string) => void
  setError: (t: string) => void
  setMenu: (v: boolean) => void
  setElegir: (v: boolean) => void
  push: (s: Screen) => void
  back: () => void
  goTab: (name: 'inicio' | 'catalogo' | 'favoritos' | 'bolsa' | 'cuenta') => void
  abrirCatalogo: (filtro?: FiltroCatalogo, ocasion?: string) => void
  entrar: (email: string, password: string) => Promise<void>
  registrar: (nombre: string, email: string, password: string) => Promise<void>
  salir: () => Promise<void>
  cambiarTienda: (tiendaId: string) => Promise<void>
  refrescarTiendas: () => Promise<void>
  addToCart: (linea: Omit<Linea, 'cantidad'>) => void
  setQty: (varianteId: string, cantidad: number) => void
  vaciar: () => void
  toggleFav: (productoId: string) => Promise<void>
  elegirSucursal: (id: string) => Promise<void>
  total: number
}

const Ctx = createContext<Sesion | null>(null)

export function useSession() {
  const v = useContext(Ctx)
  if (!v) throw new Error('Sesión fuera de proveedor')
  return v
}

async function leerJson<T>(clave: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(clave)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const claveCarrito = (t: string) => `ensayar_carrito_${t}`
const claveFavs = (t: string) => `ensayar_favoritos_${t}`
const claveSucursales = (t: string) => `ensayar_sucursales_${t}`
const claveSucursal = (t: string) => `ensayar_sucursal_${t}`

export function SessionProvider({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [tiendaActual, setTiendaActual] = useState<TiendaInfo | null>(null)
  const [tiendasAutorizadas, setTiendasAutorizadas] = useState<TiendaAutorizada[]>([])
  const [cart, setCart] = useState<Linea[]>([])
  const [favs, setFavs] = useState<string[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [sucursalId, setSucursalId] = useState('')
  const [stack, setStack] = useState<Screen[]>([{ name: 'login' }])
  const [menu, setMenu] = useState(false)
  const [elegir, setElegir] = useState(false)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  const cargarSucursales = useCallback(async (preferida?: string) => {
    const slug = tiendaActiva()
    let lista: Sucursal[]
    try {
      lista = await api<Sucursal[]>('/catalogo/sucursales', null)
      await AsyncStorage.setItem(claveSucursales(slug), JSON.stringify(lista))
    } catch (err) {
      const guardadas = esFalloRed(err) ? await leerJson<Sucursal[]>(claveSucursales(slug), []) : []
      if (!guardadas.length) throw err
      lista = guardadas
    }
    setSucursales(lista)
    setSucursalId((actual) => {
      const id = preferida || actual
      if (id && lista.some((s) => s.id === id)) return id
      return lista[0]?.id ?? ''
    })
    return lista
  }, [])

  useEffect(() => {
    void (async () => {
      await cargarApiBase()
      const slug = tiendaActiva()
      const [tok, usuario, tActual, tAutorizadas, bolsa, favoritos, suc] = await Promise.all([
        AsyncStorage.getItem('ensayar_token'),
        leerJson<User | null>('ensayar_user', null),
        leerJson<TiendaInfo | null>('ensayar_tienda_info', null),
        leerJson<TiendaAutorizada[]>('ensayar_tiendas_autorizadas', []),
        leerJson<Linea[]>(claveCarrito(slug), []),
        leerJson<string[]>(claveFavs(slug), []),
        AsyncStorage.getItem(claveSucursal(slug)),
      ])
      setCart(bolsa)
      setFavs(favoritos)
      if (tActual) setTiendaActual(tActual)
      if (tAutorizadas.length) setTiendasAutorizadas(tAutorizadas)
      if (suc) setSucursalId(suc)
      if (usuario) {
        fijarCuentaActiva(usuario.cuentaId ?? usuario.id)
      }
      if (tok && usuario) {
        try {
          const me = await api<{
            id: string
            email: string
            nombre: string
            rol: string
            cuentaId?: string
            sucursalId?: string | null
          }>('/auth/me', tok)
          const next = {
            ...usuario,
            id: me.id,
            email: me.email,
            nombre: me.nombre,
            rol: me.rol,
            cuentaId: me.cuentaId ?? usuario.cuentaId,
            sucursalId: me.sucursalId ?? usuario.sucursalId,
          }
          setToken(tok)
          setUser(next)
          fijarCuentaActiva(next.cuentaId ?? next.id)
          await AsyncStorage.setItem('ensayar_user', JSON.stringify(next))
          setStack([{ name: 'inicio' }])
        } catch (err) {
          if (esFalloRed(err)) {
            setToken(tok)
            setUser(usuario)
            fijarCuentaActiva(usuario.cuentaId ?? usuario.id)
            setStack([{ name: 'inicio' }])
          } else {
            await AsyncStorage.multiRemove(['ensayar_token', 'ensayar_user'])
            setToken(null)
            setUser(null)
            fijarCuentaActiva(undefined)
            setStack([{ name: 'login' }])
          }
        }
      }
      try {
        await cargarSucursales(suc ?? undefined)
      } catch {
        /* la tienda avisa al entrar si la API no responde */
      }
      setListo(true)
    })()
  }, [cargarSucursales])

  useEffect(() => {
    if (!listo) return
    const slug = tiendaActiva()
    void AsyncStorage.setItem(claveCarrito(slug), JSON.stringify(cart))
  }, [cart, listo])

  useEffect(() => {
    if (!listo) return
    const slug = tiendaActiva()
    void AsyncStorage.setItem(claveFavs(slug), JSON.stringify(favs))
  }, [favs, listo])

  const sucursal = sucursales.find((s) => s.id === sucursalId) ?? sucursales[0]
  const almacenId = sucursal?.almacenes[0]?.id ?? ''
  const screen = stack[stack.length - 1] ?? { name: 'login' as const }

  const push = useCallback((s: Screen) => {
    setAviso('')
    setError('')
    setMenu(false)
    setStack((st) => [...st, s])
  }, [])

  const back = useCallback(() => {
    setAviso('')
    setError('')
    setStack((st) => (st.length > 1 ? st.slice(0, -1) : st))
  }, [])

  const goTab = useCallback((name: 'inicio' | 'catalogo' | 'favoritos' | 'bolsa' | 'cuenta') => {
    setAviso('')
    setError('')
    setMenu(false)
    setStack([{ name }])
  }, [])

  const abrirCatalogo = useCallback((filtro?: FiltroCatalogo, ocasion?: string) => {
    setMenu(false)
    setStack([{ name: 'catalogo', filtro, ocasion }])
  }, [])

  const persistir = useCallback(
    async (
      accessToken: string,
      next: User,
      tiendaInfo?: TiendaInfo | null,
      tiendasList?: TiendaAutorizada[],
    ) => {
      setToken(accessToken)
      setUser(next)
      fijarCuentaActiva(next.cuentaId ?? next.id)
      const slug = tiendaActiva()
      const pairs: [string, string][] = [
        ['ensayar_token', accessToken],
        ['ensayar_user', JSON.stringify(next)],
      ]
      if (tiendaInfo) {
        setTiendaActual(tiendaInfo)
        pairs.push(['ensayar_tienda_info', JSON.stringify(tiendaInfo)])
      }
      if (tiendasList && tiendasList.length) {
        setTiendasAutorizadas(tiendasList)
        pairs.push(['ensayar_tiendas_autorizadas', JSON.stringify(tiendasList)])
      }
      await AsyncStorage.multiSet(pairs)
      const [bolsa, favoritos] = await Promise.all([
        leerJson<Linea[]>(claveCarrito(slug), []),
        leerJson<string[]>(claveFavs(slug), []),
      ])
      setCart(bolsa)
      setFavs(favoritos)
      if (next.rol === 'CLIENTA') {
        try {
          const ids = await api<string[]>('/cliente/favoritos', accessToken)
          setFavs(ids)
          await AsyncStorage.setItem(claveFavs(slug), JSON.stringify(ids))
        } catch {
          /* se quedan los favoritos locales */
        }
      }
      try {
        await cargarSucursales()
      } catch {
        /* sucursales se reintentan en inicio */
      }
      setStack([{ name: 'inicio' }])
    },
    [cargarSucursales],
  )

  const entrar = useCallback(
    async (email: string, password: string) => {
      setError('')
      const res = await api<{
        accessToken: string
        user: User
        tienda?: TiendaInfo
        tiendas?: TiendaAutorizada[]
      }>('/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.tienda?.slug) {
        await guardarTienda(res.tienda.slug)
      }
      await persistir(res.accessToken, res.user, res.tienda, res.tiendas)
    },
    [persistir],
  )

  const registrar = useCallback(
    async (nombre: string, email: string, password: string) => {
      setError('')
      const res = await api<{
        accessToken: string
        user: User
        tienda?: TiendaInfo
        tiendas?: TiendaAutorizada[]
      }>('/auth/registro', null, {
        method: 'POST',
        body: JSON.stringify({ nombre, email, password }),
      })
      if (res.tienda?.slug) {
        await guardarTienda(res.tienda.slug)
      }
      await persistir(res.accessToken, res.user, res.tienda, res.tiendas)
    },
    [persistir],
  )

  const cambiarTienda = useCallback(
    async (tiendaId: string) => {
      if (!token) return
      setError('')
      try {
        const res = await api<{
          accessToken: string
          user: User
          tienda?: TiendaInfo
          tiendas?: TiendaAutorizada[]
        }>('/auth/cambiar-tienda', token, {
          method: 'POST',
          body: JSON.stringify({ tiendaId }),
        })
        if (res.tienda?.slug) {
          await guardarTienda(res.tienda.slug)
        }
        await persistir(res.accessToken, res.user, res.tienda, res.tiendas)
        setAviso(`Tienda activa: ${res.tienda?.nombre ?? res.tienda?.slug ?? tiendaId}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cambiar de tienda')
      }
    },
    [token, persistir],
  )

  const refrescarTiendas = useCallback(async () => {
    if (!token) return
    try {
      const lista = await api<TiendaAutorizada[]>('/auth/mis-tiendas', token)
      setTiendasAutorizadas(lista)
      await AsyncStorage.setItem('ensayar_tiendas_autorizadas', JSON.stringify(lista))
    } catch {
      /* no crítico */
    }
  }, [token])

  const salir = useCallback(async () => {
    const actual = token
    const slug = tiendaActiva()
    setToken(null)
    setUser(null)
    setCart([])
    setTiendaActual(null)
    setTiendasAutorizadas([])
    setMenu(false)
    fijarCuentaActiva(undefined)
    setStack([{ name: 'login' }])
    await AsyncStorage.multiRemove([
      'ensayar_token',
      'ensayar_user',
      'ensayar_tienda_info',
      'ensayar_tiendas_autorizadas',
      claveCarrito(slug),
    ])
    if (actual) {
      try {
        await api('/auth/logout', actual, { method: 'POST' })
      } catch {
        /* la sesión local ya se cerró */
      }
    }
  }, [token])

  const addToCart = useCallback((linea: Omit<Linea, 'cantidad'>) => {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.varianteId === linea.varianteId)
      if (i >= 0) {
        return prev.map((l, idx) => (idx === i ? { ...l, cantidad: l.cantidad + 1 } : l))
      }
      return [...prev, { ...linea, cantidad: 1 }]
    })
    setAviso(`${linea.nombre} se añadió a tu bolsa.`)
    setError('')
  }, [])

  const setQty = useCallback((varianteId: string, cantidad: number) => {
    setCart((prev) =>
      prev.flatMap((l) =>
        l.varianteId !== varianteId ? [l] : cantidad <= 0 ? [] : [{ ...l, cantidad }],
      ),
    )
  }, [])

  const vaciar = useCallback(() => setCart([]), [])

  const toggleFav = useCallback(async (productoId: string) => {
    const tiene = favs.includes(productoId)
    setFavs((prev) => (tiene ? prev.filter((id) => id !== productoId) : [...prev, productoId]))
    if (!token || user?.rol !== 'CLIENTA') return
    try {
      if (tiene) await api(`/cliente/favoritos/${productoId}`, token, { method: 'DELETE' })
      else await api(`/cliente/favoritos/${productoId}`, token, { method: 'POST' })
    } catch (e) {
      setFavs((prev) => (tiene ? [...prev, productoId] : prev.filter((id) => id !== productoId)))
      setError(e instanceof Error ? e.message : 'No se pudo guardar el favorito')
    }
  }, [favs, token, user?.rol])

  const elegirSucursal = useCallback(async (id: string) => {
    const slug = tiendaActiva()
    setSucursalId(id)
    setElegir(false)
    await AsyncStorage.setItem(claveSucursal(slug), id)
  }, [])

  const total = cart.reduce((a, l) => a + l.precio * l.cantidad, 0)

  const value = useMemo<Sesion>(
    () => ({
      listo,
      token,
      user,
      tiendaActual,
      tiendasAutorizadas,
      cart,
      favs,
      sucursales,
      sucursalId: sucursal?.id ?? '',
      sucursal,
      almacenId,
      stack,
      screen,
      menu,
      elegir,
      aviso,
      error,
      setAviso,
      setError,
      setMenu,
      setElegir,
      push,
      back,
      goTab,
      abrirCatalogo,
      entrar,
      registrar,
      salir,
      cambiarTienda,
      refrescarTiendas,
      addToCart,
      setQty,
      vaciar,
      toggleFav,
      elegirSucursal,
      total,
    }),
    [
      listo,
      token,
      user,
      tiendaActual,
      tiendasAutorizadas,
      cart,
      favs,
      sucursales,
      sucursal,
      almacenId,
      stack,
      screen,
      menu,
      elegir,
      aviso,
      error,
      push,
      back,
      goTab,
      abrirCatalogo,
      entrar,
      registrar,
      salir,
      cambiarTienda,
      refrescarTiendas,
      addToCart,
      setQty,
      vaciar,
      toggleFav,
      elegirSucursal,
      total,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
