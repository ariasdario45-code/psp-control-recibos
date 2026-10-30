import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import HistorialTable from './components/HistorialTable'
import NuevoRegistro from './components/NuevoRegistro'
import Admin from './components/Admin'
import GestionUsuarios from './components/GestionUsuarios'
import Dashboard from './components/Dashboard'
import Login from './components/Login'

function RutaPrivada({ children }: { children: React.ReactNode }) {
  const { estaAutenticado } = useAuth()
  if (!estaAutenticado) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RutaAdmin({ children }: { children: React.ReactNode }) {
  const { estaAutenticado, esAdmin } = useAuth()
  if (!estaAutenticado) return <Navigate to="/login" replace />
  if (!esAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppContenido() {
  const { estaAutenticado } = useAuth()

  return (
    <Router>
      {estaAutenticado ? (
        <div className="flex min-h-screen bg-slate-100">
          <Sidebar />
          <main className="flex-1 p-8 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/nuevo" element={<NuevoRegistro />} />
              <Route path="/historial" element={<HistorialTable />} />
              <Route path="/admin" element={<RutaAdmin><Admin /></RutaAdmin>} />
              <Route path="/usuarios" element={<RutaAdmin><GestionUsuarios /></RutaAdmin>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContenido />
    </AuthProvider>
  )
}

export default App