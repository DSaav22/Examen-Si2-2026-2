import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { assetUrl } from '../asset'
import { useStorefront } from '../storefront'
import { ThemeToggle } from '../shared/ThemeToggle'
import { NotificacionesBell } from '../shared/NotificacionesBell'
import { SelectorTienda, useTiendaPublica } from '../shared/SelectorTienda'
import { SidePanel } from '../shared/Visual'
import { AccionesPwa, BannerOffline, EstadoConexion } from '../shared/Offline'
import { InstalarApp } from '../shared/InstalarApp'
import { api } from '../api'
import type { Sucursal } from '../types'
import {
  enlacesCuentaPorRol,
  esClienta,
  etiquetaRol,
  homePorRol,
  navGruposPorRol,
  navPorRol,
  type NavGrupo,
  type NavItem,
} from '../roles'
import { Asistente } from './Asistente'
import { MarcaTienda } from '../shared/MarcaTienda'
import { catalogLabel } from '../text'

function Icon({
  name,
}: {
  name: 'search' | 'heart' | 'user' | 'bag' | 'menu' | 'chevron' | 'close' | 'receipt' | 'pin' | 'settings'
}) {
  const stroke = name === 'search' || name === 'menu' || name === 'chevron' || name === 'close' || name === 'receipt' || name === 'pin' || name === 'settings'
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    heart: (
      <path d="M20.8 8.7c0 5.1-8.8 10.3-8.8 10.3S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.7Z" />
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 13H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    menu: (
      <>
        <path d="M3 6h18M3 12h18M3 18h18" />
      </>
    ),
    chevron: <path d="m9 6 6 6-6 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    receipt: (
      <>
        <path d="M6 3.5h12v17l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2Z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2.2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
      </>
    ),
  }
  return (
    <svg
      className={`shell-icon${stroke ? ' shell-icon--stroke' : ''}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function ShellLink({ to, children, end = false, onNavigate }: { to: string; children: React.ReactNode; end?: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      end={end}
      className={({ isActive }) => (isActive ? 'shell-link active' : 'shell-link')}
      to={to}
      onClick={onNavigate}
    >
      {children}
    </NavLink>
  )
}

/** Links de colección: solo activos si el query `coleccion` coincide. */
function CatalogCollectionLink({
  coleccion,
  children,
}: {
  coleccion: string
  children: React.ReactNode
}) {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const active = location.pathname === '/catalogo' && params.get('coleccion') === coleccion
  return (
    <Link
      className={active ? 'shell-link active' : 'shell-link'}
      to={`/catalogo?coleccion=${coleccion}`}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

function OpsNavIcon({ item }: { item: NavItem }) {
  const key = item.to.split('?')[0]
  const paths: Record<string, React.ReactNode> = {
    '/admin': <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    '/admin/configuracion': <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.3" /><path d="M3.5 20c.5-3.4 2.3-5.2 5.5-5.2s5 1.8 5.5 5.2M14.5 20c.2-2.2 1.3-3.6 3.5-4" /></>,
    '/admin/moderacion': <><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="m8 11 2.2 2.2L16 7.8" /></>,
    '/admin/bitacora': <><path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    '/reportes': <><path d="M4 20V4M4 20h17" /><path d="M8 16v-4M13 16V7M18 16v-7" /></>,
    '/analitica': <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/><circle cx="19" cy="7" r="1"/></>,
    '/pos': <><path d="M4 7h16v12H4z" /><path d="M7 4h10M8 11h3M8 15h8M16 11h1" /></>,
    '/encargado': <><path d="M4 8.5 12 4l8 4.5v9L12 22l-8-4.5z" /><path d="M4 8.5 12 13l8-4.5M12 13v9" /></>,
    '/despacho': <><path d="M3 7h11v10H3zM14 10h3l3 3v4h-6z" /><circle cx="7" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></>,
    '/catalogo': <><path d="M5 5.5h14v14H5z" /><path d="M8 9h8M8 12h8M8 15h5" /></>,
    '/base-datos': <><ellipse cx="12" cy="5.5" rx="7" ry="2.5" /><path d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" /></>,
    '/cuenta': <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5" /></>,
    '/sincronizacion': <><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M4 4v4h4M20 20v-4h-4" /></>,
    '/creditos': <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  }
  const icon = paths[key] ?? <path d="M5 12h14M12 5v14" />
  return <svg className="ops-nav-icon" viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
}

function OpsNavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      end={item.end ?? false}
      to={item.to}
      className={({ isActive }) => (isActive ? 'ops-nav-link is-active' : 'ops-nav-link')}
      onClick={onNavigate}
    >
      <OpsNavIcon item={item} />
      {item.label}
    </NavLink>
  )
}

function Countdown() {
  const [seconds, setSeconds] = useState(19 * 60 + 38)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(value => (value > 0 ? value - 1 : 19 * 60 + 38)), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const remaining = String(seconds % 60).padStart(2, '0')
  return (
    <span aria-label={`La oferta termina en ${minutes} minutos y ${remaining} segundos`}>
      {minutes}:{remaining}
    </span>
  )
}

const CAMPAIGN_MESSAGES = [
  { text: 'Envío gratis desde Bs 350', to: '/catalogo' },
  { text: 'Nueva temporada · otoño', to: '/catalogo?coleccion=novedades' },
  { text: 'Oferta de temporada · hasta 25%', to: '/catalogo?coleccion=ofertas' },
] as const

function CampaignBar() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex(i => (i + 1) % CAMPAIGN_MESSAGES.length),
      4200,
    )
    return () => window.clearInterval(timer)
  }, [])

  const current = CAMPAIGN_MESSAGES[index]
  return (
    <Link className="campaign-strip campaign-strip--rotate" to={current.to} aria-live="polite">
      <span key={current.text} className="campaign-strip-msg">
        {current.text}
        {index === 2 ? (
          <>
            {' '}
            <small>
              <Countdown />
            </small>
          </>
        ) : null}
      </span>
      <span className="campaign-strip-cta">Ver →</span>
    </Link>
  )
}

function CatalogMegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [categorias, setCategorias] = useState<string[]>([])
  useEffect(() => {
    if (!open) return
    let vigente = true
    api<{ categoria: string }[]>('/catalogo/productos')
      .then(items => { if (vigente) setCategorias([...new Set(items.map(item => item.categoria?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))) })
      .catch(() => { if (vigente) setCategorias([]) })
    return () => { vigente = false }
  }, [open])
  if (!open) return null
  return (
    <div className="mega-menu" role="region" aria-label="Categorías de catálogo">
      <div className="mega-menu-inner">
        <div>
          <p className="mega-label">CATEGORÍAS</p>
          {categorias.length ? categorias.map(categoria => (
            <Link key={categoria} onClick={onClose} to={`/catalogo?categoria=${encodeURIComponent(categoria)}`}>
              {catalogLabel(categoria)}
            </Link>
          )) : <Link onClick={onClose} to="/catalogo">Ver catálogo</Link>}
        </div>
        <div className="mega-feature">
          <span>Selección editorial</span>
          <strong>La nueva sofisticación</strong>
          <Link onClick={onClose} to="/catalogo">Descubrir colección →</Link>
        </div>
      </div>
    </div>
  )
}

const ACCOUNT_LINK_META: Record<
  string,
  { hint: string; icon: 'user' | 'heart' | 'receipt' | 'pin' | 'settings' | 'bag' }
> = {
  '/cuenta': { hint: 'Perfil, clave y direcciones', icon: 'user' },
  '/favoritos': { hint: 'Prendas que guardaste', icon: 'heart' },
  '/historial': { hint: 'Pedidos, facturas y envíos', icon: 'receipt' },
  '/reservas': { hint: 'Retiros y reservas activas', icon: 'pin' },
  '/admin/configuracion': { hint: 'Usuarios y catálogos', icon: 'settings' },
}

function AccountPanel({
  open,
  onClose,
  user,
  logout,
}: {
  open: boolean
  onClose: () => void
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  logout?: () => void
}) {
  const navigate = useNavigate()
  const clienta = esClienta(user.rol)
  const go = (path: string) => {
    onClose()
    navigate(path)
  }
  const links = enlacesCuentaPorRol(user.rol)
  const inicial = (user.nombre.trim()[0] || 'V').toUpperCase()
  const avatar = user.avatarUrl ? assetUrl(user.avatarUrl) : ''

  return (
    <SidePanel
      title={clienta ? 'Tu cuenta' : 'Cuenta'}
      open={open}
      onClose={onClose}
      className="account-drawer"
    >
      <div className="account-drawer-body">
        <div className="account-drawer-profile">
          <span className={`account-drawer-avatar${avatar ? ' has-photo' : ''}`} aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : inicial}
          </span>
          <div className="account-drawer-who">
            <p className="account-drawer-hello">Bienvenida</p>
            <strong>{user.nombre}</strong>
            <span>{user.email}</span>
          </div>
        </div>

        <p className="account-drawer-section">Accesos</p>
        <nav className="account-drawer-nav" aria-label="Accesos de cuenta">
          {links.map(item => {
            const meta = ACCOUNT_LINK_META[item.to] ?? {
              hint: 'Ir a la sección',
              icon: 'bag' as const,
            }
            return (
              <button
                key={item.to}
                type="button"
                className="account-drawer-link"
                onClick={() => go(item.to)}
              >
                <span className="account-drawer-icon" aria-hidden="true">
                  <Icon name={meta.icon} />
                </span>
                <span className="account-drawer-copy">
                  <strong>{item.label}</strong>
                  <small>{meta.hint}</small>
                </span>
                <span className="account-drawer-chevron" aria-hidden="true">
                  <Icon name="chevron" />
                </span>
              </button>
            )
          })}
        </nav>
        <AccionesPwa />
      </div>

      <div className="account-drawer-foot">
        {clienta ? (
          <Link className="account-drawer-cta" to="/catalogo" onClick={onClose}>
            Seguir comprando
          </Link>
        ) : null}
        {logout ? (
          <button
            type="button"
            className="account-drawer-logout"
            onClick={() => {
              onClose()
              logout()
            }}
          >
            Cerrar sesión
          </button>
        ) : null}
      </div>
    </SidePanel>
  )
}

function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    onClose()
    navigate(`/catalogo${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`)
  }
  return (
    <SidePanel title="Buscar" open={open} onClose={onClose}>
      <form className="shell-search-form" onSubmit={submit}>
        <label htmlFor="shell-search">Buscar en catálogo</label>
        <div className="shell-search-input">
          <Icon name="search" />
          <input id="shell-search" autoFocus={open} value={query} onChange={event => setQuery(event.target.value)} placeholder="Prendas, colores, colecciones" />
        </div>
        <button className="ui-button ui-button--primary" type="submit">Ver resultados</button>
      </form>
    </SidePanel>
  )
}

function MobilePanel({ open, onClose, items }: { open: boolean; onClose: () => void; items: NavItem[] }) {
  return (
    <SidePanel title="Menú" open={open} onClose={onClose}>
      <nav className="mobile-shell-nav" aria-label="Navegación móvil">
        {items.map(item => (
          <ShellLink key={`${item.to}-${item.label}`} to={item.to} end={item.end} onNavigate={onClose}>
            {item.label}
          </ShellLink>
        ))}
      </nav>
    </SidePanel>
  )
}

function BranchSelector({ fallback, label = 'Tienda' }: { fallback: string; label?: string }) {
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [selected, setSelected] = useState(() => localStorage.getItem('ensayar_sucursal') ?? '')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<Sucursal[]>('/catalogo/sucursales').then(list => {
      setBranches(list)
      if (!localStorage.getItem('ensayar_sucursal') && list[0]) {
        localStorage.setItem('ensayar_sucursal', list[0].id)
        setSelected(list[0].id)
      }
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const change = (id: string) => {
    setSelected(id)
    localStorage.setItem('ensayar_sucursal', id)
    window.dispatchEvent(new Event('ensayar_sucursal_actualizada'))
    setOpen(false)
  }

  const current = branches.find(b => b.id === selected) ?? branches[0]

  if (!branches.length) {
    return (
      <span className="branch-picker branch-picker--fallback" title="Tienda">
        <span className="branch-picker-label">{label}</span>
        <span className="branch-picker-name">{fallback}</span>
      </span>
    )
  }

  return (
    <div className={`branch-picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="branch-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current.nombre}`}
        title="Elegí tu tienda para retiro"
        onClick={() => setOpen(value => !value)}
      >
        <span className="branch-picker-label">{label}</span>
        <span className="branch-picker-copy">
          <span className="branch-picker-name">{current.nombre}</span>
          {current.ciudad ? <span className="branch-picker-city">{current.ciudad}</span> : null}
        </span>
        <Icon name="chevron" />
      </button>
      {open ? (
        <ul className="branch-picker-menu" role="listbox" aria-label={label}>
          {branches.map(branch => {
            const active = branch.id === (selected || current.id)
            return (
              <li key={branch.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`branch-picker-option${active ? ' is-active' : ''}`}
                  onClick={() => change(branch.id)}
                >
                  <span className="branch-picker-option-name">{branch.nombre}</span>
                  <span className="branch-picker-option-city">{branch.ciudad}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

/** Sucursal real del usuario ops (asignada en BD). No es un filtro falso del localStorage. */
function OpsSucursalContext({
  sucursalId,
  rol,
}: {
  sucursalId?: string | null
  rol: string
}) {
  const [nombre, setNombre] = useState<string | null>(null)

  useEffect(() => {
    if (!sucursalId) {
      setNombre(null)
      return
    }
    api<Sucursal[]>('/catalogo/sucursales')
      .then(list => {
        setNombre(list.find(s => s.id === sucursalId)?.nombre ?? 'Sucursal asignada')
      })
      .catch(() => setNombre('Sucursal asignada'))
  }, [sucursalId])

  const esAdmin = rol === 'ADMIN' || rol === 'SUPERADMIN'
  const label = sucursalId
    ? nombre ?? 'Cargando…'
    : esAdmin
      ? 'Todas las sucursales'
      : 'Sin sucursal asignada'
  const hint = sucursalId
    ? 'Asignada a tu usuario · define POS, inventario y ventas'
    : esAdmin
      ? 'Tu usuario no tiene sucursal fija · elegís sucursal en cada módulo (POS, reportes…)'
      : 'Pedile a un admin que te asigne sucursal'

  return (
    <div className="ops-sucursal-context" title={hint}>
      <p className="ops-sucursal-label">Sucursal</p>
      <p className="ops-sucursal-value">{label}</p>
      <p className="ops-sucursal-hint">{hint}</p>
    </div>
  )
}

function MobileBottomNav({ client }: { client: boolean }) {
  if (!client) return null
  return (
    <nav className="mobile-bottom-nav" aria-label="Acciones principales móviles">
      <Link to="/inicio" title="Inicio">
        <span aria-hidden="true">⌂</span>
        <small>Inicio</small>
      </Link>
      <Link to="/catalogo" title="Catálogo">
        <span aria-hidden="true">⌕</span>
        <small>Catálogo</small>
      </Link>
      <Link to="/favoritos" title="Favoritos">
        <span aria-hidden="true">♡</span>
        <small>Favoritos</small>
      </Link>
      <Link to="/carrito" title="Bolsa">
        <span aria-hidden="true">▢</span>
        <small>Bolsa</small>
      </Link>
    </nav>
  )
}

function OpsSidebar({
  open,
  onClose,
  grupos,
  home,
  userName,
  userEmail,
  rol,
  sucursalId,
  navId,
  logout,
}: {
  open: boolean
  onClose: () => void
  grupos: NavGrupo[]
  home: string
  userName: string
  userEmail: string
  rol: string
  sucursalId?: string | null
  navId: string
  logout: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`ops-sidebar-backdrop${open ? ' is-open' : ''}`}
        hidden={!open}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id={navId}
        className={`ops-sidebar${open ? ' is-open' : ''}`}
        aria-label={`Navegación de ${etiquetaRol(rol)}`}
      >
        <div className="ops-sidebar-top">
          <div className="ops-sidebar-brand">
            <Link to={home} className="ops-brand" onClick={onClose}>
              <span className="ops-brand-mark"><MarcaTienda /></span>
              <span className="ops-brand-sub">Operaciones</span>
            </Link>
            <button
              ref={closeRef}
              type="button"
              className="ops-sidebar-close"
              aria-label="Cerrar menú de navegación"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="ops-sidebar-user">
            <p className="ops-sidebar-role">{etiquetaRol(rol)}</p>
            <p className="ops-sidebar-name">{userName}</p>
            <p className="ops-sidebar-email">{userEmail}</p>
          </div>
          <SelectorTienda />
        </div>
        <nav className="ops-sidebar-nav" aria-label="Módulos del rol">
          {grupos.map(grupo => (
            <div className="ops-nav-group" key={grupo.id}>
              <p className="ops-nav-group-title" id={`ops-group-${grupo.id}`}>
                {grupo.titulo}
              </p>
              <ul className="ops-nav-list" aria-labelledby={`ops-group-${grupo.id}`}>
                {grupo.items.map(item => (
                  <li key={`${grupo.id}-${item.to}-${item.label}`}>
                    <OpsNavLink item={item} onNavigate={onClose} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="ops-sidebar-foot">
          <OpsSucursalContext sucursalId={sucursalId} rol={rol} />
          <AccionesPwa />
          <div className="ops-sidebar-tools">
            <ThemeToggle />
            <Link className="ops-tool-link" to="/cuenta" onClick={onClose}>
              Cuenta
            </Link>
            <button type="button" className="ops-tool-link ops-logout" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function ClientShell({
  user,
  logout,
  home,
}: {
  user: ReturnType<typeof useAuth>['user']
  logout?: () => void
  home: string
}) {
  const location = useLocation()
  const { cart, cartNotice, dismissCartNotice } = useStorefront()
  const marca = useTiendaPublica()?.nombre ?? 'Vesta'
  const [menuOpen, setMenuOpen] = useState(false)
  const [megaOpen, setMegaOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const guest = !user
  const bagCount = cart.reduce((sum, line) => sum + line.cantidad, 0)
  const authNext = encodeURIComponent(`${location.pathname}${location.search}`)
  const fullBleed =
    ['/inicio', '/catalogo'].includes(location.pathname) || location.pathname.startsWith('/ficha/')

  useEffect(() => {
    setMenuOpen(false)
    setMegaOpen(false)
  }, [location.pathname, location.search])

  return (
    <div className="app shell-app client-shell">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>
      <MobileBottomNav client />
      <div className="client-chrome">
        <CampaignBar />
        <header className="topbar shell-topbar client-topbar">
          <button
            className="mobile-menu-button"
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <Link className="brand-mark" to={home} aria-label={`${marca}, inicio`}>
            <MarcaTienda />
          </Link>
          <nav className="desktop-shell-nav" aria-label="Navegación principal">
            <ShellLink end to="/inicio">
              Inicio
            </ShellLink>
            <button
              className={`shell-link shell-menu-trigger${megaOpen ? ' active' : ''}`}
              type="button"
              aria-expanded={megaOpen}
              onClick={() => setMegaOpen(value => !value)}
            >
              Catálogo <Icon name="chevron" />
            </button>
            <CatalogCollectionLink coleccion="novedades">Novedades</CatalogCollectionLink>
            <CatalogCollectionLink coleccion="ocasiones">Ocasiones</CatalogCollectionLink>
            <CatalogCollectionLink coleccion="ofertas">Ofertas</CatalogCollectionLink>
          </nav>
          <div className="shell-actions">
            <BranchSelector fallback="La Paz" label="Retiro" />
            <InstalarApp />
            <button
              className="shell-icon-button"
              type="button"
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
            >
              <Icon name="search" />
            </button>
            <Link
              className="shell-icon-button"
              aria-label="Favoritos"
              to={guest ? `/login?next=${encodeURIComponent('/favoritos')}` : '/favoritos'}
            >
              <Icon name="heart" />
            </Link>
            <div className="bag-notice-anchor">
              <Link className="shell-icon-button bag-button" aria-label="Bolsa" to="/carrito">
                <Icon name="bag" />
                {bagCount > 0 ? <span className="bag-count">{bagCount > 9 ? '9+' : bagCount}</span> : null}
              </Link>
              {cartNotice ? (
                <div className="bag-added-notice" role="status" aria-live="polite">
                  {cartNotice.urlFoto ? <img src={assetUrl(cartNotice.urlFoto)} alt="" /> : <span className="bag-added-placeholder" aria-hidden="true">V</span>}
                  <div className="bag-added-content">
                    <strong>{cartNotice.nombre}</strong>
                    <b>Bs {cartNotice.precio.toFixed(2)}</b>
                    <dl>
                      <div><dt>Color</dt><dd>{cartNotice.color}</dd></div>
                      <div><dt>Talla</dt><dd>{cartNotice.talla}</dd></div>
                      <div><dt>Cantidad</dt><dd>{cartNotice.cantidad}</dd></div>
                    </dl>
                  </div>
                  <button type="button" onClick={dismissCartNotice} aria-label="Cerrar aviso">×</button>
                </div>
              ) : null}
            </div>
            {!guest ? <NotificacionesBell variant="client" /> : null}
            {guest ? (
              <Link className="shell-auth-link" to={`/login?next=${authNext}`}>
                Entrar
              </Link>
            ) : (
              <button
                className={`shell-icon-button${user.avatarUrl ? ' shell-icon-button--avatar' : ''}`}
                type="button"
                aria-label="Abrir cuenta"
                onClick={() => setAccountOpen(true)}
              >
                {user.avatarUrl ? (
                  <img className="shell-user-avatar" src={assetUrl(user.avatarUrl)} alt="" />
                ) : (
                  <Icon name="user" />
                )}
              </button>
            )}
            <ThemeToggle />
          </div>
          <CatalogMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
        </header>
      </div>
      <main
        id="contenido-principal"
        className={fullBleed ? 'shell-full-bleed' : ''}
        tabIndex={-1}
      >
        <BannerOffline />
        <Outlet />
      </main>
      <Asistente />
      {!guest && user ? (
        <AccountPanel
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          user={user}
          logout={logout}
        />
      ) : null}
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobilePanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={
          guest
            ? [
                { to: '/inicio', label: 'Inicio', end: true },
                { to: '/catalogo', label: 'Catálogo' },
                { to: '/catalogo?coleccion=novedades', label: 'Novedades' },
                { to: '/catalogo?coleccion=ofertas', label: 'Ofertas' },
                { to: '/carrito', label: 'Bolsa' },
                { to: `/login?next=${authNext}`, label: 'Entrar' },
                { to: `/registro?next=${authNext}`, label: 'Crear cuenta' },
              ]
            : [
                { to: '/inicio', label: 'Inicio', end: true },
                { to: '/catalogo', label: 'Catálogo' },
                { to: '/catalogo?coleccion=novedades', label: 'Novedades' },
                { to: '/catalogo?coleccion=ofertas', label: 'Ofertas' },
                { to: '/favoritos', label: 'Favoritos' },
                { to: '/carrito', label: 'Bolsa' },
                { to: '/cuenta', label: 'Cuenta' },
              ]
        }
      />
    </div>
  )
}

function OpsShell({
  user,
  logout,
  home,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>
  logout: () => void
  home: string
}) {
  const location = useLocation()
  const navId = useId()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const grupos = useMemo(() => navGruposPorRol(user.rol), [user.rol])
  const pageTitle = useMemo(() => {
    const flat = navPorRol(user.rol)
    const match = flat.find(item => {
      const path = item.to.split('?')[0]
      if (item.end) return location.pathname === path
      return location.pathname === path || location.pathname.startsWith(`${path}/`)
    })
    return match?.label ?? etiquetaRol(user.rol)
  }, [location.pathname, user.rol])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.classList.toggle('ops-drawer-open', sidebarOpen)
    return () => document.body.classList.remove('ops-drawer-open')
  }, [sidebarOpen])

  return (
    <div className="app shell-app ops-shell">
      <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
      <OpsSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        grupos={grupos}
        home={home}
        userName={user.nombre}
        userEmail={user.email}
        rol={user.rol}
        sucursalId={user.sucursalId}
        navId={navId}
        logout={logout}
      />
      <div className="ops-workspace">
        <header className="ops-topbar ops-topbar--slim">
          <button
            className="ops-menu-button"
            type="button"
            aria-label="Abrir menú de navegación"
            aria-expanded={sidebarOpen}
            aria-controls={navId}
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="ops-topbar-title">
            <p className="ops-topbar-kicker">{etiquetaRol(user.rol)}</p>
            <p className="ops-topbar-current" aria-live="polite">{pageTitle}</p>
          </div>
          <div className="ops-topbar-actions">
            <NotificacionesBell variant="ops" />
            <EstadoConexion />
          </div>
        </header>
        <main id="contenido-principal" className="ops-main" tabIndex={-1}>
          <BannerOffline />
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function Shell() {
  const { user, logout } = useAuth()
  if (!user) return <ClientShell user={null} home="/inicio" />
  const home = homePorRol(user.rol)
  if (esClienta(user.rol)) return <ClientShell user={user} logout={logout} home={home} />
  return <OpsShell user={user} logout={logout} home={home} />
}

export function ShellPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="shell-placeholder">
      <p className="eyebrow">VESTA</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="ui-button ui-button--primary" to="/catalogo">Volver al catálogo</Link>
    </section>
  )
}
