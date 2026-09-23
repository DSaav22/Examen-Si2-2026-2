import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { ThemeToggle } from '../shared/ThemeToggle'
import { ConnectionIndicator, SidePanel } from '../shared/Visual'
import { api } from '../api'
import type { Sucursal } from '../types'
import { Asistente } from './Asistente'

function Icon({ name }: { name: 'search' | 'heart' | 'user' | 'bag' | 'menu' | 'chevron' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
    heart: <path d="M20.8 8.7c0 5.1-8.8 10.3-8.8 10.3S3.2 13.8 3.2 8.7A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.7Z" />,
    user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20c.7-3.3 3-5 7-5s6.3 1.7 7 5" /></>,
    bag: <><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  }
  return <svg className="shell-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function ShellLink({ to, children, end = false }: { to: string; children: React.ReactNode; end?: boolean }) {
  return <NavLink end={end} className={({ isActive }) => isActive ? 'shell-link active' : 'shell-link'} to={to}>{children}</NavLink>
}

function Countdown() {
  const [seconds, setSeconds] = useState(19 * 60 + 38)
  useEffect(() => { const timer = window.setInterval(() => setSeconds(value => value > 0 ? value - 1 : 19 * 60 + 38), 1000); return () => window.clearInterval(timer) }, [])
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const remaining = String(seconds % 60).padStart(2, '0')
  return <span aria-label={`La oferta termina en ${minutes} minutos y ${remaining} segundos`}>{minutes}:{remaining}</span>
}

function CampaignBar() {
  return <><div className="promo-strip">ENVÍO GRATIS DESDE BS 350 <span aria-hidden="true">·</span> NUEVA TEMPORADA</div><div className="campaign-strip">OFERTA DE TEMPORADA <span aria-hidden="true">·</span> HASTA 25% <small><Countdown /></small></div></>
}

function CatalogMegaMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return <div className="mega-menu" role="region" aria-label="Categorías de catálogo"><div className="mega-menu-inner">
    <div><p className="mega-label">MUJER</p><Link onClick={onClose} to="/catalogo?categoria=vestidos">Vestidos</Link><Link onClick={onClose} to="/catalogo?categoria=sastreria">Sastrería</Link><Link onClick={onClose} to="/catalogo?categoria=abrigos">Abrigos</Link></div>
    <div><p className="mega-label">COLECCIONES</p><Link onClick={onClose} to="/catalogo?coleccion=novedades">Novedades</Link><Link onClick={onClose} to="/catalogo?coleccion=ofertas">Ofertas</Link><Link onClick={onClose} to="/catalogo?coleccion=temporada">Temporada</Link></div>
    <div className="mega-feature"><span>Selección editorial</span><strong>La nueva sofisticación</strong><Link onClick={onClose} to="/catalogo">Descubrir colección →</Link></div>
  </div></div>
}

function AccountPanel({ open, onClose, user }: { open: boolean; onClose: () => void; user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const navigate = useNavigate(); const canOperate = ['ADMIN', 'CAJERO', 'ENCARGADO'].includes(user.rol)
  const go = (path: string) => { onClose(); navigate(path) }
  return <SidePanel title="Acceso Vesta" open={open} onClose={onClose}><p className="panel-kicker">CUENTA ACTIVA</p><h3>{user.nombre}</h3><p className="muted">{user.email} · {user.rol}</p><div className="panel-actions">
    <button type="button" className="panel-action" onClick={() => go('/cuenta')}>Mi cuenta <span>→</span></button><button type="button" className="panel-action" onClick={() => go('/favoritos')}>Mis favoritos <span>→</span></button>{canOperate ? <button type="button" className="panel-action" onClick={() => go(user.rol === 'ADMIN' ? '/admin' : user.rol === 'CAJERO' ? '/pos' : '/encargado')}>Centro de operaciones <span>→</span></button> : null}
  </div><p className="panel-note">El acceso de empleado se muestra únicamente para usuarios con permisos reales.</p></SidePanel>
}

function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(''); const navigate = useNavigate()
  const submit = (event: React.FormEvent) => { event.preventDefault(); onClose(); navigate(`/catalogo${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`) }
  return <SidePanel title="Buscar" open={open} onClose={onClose}><form className="shell-search-form" onSubmit={submit}><label htmlFor="shell-search">Buscar en Vesta</label><div className="shell-search-input"><Icon name="search" /><input id="shell-search" autoFocus={open} value={query} onChange={event => setQuery(event.target.value)} placeholder="Prendas, colores, colecciones" /></div><button className="ui-button ui-button--primary" type="submit">Ver resultados</button></form></SidePanel>
}

function MobilePanel({ open, onClose, user }: { open: boolean; onClose: () => void; user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  const canOperate = ['ADMIN', 'CAJERO', 'ENCARGADO'].includes(user.rol)
  return <SidePanel title="Menú" open={open} onClose={onClose}><nav className="mobile-shell-nav" aria-label="Navegación móvil"><ShellLink to="/inicio">Inicio</ShellLink><ShellLink to="/catalogo">Mujer</ShellLink><ShellLink to="/catalogo?coleccion=novedades">Novedades</ShellLink><ShellLink to="/catalogo?coleccion=ofertas">Ofertas</ShellLink><ShellLink to="/favoritos">Favoritos</ShellLink><ShellLink to="/carrito">Bolsa</ShellLink>{canOperate ? <ShellLink to={user.rol === 'ADMIN' ? '/admin' : user.rol === 'CAJERO' ? '/pos' : '/encargado'}>Centro de operaciones</ShellLink> : null}</nav></SidePanel>
}

function BranchSelector({ fallback }: { fallback: string }) {
  const [branches, setBranches] = useState<Sucursal[]>([])
  const [selected, setSelected] = useState(() => localStorage.getItem('ensayar_sucursal') ?? '')
  useEffect(() => { api<Sucursal[]>('/catalogo/sucursales').then(setBranches).catch(() => undefined) }, [])
  const change = (id: string) => { setSelected(id); localStorage.setItem('ensayar_sucursal', id); window.dispatchEvent(new Event('ensayar_sucursal_actualizada')) }
  return branches.length ? <label className="branch-selector" title="Seleccionar sucursal"><span className="sr-only">Sucursal</span><select aria-label="Seleccionar sucursal" value={selected || branches[0].id} onChange={event => change(event.target.value)}>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}</select><Icon name="chevron" /></label> : <span className="branch-selector" title="Sucursal seleccionada"><span>{fallback}</span><Icon name="chevron" /></span>
}

function MobileBottomNav({ client }: { client: boolean }) {
  if (!client) return null
  return <nav className="mobile-bottom-nav" aria-label="Acciones principales móviles"><Link to="/inicio" title="Inicio"><span aria-hidden="true">⌂</span><small>Inicio</small></Link><Link to="/catalogo" title="Catálogo"><span aria-hidden="true">⌕</span><small>Catálogo</small></Link><Link to="/favoritos" title="Favoritos"><span aria-hidden="true">♡</span><small>Favoritos</small></Link><Link to="/carrito" title="Bolsa"><span aria-hidden="true">▢</span><small>Bolsa</small></Link></nav>
}

export function Shell() {
  const { user, logout } = useAuth(); const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); const [megaOpen, setMegaOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const [accountOpen, setAccountOpen] = useState(false)
  const canOperate = user ? ['ADMIN', 'CAJERO', 'ENCARGADO'].includes(user.rol) : false; const branch = user?.sucursalId ? 'Sucursal asignada' : 'Equipetrol'; const closePanels = () => { setMenuOpen(false); setMegaOpen(false) }; const clientNav = useMemo(() => user?.rol === 'CLIENTA', [user?.rol])
  useEffect(() => { closePanels() }, [location.pathname, location.search])
  if (!user) return <Navigate to="/login" replace />
  return <div className="app shell-app"><div className="shell-branch-picker"><BranchSelector fallback={branch} /></div><MobileBottomNav client={clientNav} /><CampaignBar /><header className={`topbar shell-topbar ${clientNav ? 'client-topbar' : ''}`}>
    <button className="mobile-menu-button" type="button" aria-label="Abrir menú" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button><Link className="brand-mark" to="/inicio" aria-label="Vesta, inicio">VESTA</Link>
    <nav className="desktop-shell-nav" aria-label="Navegación principal"><ShellLink end to="/inicio">INICIO</ShellLink><button className={`shell-link shell-menu-trigger${megaOpen ? ' active' : ''}`} type="button" aria-expanded={megaOpen} onClick={() => setMegaOpen(value => !value)}>MUJER <Icon name="chevron" /></button><ShellLink to="/catalogo?coleccion=novedades">NOVEDADES</ShellLink><ShellLink to="/catalogo?coleccion=ocasiones">OCASIONES</ShellLink><ShellLink to="/catalogo?coleccion=ofertas">OFERTAS</ShellLink>{(user.rol === 'ADMIN' || user.rol === 'CAJERO') ? <ShellLink to="/catalogo">CATÁLOGO</ShellLink> : null}{user.rol === 'ADMIN' ? <ShellLink to="/base-datos">DATOS</ShellLink> : null}</nav>
    <div className="shell-actions"><button className="branch-selector" type="button" aria-label={`Sucursal seleccionada: ${branch}`}><span>{branch}</span><Icon name="chevron" /></button><button className="shell-icon-button" type="button" aria-label="Buscar" onClick={() => setSearchOpen(true)}><Icon name="search" /></button><ThemeToggle />{clientNav ? <Link className="shell-icon-button" aria-label="Favoritos" to="/favoritos"><Icon name="heart" /></Link> : null}<button className="shell-icon-button" type="button" aria-label="Abrir cuenta" onClick={() => setAccountOpen(true)}><Icon name="user" /></button>{clientNav ? <Link className="shell-icon-button bag-button" aria-label="Bolsa" to="/carrito"><Icon name="bag" /></Link> : null}<button className="shell-logout" type="button" onClick={logout}>Salir</button></div><CatalogMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
  </header><div className="shell-status-row"><ConnectionIndicator /><span>·</span><span>{branch}</span>{canOperate ? <Link to={user.rol === 'ADMIN' ? '/admin' : user.rol === 'CAJERO' ? '/pos' : '/encargado'}>Acceso empleado</Link> : null}</div><main><Outlet /></main>{clientNav ? <Asistente /> : null}<AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} user={user} /><SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} /><MobilePanel open={menuOpen} onClose={() => setMenuOpen(false)} user={user} /></div>
}

export function ShellPlaceholder({ title, description }: { title: string; description: string }) { return <section className="shell-placeholder"><p className="eyebrow">VESTA</p><h1>{title}</h1><p>{description}</p><Link className="ui-button ui-button--primary" to="/catalogo">Volver al catálogo</Link></section> }
