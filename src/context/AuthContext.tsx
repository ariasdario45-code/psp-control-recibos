import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Usuario {
  id: number
  codigo: string
  nombre: string
  email: string
  rol: 'ADMIN' | 'AUXILIAR'
  estado: 'HABILITADO' | 'PENDIENTE' | 'BLOQUEADO'
}

interface AuthContextType {
  usuario: Usuario | null
  login: (codigo: string) => Promise<{ exito: boolean; mensaje: string }>
  logout: () => void
  estaAutenticado: boolean
  esAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  // Al cargar, verificar si hay sesión guardada
  useEffect(() => {
    const sesion = localStorage.getItem('sesion_usuario')
    if (sesion) {
      setUsuario(JSON.parse(sesion))
    }
  }, [])

  const login = async (codigo: string): Promise<{ exito: boolean; mensaje: string }> => {
    const codigoLimpio = codigo.trim().toUpperCase()

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('codigo', codigoLimpio)
      .single()

    if (error || !data) {
      return { exito: false, mensaje: 'Código no encontrado. Verifica e intenta de nuevo.' }
    }

    if (data.estado === 'BLOQUEADO') {
      return { exito: false, mensaje: 'Tu cuenta está bloqueada. Contacta al administrador.' }
    }

    if (data.estado === 'PENDIENTE') {
      return { exito: false, mensaje: 'Tu cuenta está pendiente de aprobación. Contacta al administrador.' }
    }

    // Login exitoso
    const usuarioLogueado: Usuario = {
      id: data.id,
      codigo: data.codigo,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      estado: data.estado,
    }

    setUsuario(usuarioLogueado)
    localStorage.setItem('sesion_usuario', JSON.stringify(usuarioLogueado))
    return { exito: true, mensaje: `Bienvenido, ${data.nombre}!` }
  }

  const logout = () => {
    setUsuario(null)
    localStorage.removeItem('sesion_usuario')
  }

  return (
    <AuthContext.Provider value={{
      usuario,
      login,
      logout,
      estaAutenticado: !!usuario,
      esAdmin: usuario?.rol === 'ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}