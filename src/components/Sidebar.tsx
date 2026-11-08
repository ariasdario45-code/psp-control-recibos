import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoPalermo from './LogoPalermo'
import { 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  Users, 
  Settings, 
  Database,
  User,
  LogOut,
  Ship
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { usuario, logout, esAdmin } = useAuth()

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel', path: '/panel' },
    { icon: PlusCircle, label: 'Nuevo registro', path: '/nuevo' },
    { icon: Clock, label: 'Historial', path: '/historial' },
    { icon: Users, label: 'Usuarios', path: '/usuarios', soloAdmin: true },
    { icon: Settings, label: 'Configuración', path: '/configuracion', soloAdmin: true },
    { icon: Database, label: 'Administración', path: '/admin', soloAdmin: true },
  ]

  const menuFiltrado = menuItems.filter(item => !item.soloAdmin || esAdmin)

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      {/* HEADER CON LOGO PALERMO + COREMAR */}
      <div className="p-5 border-b border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Logo Palermo con C azul */}
        <LogoPalermo size="small" showText={true} />
        
        {/* Separador */}
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
        
        {/* COREMAR - Nombre principal */}
        <div className="flex items-center gap-2">
          <Ship className="w-5 h-5 text-[#00A8E8]" />
          <h1 className="font-bold text-xl text-white tracking-wide">
            COREMAR
          </h1>
        </div>
        
        {/* CONTROL DE RECIBOS - Subtítulo destacado */}
        <div className="mt-2 px-2 py-1.5 bg-[#0077B6]/20 border border-[#0077B6]/40 rounded-md">
          <p className="text-[#00A8E8] text-xs font-semibold uppercase tracking-wider text-center">
            Control de Recibos
          </p>
        </div>
      </div>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="flex-1 p-4 space-y-1">
        {menuFiltrado.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              location.pathname === item.path
                ? 'bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white shadow-lg shadow-blue-900/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* FOOTER CON USUARIO Y LOGOUT */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-slate-800 rounded-lg">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0077B6] to-[#00A8E8] rounded-full flex items-center justify-center shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-white">{usuario?.nombre}</p>
            <p className="text-xs text-slate-400 truncate">{usuario?.codigo}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${
              esAdmin 
                ? 'bg-purple-600/80 text-white' 
                : 'bg-[#0077B6]/80 text-white'
            }`}>
              {usuario?.rol}
            </span>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}