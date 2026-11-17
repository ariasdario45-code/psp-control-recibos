import { useAuth } from './AuthContext'

// ✅ Solo 2 roles: auxiliar y admin
export type Rol = 'admin' | 'auxiliar'

// Permisos por rol
const PERMISOS: Record<Rol, {
  puedeVerPanel: boolean
  puedeVerHistorial: boolean
  puedeCrearRegistro: boolean
  puedeVerUsuarios: boolean
  puedeVerConfiguracion: boolean
  puedeVerAdministracion: boolean
  veSoloSusDatos: boolean  // ← NUEVO: controla aislamiento
}> = {
  admin: {
    puedeVerPanel: true,
    puedeVerHistorial: true,
    puedeCrearRegistro: true,
    puedeVerUsuarios: true,
    puedeVerConfiguracion: true,
    puedeVerAdministracion: true,
    veSoloSusDatos: false,  // El admin ve TODO
  },
  auxiliar: {
    puedeVerPanel: true,
    puedeVerHistorial: true,
    puedeCrearRegistro: true,
    puedeVerUsuarios: false,
    puedeVerConfiguracion: false,
    puedeVerAdministracion: false,
    veSoloSusDatos: true,   // El auxiliar solo ve lo SUYO
  },
}

export function usePermissions() {
  const { usuario } = useAuth()
  
  // Normalizar rol: cualquier cosa que no sea 'admin' se trata como 'auxiliar'
  const rol: Rol = usuario?.rol === 'admin' || usuario?.rol === 'superadmin' ? 'admin' : 'auxiliar'
  const permisos = PERMISOS[rol]
  
  return {
    rol,
    esAdmin: rol === 'admin',
    esAuxiliar: rol === 'auxiliar',
    ...permisos,
  }
}

// ✅ HELPER CENTRAL: Devuelve el filtro de datos según rol
// Retorna null si debe ver todo, o el código del auxiliar si debe filtrar
export function getDataFilter(): string | null {
  const { usuario } = useAuth()
  const { esAdmin } = usePermissions()
  
  if (esAdmin) return null  // Admin ve todo
  return usuario?.codigo || null  // Auxiliar solo lo suyo
}