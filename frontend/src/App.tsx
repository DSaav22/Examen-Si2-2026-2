import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth'
import { Admin } from './pages/Admin'
import { Carrito } from './pages/Carrito'
import { Catalogo } from './pages/Catalogo'
import { Encargado } from './pages/Encargado'
import { Ficha } from './pages/Ficha'
import { Historial } from './pages/Historial'
import { Login } from './pages/Login'
import { Pos } from './pages/Pos'
import { Probador } from './pages/Probador'
import { ProveedorPortal } from './pages/ProveedorPortal'
import { Registro } from './pages/Registro'
import { Reportes } from './pages/Reportes'
import { Reservas } from './pages/Reservas'
import { Shell } from './pages/Shell'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route element={<Shell />}>
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/ficha/:id" element={<Ficha />} />
            <Route path="/carrito" element={<Carrito />} />
            <Route path="/reservas" element={<Reservas />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/pos" element={<Pos />} />
            <Route path="/encargado" element={<Encargado />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/proveedor" element={<ProveedorPortal />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/probar/:varianteId" element={<Probador />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
