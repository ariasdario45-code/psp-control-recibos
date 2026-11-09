import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

// Definimos la estructura del usuario
export interface Usuario {
  id: number
  codigo: string
  nombre: string
  rol: string
  email?: string
}

// Definimos el tipo del contexto (AGREGAMOS esAdmin AQUÍ)
interface AuthContextType {
  usuario: Usuario | null
  cargando: boolean
  esAdmin: boolean // <-- ESTA LÍNEA FALTABA
  login: (usuarioInput: string, contrasena: string) => Promise<boolean>
  logout: () => void
}

// Creamos el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Proveedor del contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(true)

  // Al montar el componente, verificamos si hay una sesión guardada
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('psp_usuario')
    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado))
      } catch (error) {
        console.error('Error al parsear usuario del localStorage:', error)
        localStorage.removeItem('psp_usuario')
      }
    }
    setCargando(false)
  }, [])

  // ✅ FUNCIÓN DE LOGIN SEGURA
  const login = async (usuarioInput: string, contrasena: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('codigo', usuarioInput.toUpperCase().trim())
        .eq('activo', true)
        .single()

      if (error || !data) {
        console.error('Usuario no encontrado o inactivo:', error)
        return false
      }

      if (data.contrasena !== contrasena) {
        return false
      }

      const usuarioData: Usuario = {
        id: data.id,
        codigo: data.codigo,
        nombre: data.nombre,
        rol: data.rol,
        email: data.email
      }
      
      setUsuario(usuarioData)
      localStorage.setItem('psp_usuario', JSON.stringify(usuarioData))

      return true
    } catch (error) {
      console.error('Error en login:', error)
      return false
    }
  }

  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('psp_usuario')
  }

  // ✅ CALCULAR SI ES ADMIN (ESTA LÓGICA FALTABA)
  const esAdmin = usuario?.rol === 'admin' || usuario?.rol === 'superadmin'

  return (
    // ✅ EXPORTAMOS esAdmin AQUÍ
    <AuthContext.Provider value={{ usuario, cargando, esAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}