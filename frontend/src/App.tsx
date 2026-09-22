import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { StorefrontProvider } from './storefront'
import { Favoritos } from './pages/Favoritos'
import { AdminDashboard } from './pages/AdminDashboard'
import { DatabaseExplorer } from './pages/DatabaseExplorer'
import { Admin } from './pages/Admin'
import { Carrito } from './pages/Carrito'
import { Catalogo } from './pages/Catalogo'
import { Encargado } from './pages/Encargado'
import { Ficha } from './pages/Ficha'
import { Historial } from './pages/Historial'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Pos } from './pages/Pos'
import { Probador } from './pages/Probador'
import { ProveedorPortal } from './pages/ProveedorPortal'
import { Registro } from './pages/Registro'
import { Reportes } from './pages/Reportes'
import { Reservas } from './pages/Reservas'
import { Shell, ShellPlaceholder } from './pages/Shell'

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
            <Route path="/cuenta" element={<ShellPlaceholder title="Mi cuenta" description="El área de cuenta está preparada para conectar preferencias, pedidos y fidelización." />} />
            <Route path="/base-datos" element={<DatabaseExplorer />} />
            <Route path="/ficha/:id" element={<Ficha />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/pos" element={<Pos />} />
            <Route path="/encargado" element={<Encargado />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/configuracion" element={<Admin />} />
            <Route path="/proveedor" element={<ProveedorPortal />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/probar/:varianteId" element={<Probador />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </StorefrontProvider>
    </AuthProvider>
  )
}
