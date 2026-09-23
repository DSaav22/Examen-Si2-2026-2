import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth'
import { StorefrontProvider } from './storefront'
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
import { Moderacion } from './pages/Moderacion'
import { Reservas } from './pages/Reservas'
import { Shell } from './pages/Shell'

function ProtectedRoute({ roles, children }: { roles?: string[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) return <Navigate to="/inicio" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <StorefrontProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route element={<Shell />}>
            <Route path="/inicio" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/favoritos" element={<Favoritos />} />
            <Route path="/cuenta" element={<Cuenta />} />
            <Route path="/base-datos" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}><DatabaseExplorer /></ProtectedRoute>} />
            <Route path="/ficha/:id" element={<Ficha />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/reservas" element={<ProtectedRoute roles={['CLIENTA', 'ADMIN', 'CAJERO', 'ENCARGADO']}><Reservas /></ProtectedRoute>} />
            <Route path="/historial" element={<ProtectedRoute roles={['CLIENTA', 'ADMIN', 'CAJERO', 'ENCARGADO']}><Historial /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute roles={['CAJERO', 'ENCARGADO', 'ADMIN', 'VENDEDOR']}><Pos /></ProtectedRoute>} />
            <Route path="/encargado" element={<ProtectedRoute roles={['ENCARGADO', 'ADMIN', 'SUPERADMIN']}><Encargado /></ProtectedRoute>} />
            <Route path="/despacho" element={<ProtectedRoute roles={['ENCARGADO', 'ADMIN', 'SUPERADMIN']}><Despacho /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/moderacion" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}><Moderacion /></ProtectedRoute>} />
            <Route path="/admin/configuracion" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN']}><Admin /></ProtectedRoute>} />
            <Route path="/proveedor" element={<ProtectedRoute roles={['PROVEEDOR', 'ADMIN']}><ProveedorPortal /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute roles={['ADMIN', 'SUPERADMIN', 'ENCARGADO']}><Reportes /></ProtectedRoute>} />
            <Route path="/probar/:varianteId" element={<Probador />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </StorefrontProvider>
    </AuthProvider>
  )
}
