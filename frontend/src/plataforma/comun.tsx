import { useCallback, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth, type SesionTienda } from '../auth'
import { apiCuenta } from '../api'
import { homePorRol } from '../roles'
import type { TiendaDeCuenta } from '../tienda'
import type { Rol } from '../types'
import '../styles/plataforma.css'

export type Periodo = 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'

export type PlanPublico = {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  moneda: string
  destacado: boolean
  limites: { usuarios: number; sucursales: number; productos: number | null }
  modulos: string[]
  precios: Record<Periodo, number>
  descuentos: Record<Periodo, number>
}

export type CuentaInfo = { id: string; email: string; nombre: string; plataforma: boolean }
export type SesionCuenta = { accessToken: string; cuenta: CuentaInfo; tiendas: TiendaDeCuenta[] }

export const PERIODOS: { id: Periodo; label: string; meses: number }[] = [
  { id: 'MENSUAL', label: 'Mensual', meses: 1 },
  { id: 'TRIMESTRAL', label: 'Trimestral', meses: 3 },
  { id: 'ANUAL', label: 'Anual', meses: 12 },
]

export const MODULOS: Record<string, string> = {
  catalogo: 'Catálogo de productos y variantes',
  tienda_online: 'Tienda en línea con carrito',
  pos: 'Punto de venta (caja) con modo offline',
  inventario: 'Inventario por sucursal y almacén',
  reservas: 'Reservas para retirar en tienda',
  probador: 'Probador virtual 2D/3D',
  reportes_ia: 'Reportes generativos con IA',
  asistente_ia: 'Asistente de compra con IA',
  analitica: 'Analítica avanzada y predicciones',
  mayorista: 'Precios mayoristas',
}

/** Países hispanohablantes y su moneda local. */
export const PAISES: { codigo: string; nombre: string; moneda: string }[] = [
  { codigo: 'BO', nombre: 'Bolivia', moneda: 'BOB' },
  { codigo: 'AR', nombre: 'Argentina', moneda: 'ARS' },
  { codigo: 'CL', nombre: 'Chile', moneda: 'CLP' },
  { codigo: 'CO', nombre: 'Colombia', moneda: 'COP' },
  { codigo: 'CR', nombre: 'Costa Rica', moneda: 'CRC' },
  { codigo: 'CU', nombre: 'Cuba', moneda: 'CUP' },
  { codigo: 'EC', nombre: 'Ecuador', moneda: 'USD' },
  { codigo: 'SV', nombre: 'El Salvador', moneda: 'USD' },
  { codigo: 'ES', nombre: 'España', moneda: 'EUR' },
  { codigo: 'GT', nombre: 'Guatemala', moneda: 'GTQ' },
  { codigo: 'GQ', nombre: 'Guinea Ecuatorial', moneda: 'XAF' },
  { codigo: 'HN', nombre: 'Honduras', moneda: 'HNL' },
  { codigo: 'MX', nombre: 'México', moneda: 'MXN' },
  { codigo: 'NI', nombre: 'Nicaragua', moneda: 'NIO' },
  { codigo: 'PA', nombre: 'Panamá', moneda: 'USD' },
  { codigo: 'PY', nombre: 'Paraguay', moneda: 'PYG' },
  { codigo: 'PE', nombre: 'Perú', moneda: 'PEN' },
  { codigo: 'PR', nombre: 'Puerto Rico', moneda: 'USD' },
  { codigo: 'DO', nombre: 'República Dominicana', moneda: 'DOP' },
  { codigo: 'UY', nombre: 'Uruguay', moneda: 'UYU' },
  { codigo: 'VE', nombre: 'Venezuela', moneda: 'VES' },
]

export function usd(n: number) {
  return `US$ ${n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fecha(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function leerCuenta(): SesionCuenta | null {
  try {
    const raw = localStorage.getItem('ensayar_cuenta')
    const token = localStorage.getItem('ensayar_cuenta_token')
    return raw && token ? { ...(JSON.parse(raw) as Omit<SesionCuenta, 'accessToken'>), accessToken: token } : null
  } catch {
    return null
  }
}

type Plataforma = {
  sesion: SesionCuenta | null
  guardar: (s: SesionCuenta) => void
  refrescar: () => Promise<SesionCuenta | null>
  salir: () => void
  /** Entra a una tienda con la cuenta y lleva al panel según el rol. */
  entrar: (tiendaId: string) => Promise<void>
  /** Abre la sesión de tienda que devuelve el alta o el ingreso. */
  irATienda: (s: SesionTienda) => void
}

export function usePlataforma() {
  return useOutletContext<Plataforma>()
}

export function PlataformaLayout() {
  const [sesion, setSesion] = useState<SesionCuenta | null>(leerCuenta)
  const { abrirSesion } = useAuth()
  const navigate = useNavigate()

  const guardar = useCallback((s: SesionCuenta) => {
    localStorage.setItem('ensayar_cuenta_token', s.accessToken)
    localStorage.setItem('ensayar_cuenta', JSON.stringify({ cuenta: s.cuenta, tiendas: s.tiendas }))
    setSesion(s)
  }, [])

  const salir = useCallback(() => {
    localStorage.removeItem('ensayar_cuenta_token')
    localStorage.removeItem('ensayar_cuenta')
    setSesion(null)
    navigate('/planes')
  }, [navigate])

  const refrescar = useCallback(async () => {
    if (!localStorage.getItem('ensayar_cuenta_token')) return null
    try {
      const s = await apiCuenta<SesionCuenta>('/plataforma/cuenta')
      guardar(s)
      return s
    } catch {
      return null
    }
  }, [guardar])

  const irATienda = useCallback(
    (s: SesionTienda) => {
      abrirSesion(s)
      // Recarga completa: los datos en memoria pertenecen a la tienda anterior.
      window.location.assign(homePorRol(s.user.rol as Rol))
    },
    [abrirSesion],
  )

  const entrar = useCallback(
    async (tiendaId: string) => {
      const s = await apiCuenta<SesionTienda>('/plataforma/entrar', {
        method: 'POST',
        body: JSON.stringify({ tiendaId }),
      })
      irATienda(s)
    },
    [irATienda],
  )

  const ctx: Plataforma = { sesion, guardar, refrescar, salir, entrar, irATienda }

  return (
    <div className="pf">
      <header className="pf-top">
        <Link to="/planes" className="pf-brand">
          <span className="pf-brand-mark">EnsayAR</span>
          <span className="pf-brand-sub">Cloud para tiendas de moda</span>
        </Link>
        <nav className="pf-nav" aria-label="Plataforma">
          <NavLink to="/planes">Planes</NavLink>
          {sesion ? <NavLink to="/plataforma" end>Mis tiendas</NavLink> : null}
          {sesion?.cuenta.plataforma ? <NavLink to="/plataforma/admin">Métricas</NavLink> : null}
          <Link to="/t/vesta">Ver tienda demo</Link>
        </nav>
        <div className="pf-top-actions">
          {sesion ? (
            <>
              <span className="pf-who" title={sesion.cuenta.email}>{sesion.cuenta.nombre || sesion.cuenta.email}</span>
              <button type="button" className="pf-btn pf-btn--ghost" onClick={salir}>Salir</button>
            </>
          ) : (
            <>
              <Link className="pf-btn pf-btn--ghost" to="/plataforma/login">Entrar</Link>
              <Link className="pf-btn" to="/empezar">Crear mi tienda</Link>
            </>
          )}
        </div>
      </header>
      <main className="pf-main">
        <Outlet context={ctx} />
      </main>
      <footer className="pf-foot">
        <p>EnsayAR · SaaS multi-tienda para moda · Bolivia y países hispanohablantes</p>
        <p className="pf-muted">Pagos en modo prueba: no se cobra dinero real.</p>
      </footer>
    </div>
  )
}