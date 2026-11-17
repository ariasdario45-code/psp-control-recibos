import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissions, type Rol } from '../context/usePermissions'

interface ProtectedRouteProps {
  children: React.ReactNode
  rolesPermitidos?: Rol[]
}

export default function ProtectedRoute({ children, rolesPermitidos }: ProtectedRouteProps) {
  const { usuario, cargando } = useAuth()
  const { rol } = usePermissions()

  // Mientras carga la sesión, mostramos un spinner
  if (cargando) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Si no hay sesión iniciada → al login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Si la ruta exige roles y el usuario no tiene permiso → al panel
  if (rolesPermitidos && !rolesPermitidos.includes(rol)) {
    return <Navigate to="/panel" replace />
  }

  return <>{children}</>
}