import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../auth'

export function Shell() {
  const { user, logout } = useAuth()
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <header className="topbar">
        <strong>EnsayAR</strong>
        <nav>
          {(user.rol === 'CLIENTA' || user.rol === 'ADMIN' || user.rol === 'CAJERO') && (
            <NavLink to="/catalogo">Catálogo</NavLink>
          )}
          {user.rol === 'CLIENTA' ? (
            <>
              <NavLink to="/carrito">Carrito</NavLink>
              <NavLink to="/reservas">Reservas</NavLink>
              <NavLink to="/historial">Historial</NavLink>
            </>
          ) : null}
          {user.rol === 'CAJERO' || user.rol === 'ADMIN' ? (
            <NavLink to="/pos">Caja</NavLink>
          ) : null}
          {user.rol === 'ENCARGADO' || user.rol === 'ADMIN' ? (
            <NavLink to="/encargado">Sucursal</NavLink>
          ) : null}
          {user.rol === 'ADMIN' ? (
            <>
              <NavLink to="/admin">Admin</NavLink>
              <NavLink to="/reportes">Reportes</NavLink>
            </>
          ) : null}
          {user.rol === 'PROVEEDOR' ? (
            <NavLink to="/proveedor">Proveedor</NavLink>
          ) : null}
        </nav>
        <div className="who">
          <span>
            {user.nombre} · {user.rol}
          </span>
          <button className="ghost" type="button" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
