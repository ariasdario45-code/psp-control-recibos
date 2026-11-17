import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { usePermissions, type Rol } from './context/usePermissions'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import NuevoTurno from './components/NuevoTurno'
import TablaRegistros from './components/TablaRegistros'
import HistorialTable from './components/HistorialTable'
import GestionUsuarios from './components/GestionUsuarios'
import Configuracion from './components/Configuracion'
import Admin from './components/Admin'
import Login from './components/Login'

function ProtectedRoute({ 
  children, 
  rolesPermitidos 
}: { 
  children: ReactNode
  rolesPermitidos?: Rol[] 
}) {
  const { usuario, cargando } = useAuth()
  const { rol } = usePermissions()
  
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors duration-150">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0077B6] dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }
  
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  
  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/panel" replace />
  }
  
  return <>{children}</>
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-150 flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Rutas para TODOS los roles */}
      <Route path="/panel" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/nuevo" element={
        <ProtectedRoute><Layout><NuevoTurno /></Layout></ProtectedRoute>
      } />
      <Route path="/turno/:id" element={
        <ProtectedRoute><Layout><TablaRegistros /></Layout></ProtectedRoute>
      } />
      <Route path="/historial" element={
        <ProtectedRoute><Layout><HistorialTable /></Layout></ProtectedRoute>
      } />
      
      {/* ✅ Rutas SOLO para admin */}
      <Route path="/usuarios" element={
        <ProtectedRoute rolesPermitidos={['admin']}><Layout><GestionUsuarios /></Layout></ProtectedRoute>
      } />
      <Route path="/configuracion" element={
        <ProtectedRoute rolesPermitidos={['admin']}><Layout><Configuracion /></Layout></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute rolesPermitidos={['admin']}><Layout><Admin /></Layout></ProtectedRoute>
      } />
      
      <Route path="/" element={<Navigate to="/panel" replace />} />
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}