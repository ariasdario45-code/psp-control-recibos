import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import NuevoTurno from './components/NuevoTurno'
import TablaRegistros from './components/TablaRegistros'
import HistorialTable from './components/HistorialTable'
import GestionUsuarios from './components/GestionUsuarios'
import Configuracion from './components/Configuracion'
import Admin from './components/Admin'
import Login from './components/Login'

// Componente para proteger rutas (solo usuarios logueados)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth()
  
  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando...</p>
        </div>
      </div>
    )
  }
  
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Layout principal con Sidebar
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
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
      {/* Ruta pública - Login */}
      <Route path="/login" element={<Login />} />
      
      {/* Rutas protegidas */}
      <Route path="/panel" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/nuevo" element={
        <ProtectedRoute>
          <Layout>
            <NuevoTurno />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/turno/:id" element={
        <ProtectedRoute>
          <TablaRegistros />
        </ProtectedRoute>
      } />
      
      <Route path="/historial" element={
        <ProtectedRoute>
          <Layout>
            <HistorialTable />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/usuarios" element={
        <ProtectedRoute>
          <Layout>
            <GestionUsuarios />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/configuracion" element={
        <ProtectedRoute>
          <Layout>
            <Configuracion />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/admin" element={
        <ProtectedRoute>
          <Layout>
            <Admin />
          </Layout>
        </ProtectedRoute>
      } />
      
      {/* Ruta por defecto - redirige al panel */}
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