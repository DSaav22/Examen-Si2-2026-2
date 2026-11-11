import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth'
import { StorefrontProvider } from './storefront'
import { homePorRol } from './roles'
import { Favoritos } from './pages/Favoritos'
import { AdminDashboard } from './pages/AdminDashboard'
import { DatabaseExplorer } from './pages/DatabaseExplorer'
import { Admin } from './pages/Admin'
import { Carrito } from './pages/Carrito'
import { Catalogo } from './pages/Catalogo'
import { Cuenta } from './pages/Cuenta'
import { Encargado } from './pages/Encargado'
import { Despacho } from './pages/Despacho'
import { Ficha } from './pages/Ficha'
import { Historial } from './pages/Historial'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Pos } from './pages/Pos'
import { Probador } from './pages/Probador'
import { ProveedorPortal } from './pages/ProveedorPortal'
import { Registro } from './pages/Registro'
import { Reportes } from './pages/Reportes'
import { Analitica } from './pages/Analitica'
import { Moderacion } from './pages/Moderacion'
import { Bitacora } from './pages/Bitacora'
import { Reservas } from './pages/Reservas'
import { Shell } from './pages/Shell'
import { Sincronizacion } from './pages/Sincronizacion'
import { Creditos } from './pages/Creditos'
import { PlataformaLayout } from './plataforma/comun'
import { Planes } from './plataforma/Planes'
import { Portada } from './plataforma/Portada'
import { Empezar, PlataformaLogin, Verificar } from './plataforma/Acceso'
import { MisTiendas } from './plataforma/MisTiendas'
import { NuevaTienda } from './plataforma/NuevaTienda'
import { MetricasPlataforma } from './plataforma/Metricas'
import { TiendaPorSlug } from './shared/SelectorTienda'

/**
 * Mapa de navegación web. Para localizar una pantalla de la exposición,
 * buscá su ruta aquí y luego su componente en `pages/`. ProtectedRoute sólo
 * controla UX: la API vuelve a validar JWT y rol en el backend.
 */
function loginPath(next?: string) {
  if (!next || next === '/login' || next === '/registro') return '/login'
  return `/login?next=${encodeURIComponent(next)}`
}

function ProtectedRoute({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to={loginPath(`${location.pathname}${location.search}`)} replace />
  }
  if (roles && !roles.includes(user.rol)) return <Navigate to={homePorRol(user.rol)} replace />
  return <>{children}</>
}

function CatchAll() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/inicio" replace />
  return <Navigate to={homePorRol(user.rol)} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            <Route path="/t/:slug" element={<TiendaPorSlug />} />
            <Route path="/t/:slug/admin" element={<TiendaPorSlug administrar />} />
            <Route element={<PlataformaLayout />}>
              <Route path="/" element={<Portada />} />
              <Route path="/planes" element={<Planes />} />
              <Route path="/empezar" element={<Empezar />} />
              <Route path="/verificar" element={<Verificar />} />
              <Route path="/plataforma/login" element={<PlataformaLogin />} />
              <Route path="/plataforma" element={<MisTiendas />} />
              <Route path="/plataforma/nueva" element={<NuevaTienda />} />
              <Route path="/plataforma/admin" element={<MetricasPlataforma />} />
            </Route>
            <Route element={<Shell />}>
              <Route path="/inicio" element={<Home />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/ficha/:id" element={<Ficha />} />
              <Route path="/carrito" element={<Carrito />} />
              <Route
                path="/favoritos"
                element={
                  <ProtectedRoute roles={['CLIENTA']}>
                    <Favoritos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cuenta"
                element={
                  <ProtectedRoute roles={['CLIENTA', 'CAJERO', 'ENCARGADO', 'ADMIN', 'SUPERADMIN', 'PROVEEDOR']}>
                    <Cuenta />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/base-datos"
                element={
                  <ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}>
                    <DatabaseExplorer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservas"
                element={
                  <ProtectedRoute roles={['CLIENTA']}>
                    <Reservas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/historial"
                element={
                  <ProtectedRoute roles={['CLIENTA']}>
                    <Historial />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute roles={['CAJERO', 'ADMIN', 'SUPERADMIN']}>
                    <Pos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/creditos"
                element={
                  <ProtectedRoute roles={['CAJERO', 'ENCARGADO', 'ADMIN', 'SUPERADMIN']}>
                    <Creditos />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sincronizacion"
                element={
                  <ProtectedRoute roles={['CAJERO', 'ENCARGADO', 'ADMIN', 'SUPERADMIN']}>
                    <Sincronizacion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/encargado"
                element={
                  <ProtectedRoute roles={['ENCARGADO', 'ADMIN', 'SUPERADMIN']}>
                    <Encargado />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/despacho"
                element={
                  <ProtectedRoute roles={['ENCARGADO', 'ADMIN', 'SUPERADMIN']}>
                    <Despacho />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/moderacion"
                element={
                  <ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}>
                    <Moderacion />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bitacora"
                element={
                  <ProtectedRoute roles={['SUPERADMIN']}>
                    <Bitacora />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuracion"
                element={
                  <ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proveedor"
                element={
                  <ProtectedRoute roles={['PROVEEDOR', 'ADMIN', 'SUPERADMIN']}>
                    <ProveedorPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}>
                    <Reportes />
                  </ProtectedRoute>
                }
              />
              <Route path="/analitica" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}><Analitica /></ProtectedRoute>} />
              <Route
                path="/probar/:varianteId"
                element={
                  <ProtectedRoute roles={['CLIENTA', 'ADMIN', 'SUPERADMIN']}>
                    <Probador />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<CatchAll />} />
          </Routes>
        </BrowserRouter>
      </StorefrontProvider>
    </AuthProvider>
  )
}
